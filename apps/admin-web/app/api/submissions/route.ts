import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

/**
 * GET /api/submissions
 * - Admin: returns all pending submissions
 * - Authenticated user: returns their own submissions
 */
export async function GET() {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getSupabase();

  // Check if admin
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  let query = db
    .from('user_submissions')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false });

  if (isAdmin) {
    // Admin sees all pending submissions
    query = query.eq('status', 'pending');
  } else {
    // Regular user sees their own submissions
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (data ?? []).map((s) => ({
    id: s.id,
    promise_id: s.promise_id,
    user_id: s.user_id,
    url: s.url,
    description: s.description,
    type: s.type,
    status: s.status,
    reviewer_notes: s.reviewer_notes,
    reviewed_at: s.reviewed_at,
    reviewed_by: s.reviewed_by,
    created_at: s.created_at,
    display_name: (s.profiles as unknown as { display_name: string })?.display_name ?? 'Anonymous',
  }));

  return NextResponse.json({ submissions: formatted });
}

/**
 * POST /api/submissions
 * Create a new evidence/tip submission. Requires auth.
 * Body: { promise_id: string, url: string, description: string, type: 'evidence' | 'tip' }
 */
export async function POST(req: NextRequest) {
  // Rate limit: 5/min per IP
  const ip = getClientIp(req);
  const { success: rateLimitOk } = rateLimit(`submissions:${ip}`, 5, 60000);
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
  const { promise_id, url, description, type } = body;

  if (!promise_id || !description?.trim()) {
    return NextResponse.json({ error: 'promise_id and description are required' }, { status: 400 });
  }

  if (type && !['evidence', 'tip'].includes(type)) {
    return NextResponse.json({ error: 'type must be "evidence" or "tip"' }, { status: 400 });
  }

  const db = getSupabase();
  const { data, error } = await db
    .from('user_submissions')
    .insert({
      promise_id,
      user_id: user.id,
      url: url?.trim() || null,
      description: description.trim(),
      type: type || 'evidence',
      status: 'pending',
    })
    .select('id, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, submission: data }, { status: 201 });
}
