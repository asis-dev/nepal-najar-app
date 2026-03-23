'use client';

import { create } from 'zustand';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: 'citizen' | 'observer' | 'verifier' | 'admin';
  province: string | null;
  district: string | null;
}

interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  province?: string;
  district?: string;
}

interface AuthState {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVerifier: boolean;
  isObserver: boolean;
  karma: number | null;
  level: number | null;
  isLoading: boolean;
  error: string | null;
  _initialized: boolean;

  initialize: () => Promise<void>;
  signInWithOtp: (identifier: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (data: SignUpData) => Promise<{ needsVerification: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
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
  isVerifier: false,
  isObserver: false,
  karma: null,
  level: null,
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

      // Fetch reputation data
      let karma = 0;
      let level = 1;
      try {
        const { data: repData } = await supabase
          .from('user_reputation')
          .select('total_karma, level')
          .eq('user_id', session.user.id)
          .single();
        if (repData) {
          karma = repData.total_karma ?? 0;
          level = repData.level ?? 1;
        }
      } catch { /* no reputation row — use defaults */ }

      set({
        session,
        user: profile,
        isAuthenticated: true,
        isAdmin: profile?.role === 'admin',
        isVerifier: profile?.role === 'verifier' || profile?.role === 'admin',
        isObserver: profile?.role === 'observer' || profile?.role === 'citizen',
        karma,
        level,
        _initialized: true,
      });
    } else {
      set({ _initialized: true });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' && newSession?.user) {
        const profile = await get().fetchProfile(newSession.user.id);

        // Fetch reputation data
        let karma = 0;
        let level = 1;
        try {
          const { data: repData } = await supabase
            .from('user_reputation')
            .select('total_karma, level')
            .eq('user_id', newSession.user.id)
            .single();
          if (repData) {
            karma = repData.total_karma ?? 0;
            level = repData.level ?? 1;
          }
        } catch { /* no reputation row — use defaults */ }

        set({
          session: newSession,
          user: profile,
          isAuthenticated: true,
          isAdmin: profile?.role === 'admin',
          isVerifier: profile?.role === 'verifier' || profile?.role === 'admin',
          isObserver: profile?.role === 'observer' || profile?.role === 'citizen',
          karma,
          level,
        });
      } else if (event === 'SIGNED_OUT') {
        set({
          session: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          isVerifier: false,
          isObserver: false,
          karma: null,
          level: null,
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

  signInWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      set({ isLoading: false, error: 'Authentication not configured' });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const profile = await get().fetchProfile(data.user.id);

        // Fetch reputation data
        let karma = 0;
        let level = 1;
        try {
          const sb = createSupabaseBrowserClient();
          if (sb) {
            const { data: repData } = await sb
              .from('user_reputation')
              .select('total_karma, level')
              .eq('user_id', data.user.id)
              .single();
            if (repData) {
              karma = repData.total_karma ?? 0;
              level = repData.level ?? 1;
            }
          }
        } catch { /* no reputation row — use defaults */ }

        set({
          session: data.session,
          user: profile,
          isAuthenticated: true,
          isAdmin: profile?.role === 'admin',
          isVerifier: profile?.role === 'verifier' || profile?.role === 'admin',
          isObserver: profile?.role === 'observer' || profile?.role === 'citizen',
          karma,
          level,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithPassword: async (data: SignUpData) => {
    set({ isLoading: true, error: null });
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      set({ isLoading: false, error: 'Authentication not configured' });
      return { needsVerification: false };
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;

      // Try to update the profile with province/district if user was created
      if (authData.user) {
        try {
          await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              display_name: data.displayName,
              email: data.email,
              province: data.province || null,
              district: data.district || null,
            }, { onConflict: 'id' });
        } catch {
          // profiles table might not exist yet — ignore
        }
      }

      // If identities is empty, user already exists
      const needsVerification = !!(authData.user && authData.user.identities && authData.user.identities.length > 0);

      return { needsVerification };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      set({ isLoading: false, error: 'Authentication not configured' });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updatePassword: async (newPassword: string) => {
    set({ isLoading: true, error: null });
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      set({ isLoading: false, error: 'Authentication not configured' });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
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

        // Fetch reputation data
        let karma = 0;
        let level = 1;
        try {
          const sb = createSupabaseBrowserClient();
          if (sb) {
            const { data: repData } = await sb
              .from('user_reputation')
              .select('total_karma, level')
              .eq('user_id', data.user.id)
              .single();
            if (repData) {
              karma = repData.total_karma ?? 0;
              level = repData.level ?? 1;
            }
          }
        } catch { /* no reputation row — use defaults */ }

        set({
          session: data.session,
          user: profile,
          isAuthenticated: true,
          isAdmin: profile?.role === 'admin',
          isVerifier: profile?.role === 'verifier' || profile?.role === 'admin',
          isObserver: profile?.role === 'observer' || profile?.role === 'citizen',
          karma,
          level,
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
      isVerifier: false,
      isObserver: false,
      karma: null,
      level: null,
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
