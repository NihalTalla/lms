export const USER_STORAGE_KEY = 'codify_user';
export const ACCESS_TOKEN_STORAGE_KEY = 'codify_access_token';

export const AUTH_TOKEN_CHANGED_EVENT = 'codify-auth-token-changed';
export const AUTH_SESSION_EXPIRED_EVENT = 'codify-auth-session-expired';

type RefreshResult = {
  accessToken?: string;
};

let refreshPromise: Promise<string | null> | null = null;

function getApiBase() {
  return ((import.meta as any).env?.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

function emit(name: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(name));
}

export function getStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function storeAccessToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  emit(AUTH_TOKEN_CHANGED_EVENT);
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  emit(AUTH_TOKEN_CHANGED_EVENT);
}

export function expireStoredSession() {
  clearStoredSession();
  emit(AUTH_SESSION_EXPIRED_EVENT);
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch(`${getApiBase()}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      expireStoredSession();
      return null;
    }

    const body = (await res.json().catch(() => ({}))) as RefreshResult;
    const token = typeof body.accessToken === 'string' ? body.accessToken : null;
    if (!token) {
      expireStoredSession();
      return null;
    }

    storeAccessToken(token);
    return token;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
