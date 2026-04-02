/**
 * /api/proposals/[id]/flag — Flag proposal or comment
 *
 * POST { reason, details?, comment_id? } → report content (auth required)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

const VALID_REASONS = [
  'spam',
  'offensive',
  'duplicate',
  'misinformation',
  'off_topic',
  'other',
] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Rate limit: 10/day per IP
  const ip = getClientIp(request);
  const { success: rateLimitOk } = await rateLimit(`proposal-flags:${ip}`, 10, 86400000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 10 flags per day.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '86400' } }
    );
  }

  // Auth required
  const ssrClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssrClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: {
    reason?: string;
    details?: string;
    comment_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { reason, details, comment_id } = body;

  if (!reason || !VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
    return NextResponse.json(
      { error: `Reason must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 }
    );
  }

  const db = getSupabase();

  // Verify proposal exists
  const { data: proposal, error: proposalError } = await db
    .from('community_proposals')
    .select('id, flag_count')
    .eq('id', id)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // If flagging a comment, verify it exists
  if (comment_id) {
    const { data: comment, error: commentError } = await db
      .from('proposal_comments')
      .select('id')
      .eq('id', comment_id)
      .eq('proposal_id', id)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
  }

  // Check for duplicate flag — user can only flag a specific item once
  const dupeQuery = db
    .from('proposal_flags')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', user.id);

  if (comment_id) {
    dupeQuery.eq('comment_id', comment_id);
  } else {
    dupeQuery.eq('proposal_id', id).is('comment_id', null);
  }

  const { count: existingFlags } = await dupeQuery;

  if ((existingFlags ?? 0) > 0) {
    return NextResponse.json(
      { error: 'You have already flagged this content' },
      { status: 409 }
    );
  }

  // Insert flag
  const { data: flag, error: insertError } = await db
    .from('proposal_flags')
    .insert({
      proposal_id: id,
      comment_id: comment_id ?? null,
      reporter_id: user.id,
      reason,
      details: details?.trim() ?? null,
      status: 'pending',
    })
    .select('id, created_at')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Increment flag_count on the target and auto-hide if >= 5
  if (comment_id) {
    // Flag on a comment — increment is_flagged on the comment
    // Get current flag count for this comment
    const { count: commentFlagCount } = await db
      .from('proposal_flags')
      .select('id', { count: 'exact', head: true })
      .eq('comment_id', comment_id);

    if ((commentFlagCount ?? 0) >= 5) {
      await db
        .from('proposal_comments')
        .update({ is_flagged: true })
        .eq('id', comment_id);
    }
  } else {
    // Flag on proposal — increment flag_count
    const newFlagCount = (proposal.flag_count ?? 0) + 1;
    const updateData: Record<string, unknown> = {
      flag_count: newFlagCount,
    };

    if (newFlagCount >= 5) {
      updateData.is_hidden = true;
      updateData.is_flagged = true;
    } else if (newFlagCount >= 3) {
      updateData.is_flagged = true;
    }

    await db
      .from('community_proposals')
      .update(updateData)
      .eq('id', id);
  }

  return NextResponse.json({ success: true, flag }, { status: 201 });
}
