/**
 * Simple phone-based auth session manager.
 * Stores: { userId, phone, role, name, loggedIn: true }
 */

const SESSION_KEY = 'latielle_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.loggedIn ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, loggedIn: true }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function saveReturnUrl(url) {
  localStorage.setItem('returnUrl', url);
}

export function consumeReturnUrl() {
  const url = localStorage.getItem('returnUrl');
  localStorage.removeItem('returnUrl');
  return url;
}

export function redirectToLogin(returnUrl) {
  if (returnUrl) saveReturnUrl(returnUrl);
  window.location.href = '/login';
}