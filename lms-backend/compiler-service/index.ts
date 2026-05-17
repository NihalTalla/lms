import 'dotenv/config';

import express from 'express';
import pino from 'pino';
import { z } from 'zod';

import { executeCode } from './src/execute';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const app = express();

function envNumber(name: string, fallback: number, min?: number, max?: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  if (typeof min === 'number' && value < min) return min;
  if (typeof max === 'number' && value > max) return max;
  return value;
}

const MAX_CODE_BYTES = envNumber('COMPILER_MAX_CODE_BYTES', 65_536, 1_024, 262_144);
const MAX_STDIN_BYTES = envNumber('COMPILER_MAX_STDIN_BYTES', 65_536, 0, 262_144);
const MAX_OUTPUT_BYTES = envNumber('COMPILER_MAX_OUTPUT_BYTES', 65_536, 1_024, 262_144);
const MAX_REQUEST_BYTES = envNumber(
  'COMPILER_MAX_REQUEST_BYTES',
  Math.max(256 * 1024, MAX_CODE_BYTES + MAX_STDIN_BYTES + 8 * 1024),
  64 * 1024,
  1024 * 1024
);

app.use((req, res, next) => {
  const origin = req.headers.origin ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: MAX_REQUEST_BYTES }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const executeSchema = z.object({
  language: z.enum(['python', 'c', 'cpp', 'java']),
  code: z.string().min(1).max(MAX_CODE_BYTES),
  stdin: z.string().max(MAX_STDIN_BYTES).default(''),
  timeoutMs: z.coerce.number().int().min(1000).max(15_000),
  memoryMb: z.coerce.number().int().min(64).max(1024).default(128)
});

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

app.post('/execute', async (req, res) => {
  const parsed = executeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  try {
    const result = await executeCode(parsed.data);
    const stdoutClamp = clampUtf8(result.stdout, MAX_OUTPUT_BYTES);
    const stderrClamp = clampUtf8(result.stderr, MAX_OUTPUT_BYTES);
    const outputTruncated = Boolean(result.outputTruncated) || stdoutClamp.truncated || stderrClamp.truncated;
    const verdict = outputTruncated && result.verdict === 'ok' ? 'rte' : result.verdict;
    const stderr = outputTruncated && verdict === 'rte'
      ? (stderrClamp.value || `Output limit exceeded (${MAX_OUTPUT_BYTES} bytes)`)
      : stderrClamp.value;
    const stdoutBytes = result.stdoutBytes ?? stdoutClamp.bytes;
    const stderrBytes = result.stderrBytes ?? stderrClamp.bytes;

    logger.info(
      {
        language: parsed.data.language,
        execTimeMs: result.execTimeMs,
        verdict,
        outputTruncated,
        stdoutBytes,
        stderrBytes
      },
      'execution completed'
    );
    return res.status(200).json({
      ...result,
      stdout: stdoutClamp.value,
      stderr,
      stdoutBytes,
      stderrBytes,
      outputTruncated,
      verdict
    });
  } catch (err) {
    logger.error({ err }, 'execution failed');
    return res.status(500).json({ error: 'Execution failed' });
  }
});

const port = Number(process.env.COMPILER_PORT ?? 4000);
app.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'compiler-service listening');
});
