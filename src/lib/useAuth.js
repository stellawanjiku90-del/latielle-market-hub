import { useState, useEffect } from 'react';
import { getSession, saveSession, clearSession } from './auth';

// Global listeners so all hook instances stay in sync
let listeners = [];
function notify() { listeners.forEach(fn => fn()); }

export function useAuth() {
  const [user, setUser] = useState(() => getSession());

  useEffect(() => {
    const refresh = () => setUser(getSession());
    const onStorage = (event) => {
      if (event.key === 'latielle_session' || event.key === 'auth_token' || event.key === null) refresh();
    };
    listeners.push(refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      listeners = listeners.filter(fn => fn !== refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = (userData) => {
    saveSession(userData);
    setUser(getSession());
    notify();
  };

  const logout = () => {
    clearSession();
    setUser(null);
    notify();
    window.location.href = '/';
  };

  const updateUser = (updates) => {
    const current = getSession();
    if (!current) return;
    const updated = { ...current, ...updates };
    saveSession(updated);
    setUser(getSession());
    notify();
  };

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };
}