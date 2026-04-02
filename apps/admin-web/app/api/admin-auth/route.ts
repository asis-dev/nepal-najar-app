import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Admin auth API — now delegates to Supabase Auth.
 *
 * POST: Legacy password login is disabled (OTP / Supabase only).
 * DELETE: Sign out — clears Supabase session and legacy cookies.
 */

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Legacy admin password login is disabled. Use OTP sign-in at /admin-login.' },
    { status: 410 },
  );
}

export async function DELETE() {
  // Sign out from Supabase
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch { /* ignore if Supabase not configured */ }

  // Also clear legacy cookie
  const response = NextResponse.json({ success: true });
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
  response.cookies.set('np-admin-token', '', clearOptions);
  response.cookies.set('admin_session', '', clearOptions);
  return response;
}
