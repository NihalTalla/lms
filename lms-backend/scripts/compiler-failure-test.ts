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
  const email = process.env.VERIFY_USER_EMAIL;
  const password = process.env.VERIFY_USER_PASSWORD;
  const problemId = process.env.VERIFY_PROBLEM_ID;

  if (!email || !password || !problemId) {
    console.error('This script requires VERIFY_USER_EMAIL, VERIFY_USER_PASSWORD, and VERIFY_PROBLEM_ID');
    process.exit(2);
  }

  const login = await requestJson(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const token = String(login.accessToken);
  console.log('logged in');

  const create = await requestJson(`${apiBaseUrl}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ problemId, language: 'python', code: 'print(1)' })
  });

  const id = String(create.submissionId);
  console.log('created', id);

  for (let i = 0; i < 40; i++) {
    const s = await requestJson(`${apiBaseUrl}/api/submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`poll ${i}: ${s.data.status}`);
    if (s.data.status === 'completed' || s.data.status === 'failed') {
      console.log(JSON.stringify(s.data, null, 2));
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
