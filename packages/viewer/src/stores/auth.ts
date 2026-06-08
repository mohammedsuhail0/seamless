// Agent: 🌐 Agent C (Viewer App Auth Store)
// File: packages/viewer/src/stores/auth.ts

import { useState, useEffect } from 'react';
import api from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
}

const GOOGLE_TEMP_SESSION_KEY = 'browsync_google_temp_session';

export function useAuthStore() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [tempGoogleSession, setTempGoogleSession] = useState<{ email: string; tempToken: string } | null>(null);

  // Sync and validate user profile from local cache on start.
  useEffect(() => {
    const hydrateSession = async () => {
      const cachedTemp = sessionStorage.getItem(GOOGLE_TEMP_SESSION_KEY);
      if (cachedTemp) {
        try {
          setTempGoogleSession(JSON.parse(cachedTemp));
        } catch {
          sessionStorage.removeItem(GOOGLE_TEMP_SESSION_KEY);
        }
      }

      const cachedUser = localStorage.getItem('browsync_user');
      const accessToken = localStorage.getItem('browsync_access_token');

      if (!cachedUser || !accessToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(cachedUser);
        const profile = await api.get<UserProfile>('/api/auth/me');
        setUser(profile || parsedUser);
      } catch (err) {
        localStorage.removeItem('browsync_access_token');
        localStorage.removeItem('browsync_refresh_token');
        localStorage.removeItem('browsync_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrateSession();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      
      localStorage.setItem('browsync_access_token', data.accessToken);
      localStorage.setItem('browsync_refresh_token', data.refreshToken);
      localStorage.setItem('browsync_user', JSON.stringify(data.user));

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
      
      localStorage.setItem('browsync_access_token', data.accessToken);
      localStorage.setItem('browsync_refresh_token', data.refreshToken);
      localStorage.setItem('browsync_user', JSON.stringify(data.user));

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
      
      localStorage.setItem('browsync_access_token', data.accessToken);
      localStorage.setItem('browsync_refresh_token', data.refreshToken);
      localStorage.setItem('browsync_user', JSON.stringify(data.user));

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
        localStorage.setItem('browsync_access_token', data.accessToken);
        localStorage.setItem('browsync_refresh_token', data.refreshToken);
        localStorage.setItem('browsync_user', JSON.stringify(data.user));
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
        localStorage.setItem('browsync_access_token', data.accessToken);
        localStorage.setItem('browsync_refresh_token', data.refreshToken);
        localStorage.setItem('browsync_user', JSON.stringify(data.user));
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
    } catch (err) {
      console.warn('⚠️ Server logout failed, clearing local storage anyway');
    } finally {
      localStorage.removeItem('browsync_access_token');
      localStorage.removeItem('browsync_refresh_token');
      localStorage.removeItem('browsync_user');
      sessionStorage.removeItem(GOOGLE_TEMP_SESSION_KEY);
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
