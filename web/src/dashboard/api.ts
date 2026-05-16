const BASE = window.location.origin;

export function getToken(): string | null {
  return sessionStorage.getItem('dashboard_token');
}

export function setToken(t: string): void {
  sessionStorage.setItem('dashboard_token', t);
}

export async function apiFetch(path: string, opts?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

export async function login(secret: string): Promise<string> {
  const r = await fetch(`${BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret }),
  });
  if (!r.ok) throw new Error('Invalid secret');
  const d = await r.json() as { token: string };
  return d.token;
}
