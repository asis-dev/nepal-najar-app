/**
 * Supabase browser-safe client (anon key — read-only via RLS)
 * Safe to use in client components.
 */
import { createClient } from '@supabase/supabase-js';

export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);
