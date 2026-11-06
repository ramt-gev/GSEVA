// Thin fetch wrapper — mirrors frontend-admin/src/lib/api.ts's proven pattern
// (auto Bearer-token attach, typed ApiError, 401 clears token). Deliberately
// does NOT unwrap response envelopes: backend-mysql's ~48 endpoints return
// genuinely different shapes ({data}, flat, {success,...}, {data,total},
// bare arrays) — each src/lib/endpoints/*.ts wrapper knows its own endpoint's
// real shape instead of guessing at one generic convention.
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

// Distinct from frontend-admin's `gev_admin_token` key so the two apps can
// never clobber each other's session if ever hosted under the same origin.
const TOKEN_KEY = 'gev_icms_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body,
  });

  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(res.status, message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// Absolute URL for endpoints consumed directly by the browser (img src,
// window.open, <a href>) rather than through api() — QR PNGs, PDF passes,
// the police report download.
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// Builds a query string from a plain object, skipping undefined/null/''
// values so optional filters don't show up as literal "?foo=undefined".
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
