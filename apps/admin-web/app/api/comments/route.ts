import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

/**
 * GET /api/comments?promise_id=X
 * Returns approved comments joined with profiles for display_name.
 * If the requesting user is logged in, also includes their own unapproved comments.
 */
export async function GET(req: NextRequest) {
  const promiseId = req.nextUrl.searchParams.get('promise_id');
  if (!promiseId) {
    return NextResponse.json({ error: 'promise_id is required' }, { status: 400 });
  }

  const db = getSupabase();

  // Flatten profile join helper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const format = (rows: any[]) =>
    rows.map((c) => ({
      id: c.id,
      promise_id: c.promise_id,
      user_id: c.user_id,
      content: c.content,
      is_approved: c.is_approved,
      created_at: c.created_at,
      display_name: (c.profiles as unknown as { display_name: string })?.display_name ?? 'Anonymous',
    }));

  // Admin mode: fetch ALL pending comments across all promises
  if (promiseId === '_all_pending') {
    try {
      const supabaseUser = await createSupabaseServerClient();
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { data: allPending, error: pendingErr } = await db
        .from('comments')
        .select('id, promise_id, user_id, content, is_approved, created_at, profiles(display_name)')
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (pendingErr) {
        return NextResponse.json({ error: pendingErr.message }, { status: 500 });
      }

      return NextResponse.json({
        comments: [],
        pending: format(allPending ?? []),
      });
    } catch {
      return NextResponse.json({ error: 'Failed to fetch pending comments' }, { status: 500 });
    }
  }

  // Normal mode: fetch approved comments for a specific promise
  const { data: approved, error: approvedErr } = await db
    .from('comments')
    .select('id, promise_id, user_id, content, is_approved, created_at, profiles(display_name)')
    .eq('promise_id', promiseId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (approvedErr) {
    return NextResponse.json({ error: approvedErr.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userPending: any[] = [];

  // If user is logged in, include their own unapproved comments
  try {
    const supabaseUser = await createSupabaseServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (user) {
      const { data: pending } = await db
        .from('comments')
        .select('id, promise_id, user_id, content, is_approved, created_at, profiles(display_name)')
        .eq('promise_id', promiseId)
        .eq('user_id', user.id)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      userPending = pending ?? [];
    }
  } catch {
    // Not logged in — fine, just return approved comments
  }

  return NextResponse.json({
    comments: format(approved ?? []),
    pending: format(userPending),
  });
}

/**
 * POST /api/comments
 * Create a new comment (requires auth). Comments start as unapproved.
 * Body: { promise_id: string, content: string }
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10/min per IP
  const ip = getClientIp(req);
  const { success: rateLimitOk } = await rateLimit(`comments:${ip}`, 10, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } }
    );
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json();
  const { promise_id, content } = body;

  if (!promise_id || !content?.trim()) {
    return NextResponse.json({ error: 'promise_id and content are required' }, { status: 400 });
  }

  if (content.trim().length > 2000) {
    return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
  }

  const db = getSupabase();
  const { data, error } = await db
    .from('comments')
    .insert({
      promise_id,
      user_id: user.id,
      content: content.trim(),
      is_approved: false,
    })
    .select('id, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, comment: data }, { status: 201 });
}
