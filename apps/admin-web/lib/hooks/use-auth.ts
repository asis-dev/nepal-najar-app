'use client';

import { create } from 'zustand';
import { api } from '../api';

interface User {
  id: string;
  displayName: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  permissions?: string[];
  govtUnit?: string;
  language?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Legacy — kept for backwards compat
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;

  // New OTP-based auth methods
  requestOtp: (identifier: string) => Promise<{ message: string; expiresIn: number; devOtp?: string }>;
  verifyOtp: (identifier: string, otp: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('nepal_progress_token') : null,
  user: getStoredValue<User | null>('nepal_progress_user', null),
  isAuthenticated:
    typeof window !== 'undefined' && !!localStorage.getItem('nepal_progress_token'),
  isLoading: false,
  error: null,

  login: (token: string, user: User) => {
    localStorage.setItem('nepal_progress_token', token);
    localStorage.setItem('nepal_progress_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true, error: null });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — we clear local state regardless
    }
    localStorage.removeItem('nepal_progress_token');
    localStorage.removeItem('nepal_progress_refresh_token');
    localStorage.removeItem('nepal_progress_user');
    set({ token: null, user: null, isAuthenticated: false, error: null });
    window.location.href = '/login';
  },

  updateUser: (updates: Partial<User>) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...updates } : null;
      if (updated) {
        localStorage.setItem('nepal_progress_user', JSON.stringify(updated));
      }
      return { user: updated };
    });
  },

  requestOtp: async (identifier: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/request-otp', { identifier });
      return {
        message: data.message,
        expiresIn: data.expires_in,
        devOtp: data.dev_otp, // only present when NODE_ENV !== 'production'
      };
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Failed to send OTP';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (identifier: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/verify-otp', { identifier, otp });
      // API returns snake_case keys
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      const user = data.user;

      // Normalise: keep `name` field populated for backwards compat
      const normalisedUser: User = {
        ...user,
        name: user.displayName || user.name || '',
      };

      localStorage.setItem('nepal_progress_token', accessToken);
      localStorage.setItem('nepal_progress_refresh_token', refreshToken);
      localStorage.setItem('nepal_progress_user', JSON.stringify(normalisedUser));

      set({
        token: accessToken,
        user: normalisedUser,
        isAuthenticated: true,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Invalid OTP';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshToken: async () => {
    const refreshTok = localStorage.getItem('nepal_progress_refresh_token');
    if (!refreshTok) {
      get().logout();
      return;
    }
    try {
      const { data } = await api.post('/auth/refresh', {
        refresh_token: refreshTok,
      });
      const newToken = data.access_token;
      localStorage.setItem('nepal_progress_token', newToken);
      set({ token: newToken });
    } catch {
      get().logout();
    }
  },

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/auth/me');
      const normalisedUser: User = {
        ...data,
        name: data.displayName || data.name || '',
      };
      localStorage.setItem('nepal_progress_user', JSON.stringify(normalisedUser));
      set({ user: normalisedUser, isAuthenticated: true });
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch profile';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
