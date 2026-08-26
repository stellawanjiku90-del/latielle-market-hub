/**
 * Custom phone-based auth session manager.
 * Stores the user session in localStorage, independent of Base44 auth.
 */

const SESSION_KEY = 'latielle_phone_session';

export function getPhoneSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}

export function savePhoneSession(sessionToken, user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionToken, user }));
}

export function clearPhoneSession() {
  localStorage.removeItem(SESSION_KEY);
}