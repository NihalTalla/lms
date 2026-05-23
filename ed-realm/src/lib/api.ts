// Lightweight API client for the frontend.
// Use these helpers for backend-backed data access.

import {
  expireStoredSession,
  getStoredAccessToken,
  refreshAccessToken
} from './auth-session';

const API_BASE = (((import.meta as any).env?.VITE_API_BASE_URL ?? '') as string).replace(/\/$/, '');

function unwrapData<T>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

function buildHeaders(opts: RequestInit, token: string | null) {
  const headers = new Headers(opts.headers);

  if (!headers.has('Content-Type') && opts.body && !(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

export async function authFetch(path: string, opts: RequestInit = {}) {
  const url = path.startsWith('http') ? path : API_BASE + path;
  const token = getStoredAccessToken();

  let res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: buildHeaders(opts, token)
  });

  if (res.status !== 401) {
    return res;
  }

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) {
    return res;
  }

  res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: buildHeaders(opts, refreshedToken)
  });

  if (res.status === 401) {
    expireStoredSession();
  }

  return res;
}

async function request(path: string, opts: RequestInit = {}) {
  const res = await authFetch(path, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Provide a friendlier error for auth issues so frontend can surface a sign-in prompt
    if (res.status === 401) throw new Error(`API ${path} returned 401 Unauthorized`);
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    return unwrapData(json);
  }
  return res.text();
}

export async function getProblems() {
  return request('/api/problems');
}

export async function getProblem(id: string) {
  return request(`/api/problems/${id}`);
}

export async function getSubmission(id: string) {
  return request(`/api/submissions/${id}`);
}

export async function getSubmissions(query = '') {
  return request(`/api/submissions${query}`);
}

export async function getRecoveredSubmissions() {
  return request('/api/submissions/recover');
}

export async function createProblem(payload: unknown) {
  return request('/api/problems', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateProblem(id: string, payload: unknown) {
  return request(`/api/problems/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteProblem(id: string) {
  return request(`/api/problems/${id}`, { method: 'DELETE' });
}

export async function getCourses() {
  return request('/api/courses');
}

export async function getBatches() {
  return request('/api/batches');
}

export async function getUsers() {
  return request('/api/users');
}

export async function getInstitutions() {
  return request('/api/institutions');
}

export async function createUser(payload: unknown) {
  return request('/api/users', { method: 'POST', body: JSON.stringify(payload) });
}

export async function resetUserPassword(id: string, password: string) {
  return request(`/api/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) });
}

export async function updateUserStatus(id: string, isActive: boolean) {
  return request(`/api/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
}

export async function updateUser(id: string, payload: unknown) {
  return request(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function getBatchStudents(batchId: string) {
  return request(`/api/batches/${encodeURIComponent(batchId)}/students`);
}

export async function getAttendanceSessions(batchId?: string) {
  const q = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
  return request(`/api/attendance${q}`);
}

export async function createAttendanceSession(payload: { courseId: string; courseTitle: string; batchId?: string }) {
  return request('/api/attendance', { method: 'POST', body: JSON.stringify(payload) });
}

export async function closeAttendanceSession(id: string) {
  return request(`/api/attendance/${encodeURIComponent(id)}/close`, { method: 'PATCH' });
}

export async function markAttendance(sessionId: string) {
  return request(`/api/attendance/${encodeURIComponent(sessionId)}/mark`, { method: 'POST' });
}

export async function getAnalyticsOverview() {
  return request('/api/analytics/overview');
}

export async function getAnalyticsUsers() {
  return request('/api/analytics/users');
}

export async function getAnalyticsSubmissions() {
  return request('/api/analytics/submissions');
}

export async function createSubmission(payload: unknown) {
  return request('/api/submissions', { method: 'POST', body: JSON.stringify(payload) });
}

export async function startTestAttempt(testId: string) {
  return request(`/api/tests/${encodeURIComponent(testId)}/attempt/start`, { method: 'POST' });
}

export async function getActiveTestAttempt(testId: string) {
  return request(`/api/tests/${encodeURIComponent(testId)}/attempt/active`);
}

export async function submitTestAttempt(testId: string, answers: Record<string, string>) {
  return request(`/api/tests/${encodeURIComponent(testId)}/attempt`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  });
}


export default {
  getProblems,
  getProblem,
  getSubmission,
  createProblem,
  updateProblem,
  deleteProblem,
  getCourses,
  getBatches,
  getUsers,
  getInstitutions,
  createUser,
  resetUserPassword,
  updateUserStatus,
  updateUser,
  getBatchStudents,
  getAnalyticsOverview,
  getAnalyticsUsers,
  getAnalyticsSubmissions,
  createSubmission,
  startTestAttempt,
  getActiveTestAttempt,
  submitTestAttempt,
  getSubmissions,
  getRecoveredSubmissions
};
