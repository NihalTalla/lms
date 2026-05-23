import { describe, expect, it } from 'vitest';
import { getChallengeProblemId, isBackendProblemId, summarizeSubmission } from './coding-challenge-lifecycle';

describe('coding challenge lifecycle helpers', () => {
  it('only treats backend UUIDs as API-submit capable problem IDs', () => {
    expect(isBackendProblemId('challenge-0')).toBe(false);
    expect(isBackendProblemId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(getChallengeProblemId({ id: 'challenge-0' })).toBeNull();
    expect(getChallengeProblemId({ problemId: '550e8400-e29b-41d4-a716-446655440000' })).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('summarizes persisted submission state into challenge score state', () => {
    expect(summarizeSubmission({ status: 'completed', verdict: 'accepted', passedTests: 4, totalTests: 4 }, 2)).toEqual({
      total: 4,
      passed: 4,
      score: 100,
      accepted: true,
      done: true,
      uiState: 'accepted'
    });

    expect(summarizeSubmission({ status: 'completed', verdict: 'wrong_answer', passedTests: 1, totalTests: 3 }, 2)).toMatchObject({
      total: 3,
      passed: 1,
      score: 33,
      accepted: false,
      done: true,
      uiState: 'wrong_answer'
    });
  });

  it('keeps pending challenge reload state non-terminal', () => {
    expect(summarizeSubmission({ status: 'running', passedTests: 0, totalTests: 4 }, 4)).toMatchObject({
      total: 4,
      passed: 0,
      score: 0,
      accepted: false,
      done: false,
      uiState: 'running'
    });
  });

  it('reconciles challenge reload from pending to accepted without changing totals', () => {
    const pending = summarizeSubmission({ id: 'sub-1', status: 'pending', passedTests: 0, totalTests: 5 }, 2);
    const accepted = summarizeSubmission({ id: 'sub-1', status: 'completed', verdict: 'accepted', passedTests: 5, totalTests: 5 }, 2);

    expect(pending).toMatchObject({
      total: 5,
      done: false,
      uiState: 'queued'
    });
    expect(accepted).toMatchObject({
      total: 5,
      passed: 5,
      score: 100,
      done: true,
      uiState: 'accepted'
    });
  });
});
