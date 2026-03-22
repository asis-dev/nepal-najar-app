/**
 * /api/evidence — Citizen evidence for promises
 *
 * GET  ?promise_id=X  → list evidence for a promise (joined with profiles)
 * POST { promise_id, media_urls, caption, classification }  → submit evidence (auth required)
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
    return NextResponse.json({ evidence: [] });
  }

  const db = getSupabase();

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const evidence = (data ?? []).map((e: any) => ({
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
    created_at: e.created_at,
    display_name: (e.profiles as { display_name: string })?.display_name ?? 'Anonymous',
  }));

  return NextResponse.json({ evidence });
}

export async function POST(req: NextRequest) {
  // Rate limit: 10/min per IP
  const ip = getClientIp(req);
  const { success: rateLimitOk } = rateLimit(`evidence:${ip}`, 10, 60000);
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
    })
    .select('id, created_at')
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Evidence table not yet created', saved: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, evidence: data }, { status: 201 });
}
