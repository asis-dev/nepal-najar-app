import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getBearerToken, secretsEqual } from '@/lib/security/request-auth';
import { isOwnerUser } from '@/lib/auth/owner';

const ADMIN_COOKIE_NAMES = ['admin_session', 'np-admin-token'] as const;

function getLegacyCookieToken(request: Request | NextRequest): string | null {
  if (!('cookies' in request) || !request.cookies) return null;
  for (const cookieName of ADMIN_COOKIE_NAMES) {
    const value = request.cookies.get(cookieName)?.value;
    if (value) return value;
  }
  return null;
}

async function hasAdminSupabaseSession(): Promise<boolean> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return false;
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return false;
    }

    if (profile?.role !== 'admin') {
      return false;
    }

    return isOwnerUser({ id: user.id, email: user.email || profile.email });
  } catch {
    return false;
  }
}

function hasLegacyAdminSecret(request: Request | NextRequest): boolean {
  // Legacy fallback remains available only when explicitly enabled.
  if (process.env.ENABLE_LEGACY_ADMIN_SECRET !== 'true') return false;

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;

  const bearer = getBearerToken(request);
  if (secretsEqual(bearer, adminSecret)) {
    return true;
  }

  const cookieToken = getLegacyCookieToken(request);
  return secretsEqual(cookieToken, adminSecret);
}

export async function isAdminAuthed(request: Request | NextRequest): Promise<boolean> {
  if (await hasAdminSupabaseSession()) {
    return true;
  }

  return hasLegacyAdminSecret(request);
}
