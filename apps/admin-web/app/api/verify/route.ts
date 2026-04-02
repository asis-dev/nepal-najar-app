/**
 * /api/verify — Progress verification by citizens
 *
 * GET  ?promise_id=X  → verification stats (counts of accurate/disputed/partially_true)
 * POST { promise_id, verification, reason }  → submit/update verification (auth required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

export async function GET(req: NextRequest) {
  const promiseId = req.nextUrl.searchParams.get('promise_id');
  if (!promiseId) {
    return NextResponse.json({ error: 'promise_id is required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      accurate: 0,
      disputed: 0,
      partially_true: 0,
      total: 0,
      user_verification: null,
    });
  }

  const db = getSupabase();

  const { data, error } = await db
    .from('progress_verifications')
    .select('verification')
    .eq('promise_id', promiseId);

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ accurate: 0, disputed: 0, partially_true: 0, total: 0, user_verification: null });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const accurate = rows.filter((r) => r.verification === 'accurate').length;
  const disputed = rows.filter((r) => r.verification === 'disputed').length;
  const partially_true = rows.filter((r) => r.verification === 'partially_true').length;

  // Check if the requesting user has already voted
  let user_verification: string | null = null;
  try {
    const supabaseUser = await createSupabaseServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (user) {
      const { data: userVote } = await db
        .from('progress_verifications')
        .select('verification')
        .eq('promise_id', promiseId)
        .eq('user_id', user.id)
        .single();
      user_verification = userVote?.verification ?? null;
    }
  } catch {
    // Not logged in
  }

  return NextResponse.json({
    accurate,
    disputed,
    partially_true,
    total: accurate + disputed + partially_true,
    user_verification,
  });
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  const { success: rateLimitOk } = await rateLimit(`verify:${ip}`, 10, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: {
    promise_id?: string;
    verification?: string;
    reason?: string;
    province?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { promise_id, verification, reason, province } = body;

  if (!promise_id || !verification) {
    return NextResponse.json({ error: 'promise_id and verification are required' }, { status: 400 });
  }

  if (!['accurate', 'disputed', 'partially_true'].includes(verification)) {
    return NextResponse.json({ error: 'verification must be accurate, disputed, or partially_true' }, { status: 400 });
  }

  const db = getSupabase();

  // Upsert — one verification per user per promise
  const { error } = await db
    .from('progress_verifications')
    .upsert(
      {
        user_id: user.id,
        promise_id,
        verification,
        reason: reason?.trim() ?? null,
        province: province ?? null,
      },
      { onConflict: 'user_id,promise_id' }
    );

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Verifications table not yet created', saved: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
