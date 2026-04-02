/**
 * GET / PATCH / DELETE  /api/intelligence/signals/[id]
 *
 * Manage a single intelligence signal.
 *   GET    — return full signal row (admin session or SCRAPE_SECRET)
 *   PATCH  — edit classification, confidence, review status, etc. (admin session or SCRAPE_SECRET)
 *   DELETE — soft-delete (mark rejected) (admin session only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/auth/admin';
import { getSupabase } from '@/lib/supabase/server';
import { recordSignalReviewAudit } from '@/lib/intelligence/review-audit';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

type AuthLevel = 'admin' | 'scrape' | null;

async function getAuthLevel(request: NextRequest): Promise<AuthLevel> {
  if (await isAdminAuthed(request)) {
    return 'admin';
  }

  const scrapeSecret = process.env.SCRAPE_SECRET;
  if (bearerMatchesSecret(request, scrapeSecret)) {
    return 'scrape';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_CLASSIFICATIONS = [
  'confirms',
  'contradicts',
  'neutral',
  'statement',
  'budget_allocation',
  'policy_change',
] as const;

const VALID_REVIEW_STATUSES = ['approved', 'edited', 'rejected'] as const;

// ---------------------------------------------------------------------------
// GET — full signal details
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authLevel = await getAuthLevel(request);
  if (!authLevel) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json(
        { error: status === 404 ? 'Signal not found' : error.message },
        { status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch signal' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — edit signal fields + record review history
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authLevel = await getAuthLevel(request);
  if (!authLevel) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = getSupabase();

    // Fetch current signal so we can diff for review_history
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

    // Build the update object from allowed fields
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
      if (typeof body.confidence !== 'number' || body.confidence < 0 || body.confidence > 1) {
        return NextResponse.json(
          { error: 'confidence must be a number between 0 and 1' },
          { status: 400 },
        );
      }
      previousValues.confidence = current.confidence;
      newValues.confidence = body.confidence;
      updateFields.confidence = body.confidence;
    }

    if (body.relevance_score !== undefined) {
      if (typeof body.relevance_score !== 'number' || body.relevance_score < 0 || body.relevance_score > 1) {
        return NextResponse.json(
          { error: 'relevance_score must be a number between 0 and 1' },
          { status: 400 },
        );
      }
      previousValues.relevance_score = current.relevance_score;
      newValues.relevance_score = body.relevance_score;
      updateFields.relevance_score = body.relevance_score;
    }

    if (body.matched_promise_ids !== undefined) {
      if (!Array.isArray(body.matched_promise_ids)) {
        return NextResponse.json(
          { error: 'matched_promise_ids must be an array of numbers' },
          { status: 400 },
        );
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

    if (body.reviewed_by !== undefined) {
      previousValues.reviewed_by = current.reviewed_by;
      newValues.reviewed_by = body.reviewed_by;
      updateFields.reviewed_by = body.reviewed_by;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    // Always clear review_required after admin action
    updateFields.review_required = false;

    // Build review history entry and append to metadata
    const metadata = (current.metadata as Record<string, unknown>) || {};
    const reviewHistory = Array.isArray(metadata.review_history)
      ? [...metadata.review_history]
      : [];

    reviewHistory.push({
      action: 'edit',
      previous_values: previousValues,
      new_values: newValues,
      reviewed_by: body.reviewed_by || 'admin',
      reviewed_at: new Date().toISOString(),
      notes: body.review_notes || null,
    });

    updateFields.metadata = { ...metadata, review_history: reviewHistory };

    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('intelligence_signals')
      .update(updateFields)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    await recordSignalReviewAudit({
      signalId: id,
      action: (body.review_status || 'edited') as 'approved' | 'rejected' | 'edited',
      reviewer:
        typeof body.reviewed_by === 'string' ? body.reviewed_by : authLevel,
      previousClassification:
        (previousValues.classification as string | null) || current.classification,
      newClassification:
        (newValues.classification as string | null) || updated.classification,
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

// ---------------------------------------------------------------------------
// DELETE — soft-delete (admin only)
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authLevel = await getAuthLevel(request);
  if (authLevel !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
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

    const metadata = (current.metadata as Record<string, unknown>) || {};
    const reviewHistory = Array.isArray(metadata.review_history)
      ? [...metadata.review_history]
      : [];

    reviewHistory.push({
      action: 'delete',
      previous_values: { review_status: current.review_status },
      new_values: { review_status: 'rejected' },
      reviewed_by: 'admin',
      reviewed_at: new Date().toISOString(),
      notes: 'Soft-deleted by admin',
    });

    const { data: updated, error: updateError } = await supabase
      .from('intelligence_signals')
      .update({
        review_status: 'rejected',
        review_required: false,
        metadata: {
          ...metadata,
          review_history: reviewHistory,
          deleted_by: 'admin',
          deleted_at: new Date().toISOString(),
        },
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    await recordSignalReviewAudit({
      signalId: id,
      action: 'rejected',
      reviewer: 'admin',
      previousClassification: current.classification,
      newClassification: updated.classification,
      previousConfidence: current.confidence as number | null,
      newConfidence: updated.confidence as number | null,
      notes: 'Soft-deleted by admin',
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete signal' },
      { status: 500 },
    );
  }
}
