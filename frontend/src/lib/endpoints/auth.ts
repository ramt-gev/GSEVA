import { api } from '../api';
import type { CurrentUser } from '../types';

// login/google responses use `name` (not `full_name`) and omit `dept_id` —
// confirmed against authService.js's issueToken()/authService.login(). Kept
// distinct from CurrentUser (which mirrors /me's shape) rather than forcing
// one type to cover both.
export interface LoginResult {
  token: string;
  user: {
    user_id: string;
    username: string;
    name: string;
    role: CurrentUser['role'];
    module_access: string[];
  };
}

export function login(username: string, password: string) {
  return api<LoginResult>('/api/auth/login', { method: 'POST', body: { username, password } });
}

export function loginWithGoogle(credential: string) {
  return api<LoginResult>('/api/auth/google', { method: 'POST', body: { credential } });
}

export function linkGoogle(credential: string) {
  return api<{ ok: true; google_email: string; google_name: string }>('/api/auth/google/link', {
    method: 'POST',
    body: { credential },
  });
}

export function unlinkGoogle() {
  return api<{ ok: true }>('/api/auth/google/unlink', { method: 'POST' });
}

export async function me(): Promise<CurrentUser> {
  const res = await api<{ data: CurrentUser }>('/api/auth/me');
  return res.data;
}
