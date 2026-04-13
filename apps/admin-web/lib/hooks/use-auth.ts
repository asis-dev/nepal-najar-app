'use client';

import { create } from 'zustand';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { isElevatedRole, normalizeAppRole, type AppRole } from '@/lib/auth/roles';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: AppRole;
  province: string | null;
  district: string | null;
  avatarUrl?: string | null;
}

interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  country?: string;
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
  patchUserProfile: (patch: Partial<UserProfile>) => void;
}

function buildImmediateProfileFromUser(
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, unknown>;
  },
  fallbackEmail?: string | null,
): UserProfile {
  const meta = user.user_metadata || {};
  const email = user.email || fallbackEmail || null;

  return {
    id: user.id,
    displayName:
      (typeof meta.display_name === 'string' && meta.display_name) ||
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (email ? email.split('@')[0] : 'Citizen'),
    email,
    phone: user.phone || null,
    role: normalizeAppRole(meta.role, 'citizen'),
    province: typeof meta.province === 'string' ? meta.province : null,
    district: typeof meta.district === 'string' ? meta.district : null,
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
  };
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

    // Try browser client session first
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const immediateProfile = buildImmediateProfileFromUser(session.user);
      set({
        session,
        user: immediateProfile,
        isAuthenticated: true,
        isAdmin: immediateProfile.role === 'admin',
        isVerifier: immediateProfile.role === 'verifier' || immediateProfile.role === 'admin',
        isObserver: !isElevatedRole(immediateProfile.role),
        karma: 0,
        level: 1,
        _initialized: true,
      });

      setTimeout(async () => {
        try {
          const [profile, repResult] = await Promise.all([
            get().fetchProfile(session.user.id),
            (async () => {
              try {
                const { data: repData } = await supabase
                  .from('user_reputation')
                  .select('total_karma, level')
                  .eq('user_id', session.user.id)
                  .single();
                return { karma: repData?.total_karma ?? 0, level: repData?.level ?? 1 };
              } catch { return { karma: 0, level: 1 }; }
            })(),
          ]);

          if (profile) {
            set({
              user: profile,
              isAdmin: profile.role === 'admin',
              isVerifier: profile.role === 'verifier' || profile.role === 'admin',
              isObserver: !isElevatedRole(profile.role),
              karma: repResult.karma,
              level: repResult.level,
            });
          } else {
            set({
              karma: repResult.karma,
              level: repResult.level,
            });
          }
        } catch {
          // Immediate profile state is sufficient if enrichment fails.
        }
      }, 0);
    } else {
      // Browser client can't read session (cookie format mismatch).
      // Fall back to server-side API route which reads cookies correctly.
      let serverProfile: UserProfile | null = null;
      try {
        const res = await fetch('/api/me/profile', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const p = json.profile;
          if (p && p.id) {
            serverProfile = {
              id: String(p.id),
              displayName: p.displayName || p.display_name || '',
              email: p.email || null,
              phone: p.phone || null,
              role: normalizeAppRole(p.role, 'citizen'),
              province: p.province || null,
              district: p.district || null,
              avatarUrl: p.avatarUrl || p.avatar_url || null,
            };
          }
        }
      } catch { /* not authenticated */ }

      if (serverProfile) {
        set({
          session: null, // no browser session, but user IS authenticated
          user: serverProfile,
          isAuthenticated: true,
          isAdmin: serverProfile.role === 'admin',
          isVerifier: serverProfile.role === 'verifier' || serverProfile.role === 'admin',
          isObserver: !isElevatedRole(serverProfile.role),
          karma: 0,
          level: 1,
          _initialized: true,
        });
      } else {
        set({ _initialized: true });
      }
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' && newSession?.user) {
        // Skip if signInWithPassword already populated the state
        if (get().isAuthenticated && get().user?.id === newSession.user.id) return;

        const [profile, repResult] = await Promise.all([
          get().fetchProfile(newSession.user.id),
          (async () => {
            try {
              const { data: repData } = await supabase
                .from('user_reputation')
                .select('total_karma, level')
                .eq('user_id', newSession.user!.id)
                .single();
              return { karma: repData?.total_karma ?? 0, level: repData?.level ?? 1 };
            } catch { return { karma: 0, level: 1 }; }
          })(),
        ]);

        set({
          session: newSession,
          user: profile,
          isAuthenticated: true,
          isAdmin: profile?.role === 'admin',
          isVerifier: profile?.role === 'verifier' || profile?.role === 'admin',
          isObserver: profile ? !isElevatedRole(profile.role) : false,
          karma: repResult.karma,
          level: repResult.level,
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
      // Retry once on "lock was stolen" (concurrent session refresh race condition)
      let result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error?.message?.includes('lock')) {
        await new Promise((r) => setTimeout(r, 300));
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      const { data, error } = result;
      if (error) throw error;

      if (data.user) {
        const userId = data.user.id;
        const meta = data.user.user_metadata || {};

        // Build an immediate profile from auth metadata so UI updates INSTANTLY
        // (don't wait for API calls that may fail due to cookie timing)
        const immediateProfile = buildImmediateProfileFromUser(data.user, email);

        // Set state immediately so user sees they're logged in
        set({
          session: data.session,
          user: immediateProfile,
          isAuthenticated: true,
          isAdmin: immediateProfile.role === 'admin',
          isVerifier: immediateProfile.role === 'verifier' || immediateProfile.role === 'admin',
          isObserver: !isElevatedRole(immediateProfile.role),
          karma: 0,
          level: 1,
        });

        // Then fetch the FULL profile from DB in the background (has real role, etc.)
        // Small delay to let cookies propagate
        setTimeout(async () => {
          try {
            const [profile, repResult] = await Promise.all([
              get().fetchProfile(userId),
              (async () => {
                try {
                  const sb = createSupabaseBrowserClient();
                  if (!sb) return { karma: 0, level: 1 };
                  const { data: repData } = await sb
                    .from('user_reputation')
                    .select('total_karma, level')
                    .eq('user_id', userId)
                    .single();
                  return { karma: repData?.total_karma ?? 0, level: repData?.level ?? 1 };
                } catch { return { karma: 0, level: 1 }; }
              })(),
            ]);

            if (profile) {
              set({
                user: profile,
                isAdmin: profile.role === 'admin',
                isVerifier: profile.role === 'verifier' || profile.role === 'admin',
                isObserver: !isElevatedRole(profile.role),
                karma: repResult.karma,
                level: repResult.level,
              });
            }
          } catch { /* immediate profile is good enough */ }
        }, 500);
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
          isObserver: profile ? !isElevatedRole(profile.role) : false,
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

  patchUserProfile: (patch) =>
    set((state) => {
      if (!state.user) return {};
      return {
        user: {
          ...state.user,
          ...patch,
        },
      };
    }),

  fetchProfile: async (userId: string): Promise<UserProfile | null> => {
    // Use API route instead of direct Supabase to avoid RLS/cookie issues
    let data: Record<string, unknown> | null = null;
    try {
      const res = await fetch('/api/me/profile', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        data = json.profile ?? json ?? null;
      }
    } catch { /* fallback below */ }

    // Fallback: try direct Supabase read
    if (!data) {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return null;
      const { data: firstRead } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      data = (firstRead as Record<string, unknown> | null) ?? null;
    }

    if (!data) return null;

    return {
      id: String(data.id),
      displayName: typeof data.display_name === 'string' ? data.display_name : '',
      email: typeof data.email === 'string' ? data.email : null,
      phone: typeof data.phone === 'string' ? data.phone : null,
      role: normalizeAppRole(data.role, 'citizen'),
      province: typeof data.province === 'string' ? data.province : null,
      district: typeof data.district === 'string' ? data.district : null,
      avatarUrl: typeof data.avatar_url === 'string' ? data.avatar_url : null,
    };
  },
}));
