/**
 * /api/proposals/[id]/votes — Proposal voting
 *
 * GET  → vote aggregates for a proposal
 * POST { vote_type, device_fingerprint? } → cast or change vote
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getSupabase();

  const { data, error } = await db
    .from('proposal_votes')
    .select('vote_type, user_id')
    .eq('proposal_id', id);

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ up: 0, down: 0, net: 0 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const up = rows.filter((v) => v.vote_type === 'up').length;
  const down = rows.filter((v) => v.vote_type === 'down').length;

  // Get the current user's vote if logged in
  let userVote: string | null = null;
  try {
    const ssrClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();
    if (user) {
      const existing = rows.find((v) => v.user_id === user.id);
      userVote = existing?.vote_type ?? null;
    }
  } catch {
    // Not logged in
  }

  return NextResponse.json({
    up,
    down,
    net: up - down,
    userVote,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Rate limit: 60/hour per IP
  const ip = getClientIp(request);
  const { success: rateLimitOk } = await rateLimit(`proposal-votes:${ip}`, 60, 3600000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '3600' } }
    );
  }

  let body: {
    vote_type?: string;
    device_fingerprint?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vote_type, device_fingerprint } = body;

  if (!vote_type || !['up', 'down'].includes(vote_type)) {
    return NextResponse.json({ error: 'vote_type must be up or down' }, { status: 400 });
  }

  // Try to get authenticated user
  let userId: string | null = null;
  try {
    const ssrClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Anonymous vote
  }

  // Anonymous votes require device_fingerprint
  if (!userId && !device_fingerprint) {
    return NextResponse.json(
      { error: 'device_fingerprint required for anonymous votes' },
      { status: 400 }
    );
  }

  const db = getSupabase();

  // Verify proposal exists and is not hidden
  const { data: proposal, error: proposalError } = await db
    .from('community_proposals')
    .select('id, upvote_count, downvote_count, comment_count, created_at')
    .eq('id', id)
    .eq('is_hidden', false)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // Upsert vote
  if (userId) {
    const { error } = await db.from('proposal_votes').upsert(
      {
        proposal_id: id,
        user_id: userId,
        device_fingerprint: device_fingerprint ?? null,
        vote_type,
      },
      { onConflict: 'proposal_id,user_id' }
    );

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Votes table not yet created', saved: false });
      }
      return NextResponse.json({ error: error.message, saved: false }, { status: 500 });
    }
  } else {
    const { error } = await db.from('proposal_votes').upsert(
      {
        proposal_id: id,
        device_fingerprint,
        vote_type,
      },
      { onConflict: 'proposal_id,device_fingerprint' }
    );

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Votes table not yet created', saved: false });
      }
      return NextResponse.json({ error: error.message, saved: false }, { status: 500 });
    }
  }

  // Recompute vote counts on the proposal
  const { data: allVotes } = await db
    .from('proposal_votes')
    .select('vote_type')
    .eq('proposal_id', id);

  const votes = allVotes ?? [];
  const upvote_count = votes.filter((v) => v.vote_type === 'up').length;
  const downvote_count = votes.filter((v) => v.vote_type === 'down').length;

  // Recompute trending score
  const ageHours = Math.max(
    1,
    (Date.now() - new Date(proposal.created_at).getTime()) / 3600000
  );
  const commentCount = proposal.comment_count ?? 0;
  const trending_score =
    (upvote_count - downvote_count * 0.5 + commentCount * 0.3) / Math.pow(ageHours, 1.8);

  // Determine if proposal should auto-promote to trending
  const netVotes = upvote_count - downvote_count;
  const statusUpdate: Record<string, unknown> = {
    upvote_count,
    downvote_count,
    trending_score,
    updated_at: new Date().toISOString(),
  };

  // Auto-promote to trending at 20+ net votes
  const { data: currentProposal } = await db
    .from('community_proposals')
    .select('status')
    .eq('id', id)
    .single();

  if (currentProposal?.status === 'open' && netVotes >= 20) {
    statusUpdate.status = 'trending';
  }

  await db.from('community_proposals').update(statusUpdate).eq('id', id);

  return NextResponse.json({ saved: true, upvote_count, downvote_count, net: netVotes });
}
