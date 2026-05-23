export const SUBMISSION_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export const SUBMISSION_VERDICTS = [
  'accepted',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'runtime_error',
  'compilation_error'
] as const;

export const UI_SUBMISSION_STATES = [
  'queued',
  'running',
  'accepted',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'runtime_error',
  'compilation_error',
  'failed'
] as const;

export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];
export type SubmissionVerdict = typeof SUBMISSION_VERDICTS[number];
export type UiSubmissionState = typeof UI_SUBMISSION_STATES[number];

export type SubmissionLifecycleInput = {
  status?: string | null;
  verdict?: string | null;
};

export type NormalizedSubmissionLifecycle = {
  backendStatus: SubmissionStatus | null;
  verdict: SubmissionVerdict | null;
  uiState: UiSubmissionState;
  isTerminal: boolean;
  isAccepted: boolean;
};

export function normalizeSubmissionLifecycle(input: SubmissionLifecycleInput): NormalizedSubmissionLifecycle {
  const backendStatus = isSubmissionStatus(input.status) ? input.status : null;
  const verdict = isSubmissionVerdict(input.verdict) ? input.verdict : null;

  if (backendStatus === 'pending') {
    return lifecycle(backendStatus, verdict, 'queued');
  }

  if (backendStatus === 'running') {
    return lifecycle(backendStatus, verdict, 'running');
  }

  if (backendStatus === 'completed') {
    return lifecycle(backendStatus, verdict, verdict ?? 'failed');
  }

  return lifecycle(backendStatus, verdict, 'failed');
}

export function isSubmissionTerminal(input: SubmissionLifecycleInput) {
  return normalizeSubmissionLifecycle(input).isTerminal;
}

function lifecycle(
  backendStatus: SubmissionStatus | null,
  verdict: SubmissionVerdict | null,
  uiState: UiSubmissionState
): NormalizedSubmissionLifecycle {
  return {
    backendStatus,
    verdict,
    uiState,
    isTerminal: uiState !== 'queued' && uiState !== 'running',
    isAccepted: uiState === 'accepted'
  };
}

function isSubmissionStatus(value: unknown): value is SubmissionStatus {
  return typeof value === 'string' && (SUBMISSION_STATUSES as readonly string[]).includes(value);
}

function isSubmissionVerdict(value: unknown): value is SubmissionVerdict {
  return typeof value === 'string' && (SUBMISSION_VERDICTS as readonly string[]).includes(value);
}
