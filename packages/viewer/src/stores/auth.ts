// Agent: 🌐 Agent C (Viewer Auth Store)
// File: packages/viewer/src/stores/auth.ts

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export type UserProfile = User;

export interface TempGoogleSession {
  email: string;
  tempToken: string;
}

const GOOGLE_TEMP_SESSION_KEY = 'brosync_google_temp_session';

function storeAuth(data: { accessToken: string; refreshToken: string; user: User }) {
  localStorage.setItem('brosync_access_token', data.accessToken);
  localStorage.setItem('brosync_refresh_token', data.refreshToken);
  localStorage.setItem('brosync_user', JSON.stringify(data.user));
  // Legacy aliases for backwards compatibility
  localStorage.setItem('browsync_access_token', data.accessToken);
  localStorage.setItem('browsync_refresh_token', data.refreshToken);
  localStorage.setItem('browsync_user', JSON.stringify(data.user));
}

function clearAuth() {
  localStorage.removeItem('brosync_access_token');
  localStorage.removeItem('brosync_refresh_token');
  localStorage.removeItem('brosync_user');
  localStorage.removeItem('browsync_access_token');
  localStorage.removeItem('browsync_refresh_token');
  localStorage.removeItem('browsync_user');
  sessionStorage.removeItem(GOOGLE_TEMP_SESSION_KEY);
  sessionStorage.removeItem('browsync_google_temp_session');
}

export function useAuthStore() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tempGoogleSession, setTempGoogleSession] = useState<TempGoogleSession | null>(null);

  useEffect(() => {
    // Check for cached temporary Google OAuth registration payload
    const cachedTemp = sessionStorage.getItem(GOOGLE_TEMP_SESSION_KEY) || sessionStorage.getItem('browsync_google_temp_session');
    if (cachedTemp) {
      try {
        setTempGoogleSession(JSON.parse(cachedTemp));
      } catch {
        sessionStorage.removeItem(GOOGLE_TEMP_SESSION_KEY);
      }
    }

    const cachedUser = localStorage.getItem('brosync_user') || localStorage.getItem('browsync_user');
    const accessToken = localStorage.getItem('brosync_access_token') || localStorage.getItem('browsync_access_token');

    if (!cachedUser || !accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setUser(JSON.parse(cachedUser));
    } catch {
      clearAuth();
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      storeAuth(data);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, displayName: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', { email, displayName, password });
      storeAuth(data);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (email: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/google-login', { email });
      storeAuth(data);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const googleCallback = async (idToken: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/google-callback', { idToken });
      
      if (data.status === 'AUTHENTICATED') {
        storeAuth(data);
        sessionStorage.removeItem(GOOGLE_TEMP_SESSION_KEY);
        setUser(data.user);
        setTempGoogleSession(null);
      } else if (data.status === 'ONBOARDING_REQUIRED') {
        sessionStorage.setItem(GOOGLE_TEMP_SESSION_KEY, JSON.stringify(data.tempSession));
        setTempGoogleSession(data.tempSession);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const googleOnboard = async (username: string, password: string, tempToken: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/google-onboard', { username, password, tempToken });
      
      if (data.status === 'AUTHENTICATED') {
        storeAuth(data);
        sessionStorage.removeItem(GOOGLE_TEMP_SESSION_KEY);
        setUser(data.user);
        setTempGoogleSession(null);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/api/auth/logout');
    } catch (_err) {
      console.warn('⚠️ Server logout failed, clearing local storage anyway');
    } finally {
      clearAuth();
      setUser(null);
      setTempGoogleSession(null);
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    tempGoogleSession,
    isAuthenticated: !!user,
    login,
    register,
    googleLogin,
    googleCallback,
    googleOnboard,
    logout,
  };
}

export const useAuth = useAuthStore;
export default useAuthStore;
