/**
 * Supabase browser-safe client (anon key — read-only via RLS)
 * Safe to use in client components.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasPublicSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

let supabasePublic: SupabaseClient | null = null;

if (hasPublicSupabaseConfig) {
  supabasePublic = createClient(supabaseUrl!, supabaseAnonKey!);
}

export { supabasePublic };
