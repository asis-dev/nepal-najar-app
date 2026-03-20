import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Admin auth API — now delegates to Supabase Auth.
 *
 * POST: Legacy password login (kept for backwards compatibility).
 * DELETE: Sign out — clears both Supabase session and legacy cookie.
 */

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Legacy: ADMIN_SECRET password check (backwards compat)
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json(
        { error: 'Admin access not configured. Use OTP login instead.' },
        { status: 503 }
      );
    }

    if (!password || password !== adminSecret) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('np-admin-token', adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE() {
  // Sign out from Supabase
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch { /* ignore if Supabase not configured */ }

  // Also clear legacy cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set('np-admin-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
