import { spawn } from 'child_process';

export type RunProcessResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputLimitExceeded: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  durationMs: number;
};

export async function runProcess(params: {
  cmd: string[];
  stdin?: string;
  timeoutMs: number;
  maxOutputBytes: number;
  uid?: number;
  gid?: number;
}): Promise<RunProcessResult> {
  const [command, ...args] = params.cmd;
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      uid: params.uid,
      gid: params.gid,
      env: {
        ...process.env,
        PATH: process.env.PATH
      }
    });

    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let timedOut = false;
    let outputLimitExceeded = false;
    let settled = false;

    const kill = () => {
      try {
        child.kill('SIGKILL');
      } catch {
        // process may already be gone
      }
    };

    const finish = (result: RunProcessResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const append = (current: Buffer, chunk: Buffer) => {
      const next = Buffer.concat([current, chunk]);
      if (next.length > params.maxOutputBytes) {
        outputLimitExceeded = true;
        kill();
        return next.subarray(0, params.maxOutputBytes);
      }
      return next;
    };

    const timer = setTimeout(() => {
      timedOut = true;
      kill();
      finish({
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        exitCode: null,
        timedOut: true,
        outputLimitExceeded,
        stdoutBytes: stdout.length,
        stderrBytes: stderr.length,
        durationMs: Date.now() - startedAt
      });
    }, params.timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!settled) reject(err);
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      finish({
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        exitCode,
        timedOut: timedOut || Date.now() - startedAt > params.timeoutMs,
        outputLimitExceeded,
        stdoutBytes: stdout.length,
        stderrBytes: stderr.length,
        durationMs: Date.now() - startedAt
      });
    });

    if (params.stdin) {
      child.stdin.write(params.stdin);
    }
    child.stdin.end();
  });
}
