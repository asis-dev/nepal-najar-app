/**
 * /api/votes — Public vote persistence
 *
 * GET  ?topic_type=promise&topic_id=1  → vote counts for a topic
 * POST { topic_type, topic_id, vote_type, device_fingerprint }  → cast/update vote
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicType = searchParams.get('topic_type');
  const topicId = searchParams.get('topic_id');

  if (!topicType || !topicId) {
    return NextResponse.json({ error: 'topic_type and topic_id required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ up: 0, down: 0, total: 0 });
  }

  const supabase = getSupabase();

  const { data } = await supabase
    .from('public_votes')
    .select('vote_type')
    .eq('topic_type', topicType)
    .eq('topic_id', topicId);

  const up = (data ?? []).filter((v) => v.vote_type === 'up').length;
  const down = (data ?? []).filter((v) => v.vote_type === 'down').length;

  return NextResponse.json({ up, down, total: up + down });
}

export async function POST(request: NextRequest) {
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

  if (!topic_type || !topic_id || !vote_type || !device_fingerprint) {
    return NextResponse.json(
      { error: 'topic_type, topic_id, vote_type, and device_fingerprint required' },
      { status: 400 },
    );
  }

  if (!['up', 'down', 'priority'].includes(vote_type)) {
    return NextResponse.json({ error: 'vote_type must be up, down, or priority' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Upsert: one vote per device per topic
  const { error } = await supabase.from('public_votes').upsert(
    {
      topic_type,
      topic_id,
      vote_type,
      device_fingerprint,
      geo_verified: geo_verified ?? false,
    },
    { onConflict: 'topic_type,topic_id,device_fingerprint' },
  );

  if (error) {
    // If table doesn't exist yet, return graceful error
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Votes table not yet created', saved: false });
    }
    return NextResponse.json({ error: error.message, saved: false }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
