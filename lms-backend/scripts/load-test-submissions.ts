import 'dotenv/config';

import { performance } from 'node:perf_hooks';

type Credentials = {
  label: string;
  email: string;
  password: string;
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
  createdAt?: unknown;
  execTimeMs?: unknown;
};

type SubmissionResponse = {
  data?: SubmissionResult;
};

type PollSummary = {
  id: string;
  status: string;
  verdict: string | null;
  passedTests: number;
  totalTests: number;
  createLatencyMs: number;
  firstObservedProcessingMs: number | null;
  completionLatencyMs: number;
};

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const seededProblemId = process.env.VERIFY_PROBLEM_ID ?? '33333333-3333-3333-3333-333333333333';
const submissionsPerUser = Number(process.env.LOAD_TEST_SUBMISSIONS_PER_USER ?? 2);
const pollIntervalMs = Number(process.env.LOAD_TEST_POLL_INTERVAL_MS ?? 1000);
const pollAttempts = Number(process.env.LOAD_TEST_POLL_ATTEMPTS ?? 90);

const users: Credentials[] = [
  { label: 'student1', email: 'student1@codify.com', password: 'Student@123' },
  { label: 'student2', email: 'student2@codify.com', password: 'Student@123' },
  { label: 'student3', email: 'student3@codify.com', password: 'Student@123' }
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function assertString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is missing from response`);
  }
  return value;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  const body = text.length ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}\n${formatJson(body)}`);
  }

  return body as T;
}

async function login(credentials: Credentials) {
  const body = await requestJson<LoginResponse>(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credentials.email, password: credentials.password })
  });

  return assertString(body.accessToken, `${credentials.label} accessToken`);
}

async function createSubmission(accessToken: string, code: string) {
  const startedAt = performance.now();
  const body = await requestJson<CreateSubmissionResponse>(`${apiBaseUrl}/api/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      problemId: seededProblemId,
      language: 'python',
      code
    })
  });

  return {
    id: assertString(body.submissionId, 'submissionId'),
    createLatencyMs: Math.round(performance.now() - startedAt)
  };
}

async function getSubmission(accessToken: string, id: string) {
  return requestJson<SubmissionResponse>(`${apiBaseUrl}/api/submissions/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

function toSubmissionStatus(value: unknown): value is SubmissionStatus {
  return value === 'pending' || value === 'running' || value === 'completed' || value === 'failed';
}

async function pollSubmission(accessToken: string, id: string, createLatencyMs: number): Promise<PollSummary> {
  const startedAt = performance.now();
  let firstObservedProcessingMs: number | null = null;

  for (let attempt = 1; attempt <= pollAttempts; attempt += 1) {
    const response = await getSubmission(accessToken, id);
    const submission = response.data;

    if (!submission) {
      throw new Error(`Submission response missing data for ${id}`);
    }

    const status = submission.status;
    if (!toSubmissionStatus(status)) {
      throw new Error(`Unknown submission status for ${id}: ${String(status)}`);
    }

    if ((status === 'running' || status === 'completed' || status === 'failed') && firstObservedProcessingMs === null) {
      firstObservedProcessingMs = Math.round(performance.now() - startedAt);
    }

    if (status === 'completed' || status === 'failed') {
      return {
        id,
        status,
        verdict: typeof submission.verdict === 'string' ? submission.verdict : null,
        passedTests: typeof submission.passedTests === 'number' ? submission.passedTests : 0,
        totalTests: typeof submission.totalTests === 'number' ? submission.totalTests : 0,
        createLatencyMs,
        firstObservedProcessingMs,
        completionLatencyMs: Math.round(performance.now() - startedAt)
      };
    }

    console.log(`poll ${id}: ${status} (${attempt}/${pollAttempts})`);
    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for submission ${id}`);
}

async function main() {
  console.log('Logging in test users...');
  const tokens = await Promise.all(users.map(async (user) => ({ user, token: await login(user) })));

  const code = [
    'import sys',
    'a, b = map(int, sys.stdin.read().split())',
    'print(a + b)'
  ].join('\n');

  console.log(`Creating ${submissionsPerUser} submissions per user across ${tokens.length} users...`);
  const created = await Promise.all(
    tokens.flatMap(({ token, user }) =>
      Array.from({ length: submissionsPerUser }, async (_, index) => {
        const createdSubmission = await createSubmission(token, code);
        console.log(`created ${createdSubmission.id} for ${user.label} (${index + 1}/${submissionsPerUser})`);
        return {
          user: user.label,
          token,
          ...createdSubmission
        };
      })
    )
  );

  console.log('Polling submissions to completion...');
  const results = await Promise.all(
    created.map((submission) => pollSubmission(submission.token, submission.id, submission.createLatencyMs))
  );

  const summary = {
    total: results.length,
    completed: results.filter((result) => result.status === 'completed').length,
    failed: results.filter((result) => result.status === 'failed').length,
    accepted: results.filter((result) => result.verdict === 'accepted').length,
    averageCreateLatencyMs: Math.round(results.reduce((sum, result) => sum + result.createLatencyMs, 0) / results.length),
    averageFirstProcessingMs: Math.round(
      results.reduce((sum, result) => sum + (result.firstObservedProcessingMs ?? 0), 0) / results.length
    ),
    averageCompletionLatencyMs: Math.round(
      results.reduce((sum, result) => sum + result.completionLatencyMs, 0) / results.length
    ),
    verdicts: results.reduce<Record<string, number>>((acc, result) => {
      const key = result.verdict ?? 'null';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  };

  console.log('Load test summary:');
  console.log(formatJson(summary));

  if (summary.failed > 0) {
    throw new Error(`Load test observed ${summary.failed} failed submissions`);
  }

  if (summary.accepted !== summary.total) {
    throw new Error(`Expected all submissions to be accepted, but only ${summary.accepted}/${summary.total} were accepted`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
