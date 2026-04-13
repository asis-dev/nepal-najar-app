import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import { getBearerToken } from '@/lib/security/request-auth';

type RequestLike = NextRequest | Request;

export async function getRequestUser(request?: RequestLike) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();

  if (cookieUser) {
    return { supabase, user: cookieUser };
  }

  const bearerToken = request ? getBearerToken(request) : null;
  if (!bearerToken) {
    return { supabase, user: null };
  }

  const {
    data: { user: bearerUser },
  } = await getSupabase().auth.getUser(bearerToken);

  if (!bearerUser) {
    return { supabase, user: null };
  }

  // Create a client with the user's JWT so auth.uid() works for RLS
  const authedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      auth: { persistSession: false },
    },
  );

  return { supabase: authedClient, user: bearerUser };
}
