'use client';

import { create } from 'zustand';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: 'citizen' | 'admin';
  province: string | null;
  district: string | null;
}

interface AuthState {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  _initialized: boolean;

  initialize: () => Promise<void>;
  signInWithOtp: (identifier: string) => Promise<void>;
  verifyOtp: (identifier: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  fetchProfile: (userId: string) => Promise<UserProfile | null>;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: false,
  error: null,
  _initialized: false,

  initialize: async () => {
    if (get()._initialized) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      set({ _initialized: true });
      return;
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await get().fetchProfile(session.user.id);
      set({
        session,
        user: profile,
        isAuthenticated: true,
        isAdmin: profile?.role === 'admin',
        _initialized: true,
      });
    } else {
      set({ _initialized: true });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' && newSession?.user) {
        const profile = await get().fetchProfile(newSession.user.id);
        set({
          session: newSession,
          user: profile,
          isAuthenticated: true,
          isAdmin: profile?.role === 'admin',
        });
      } else if (event === 'SIGNED_OUT') {
        set({
          session: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        });
      } else if (event === 'TOKEN_REFRESHED' && newSession) {
        set({ session: newSession });
      }
    });
  },

  signInWithOtp: async (identifier: string) => {
    set({ isLoading: true, error: null });
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      set({ isLoading: false, error: 'Authentication not configured' });
      return;
    }

    try {
      const opts = isEmail(identifier)
        ? { email: identifier }
        : { phone: identifier };

      const { error } = await supabase.auth.signInWithOtp(opts);
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (identifier: string, token: string) => {
    set({ isLoading: true, error: null });
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      set({ isLoading: false, error: 'Authentication not configured' });
      return;
    }

    try {
      const opts = isEmail(identifier)
        ? { email: identifier, token, type: 'email' as const }
        : { phone: identifier, token, type: 'sms' as const };

      const { data, error } = await supabase.auth.verifyOtp(opts);
      if (error) throw error;

      if (data.user) {
        const profile = await get().fetchProfile(data.user.id);
        set({
          session: data.session,
          user: profile,
          isAuthenticated: true,
          isAdmin: profile?.role === 'admin',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid OTP';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Also clear legacy admin cookie
    try {
      await fetch('/api/admin-auth', { method: 'DELETE' });
    } catch { /* ignore */ }

    set({
      session: null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  fetchProfile: async (userId: string): Promise<UserProfile | null> => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, email, phone, role, province, district')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      displayName: data.display_name || '',
      email: data.email,
      phone: data.phone,
      role: data.role,
      province: data.province,
      district: data.district,
    };
  },
}));
