import { describe, expect, it } from 'vitest';
import { normalizeSubmissionLifecycle } from './submission-lifecycle';

describe('submission lifecycle normalization', () => {
  it('maps backend execution status into canonical UI states', () => {
    expect(normalizeSubmissionLifecycle({ status: 'pending' })).toMatchObject({
      uiState: 'queued',
      isTerminal: false
    });

    expect(normalizeSubmissionLifecycle({ status: 'running' })).toMatchObject({
      uiState: 'running',
      isTerminal: false
    });
  });

  it('uses backend verdicts as terminal UI states when completed', () => {
    expect(normalizeSubmissionLifecycle({ status: 'completed', verdict: 'accepted' })).toMatchObject({
      uiState: 'accepted',
      isAccepted: true,
      isTerminal: true
    });

    expect(normalizeSubmissionLifecycle({ status: 'completed', verdict: 'time_limit_exceeded' })).toMatchObject({
      uiState: 'time_limit_exceeded',
      isAccepted: false,
      isTerminal: true
    });
  });

  it('fails closed for invalid or failed lifecycle state', () => {
    expect(normalizeSubmissionLifecycle({ status: 'completed', verdict: 'timeout' })).toMatchObject({
      uiState: 'failed',
      isTerminal: true
    });

    expect(normalizeSubmissionLifecycle({ status: 'failed' })).toMatchObject({
      uiState: 'failed',
      isTerminal: true
    });
  });
});
