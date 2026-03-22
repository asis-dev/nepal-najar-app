/**
 * /api/proposals/[id]/updates — Status timeline / updates
 *
 * GET  → list updates for a proposal (chronological)
 * POST { content, update_type, new_status? } → add update (author or admin only)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';

const VALID_UPDATE_TYPES = ['general', 'status_change', 'official_response', 'milestone'] as const;

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getSupabase();

  const { data, error } = await db
    .from('proposal_updates')
    .select(
      'id, proposal_id, author_id, content, update_type, old_status, new_status, created_at, profiles(display_name, avatar_url)'
    )
    .eq('proposal_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates = (data ?? []).map((u: any) => ({
    ...u,
    author_display_name:
      (u.profiles as unknown as { display_name: string })?.display_name ?? 'Unknown',
    author_avatar_url:
      (u.profiles as unknown as { avatar_url: string })?.avatar_url ?? null,
    profiles: undefined,
  }));

  return NextResponse.json({ updates });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Auth required
  const ssrClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssrClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getSupabase();

  // Get proposal
  const { data: proposal, error: fetchError } = await db
    .from('community_proposals')
    .select('id, author_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // Check permissions — only author or admin
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

  let body: {
    content?: string;
    update_type?: string;
    new_status?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { content, update_type, new_status } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  if (
    !update_type ||
    !VALID_UPDATE_TYPES.includes(update_type as (typeof VALID_UPDATE_TYPES)[number])
  ) {
    return NextResponse.json(
      { error: `update_type must be one of: ${VALID_UPDATE_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  // If status_change, validate and apply the status transition
  let old_status: string | null = null;
  if (update_type === 'status_change') {
    if (!new_status) {
      return NextResponse.json(
        { error: 'new_status is required for status_change updates' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(new_status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json({ error: `Invalid status: ${new_status}` }, { status: 400 });
    }

    old_status = proposal.status;

    // Update proposal status
    const { error: statusError } = await db
      .from('community_proposals')
      .update({ status: new_status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }
  }

  // Insert the update record
  const { data: update, error: insertError } = await db
    .from('proposal_updates')
    .insert({
      proposal_id: id,
      author_id: user.id,
      content: content.trim(),
      update_type,
      old_status: old_status ?? null,
      new_status: update_type === 'status_change' ? new_status : null,
    })
    .select('id, created_at, update_type, old_status, new_status')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, update }, { status: 201 });
}
