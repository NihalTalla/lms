import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

import { cConfig } from './languages/c';
import { cppConfig } from './languages/cpp';
import { javaConfig } from './languages/java';
import { pythonConfig } from './languages/python';
import type { LanguageConfig, SupportedLanguage } from './languages/types';
import { runProcess } from './runProcess';

export type { SupportedLanguage };

export type ExecuteRequest = {
  language: SupportedLanguage;
  code: string;
  stdin: string;
  timeoutMs: number;
  memoryMb: number;
};

export type ExecuteResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  verdict: 'ok' | 'tle' | 'mle' | 'rte' | 'ce';
  execTimeMs: number;
  stdoutBytes?: number;
  stderrBytes?: number;
  outputTruncated?: boolean;
  compileTimeMs?: number;
  runTimeMs?: number;
  runner?: 'lambda' | 'local';
  runnerExecTimeMs?: number;
};

type RunnerError = {
  type?: string;
  message?: string;
};

type RunnerLambdaBody = {
  stdout?: string;
  stderr?: string;
  stdoutBytes?: number;
  stderrBytes?: number;
  outputTruncated?: boolean;
  execTimeMs?: number;
  error?: RunnerError | null;
};

type RunnerLambdaProxyResponse = {
  statusCode?: number;
  body?: string;
};

const EXEC_BASE = process.env.EXEC_BASE ?? '/tmp/lms-exec';
const SANDBOX = process.env.SANDBOX_BIN ?? '/usr/local/bin/sandbox-run';
function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

const MAX_OUTPUT_BYTES = envNumber('COMPILER_MAX_OUTPUT_BYTES', 64 * 1024);
const COMPILE_TIMEOUT_MS = 10_000;

const RUNNER_URLS: Record<SupportedLanguage, string | undefined> = {
  python: process.env.COMPILER_RUNNER_PYTHON_URL,
  java: process.env.COMPILER_RUNNER_JAVA_URL,
  c: process.env.COMPILER_RUNNER_C_URL,
  cpp: process.env.COMPILER_RUNNER_CPP_URL
};

function languageConfig(language: SupportedLanguage, dir: string): LanguageConfig {
  if (language === 'python') return pythonConfig(dir, SANDBOX);
  if (language === 'c') return cConfig(dir, SANDBOX);
  if (language === 'cpp') return cppConfig(dir, SANDBOX);
  return javaConfig(dir, SANDBOX);
}

function runnerUid() {
  const value = Number(process.env.RUNNER_UID);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function runnerGid() {
  const value = Number(process.env.RUNNER_GID);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function mapRunnerErrorToVerdict(error: RunnerError | null | undefined): ExecuteResult['verdict'] {
  if (!error) return 'ok';

  const type = (error.type ?? '').toUpperCase();
  const message = (error.message ?? '').toLowerCase();

  if (type.includes('COMPILE')) return 'ce';
  if (type.includes('TIME')) return 'tle';
  if (type.includes('MEMORY')) return 'mle';
  if (type.includes('OUTPUT')) return 'rte';
  if (type.includes('INPUT')) return 'ce';
  if (type.includes('RUNTIME')) return 'rte';

  if (message.includes('time limit')) return 'tle';
  if (message.includes('memory limit')) return 'mle';
  if (message.includes('output limit')) return 'rte';
  if (message.includes('input too large')) return 'ce';
  if (message.includes('compile')) return 'ce';

  return 'rte';
}

function clampUtf8(value: string, maxBytes: number) {
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

function parseRunnerPayload(payload: unknown): RunnerLambdaBody {
  if (!payload || typeof payload !== 'object') return {};

  const proxy = payload as RunnerLambdaProxyResponse;
  if (typeof proxy.body === 'string') {
    try {
      const parsed = JSON.parse(proxy.body) as unknown;
      if (parsed && typeof parsed === 'object') return parsed as RunnerLambdaBody;
    } catch {
      return {};
    }
  }

  return payload as RunnerLambdaBody;
}

async function executeViaLambda(req: ExecuteRequest): Promise<ExecuteResult | null> {
  const runnerUrl = RUNNER_URLS[req.language];
  if (!runnerUrl) return null;

  const start = Date.now();
  const controller = new AbortController();
  const timeoutMs = Math.max(req.timeoutMs + 3000, COMPILE_TIMEOUT_MS);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(runnerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        language: req.language,
        code: req.code,
        stdin: req.stdin,
        timeoutMs: req.timeoutMs,
        memoryMb: req.memoryMb
      }),
      signal: controller.signal
    });

    const payload = parseRunnerPayload(await response.json().catch(() => null));
    const stdout = typeof payload.stdout === 'string' ? payload.stdout : '';
    const stderr = typeof payload.stderr === 'string' ? payload.stderr : '';
    const verdict = mapRunnerErrorToVerdict(payload.error ?? null);
    const stdoutClamp = clampUtf8(stdout, MAX_OUTPUT_BYTES);
    const stderrClamp = clampUtf8(stderr, MAX_OUTPUT_BYTES);
    const outputTruncated = Boolean(payload.outputTruncated) || stdoutClamp.truncated || stderrClamp.truncated;
    const stderrWithLimit = outputTruncated && verdict === 'ok'
      ? (stderrClamp.value || `Output limit exceeded (${MAX_OUTPUT_BYTES} bytes)`)
      : stderrClamp.value;

    return {
      stdout: stdoutClamp.value,
      stderr: stderrWithLimit,
      exitCode: verdict === 'ok' ? 0 : 1,
      verdict: outputTruncated && verdict === 'ok' ? 'rte' : verdict,
      execTimeMs: Date.now() - start,
      runnerExecTimeMs: typeof payload.execTimeMs === 'number' ? payload.execTimeMs : undefined,
      stdoutBytes: typeof payload.stdoutBytes === 'number' ? payload.stdoutBytes : stdoutClamp.bytes,
      stderrBytes: typeof payload.stderrBytes === 'number' ? payload.stderrBytes : stderrClamp.bytes,
      outputTruncated,
      runner: 'lambda'
    };
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      return {
        stdout: '',
        stderr: 'Runner invocation timed out',
        exitCode: null,
        verdict: 'tle',
        execTimeMs: Date.now() - start,
        runner: 'lambda'
      };
    }

    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    clearTimeout(timer);
  }
}

