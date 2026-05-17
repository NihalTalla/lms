import axios from 'axios';
import http from 'node:http';
import https from 'node:https';

import { prisma } from '@/config/db';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { redis } from '@/config/redis';

import type { Verdict } from '@prisma/client';
import type { SubmissionJob } from './submissions.queue';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trimEnd();
}

function truncateOutput(value: string, maxBytes: number) {
  const buf = Buffer.from(value, 'utf8');
  if (buf.length <= maxBytes) {
    return { value, bytes: buf.length, truncated: false };
  }
  return {
    value: buf.subarray(0, maxBytes).toString('utf8'),
    bytes: buf.length,
    truncated: true
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Use direct axios POST calls with AbortController for hard timeouts and retries.

type CompilerVerdict = 'ok' | 'tle' | 'mle' | 'rte' | 'ce';

// Zod-like type guard for runtime validation
type CompilerResponse = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  verdict: CompilerVerdict;
  execTimeMs: number;
  outputTruncated?: boolean;
  stdoutBytes?: number;
  stderrBytes?: number;
};

function validateCompilerResponse(data: unknown): data is CompilerResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.stdout === 'string' &&
    typeof obj.stderr === 'string' &&
    (obj.exitCode === null || typeof obj.exitCode === 'number') &&
    typeof obj.verdict === 'string' &&
    typeof obj.execTimeMs === 'number'
  );
}

function mapCompilerVerdict(verdict: CompilerVerdict): Verdict {
  if (verdict === 'tle') return 'time_limit_exceeded';
  if (verdict === 'mle') return 'memory_limit_exceeded';
  if (verdict === 'ce') return 'compilation_error';
  if (verdict === 'rte') return 'runtime_error';
  return 'accepted';
}

async function runSingleTest(params: {
  submissionId: string;
  testCaseIndex: number;
  language: 'python' | 'c' | 'cpp' | 'java';
  code: string;
  stdin: string;
  timeoutMs: number;
  memoryMb: number;
}) {
  let lastError: Error | undefined;
  const hardTimeout = env.COMPILER_TIMEOUT_MS + 3_000; // 3s buffer

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      logger.debug(
        {
          submissionId: params.submissionId,
          testCaseIndex: params.testCaseIndex,
          attempt
        },
        'Calling compiler service'
      );

      // Use AbortController for hard timeout
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => {
        controller.abort();
      }, hardTimeout);

      try {
        const res = await axios.post<unknown>(
          `${env.COMPILER_SERVICE_URL}/execute`,
          {
            language: params.language,
            code: params.code,
            stdin: params.stdin,
            timeoutMs: params.timeoutMs,
            memoryMb: params.memoryMb
          },
          {
            timeout: hardTimeout,
            signal: controller.signal,
            httpAgent,
            httpsAgent
          }
        );
        clearTimeout(timeoutHandle);

        // Validate response shape
        if (!validateCompilerResponse(res.data)) {
          logger.error(
            {
              submissionId: params.submissionId,
              testCaseIndex: params.testCaseIndex,
              receivedData: res.data
            },
            'Compiler response has invalid shape'
          );
          throw new Error('Invalid compiler response format');
        }

        logger.debug(
          {
            submissionId: params.submissionId,
            testCaseIndex: params.testCaseIndex,
            verdict: res.data.verdict,
            execTimeMs: res.data.execTimeMs,
            attempt
          },
          'Compiler call succeeded'
        );

        return res.data;
      } finally {
        clearTimeout(timeoutHandle);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isTimeout =
        lastError.message.includes('ECONNABORTED') || lastError.message.includes('timeout');
      const isNetworkError =
        lastError.message.includes('ECONNREFUSED') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('socket');

      if (axios.isAxiosError(err)) {
        logger.warn(
          {
            submissionId: params.submissionId,
            testCaseIndex: params.testCaseIndex,
            status: err.response?.status,
            statusText: err.response?.statusText,
            message: err.message,
            code: err.code,
            isTimeout,
            isNetworkError,
            attempt,
            compilerUrl: env.COMPILER_SERVICE_URL
          },
          'Compiler service call failed'
        );
      } else {
        logger.warn(
          {
            submissionId: params.submissionId,
            testCaseIndex: params.testCaseIndex,
            message: lastError.message,
            isTimeout,
            isNetworkError,
            attempt
          },
          'Compiler call error'
        );
      }

      // Retry on network/timeout errors
      if ((isNetworkError || isTimeout) && attempt < 2) {
        const backoffMs = attempt * 1000;
        logger.info(
          {
            submissionId: params.submissionId,
            testCaseIndex: params.testCaseIndex,
            backoffMs
          },
          'Retrying compiler call'
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // Final attempt failed
      break;
    }
  }

  logger.error(
    {
      submissionId: params.submissionId,
      testCaseIndex: params.testCaseIndex,
      error: lastError?.message,
      compilerUrl: env.COMPILER_SERVICE_URL
    },
    'Compiler service unavailable after retries'
  );
  throw lastError || new Error('Compiler service failed');
}

async function updateContestScore(job: SubmissionJob) {
  if (!job.contestId) return;

  try {
    const previousAccepted = await prisma.submission.findFirst({
      where: {
        id: { not: job.submissionId },
        contestId: job.contestId,
        problemId: job.problemId,
        userId: job.userId,
        verdict: 'accepted'
      },
      select: { id: true }
    });

    if (previousAccepted) return;

    const contestProblem = await prisma.contestProblem.findUnique({
      where: {
        contestId_problemId: {
          contestId: job.contestId,
          problemId: job.problemId
        }
      },
      select: { points: true }
    });

    const points = contestProblem?.points ?? 100;

    await prisma.$transaction([
      prisma.contestEntry.upsert({
        where: {
          contestId_userId: {
            contestId: job.contestId,
            userId: job.userId
          }
        },
        create: {
          contestId: job.contestId,
          userId: job.userId,
          score: points
        },
        update: {
          score: { increment: points }
        }
      })
    ]);

    await redis.zincrby(`leaderboard:${job.contestId}`, points, job.userId);

    logger.info(
      { submissionId: job.submissionId, contestId: job.contestId, points },
      'Contest score updated'
    );
  } catch (err) {
    logger.error({ err, submissionId: job.submissionId }, 'Failed to update contest score');
  }
}

