/**
 * /api/evidence/[id]/votes — Upvote/downvote citizen evidence
 *
 * POST { vote_type: 'up' | 'down' }  → cast or toggle vote (auth required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: evidenceId } = await params;

  // Rate limit
  const ip = getClientIp(req);
  const { success: rateLimitOk } = await rateLimit(`evidence-vote:${ip}`, 30, 60000);
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

  let body: { vote_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vote_type } = body;
  if (!vote_type || !['up', 'down'].includes(vote_type)) {
    return NextResponse.json({ error: 'vote_type must be up or down' }, { status: 400 });
  }

  const db = getSupabase();

  // Check if user already voted on this evidence
  const { data: existing } = await db
    .from('citizen_evidence_votes')
    .select('id, vote_type')
    .eq('evidence_id', evidenceId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.vote_type === vote_type) {
      // Same vote — toggle off (delete)
      await db.from('citizen_evidence_votes').delete().eq('id', existing.id);
      return NextResponse.json({ saved: true, action: 'removed' });
    }
    // Different vote — update
    const { error } = await db
      .from('citizen_evidence_votes')
      .update({ vote_type })
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ saved: true, action: 'updated' });
  }

  // New vote
  const { error } = await db
    .from('citizen_evidence_votes')
    .insert({
      evidence_id: evidenceId,
      user_id: user.id,
      vote_type,
    });

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Evidence votes table not yet created', saved: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, action: 'created' });
}
