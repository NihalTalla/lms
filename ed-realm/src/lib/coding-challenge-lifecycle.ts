import { normalizeSubmissionLifecycle } from './submission-lifecycle';

export type SubmissionLike = {
  id?: string;
  status?: string;
  verdict?: string | null;
  passedTests?: number | null;
  totalTests?: number | null;
  execTimeMs?: number | null;
  stderr?: string | null;
  stdout?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBackendProblemId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function getChallengeProblemId(challenge: unknown): string | null {
  if (!challenge || typeof challenge !== 'object') return null;

  const record = challenge as Record<string, unknown>;
  const candidate = record.problemId ?? record.id;
  return isBackendProblemId(candidate) ? candidate : null;
}

export function summarizeSubmission(submission: SubmissionLike, fallbackTotal: number) {
  const lifecycle = normalizeSubmissionLifecycle(submission);
  const total = typeof submission.totalTests === 'number' && submission.totalTests > 0
    ? submission.totalTests
    : Math.max(fallbackTotal, 1);

  const passed = typeof submission.passedTests === 'number'
    ? Math.max(0, Math.min(submission.passedTests, total))
    : submission.verdict === 'accepted'
      ? total
      : 0;

  return {
    total,
    passed,
    score: Math.round((passed / total) * 100),
    accepted: lifecycle.isAccepted,
    done: lifecycle.isTerminal,
    uiState: lifecycle.uiState
  };
}
