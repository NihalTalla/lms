import 'dotenv/config';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const seededProblemId = process.env.VERIFY_PROBLEM_ID;
const pollIntervalMs = Number(process.env.VERIFY_POLL_INTERVAL_MS ?? 1500);
const pollAttempts = Number(process.env.VERIFY_POLL_ATTEMPTS ?? 80);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatJson(v: unknown) {
  return JSON.stringify(v, null, 2);
}

async function requestJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  const body = text.length ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}\n${formatJson(body)}`);
  return body;
}

async function login() {
  const email = process.env.VERIFY_USER_EMAIL;
  const password = process.env.VERIFY_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('VERIFY_USER_EMAIL and VERIFY_USER_PASSWORD must be set for this script');
  }

  const body = await requestJson(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!body.accessToken) throw new Error('login failed');
  return String(body.accessToken);
}

async function createSubmission(accessToken: string, code: string, language = 'python') {
  const res = await requestJson(`${apiBaseUrl}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ problemId: seededProblemId, language, code })
  });
  return String(res.submissionId);
}

async function getSubmission(accessToken: string, id: string) {
  return requestJson(`${apiBaseUrl}/api/submissions/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function pollSubmission(accessToken: string, id: string) {
  for (let i = 0; i < pollAttempts; i++) {
    const data = await getSubmission(accessToken, id);
    const status = data.data?.status;
    if (status === 'completed' || status === 'failed') return data.data;
    console.log(`poll ${id}: ${status} (${i + 1}/${pollAttempts})`);
    await sleep(pollIntervalMs);
  }
  throw new Error(`timed out polling ${id}`);
}

async function duplicateSpamTest(accessToken: string) {
  console.log('\n== Duplicate submission spam test ==');
  const code = ['import sys', 'a,b = map(int, sys.stdin.read().split())', 'print(a+b)'].join('\n');
  const ids: string[] = [];
  for (let i = 0; i < 8; i++) {
    try {
      const id = await createSubmission(accessToken, code);
      console.log(`created submission ${id}`);
      ids.push(id);
      // small spacing to avoid tripping extreme rate limits while still stressing the system
      await sleep(300);
    } catch (err) {
      console.error('create submission error:', err instanceof Error ? err.message : String(err));
      // continue trying to create more submissions
    }
  }

  // poll all
  const results = await Promise.all(ids.map((id) => pollSubmission(accessToken, id)));
  console.log('Duplicate spam results:');
  console.log(formatJson(results.map((r) => ({ id: r.id, verdict: r.verdict, status: r.status }))));
}

async function compileErrorTest(accessToken: string) {
  console.log('\n== Compile error test ==');
  const code = "print("; // invalid python
  const id = await createSubmission(accessToken, code);
  console.log(`created ${id}`);
  const res = await pollSubmission(accessToken, id);
  console.log('Compile error result:', formatJson(res));
}

async function infiniteLoopTest(accessToken: string) {
  console.log('\n== Infinite loop timeout test ==');
  const code = ['while True:', '    pass'].join('\n');
  const id = await createSubmission(accessToken, code);
  console.log(`created ${id}`);
  const res = await pollSubmission(accessToken, id);
  console.log('Infinite loop result:', formatJson(res));
}

async function runtimeCrashTest(accessToken: string) {
  console.log('\n== Runtime crash test ==');
  const code = ['print(1/0)'].join('\n');
  const id = await createSubmission(accessToken, code);
  console.log(`created ${id}`);
  const res = await pollSubmission(accessToken, id);
  console.log('Runtime crash result:', formatJson(res));
}

async function main() {
  console.log('Logging in...');
  const token = await login();

  await duplicateSpamTest(token);
  // cooldown to allow server-side rate limits to recover before next tests
  await sleep(15000);
  await compileErrorTest(token);
  await infiniteLoopTest(token);
  await runtimeCrashTest(token);

  console.log('\nAll tests complete.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
