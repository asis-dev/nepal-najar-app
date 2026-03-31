/**
 * PATCH /api/admin/signals/[id]
 *
 * Admin-only: update a signal's review_status, classification, confidence,
 * matched_promise_ids, review_notes, etc.
 * Auth: admin_session cookie or Bearer ADMIN_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/auth/admin';
import { getSupabase } from '@/lib/supabase/server';
import { recordSignalReviewAudit } from '@/lib/intelligence/review-audit';

const VALID_CLASSIFICATIONS = [
  'confirms', 'contradicts', 'neutral', 'statement', 'budget_allocation', 'policy_change',
] as const;

const VALID_REVIEW_STATUSES = ['approved', 'edited', 'rejected'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = getSupabase();

    // Fetch current signal
    const { data: current, error: fetchError } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      const status = fetchError.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json(
        { error: status === 404 ? 'Signal not found' : fetchError.message },
        { status },
      );
    }

    const updateFields: Record<string, unknown> = {};
    const previousValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    if (body.classification !== undefined) {
      if (!VALID_CLASSIFICATIONS.includes(body.classification)) {
        return NextResponse.json(
          { error: `Invalid classification. Must be one of: ${VALID_CLASSIFICATIONS.join(', ')}` },
          { status: 400 },
        );
      }
      previousValues.classification = current.classification;
      newValues.classification = body.classification;
      updateFields.classification = body.classification;
    }

    if (body.confidence !== undefined) {
      const c = Number(body.confidence);
      if (isNaN(c) || c < 0 || c > 1) {
        return NextResponse.json({ error: 'confidence must be 0-1' }, { status: 400 });
      }
      previousValues.confidence = current.confidence;
      newValues.confidence = c;
      updateFields.confidence = c;
    }

    if (body.matched_promise_ids !== undefined) {
      if (!Array.isArray(body.matched_promise_ids)) {
        return NextResponse.json({ error: 'matched_promise_ids must be an array' }, { status: 400 });
      }
      previousValues.matched_promise_ids = current.matched_promise_ids;
      newValues.matched_promise_ids = body.matched_promise_ids;
      updateFields.matched_promise_ids = body.matched_promise_ids;
    }

    if (body.review_status !== undefined) {
      if (!VALID_REVIEW_STATUSES.includes(body.review_status)) {
        return NextResponse.json(
          { error: `Invalid review_status. Must be one of: ${VALID_REVIEW_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      previousValues.review_status = current.review_status;
      newValues.review_status = body.review_status;
      updateFields.review_status = body.review_status;
    }

    if (body.review_notes !== undefined) {
      previousValues.review_notes = current.review_notes;
      newValues.review_notes = body.review_notes;
      updateFields.review_notes = body.review_notes;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Always clear review_required after admin action
    updateFields.review_required = false;

    // Append review history
    const metadata = (current.metadata as Record<string, unknown>) || {};
    const reviewHistory = Array.isArray(metadata.review_history)
      ? [...metadata.review_history]
      : [];

    reviewHistory.push({
      action: body.review_status || 'edit',
      previous_values: previousValues,
      new_values: newValues,
      reviewed_by: 'admin',
      reviewed_at: new Date().toISOString(),
      notes: body.review_notes || null,
    });

    updateFields.metadata = { ...metadata, review_history: reviewHistory };

    const { data: updated, error: updateError } = await supabase
      .from('intelligence_signals')
      .update(updateFields)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await recordSignalReviewAudit({
      signalId: id,
      action: (body.review_status || 'edited') as 'approved' | 'rejected' | 'edited',
      reviewer: 'admin',
      previousClassification: (previousValues.classification as string | null) || current.classification,
      newClassification: (newValues.classification as string | null) || updated.classification,
      previousConfidence:
        typeof previousValues.confidence === 'number'
          ? (previousValues.confidence as number)
          : (current.confidence as number | null),
      newConfidence:
        typeof newValues.confidence === 'number'
          ? (newValues.confidence as number)
          : (updated.confidence as number | null),
      notes: typeof body.review_notes === 'string' ? body.review_notes : null,
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update signal' },
      { status: 500 },
    );
  }
}
