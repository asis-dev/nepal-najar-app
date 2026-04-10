import type { NextRequest } from 'next/server';
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

  return { supabase, user: bearerUser ?? null };
}