export async function processSubmission(job: SubmissionJob) {
  logger.info(
    {
      submissionId: job.submissionId,
      userId: job.userId,
      problemId: job.problemId,
      language: job.language
    },
    'Starting submission processing'
  );

  let submission = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    submission = await prisma.submission.findUnique({
      where: { id: job.submissionId },
      include: {
        problem: {
          include: {
            testCases: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                order: true,
                input: true,
                expected: true
              }
            }
          }
        }
      }
    });

    if (submission) break;

    if (attempt < 5) {
      logger.warn(
        { submissionId: job.submissionId, attempt },
        'Submission not visible yet; retrying lookup'
      );
      await sleep(250);
    }
  }

  if (!submission) {
    logger.warn({ submissionId: job.submissionId }, 'Submission not found during processing');
    return;
  }

  if (submission.status !== 'pending') {
    logger.info(
      { submissionId: job.submissionId, status: submission.status },
      'Submission is no longer pending; skipping'
    );
    return;
  }

  const testCases = submission.problem.testCases;
  logger.info(
    { submissionId: job.submissionId, totalTests: testCases.length },
    'Processing submission with test cases'
  );

  await prisma.submission.update({
    where: { id: job.submissionId },
    data: {
      status: 'running',
      totalTests: testCases.length
    }
  });

  let passed = 0;
  let verdict: Verdict = 'accepted';
  let stdout: string | null = null;
  let stderr: string | null = null;
  let execTimeMs = 0;

  try {
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      logger.debug(
        { submissionId: job.submissionId, testCaseIndex: i + 1, total: testCases.length },
        'Running test case'
      );

      const result = await runSingleTest({
        submissionId: job.submissionId,
        testCaseIndex: i,
        language: submission.language,
        code: submission.code,
        stdin: tc.input,
        timeoutMs: submission.problem.timeLimit,
        memoryMb: submission.problem.memoryLimit
      });

      execTimeMs += result.execTimeMs;
      const outputLimitBytes = env.COMPILER_MAX_OUTPUT_BYTES;
      const stdoutSafe = truncateOutput(result.stdout, outputLimitBytes);
      const stderrSafe = truncateOutput(result.stderr, outputLimitBytes);
      const outputTruncated = Boolean(result.outputTruncated) || stdoutSafe.truncated || stderrSafe.truncated;

      stdout = stdoutSafe.value;
      stderr = stderrSafe.value;

      if (outputTruncated && result.verdict === 'ok') {
        verdict = 'runtime_error';
        stderr = stderr || `Output limit exceeded (${outputLimitBytes} bytes)`;
        logger.info(
          {
            submissionId: job.submissionId,
            testCaseIndex: i,
            outputTruncated,
            stdoutBytes: stdoutSafe.bytes,
            stderrBytes: stderrSafe.bytes
          },
          'Test case failed (output limit exceeded)'
        );
        break;
      }

      if (result.verdict !== 'ok') {
        verdict = mapCompilerVerdict(result.verdict);
        logger.info(
          {
            submissionId: job.submissionId,
            testCaseIndex: i,
            verdict: result.verdict
          },
          'Test case failed (compiler verdict)'
        );
        break;
      }

      const actual = normalizeOutput(result.stdout);
      const expected = normalizeOutput(tc.expected);

      if (actual !== expected) {
        verdict = 'wrong_answer';
        logger.info(
          {
            submissionId: job.submissionId,
            testCaseIndex: i,
            expectedLength: expected.length,
            actualLength: actual.length
          },
          'Test case failed (output mismatch)'
        );
        break;
      }

      passed += 1;
      logger.debug(
        { submissionId: job.submissionId, testCaseIndex: i, passed },
        'Test case passed'
      );
    }

    if (passed !== testCases.length && verdict === 'accepted') {
      verdict = 'wrong_answer';
    }

    logger.info(
      {
        submissionId: job.submissionId,
        verdict,
        passed,
        total: testCases.length,
        execTimeMs
      },
      'Submission evaluation complete'
    );

    await prisma.submission.update({
      where: { id: job.submissionId },
      data: {
        status: 'completed',
        verdict,
        passedTests: passed,
        totalTests: testCases.length,
        stdout,
        stderr,
        execTimeMs
      }
    });

    if (verdict === 'accepted') {
      await updateContestScore(job);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Worker processing error';

    // Check if it's a compiler service error
    const isCompilerDown =
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('Compiler service unavailable') ||
      errorMsg.includes('ETIMEDOUT');

    logger.error(
      {
        err,
        submissionId: job.submissionId,
        isCompilerDown,
        testCasesProcessed: passed
      },
      isCompilerDown ? 'Compiler service unavailable' : 'Submission processing failed'
    );

    // Mark submission as completed with error, not failed
    // This prevents it from being retried indefinitely
    await prisma.submission.update({
      where: { id: job.submissionId },
      data: {
        status: 'completed',
        verdict: 'runtime_error',
        passedTests: passed,
        totalTests: testCases.length,
        stderr: isCompilerDown
          ? 'Compiler service unavailable - please try again later'
          : errorMsg
      }
    });

    // Log but don't throw - submission is marked completed
    if (!isCompilerDown) {
      throw err;
    }
  }
}
