import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/auth/admin';
import { getSupabase } from '@/lib/supabase/server';

const VALID_REVIEW_STATES = ['candidate', 'reviewed', 'published', 'rejected'] as const;

function isAuthed(request: NextRequest): boolean {
  return isAdminAuthed(request);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.review_state !== undefined) {
      if (!VALID_REVIEW_STATES.includes(body.review_state)) {
        return NextResponse.json(
          { error: `Invalid review_state. Must be one of: ${VALID_REVIEW_STATES.join(', ')}` },
          { status: 400 },
        );
      }

      updates.review_state = body.review_state;
      if (body.review_state === 'published') {
        updates.is_public = true;
        updates.published_at = new Date().toISOString();
      }
      if (body.review_state === 'candidate' || body.review_state === 'rejected') {
        updates.is_public = false;
      }
    }

    if (body.is_public !== undefined) {
      updates.is_public = Boolean(body.is_public);
      if (body.is_public === true && updates.review_state === undefined) {
        updates.review_state = 'published';
        updates.published_at = new Date().toISOString();
      }
    }

    if (body.review_notes !== undefined) updates.review_notes = body.review_notes;
    if (body.summary !== undefined) updates.summary = body.summary;
    if (body.summary_ne !== undefined) updates.summary_ne = body.summary_ne;
    if (body.actors !== undefined) {
      if (!Array.isArray(body.actors)) {
        return NextResponse.json({ error: 'actors must be an array' }, { status: 400 });
      }
      updates.actors = body.actors.map((value: unknown) => String(value));
    }
    if (body.merged_into_id !== undefined) {
      updates.merged_into_id = body.merged_into_id || null;
      if (body.merged_into_id) {
        updates.is_public = false;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('promises')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update commitment' },
      { status: 500 },
    );
  }
}
