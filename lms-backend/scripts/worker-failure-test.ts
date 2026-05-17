import 'dotenv/config';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

async function requestJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  const body = text.length ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}\n${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log('Logging in...');
  const login = await requestJson(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student1@codify.com', password: 'Student@123' })
  });
  const token = String(login.accessToken);
  console.log('Creating submission while worker is down...');
  const create = await requestJson(`${apiBaseUrl}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ problemId: '33333333-3333-3333-3333-333333333333', language: 'python', code: 'print(1)' })
  });
  const id = String(create.submissionId);
  console.log('submission created', id);

  console.log('Now start the worker in another terminal. This script will poll until the submission is processed.');

  for (let i = 0; i < 120; i++) {
    try {
      const s = await requestJson(`${apiBaseUrl}/api/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`poll ${i}: ${s.data.status}`);
      if (s.data.status === 'completed' || s.data.status === 'failed') {
        console.log(JSON.stringify(s.data, null, 2));
        break;
      }
    } catch (err) {
      console.error('poll error', err instanceof Error ? err.message : String(err));
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
