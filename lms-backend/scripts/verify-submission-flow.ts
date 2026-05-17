import 'dotenv/config';

type DependencyStatus = 'ok' | 'error';

type HealthResponse = {
  status?: string;
  db?: DependencyStatus;
  redis?: DependencyStatus;
  sqs?: DependencyStatus;
};

type LoginResponse = {
  accessToken?: unknown;
};

type CreateSubmissionResponse = {
  submissionId?: unknown;
  status?: unknown;
};

type SubmissionStatus = 'pending' | 'running' | 'completed' | 'failed';

type SubmissionResult = {
  id?: unknown;
  status?: unknown;
  verdict?: unknown;
  passedTests?: unknown;
  totalTests?: unknown;
  stderr?: unknown;
};

type SubmissionResponse = {
  data?: SubmissionResult;
};

type JsonRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const compilerServiceUrl = process.env.COMPILER_SERVICE_URL ?? 'http://localhost:4000';
const seededProblemId =
  process.env.VERIFY_PROBLEM_ID ?? '33333333-3333-3333-3333-333333333333';
const pollIntervalMs = Number(process.env.VERIFY_POLL_INTERVAL_MS ?? 1500);
const pollAttempts = Number(process.env.VERIFY_POLL_ATTEMPTS ?? 40);

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is missing from response`);
  }

  return value;
}

function isSubmissionStatus(value: unknown): value is SubmissionStatus {
  return value === 'pending' || value === 'running' || value === 'completed' || value === 'failed';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function requestJson<T>(url: string, init?: JsonRequestInit): Promise<T> {
  let res: Response;

  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers
      }
    });
  } catch (err) {
    throw new Error(
      `Request failed before response for ${url}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const text = await res.text();
  const body = text.length > 0 ? (JSON.parse(text) as unknown) : {};

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}\n${formatJson(body)}`);
  }

  return body as T;
}

async function assertCompilerHealth() {
  const health = await requestJson<{ status?: unknown }>(`${compilerServiceUrl}/health`);
  if (health.status !== 'ok') {
    throw new Error(`Compiler health failed: ${formatJson(health)}`);
  }
}

async function assertApiHealth() {
  const health = await requestJson<HealthResponse>(`${apiBaseUrl}/health`);
  if (health.status !== 'ok' || health.db !== 'ok' || health.redis !== 'ok' || health.sqs !== 'ok') {
    throw new Error(
      `API health failed. Expected status/db/redis/sqs all ok, received:\n${formatJson(health)}`
    );
  }
}

async function login() {
  const loginResponse = await requestJson<LoginResponse>(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'student1@codify.com',
      password: 'Student@123'
    })
  });

  return assertString(loginResponse.accessToken, 'accessToken');
}

async function createSubmission(accessToken: string) {
  const submissionCode = [
    'import sys',
    'a, b = map(int, sys.stdin.read().split())',
    'print(a + b)'
  ].join('\n');

  const response = await requestJson<CreateSubmissionResponse>(`${apiBaseUrl}/api/submissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      problemId: seededProblemId,
      language: 'python',
      code: submissionCode
    })
  });

  const submissionId = assertString(response.submissionId, 'submissionId');

  if (response.status !== 'pending') {
    throw new Error(`Expected created submission status pending, received ${String(response.status)}`);
  }

  return submissionId;
}

async function getSubmission(accessToken: string, submissionId: string) {
  const response = await requestJson<SubmissionResponse>(
    `${apiBaseUrl}/api/submissions/${submissionId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.data) {
    throw new Error(`Submission response missing data: ${formatJson(response)}`);
  }

  return response.data;
}

async function pollSubmission(accessToken: string, submissionId: string) {
  for (let attempt = 1; attempt <= pollAttempts; attempt++) {
    const submission = await getSubmission(accessToken, submissionId);

    if (!isSubmissionStatus(submission.status)) {
      throw new Error(`Unknown submission status: ${String(submission.status)}`);
    }

    if (submission.status === 'failed') {
      throw new Error(`Submission failed:\n${formatJson(submission)}`);
    }

    if (submission.status === 'completed') {
      return submission;
    }

    console.log(
      `Submission ${submissionId} is ${submission.status}; polling again (${attempt}/${pollAttempts})`
    );
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for submission ${submissionId} after ${pollAttempts} attempts`
  );
}

async function main() {
  console.log('Checking compiler health...');
  await assertCompilerHealth();

  console.log('Checking API dependency health...');
  await assertApiHealth();

  console.log('Logging in as seeded student...');
  const accessToken = await login();

  console.log('Creating seeded Sum Two Numbers submission...');
  const submissionId = await createSubmission(accessToken);

  console.log(`Polling submission ${submissionId}...`);
  const result = await pollSubmission(accessToken, submissionId);

  if (result.verdict !== 'accepted' || result.passedTests !== 3 || result.totalTests !== 3) {
    throw new Error(`Submission did not meet acceptance criteria:\n${formatJson(result)}`);
  }

  console.log('Submission flow verified:');
  console.log(
    formatJson({
      id: result.id,
      status: result.status,
      verdict: result.verdict,
      passedTests: result.passedTests,
      totalTests: result.totalTests
    })
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
