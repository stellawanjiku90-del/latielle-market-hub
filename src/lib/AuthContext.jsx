import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { getSession, saveSession, clearSession } from '@/lib/auth';

const AuthContext = createContext(null);

const dashboardFor = (user) => {
  if (user?.role === 'admin') return '/admin';
  if (user?.role === 'seller') return '/seller-dashboard';
  return '/buyer-dashboard';
};

const sessionUser = (user) => ({
  userId: user?.id || user?.userId,
  phone: user?.phone_number || user?.phone || '',
  role: user?.role || 'buyer',
  name: user?.full_name || user?.name || '',
  full_name: user?.full_name || user?.name || '',
  email: user?.email || '',
  profile_picture: user?.profile_picture || '',
});

export const AuthProvider = ({ children }) => {
  const initialSession = getSession();
  const [user, setUser] = useState(initialSession);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialSession));
  const [isLoadingAuth, setIsLoadingAuth] = useState(Boolean(localStorage.getItem('auth_token')));
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(!localStorage.getItem('auth_token'));
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setAuthError(null);
    if (localStorage.getItem('auth_token')) {
      await checkUserAuth();
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await api.auth.me();
      const normalized = sessionUser(currentUser);
      saveSession(normalized);
      setUser(normalized);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      clearSession();
      setUser(null);
      setIsAuthenticated(false);
      if (error?.status === 401 || error?.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Your session has expired. Please sign in again.' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const login = (userData) => {
    const normalized = sessionUser(userData);
    saveSession(normalized);
    setUser(normalized);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
  };

  const updateUser = (updates) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...updates };
      saveSession(next);
      return next;
    });
  };

  const logout = (shouldRedirect = true) => {
    clearSession();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    if (shouldRedirect) window.location.replace('/');
  };

  const navigateToLogin = () => {
    api.auth.redirectToLogin();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      dashboardFor,
      login,
      updateUser,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
