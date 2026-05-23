import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './data';
import { createRequestId } from './request-id';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_TOKEN_CHANGED_EVENT,
  clearStoredSession,
  getStoredAccessToken,
  storeAccessToken,
  USER_STORAGE_KEY
} from './auth-session';
import { authFetch } from './api';

interface AuthContextType {
  currentUser: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setRole: (role: 'admin' | 'faculty' | 'trainer' | 'student') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const persistUser = (user: User | null) => {
    setCurrentUser(user);

    if (typeof window === 'undefined') {
      return;
    }
    
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncToken = () => setAccessToken(getStoredAccessToken());
    const handleExpiredSession = () => {
      setAccessToken(null);
      setCurrentUser(null);
    };

    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);

    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    const savedToken = getStoredAccessToken();
    if (!savedUser) {
      if (savedToken) setAccessToken(savedToken);
      return () => {
        window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);
        window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
      };
    }

    try {
      const parsed = JSON.parse(savedUser) as User;
      setCurrentUser(parsed);
      if (savedToken) setAccessToken(savedToken);
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }

    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Call backend auth API
    try {
      const base = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
      const url = base ? `${base}/api/auth/login` : '/api/auth/login';

      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include', // receive refresh cookie
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': createRequestId()
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) return false;

      const body = await res.json();
      const token = typeof body.accessToken === 'string' ? body.accessToken : null;
      const user = body.user as User | undefined;

      if (token) {
        setAccessToken(token);
        storeAccessToken(token);
      }

      if (user) {
        persistUser(user);
      }

      return !!token;
    } catch (err) {
      return false;
    }
  };

  const logout = () => {
    // Inform backend and clear local state
    try {
      authFetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'X-Request-Id': createRequestId()
        }
      });
    } catch {}

    setAccessToken(null);
    clearStoredSession();
    persistUser(null);
  };

  const setRole = (role: 'admin' | 'faculty' | 'trainer' | 'student') => {
    if (!currentUser) return;
    persistUser({ ...currentUser, role });
  };

  return (
    <AuthContext.Provider value={{ currentUser, accessToken, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
