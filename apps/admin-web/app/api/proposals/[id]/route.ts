/**
 * /api/proposals/[id] — Single Proposal CRUD
 *
 * GET    → proposal detail with author profile and vote counts
 * PATCH  → update proposal (author for draft/open, admin for status changes)
 * DELETE → soft-delete (set is_hidden=true, author or admin)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';

const VALID_STATUSES = [
  'draft',
  'open',
  'trending',
  'under_review',
  'accepted',
  'rejected',
  'in_progress',
  'completed',
  'archived',
] as const;

// Valid status transitions: from → allowed destinations
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['open'],
  open: ['trending', 'archived'],
  trending: ['under_review', 'archived'],
  under_review: ['accepted', 'rejected', 'archived'],
  accepted: ['in_progress', 'archived'],
  rejected: ['archived'],
  in_progress: ['completed', 'archived'],
  completed: ['archived'],
};

// Statuses that only admins can transition to
const ADMIN_ONLY_TARGETS = ['under_review', 'accepted', 'rejected', 'in_progress', 'completed'];

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getSupabase();

  const { data, error } = await db
    .from('community_proposals')
    .select(
      '*, profiles(display_name, avatar_url)'
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (data.is_hidden) {
    // Allow author or admin to see hidden proposals
    let canSee = false;
    try {
      const ssrClient = await createSupabaseServerClient();
      const {
        data: { user },
      } = await ssrClient.auth.getUser();
      if (user) {
        if (user.id === data.author_id) canSee = true;
        const { data: profile } = await db
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'admin') canSee = true;
      }
    } catch {
      // Not logged in
    }
    if (!canSee) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposal = data as any;

  return NextResponse.json({
    proposal: {
      ...proposal,
      author_display_name:
        (proposal.profiles as unknown as { display_name: string })?.display_name ?? 'Anonymous',
      author_avatar_url:
        (proposal.profiles as unknown as { avatar_url: string })?.avatar_url ?? null,
      profiles: undefined,
    },
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const ssrClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssrClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getSupabase();

  // Get current proposal
  const { data: proposal, error: fetchError } = await db
    .from('community_proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // Check permissions
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isAuthor = proposal.author_id === user.id;

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Build update object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  // Authors can only edit draft/open proposals (content fields)
  if (isAuthor && !isAdmin) {
    if (!['draft', 'open'].includes(proposal.status)) {
      return NextResponse.json(
        { error: 'Can only edit proposals in draft or open status' },
        { status: 403 }
      );
    }
  }

  // Content fields (author in draft/open, or admin)
  const editableFields = [
    'title',
    'title_ne',
    'description',
    'description_ne',
    'category',
    'province',
    'district',
    'municipality',
    'related_promise_ids',
    'estimated_cost_npr',
    'image_urls',
  ];

  for (const field of editableFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Validate title if provided
  if (updates.title !== undefined) {
    const t = String(updates.title).trim();
    if (t.length < 5 || t.length > 200) {
      return NextResponse.json({ error: 'Title must be 5-200 characters' }, { status: 400 });
    }
    updates.title = t;
  }

  // Validate description if provided
  if (updates.description !== undefined) {
    const d = String(updates.description).trim();
    if (d.length < 20 || d.length > 5000) {
      return NextResponse.json({ error: 'Description must be 20-5000 characters' }, { status: 400 });
    }
    updates.description = d;
  }

  // Status change
  if (body.status !== undefined) {
    const newStatus = String(body.status);
    if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json({ error: `Invalid status: ${newStatus}` }, { status: 400 });
    }

    const allowed = STATUS_TRANSITIONS[proposal.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${proposal.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    // Admin-only transitions
    if (ADMIN_ONLY_TARGETS.includes(newStatus) && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can set this status' },
        { status: 403 }
      );
    }

    updates.status = newStatus;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await db
    .from('community_proposals')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, proposal: updated });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const ssrClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssrClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getSupabase();

  const { data: proposal, error: fetchError } = await db
    .from('community_proposals')
    .select('author_id')
    .eq('id', id)
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isAuthor = proposal.author_id === user.id;

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Soft delete
  const { error: updateError } = await db
    .from('community_proposals')
    .update({ is_hidden: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Proposal hidden' });
}
