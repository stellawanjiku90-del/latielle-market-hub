/**
 * Custom hook for phone-based authentication.
 * Reads/writes from localStorage. Used throughout the app instead of api.auth.
 */
import { useState, useEffect } from 'react';
import { getPhoneSession, savePhoneSession, clearPhoneSession } from './phoneAuth';

let listeners = [];

function notify() {
  listeners.forEach(fn => fn());
}

export function usePhoneAuth() {
  const [session, setSession] = useState(() => getPhoneSession());

  useEffect(() => {
    const refresh = () => setSession(getPhoneSession());
    listeners.push(refresh);
    return () => {
      listeners = listeners.filter(fn => fn !== refresh);
    };
  }, []);

  const login = (sessionToken, user) => {
    savePhoneSession(sessionToken, user);
    setSession({ sessionToken, user });
    notify();
  };

  const logout = () => {
    clearPhoneSession();
    setSession(null);
    notify();
    window.location.href = '/';
  };

  const updateUser = (updates) => {
    const current = getPhoneSession();
    if (!current) return;
    const updated = { ...current.user, ...updates };
    savePhoneSession(current.sessionToken, updated);
    setSession({ ...current, user: updated });
    notify();
  };

  return {
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
    login,
    logout,
    updateUser,
  };
}