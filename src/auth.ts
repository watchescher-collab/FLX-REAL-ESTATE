const SESSION_KEY = 'flx_session_token';

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  profile_picture?: string;
  client_category?: string;
  approval_status?: string;
};

export async function signIn(identifier: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: identifier, phone: identifier, username: identifier, identifier, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  const payload = await response.json();
  if (payload.token) localStorage.setItem(SESSION_KEY, payload.token);
  return payload.user as SessionUser;
}

export async function registerUser(name: string, email: string, password: string, role = 'Client', clientCategory = '', phone = '', username = '') {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, username, password, role, client_category: clientCategory }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(error.error || 'Registration failed');
  }

  const payload = await response.json();
  if (payload.token) localStorage.setItem(SESSION_KEY, payload.token);
  return { ...(payload.user as SessionUser), pending_approval: Boolean(payload.pending_approval), message: payload.message as string | undefined };
}

export async function updateProfile(input: { name: string; email: string; phone: string; picture?: string }) {
  const response = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}` },
    body: JSON.stringify({ ...input, profile_picture: input.picture }),
  });
  const payload = await response.json().catch(() => ({ error: 'Profile update failed.' }));
  if (!response.ok) throw new Error(payload.error || 'Profile update failed.');
  return payload.user as SessionUser;
}

export function getStoredToken() {
  return localStorage.getItem(SESSION_KEY) || '';
}

export function signOut() {
  const token = getStoredToken();
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    }).catch(() => undefined);
  }

  localStorage.removeItem(SESSION_KEY);
}

export async function fetchSessionUser(): Promise<SessionUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  const response = await fetch('/api/auth/session', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    signOut();
    return null;
  }

  const payload = await response.json();
  return payload.user as SessionUser | null;
}
