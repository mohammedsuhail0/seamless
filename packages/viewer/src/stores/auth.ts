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

export function useAuthStore() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync user profile from local cache on start
  useEffect(() => {
    const cachedUser = localStorage.getItem('browsync_user');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
    }
    setLoading(false);
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
      setUser(null);
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    googleLogin,
    logout,
  };
}
