import { prisma } from '@/config/db';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { badRequest, forbidden, notFound } from '@/utils/apiError';

import type { Role } from '@/types/auth';

import { enqueueSubmissionJob } from '@/jobs/submissions.queue';

export async function createSubmission(requester: { id: string; role: Role }, input: {
  problemId: string;
  language: 'python' | 'c' | 'cpp' | 'java';
  code: string;
  contestId?: string;
}) {
  if (!['student', 'faculty', 'trainer'].includes(requester.role)) throw forbidden('Forbidden');

  logger.info(
    {
      userId: requester.id,
      problemId: input.problemId,
      language: input.language,
      codeLength: input.code.length
    },
    'Submission API called'
  );

  const codeBytes = Buffer.byteLength(input.code, 'utf8');
  if (codeBytes > env.SUBMISSION_CODE_MAX_BYTES) {
    throw badRequest(`Code exceeds max size (${env.SUBMISSION_CODE_MAX_BYTES} bytes)`);
  }

  const problem = await prisma.problem.findFirst({
    where: {
      id: input.problemId,
      isPublished: true
    },
    select: { id: true, timeLimit: true, memoryLimit: true }
  });

  if (!problem) throw notFound('Not found');

  if (input.contestId) {
    const now = new Date();
    const contest = await prisma.contest.findUnique({
      where: { id: input.contestId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        problems: {
          where: { problemId: input.problemId },
          select: { problemId: true }
        },
        entries: {
          where: { userId: requester.id },
          select: { userId: true }
        }
      }
    });

    if (!contest) throw notFound('Not found');
    if (contest.startTime > now || contest.endTime < now) throw badRequest('Contest is not active');
    if (contest.problems.length === 0) throw badRequest('Problem is not in this contest');
    if (contest.entries.length === 0) throw forbidden('Join contest first');
  }

  const totalTests = await prisma.testCase.count({
    where: {
      problemId: input.problemId
    }
  });

  logger.info(
    { userId: requester.id, problemId: input.problemId, totalTests },
    'Creating submission DB record'
  );

  const submission = await prisma.submission.create({
    data: {
      userId: requester.id,
      problemId: input.problemId,
      contestId: input.contestId,
      language: input.language,
      code: input.code,
      status: 'pending',
      totalTests
    },
    select: {
      id: true,
      status: true
    }
  });

  logger.info(
    { submissionId: submission.id, totalTests },
    'Submission created, enqueueing to SQS'
  );

  await enqueueSubmissionJob({
    submissionId: submission.id,
    userId: requester.id,
    problemId: input.problemId,
    language: input.language,
    code: input.code,
    ...(input.contestId ? { contestId: input.contestId } : {})
  });

  logger.info(
    { submissionId: submission.id },
    'Submission enqueued successfully - waiting for worker processing'
  );

  return {
    submissionId: submission.id,
    status: submission.status
  };
}

export async function getSubmissionById(requester: { id: string; role: Role }, submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      userId: true,
      problemId: true,
      language: true,
      code: true,
      status: true,
      verdict: true,
      stdout: true,
      stderr: true,
      passedTests: true,
      totalTests: true,
      execTimeMs: true,
      memoryKb: true,
      createdAt: true,
      problem: {
        select: {
          id: true,
          title: true,
          difficulty: true
        }
      }
    }
  });

  if (!submission) throw notFound('Not found');

  if (requester.role === 'student' && submission.userId !== requester.id) {
    throw forbidden('Forbidden');
  }

  return submission;
}

export async function listSubmissions(
  requester: { id: string; role: Role },
  params: {
    page: number;
    limit: number;
    status?: 'pending' | 'running' | 'completed' | 'failed';
    problemId?: string;
    contestId?: string;
  }
) {
  const where = {
    ...(requester.role === 'student' ? { userId: requester.id } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.problemId ? { problemId: params.problemId } : {}),
    ...(params.contestId ? { contestId: params.contestId } : {})
  };

  const skip = (params.page - 1) * params.limit;

  const [total, items] = await prisma.$transaction([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: params.limit,
      select: {
        id: true,
        userId: true,
        problemId: true,
        contestId: true,
        language: true,
        status: true,
        verdict: true,
        passedTests: true,
        totalTests: true,
        execTimeMs: true,
        createdAt: true,
        problem: {
          select: { id: true, title: true, difficulty: true }
        },
        user:
          requester.role === 'student'
            ? false
            : {
                select: { id: true, name: true, email: true }
              }
      }
    })
  ]);

  return { page: params.page, limit: params.limit, total, items };
}

export async function getGradingQueue() {
  return prisma.submission.findMany({
    where: {
      status: 'completed',
      score: null
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      problemId: true,
      contestId: true,
      language: true,
      status: true,
      verdict: true,
      passedTests: true,
      totalTests: true,
      execTimeMs: true,
      score: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      problem: { select: { id: true, title: true, difficulty: true } }
    }
  });
}

export async function listPendingSubmissionsForUser(requester: { id: string; role: Role }) {
  const where = {
    ...(requester.role === 'student' ? { userId: requester.id } : {}),
    status: { in: ['pending', 'running'] }
  } as any;

  const items = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      problemId: true,
      contestId: true,
      language: true,
      status: true,
      verdict: true,
      passedTests: true,
      totalTests: true,
      execTimeMs: true,
      createdAt: true,
      problem: { select: { id: true, title: true, difficulty: true } }
    }
  });

  return items;
}

export async function gradeSubmission(
  id: string,
  input: { verdict: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error'; score?: number },
  graderId: string
) {
  return prisma.submission.update({
    where: { id },
    data: {
      verdict: input.verdict,
      score: input.score,
      gradedBy: graderId,
      gradedAt: new Date()
    },
    select: {
      id: true,
      status: true,
      verdict: true,
      score: true,
      gradedBy: true,
      gradedAt: true
    }
  });
}
