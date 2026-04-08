/**
 * Supabase browser client — cookie-based auth via @supabase/ssr.
 * Safe to use in client components. Handles auth session automatically.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasPublicSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

let _browserClient: SupabaseClient | null = null;

/** Get the singleton browser Supabase client (cookie-based auth) */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (!hasPublicSupabaseConfig) return null;
  if (_browserClient) return _browserClient;
  _browserClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  return _browserClient;
}

/** Backwards-compatible alias used by older client components. */
export const getSupabaseBrowser = createSupabaseBrowserClient;

/**
 * Backwards-compatible export — used by hooks that read public data.
 * Uses the SAME singleton to avoid "lock was stolen" race conditions.
 */
export const supabasePublic: SupabaseClient | null = hasPublicSupabaseConfig
  ? createSupabaseBrowserClient()
  : null;
