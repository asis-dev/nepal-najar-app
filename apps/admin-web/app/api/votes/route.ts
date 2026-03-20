/**
 * /api/votes — Public vote persistence
 *
 * GET  ?topic_type=promise&topic_id=1  → vote counts for a topic
 * POST { topic_type, topic_id, vote_type, device_fingerprint }  → cast/update vote
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicType = searchParams.get('topic_type');
  const topicId = searchParams.get('topic_id');

  if (!topicType || !topicId) {
    return NextResponse.json({ error: 'topic_type and topic_id required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      up: 0,
      down: 0,
      total: 0,
      weightedUp: 0,
      weightedDown: 0,
      weightedTotal: 0,
      verifiedUp: 0,
      verifiedDown: 0,
      priorityCount: 0,
    });
  }

  const supabase = getSupabase();

  const { data } = await supabase
    .from('public_votes')
    .select('vote_type, vote_weight, user_id')
    .eq('topic_type', topicType)
    .eq('topic_id', topicId);

  const rows = data ?? [];

  // Basic counts
  const up = rows.filter((v) => v.vote_type === 'up').length;
  const down = rows.filter((v) => v.vote_type === 'down').length;

  // Weighted counts (SUM of vote_weight)
  const weightedUp = rows
    .filter((v) => v.vote_type === 'up')
    .reduce((sum, v) => sum + (v.vote_weight ?? 1), 0);
  const weightedDown = rows
    .filter((v) => v.vote_type === 'down')
    .reduce((sum, v) => sum + (v.vote_weight ?? 1), 0);

  // Verified counts (votes from logged-in users)
  const verifiedUp = rows.filter((v) => v.vote_type === 'up' && v.user_id != null).length;
  const verifiedDown = rows.filter((v) => v.vote_type === 'down' && v.user_id != null).length;

  // Priority count
  const priorityCount = rows.filter((v) => v.vote_type === 'priority').length;

  return NextResponse.json({
    up,
    down,
    total: up + down,
    weightedUp,
    weightedDown,
    weightedTotal: weightedUp + weightedDown,
    verifiedUp,
    verifiedDown,
    priorityCount,
  });
}

export async function POST(request: NextRequest) {
  // Rate limit: 30/min per IP
  const ip = getClientIp(request);
  const { success: rateLimitOk } = rateLimit(`votes:${ip}`, 30, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let body: {
    topic_type?: string;
    topic_id?: string;
    vote_type?: string;
    device_fingerprint?: string;
    geo_verified?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic_type, topic_id, vote_type, device_fingerprint, geo_verified } = body;

  if (!topic_type || !topic_id || !vote_type) {
    return NextResponse.json(
      { error: 'topic_type, topic_id, and vote_type required' },
      { status: 400 },
    );
  }

  if (!['up', 'down', 'priority'].includes(vote_type)) {
    return NextResponse.json({ error: 'vote_type must be up, down, or priority' }, { status: 400 });
  }

  // Try to get authenticated user session
  let userId: string | null = null;
  try {
    const ssrClient = await createSupabaseServerClient();
    const { data: { user } } = await ssrClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // No user session — anonymous vote
  }

  // Priority votes require authentication
  if (vote_type === 'priority' && !userId) {
    return NextResponse.json(
      { error: 'You must be logged in to prioritize issues' },
      { status: 401 },
    );
  }

  // Anonymous votes require device_fingerprint
  if (!userId && !device_fingerprint) {
    return NextResponse.json(
      { error: 'device_fingerprint required for anonymous votes' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Determine vote weight
  let vote_weight = 1;
  if (userId) {
    vote_weight = geo_verified ? 3 : 2;
  }

  if (userId) {
    // Authenticated vote: dedup by (topic_type, topic_id, user_id)
    const { error } = await supabase.from('public_votes').upsert(
      {
        topic_type,
        topic_id,
        vote_type,
        device_fingerprint: device_fingerprint ?? null,
        user_id: userId,
        geo_verified: geo_verified ?? false,
        vote_weight,
      },
      { onConflict: 'topic_type,topic_id,user_id' },
    );

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Votes table not yet created', saved: false });
      }
      return NextResponse.json({ error: error.message, saved: false }, { status: 500 });
    }
  } else {
    // Anonymous vote: dedup by (topic_type, topic_id, device_fingerprint)
    const { error } = await supabase.from('public_votes').upsert(
      {
        topic_type,
        topic_id,
        vote_type,
        device_fingerprint,
        geo_verified: geo_verified ?? false,
        vote_weight,
      },
      { onConflict: 'topic_type,topic_id,device_fingerprint' },
    );

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Votes table not yet created', saved: false });
      }
      return NextResponse.json({ error: error.message, saved: false }, { status: 500 });
    }
  }

  return NextResponse.json({ saved: true });
}
