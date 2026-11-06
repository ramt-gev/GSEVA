import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getToken, setToken, clearToken, ApiError } from './api';
import * as authApi from './endpoints/auth';
import type { CurrentUser } from './types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Standardizes on the safest of the 3 auth-persistence patterns found across
// the prototypes (localStorage + boot-time /me validation) — used by
// Gate/Canteen/Admin/Dashboard. Shared across all 4 rather than siloed per
// app: simpler, and harmless since these run on physically separate devices.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError) clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password);
    setToken(res.token);
    await refresh();
  }

  async function loginWithGoogle(credential: string) {
    const res = await authApi.loginWithGoogle(credential);
    setToken(res.token);
    await refresh();
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
