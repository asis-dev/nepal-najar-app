/**
 * /api/proposals/[id]/comments — Threaded comments on proposals
 *
 * GET  → list comments (approved + user's own pending), threaded
 * POST { content, parent_id? } → submit comment (auth required)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatComment(c: any) {
  return {
    id: c.id,
    proposal_id: c.proposal_id,
    user_id: c.user_id,
    parent_id: c.parent_id,
    content: c.content,
    is_approved: c.is_approved,
    is_flagged: c.is_flagged,
    created_at: c.created_at,
    display_name:
      (c.profiles as unknown as { display_name: string })?.display_name ?? 'Anonymous',
    avatar_url:
      (c.profiles as unknown as { avatar_url: string })?.avatar_url ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildThreads(comments: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roots: any[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getSupabase();

  const selectFields =
    'id, proposal_id, user_id, parent_id, content, is_approved, is_flagged, created_at, profiles(display_name, avatar_url)';

  // Get approved comments
  const { data: approved, error: approvedErr } = await db
    .from('proposal_comments')
    .select(selectFields)
    .eq('proposal_id', id)
    .eq('is_approved', true)
    .order('created_at', { ascending: true });

  if (approvedErr) {
    return NextResponse.json({ error: approvedErr.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userPending: any[] = [];

  // If user is logged in, include their own unapproved comments
  try {
    const ssrClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (user) {
      const { data: pending } = await db
        .from('proposal_comments')
        .select(selectFields)
        .eq('proposal_id', id)
        .eq('user_id', user.id)
        .eq('is_approved', false)
        .order('created_at', { ascending: true });

      userPending = pending ?? [];
    }
  } catch {
    // Not logged in
  }

  const allComments = [...(approved ?? []).map(formatComment), ...userPending.map(formatComment)];
  const threaded = buildThreads(allComments);

  return NextResponse.json({
    comments: threaded,
    total: allComments.length,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Rate limit: 10/min per IP
  const ip = getClientIp(request);
  const { success: rateLimitOk } = rateLimit(`proposal-comments:${ip}`, 10, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } }
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

  let body: { content?: string; parent_id?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { content, parent_id } = body;

  if (!content?.trim() || content.trim().length < 1 || content.trim().length > 2000) {
    return NextResponse.json({ error: 'Content must be 1-2000 characters' }, { status: 400 });
  }

  const db = getSupabase();

  // Verify proposal exists
  const { data: proposal, error: proposalError } = await db
    .from('community_proposals')
    .select('id, comment_count')
    .eq('id', id)
    .eq('is_hidden', false)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // If parent_id is provided, verify it exists
  if (parent_id) {
    const { data: parentComment, error: parentError } = await db
      .from('proposal_comments')
      .select('id')
      .eq('id', parent_id)
      .eq('proposal_id', id)
      .single();

    if (parentError || !parentComment) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    }
  }

  // Check user karma for auto-approval
  const { data: profile } = await db
    .from('profiles')
    .select('proposal_karma, role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const karma = profile?.proposal_karma ?? 0;
  const autoApprove = isAdmin || karma >= 10;

  const { data: comment, error: insertError } = await db
    .from('proposal_comments')
    .insert({
      proposal_id: id,
      user_id: user.id,
      parent_id: parent_id ?? null,
      content: content.trim(),
      is_approved: autoApprove,
      is_flagged: false,
    })
    .select('id, created_at, is_approved')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update comment_count on proposal (only for approved comments)
  if (autoApprove) {
    await db
      .from('community_proposals')
      .update({
        comment_count: (proposal.comment_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  return NextResponse.json(
    {
      success: true,
      comment,
      auto_approved: autoApprove,
    },
    { status: 201 }
  );
}
