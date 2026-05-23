import { beforeEach, describe, expect, it, vi } from 'vitest';
import api, { authFetch } from './api';
import { ACCESS_TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './auth-session';

describe('authFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('refreshes the access token and retries protected requests once after a 401', async () => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'expired-token');

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response('expired', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'fresh-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await authFetch('/api/analytics/overview');

    expect(res.ok).toBe(true);
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('fresh-token');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(expect.any(Headers));
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).get('Authorization')).toBe('Bearer expired-token');
    expect((fetchMock.mock.calls[2][1]?.headers as Headers).get('Authorization')).toBe('Bearer fresh-token');
  });

  it('clears persisted identity when refresh cannot recover the session', async () => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'expired-token');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 'u1' }));

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response('expired', { status: 401 }))
      .mockResolvedValueOnce(new Response('invalid refresh', { status: 401 }));

    const res = await authFetch('/api/analytics/users');

    expect(res.status).toBe(401);
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('collapses concurrent dashboard 401s into one refresh and retries each request', async () => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'idle-token');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 'admin-1', role: 'admin' }));

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response('expired overview', { status: 401 }))
      .mockResolvedValueOnce(new Response('expired users', { status: 401 }))
      .mockResolvedValueOnce(new Response('expired submissions', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'dashboard-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ totalUsers: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accepted: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const [overview, users, submissions] = await Promise.all([
      api.getAnalyticsOverview(),
      api.getAnalyticsUsers(),
      api.getAnalyticsSubmissions()
    ]);

    expect(overview).toEqual({ totalUsers: 3 });
    expect(users).toEqual({ items: [] });
    expect(submissions).toEqual({ accepted: 1 });
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('dashboard-token');
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/auth/refresh'))).toHaveLength(1);
    for (const call of fetchMock.mock.calls.slice(4)) {
      expect((call[1]?.headers as Headers).get('Authorization')).toBe('Bearer dashboard-token');
    }
  });

  it('keeps submission polling alive when the token expires mid-poll', async () => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'poll-token');

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 'sub-1', status: 'running' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response('expired poll', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'poll-token-2' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 'sub-1', status: 'completed', verdict: 'accepted' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

    const first = await api.getSubmission('sub-1');
    const second = await api.getSubmission('sub-1');

    expect(first).toEqual({ id: 'sub-1', status: 'running' });
    expect(second).toEqual({ id: 'sub-1', status: 'completed', verdict: 'accepted' });
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('poll-token-2');
    expect((fetchMock.mock.calls[3][1]?.headers as Headers).get('Authorization')).toBe('Bearer poll-token-2');
  });

  it('recovers pending submissions after refreshing and then reconciles final state', async () => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'recovery-token');

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response('expired recovery', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'recovery-token-2' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'sub-2', problemId: 'p-1', status: 'running', language: 'python', createdAt: '2026-05-13T00:00:00.000Z' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 'sub-2', status: 'completed', verdict: 'accepted' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

    const recovered = await api.getRecoveredSubmissions();
    const final = await api.getSubmission(recovered[0].id);

    expect(recovered).toHaveLength(1);
    expect(recovered[0].status).toBe('running');
    expect(final).toEqual({ id: 'sub-2', status: 'completed', verdict: 'accepted' });
    expect((fetchMock.mock.calls[2][1]?.headers as Headers).get('Authorization')).toBe('Bearer recovery-token-2');
  });
});
