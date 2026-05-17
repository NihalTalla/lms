// sandbox_run.js - safer execution wrapper (separate Node process)
// Usage:
//   node sandbox_run.js <program.py> <input.txt> <expected.txt>
//
// Enforces:
// - OS-level wall clock timeout (kill process)
// - Node heap cap via --max-old-space-size
// - VM-level limits (inside judge.js)
//
// Exit codes mirror judge.js:
//   0 = Accepted, 1 = Wrong Answer, 2 = Error, 3 = TLE

const { spawn } = require('child_process');
const path = require('path');

function main() {
  const programPath = process.argv[2];
  const inputPath = process.argv[3];
  const expectedPath = process.argv[4];

  if (!programPath || !inputPath || !expectedPath) {
    console.error('Usage: node sandbox_run.js <program.py> <input.txt> <expected.txt>');
    process.exit(2);
  }

  const judgePath = path.resolve(__dirname, 'judge.js');
  const nodeArgs = [
    '--max-old-space-size=128',
    judgePath,
    path.resolve(programPath),
    path.resolve(inputPath),
    path.resolve(expectedPath)
  ];

  const child = spawn(process.execPath, nodeArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  let out = '';
  let err = '';
  child.stdout.on('data', d => { out += d.toString(); });
  child.stderr.on('data', d => { err += d.toString(); });

  const timeoutMs = 2500;
  const timer = setTimeout(() => {
    try { child.kill('SIGKILL'); } catch {}
  }, timeoutMs);

  child.on('exit', (code, signal) => {
    clearTimeout(timer);
    if (signal) {
      console.error('TIME LIMIT EXCEEDED');
      process.exit(3);
    }
    if (err.trim()) process.stderr.write(err);
    if (out.trim()) process.stdout.write(out);
    process.exit(code ?? 2);
  });
}

main();

