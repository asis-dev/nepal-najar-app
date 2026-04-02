/**
 * /api/evidence — Citizen evidence for promises
 *
 * GET  ?promise_id=X            → list approved evidence for a promise (joined with profiles)
 * GET  ?promise_id=X&status=pending → list unapproved evidence (verifier/admin only)
 * POST { promise_id, media_urls, caption, classification }  → submit evidence (auth required)
 *       - Verifier/admin submissions are auto-approved
 *       - Anti-gaming: daily limits, duplicate URL check
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatEvidence(rows: any[]) {
  return rows.map((e) => ({
    id: e.id,
    user_id: e.user_id,
    promise_id: e.promise_id,
    evidence_type: e.evidence_type,
    media_urls: e.media_urls,
    caption: e.caption,
    caption_ne: e.caption_ne,
    classification: e.classification,
    latitude: e.latitude,
    longitude: e.longitude,
    upvote_count: e.upvote_count,
    downvote_count: e.downvote_count,
    is_approved: e.is_approved,
    created_at: e.created_at,
    display_name: (e.profiles as { display_name: string })?.display_name ?? 'Anonymous',
  }));
}

export async function GET(req: NextRequest) {
  const promiseId = req.nextUrl.searchParams.get('promise_id');
  if (!promiseId) {
    return NextResponse.json({ error: 'promise_id is required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ evidence: [] });
  }

  const db = getSupabase();
  const status = req.nextUrl.searchParams.get('status');

  // Pending evidence — verifier/admin only
  if (status === 'pending') {
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

    if (!profile || !['verifier', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Verifier or admin access required' }, { status: 403 });
    }

    const { data, error } = await db
      .from('citizen_evidence')
      .select('*, profiles(display_name)')
      .eq('promise_id', promiseId)
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ evidence: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ evidence: formatEvidence(data ?? []) });
  }

  // Default: approved evidence (public)
  const { data, error } = await db
    .from('citizen_evidence')
    .select('*, profiles(display_name)')
    .eq('promise_id', promiseId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ evidence: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ evidence: formatEvidence(data ?? []) });
}

export async function POST(req: NextRequest) {
  // Rate limit: 10/min per IP
  const ip = getClientIp(req);
  const { success: rateLimitOk } = await rateLimit(`evidence:${ip}`, 10, 60000);
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
    media_urls?: string[];
    caption?: string;
    classification?: string;
    evidence_type?: string;
    latitude?: number;
    longitude?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { promise_id, media_urls, caption, classification, evidence_type, latitude, longitude } = body;

  if (!promise_id || !classification) {
    return NextResponse.json({ error: 'promise_id and classification are required' }, { status: 400 });
  }

  if (!['confirms', 'contradicts', 'neutral'].includes(classification)) {
    return NextResponse.json({ error: 'classification must be confirms, contradicts, or neutral' }, { status: 400 });
  }

  if (caption && caption.length > 500) {
    return NextResponse.json({ error: 'Caption too long (max 500 characters)' }, { status: 400 });
  }

  const db = getSupabase();

  // --- Anti-gaming checks ---

  // 1. Check submitter role for auto-approve and daily limits
  const { data: profile } = await db
    .from('profiles')
    .select('role, created_at')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role ?? 'citizen';
  const isPrivileged = ['verifier', 'admin'].includes(userRole);

  // 2. Daily submission limit
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: dailyCount, error: countErr } = await db
    .from('citizen_evidence')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneDayAgo);

  if (countErr && countErr.code !== '42P01') {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  const todaySubmissions = dailyCount ?? 0;

  // New accounts (< 7 days old) get stricter limit
  const accountAge = profile?.created_at
    ? Date.now() - new Date(profile.created_at).getTime()
    : Infinity;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const isNewAccount = accountAge < sevenDaysMs;
  const dailyLimit = isNewAccount ? 2 : 5;

  if (todaySubmissions >= dailyLimit) {
    return NextResponse.json(
      { error: `Daily submission limit reached (${dailyLimit}/day). Try again tomorrow.` },
      { status: 429, headers: { 'Retry-After': '86400' } }
    );
  }

  // 3. Duplicate URL check
  if (media_urls && media_urls.length > 0) {
    for (const url of media_urls) {
      const { data: duplicate } = await db
        .from('citizen_evidence')
        .select('id')
        .eq('promise_id', promise_id)
        .contains('media_urls', [url])
        .limit(1)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          { error: 'Duplicate media URL: this evidence has already been submitted for this promise.' },
          { status: 409 }
        );
      }
    }
  }

  // --- Insert evidence ---
  const { data, error } = await db
    .from('citizen_evidence')
    .insert({
      user_id: user.id,
      promise_id,
      evidence_type: evidence_type ?? 'photo',
      media_urls: media_urls ?? [],
      caption: caption?.trim() ?? null,
      classification,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      is_approved: isPrivileged, // Auto-approve for verifier/admin
    })
    .select('id, created_at, is_approved')
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Evidence table not yet created', saved: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, evidence: data }, { status: 201 });
}
