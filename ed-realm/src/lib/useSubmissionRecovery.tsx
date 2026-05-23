import { useEffect } from 'react';
import { useAuth } from './auth-context';
import { submissionLifecycleManager } from './submission-lifecycle-manager';

type SubmissionSummary = {
  id: string;
  problemId: string;
  status: string;
  language: string;
  createdAt: string;
};

export function useSubmissionRecovery(options?: {
  problemId?: string;
  pollIntervalMs?: number;
  onDiscovered?: (s: SubmissionSummary) => void;
  onUpdated?: (s: any) => void;
}) {
  const { accessToken } = useAuth();
  const pollInterval = options?.pollIntervalMs ?? 2000;

  useEffect(() => {
    if (!accessToken) return;
    if (options && Object.prototype.hasOwnProperty.call(options, 'problemId') && !options.problemId) return;

    const unsubscribe = submissionLifecycleManager.subscribe((event) => {
      if (options?.problemId && event.submission?.problemId !== options.problemId) {
        return;
      }

      if (event.type === 'discovered' && event.submission) {
        options?.onDiscovered?.(event.submission as SubmissionSummary);
      }

      if ((event.type === 'updated' || event.type === 'terminal') && event.submission) {
        options?.onUpdated?.(event.submission);
      }
    });

    const recoveryOptions = {
      problemId: options?.problemId,
      intervalMs: pollInterval
    };

    void submissionLifecycleManager.restorePersisted(recoveryOptions)
      .catch(() => {
        // Warm continuity is best-effort; backend recovery remains authoritative.
      })
      .finally(() => {
        void submissionLifecycleManager.recover(recoveryOptions).catch(() => {
          // Recovery is best-effort; authFetch handles invalid-session cleanup.
        });
      });

    return unsubscribe;
  }, [accessToken, options?.problemId, pollInterval]);
}

export default useSubmissionRecovery;
