import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SubmissionLifecycleManager, SubmissionLifecycleEvent } from './submission-lifecycle-manager';

const ACTIVE_STORAGE_KEY = 'codify_active_submissions';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('SubmissionLifecycleManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dedupes concurrent polling for the same submission', async () => {
    const response = deferred<unknown>();
    const client = {
      getSubmission: vi.fn(() => response.promise),
      getRecoveredSubmissions: vi.fn()
    };
    const manager = new SubmissionLifecycleManager(client);

    const first = manager.pollSubmission('sub-1');
    const second = manager.pollSubmission('sub-1');

    response.resolve({ id: 'sub-1', status: 'completed', verdict: 'accepted' });

    await expect(first).resolves.toMatchObject({ id: 'sub-1', verdict: 'accepted' });
    await expect(second).resolves.toMatchObject({ id: 'sub-1', verdict: 'accepted' });
    expect(client.getSubmission).toHaveBeenCalledTimes(1);
  });

  it('emits discovered and terminal events during recovery orchestration', async () => {
    const client = {
      getRecoveredSubmissions: vi.fn().mockResolvedValue({
        data: [{ id: 'sub-2', problemId: 'problem-1', status: 'running', language: 'python', createdAt: 'now' }]
      }),
      getSubmission: vi.fn().mockResolvedValue({
        data: { id: 'sub-2', problemId: 'problem-1', status: 'completed', verdict: 'wrong_answer' }
      })
    };
    const manager = new SubmissionLifecycleManager(client);
    const events: SubmissionLifecycleEvent[] = [];
    manager.subscribe((event) => events.push(event));

    const recovered = await manager.recover({ problemId: 'problem-1' });
    await Promise.resolve();

    expect(recovered).toHaveLength(1);
    expect(events.map((event) => event.type)).toContain('discovered');
    expect(events.map((event) => event.type)).toContain('terminal');
    expect(manager.getActiveSubmissions()).toHaveLength(0);
  });

  it('filters recovered submissions by problem before polling', async () => {
    const client = {
      getRecoveredSubmissions: vi.fn().mockResolvedValue({
        data: [
          { id: 'sub-3', problemId: 'problem-1', status: 'running' },
          { id: 'sub-4', problemId: 'problem-2', status: 'running' }
        ]
      }),
      getSubmission: vi.fn().mockResolvedValue({
        data: { id: 'sub-3', problemId: 'problem-1', status: 'completed', verdict: 'accepted' }
      })
    };
    const manager = new SubmissionLifecycleManager(client);

    const recovered = await manager.recover({ problemId: 'problem-1' });
    await Promise.resolve();

    expect(recovered.map((submission) => submission.id)).toEqual(['sub-3']);
    expect(client.getSubmission).toHaveBeenCalledWith('sub-3');
    expect(client.getSubmission).not.toHaveBeenCalledWith('sub-4');
  });

  it('persists only minimal non-terminal submission metadata and removes terminal entries', () => {
    const client = {
      getSubmission: vi.fn(),
      getRecoveredSubmissions: vi.fn()
    };
    const manager = new SubmissionLifecycleManager(client);

    manager.register({
      id: 'sub-5',
      problemId: 'problem-1',
      status: 'running',
      verdict: null,
      code: 'do not persist full code',
      stdout: 'do not persist output',
      createdAt: '2026-05-13T00:00:00.000Z'
    });

    expect(JSON.parse(localStorage.getItem(ACTIVE_STORAGE_KEY) ?? '[]')).toEqual([
      {
        id: 'sub-5',
        problemId: 'problem-1',
        createdAt: '2026-05-13T00:00:00.000Z',
        lastKnownState: 'running'
      }
    ]);

    manager.register({
      id: 'sub-5',
      problemId: 'problem-1',
      status: 'completed',
      verdict: 'accepted'
    });

    expect(localStorage.getItem(ACTIVE_STORAGE_KEY)).toBeNull();
  });

  it('restores persisted active submissions through backend hydration before polling', async () => {
    localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify([
      { id: 'sub-6', problemId: 'problem-1', createdAt: 'now', lastKnownState: 'queued' }
    ]));

    const client = {
      getRecoveredSubmissions: vi.fn(),
      getSubmission: vi.fn()
        .mockResolvedValueOnce({ data: { id: 'sub-6', problemId: 'problem-1', status: 'running', createdAt: 'now' } })
        .mockResolvedValueOnce({ data: { id: 'sub-6', problemId: 'problem-1', status: 'completed', verdict: 'accepted', createdAt: 'now' } })
    };
    const manager = new SubmissionLifecycleManager(client);
    const events: SubmissionLifecycleEvent[] = [];
    manager.subscribe((event) => events.push(event));

    const restored = await manager.restorePersisted({ problemId: 'problem-1' });
    await Promise.resolve();

    expect(restored).toHaveLength(1);
    expect(events.map((event) => event.type)).toContain('discovered');
    expect(events.map((event) => event.type)).toContain('terminal');
    expect(localStorage.getItem(ACTIVE_STORAGE_KEY)).toBeNull();
  });

  it('removes stale persisted entries when backend hydration fails', async () => {
    localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify([
      { id: 'sub-stale', problemId: 'problem-1', lastKnownState: 'running' }
    ]));

    const client = {
      getRecoveredSubmissions: vi.fn(),
      getSubmission: vi.fn().mockRejectedValue(new Error('not found'))
    };
    const manager = new SubmissionLifecycleManager(client);

    const restored = await manager.restorePersisted();

    expect(restored).toEqual([]);
    expect(localStorage.getItem(ACTIVE_STORAGE_KEY)).toBeNull();
  });

  it('coordinates polling ownership across tabs and resolves followers from lifecycle events', async () => {
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

    const ownerResponse = deferred<unknown>();
    const ownerClient = {
      getRecoveredSubmissions: vi.fn(),
      getSubmission: vi.fn(() => ownerResponse.promise)
    };
    const followerClient = {
      getRecoveredSubmissions: vi.fn(),
      getSubmission: vi.fn()
    };

    const owner = new SubmissionLifecycleManager(ownerClient, {
      tabId: 'tab-owner',
      channelName: 'test-submissions',
      ownershipTtlMs: 10_000
    });
    const follower = new SubmissionLifecycleManager(followerClient, {
      tabId: 'tab-follower',
      channelName: 'test-submissions',
      ownershipTtlMs: 10_000
    });

    const ownerPoll = owner.pollSubmission('sub-7', { intervalMs: 1, maxAttempts: 1 });
    const followerPoll = follower.pollSubmission('sub-7', { intervalMs: 1, maxAttempts: 20 });

    ownerResponse.resolve({ id: 'sub-7', problemId: 'problem-1', status: 'completed', verdict: 'accepted' });

    await expect(ownerPoll).resolves.toMatchObject({ id: 'sub-7', verdict: 'accepted' });
    await expect(followerPoll).resolves.toMatchObject({ id: 'sub-7', verdict: 'accepted' });
    expect(ownerClient.getSubmission).toHaveBeenCalledTimes(1);
    expect(followerClient.getSubmission).not.toHaveBeenCalled();
  });
});

class FakeBroadcastChannel {
  static channels = new Map<string, Set<FakeBroadcastChannel>>();
  onmessage: ((message: { data: unknown }) => void) | null = null;

  constructor(public readonly name: string) {
    const existing = FakeBroadcastChannel.channels.get(name) ?? new Set<FakeBroadcastChannel>();
    existing.add(this);
    FakeBroadcastChannel.channels.set(name, existing);
  }

  postMessage(data: unknown) {
    for (const channel of FakeBroadcastChannel.channels.get(this.name) ?? []) {
      if (channel === this) continue;
      setTimeout(() => channel.onmessage?.({ data }), 0);
    }
  }

  close() {
    FakeBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}