async function executeLocalCode(req: ExecuteRequest): Promise<ExecuteResult> {
  const dir = path.join(EXEC_BASE, uuid());
  const start = Date.now();
  await mkdir(dir, { recursive: true });
  let compileTimeMs = 0;
  let runTimeMs = 0;

  try {
    const config = languageConfig(req.language, dir);
    await writeFile(config.mainFile, req.code, 'utf8');

    if (config.compileCmd) {
      const compile = await runProcess({
        cmd: config.compileCmd,
        timeoutMs: COMPILE_TIMEOUT_MS,
        maxOutputBytes: MAX_OUTPUT_BYTES,
        uid: runnerUid(),
        gid: runnerGid()
      });

      compileTimeMs = compile.durationMs;

      if (compile.outputLimitExceeded) {
        return {
          stdout: compile.stdout,
          stderr: compile.stderr || `Compiler output exceeded ${MAX_OUTPUT_BYTES} bytes`,
          exitCode: compile.exitCode,
          verdict: 'ce',
          execTimeMs: Date.now() - start,
          stdoutBytes: compile.stdoutBytes,
          stderrBytes: compile.stderrBytes,
          outputTruncated: true,
          compileTimeMs,
          runTimeMs,
          runner: 'local'
        };
      }

      if (compile.timedOut || compile.exitCode !== 0) {
        return {
          stdout: compile.stdout,
          stderr: compile.stderr,
          exitCode: compile.exitCode,
          verdict: 'ce',
          execTimeMs: Date.now() - start,
          stdoutBytes: compile.stdoutBytes,
          stderrBytes: compile.stderrBytes,
          outputTruncated: false,
          compileTimeMs,
          runTimeMs,
          runner: 'local'
        };
      }
    }

    const run = await runProcess({
      cmd: config.runCmd,
      stdin: req.stdin,
      timeoutMs: req.timeoutMs,
      maxOutputBytes: MAX_OUTPUT_BYTES,
      uid: runnerUid(),
      gid: runnerGid()
    });

    runTimeMs = run.durationMs;

    const verdict = run.outputLimitExceeded
      ? 'rte'
      : run.timedOut
        ? 'tle'
        : run.exitCode === 0
          ? 'ok'
          : 'rte';

    return {
      stdout: run.stdout,
      stderr: run.outputLimitExceeded
        ? (run.stderr || `Output limit exceeded (${MAX_OUTPUT_BYTES} bytes)`)
        : run.stderr,
      exitCode: run.exitCode,
      verdict,
      execTimeMs: Date.now() - start,
      stdoutBytes: run.stdoutBytes,
      stderrBytes: run.stderrBytes,
      outputTruncated: run.outputLimitExceeded,
      compileTimeMs,
      runTimeMs,
      runner: 'local'
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function executeCode(req: ExecuteRequest): Promise<ExecuteResult> {
  const remoteResult = await executeViaLambda(req);
  if (remoteResult) return remoteResult;

  return executeLocalCode(req);
}
