/**
 * GET /api/admin/corrections — list recent corrections
 * POST /api/admin/corrections — submit a correction and execute it
 *
 * Auth: admin Supabase session (legacy ADMIN_SECRET is optional via env opt-in).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/auth/admin';
import { getSupabase } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Auth — same pattern as other admin routes
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Correction types and their execution logic
// ---------------------------------------------------------------------------

type CorrectionType =
  | 'merge'
  | 'reclassify'
  | 'wrong_commitment'
  | 'not_a_commitment'
  | 'wrong_ministry'
  | 'wrong_progress'
  | 'custom';

const VALID_CORRECTION_TYPES: CorrectionType[] = [
  'merge',
  'reclassify',
  'wrong_commitment',
  'not_a_commitment',
  'wrong_ministry',
  'wrong_progress',
  'custom',
];

interface CorrectionBody {
  signal_id?: string;
  commitment_id?: number;
  correction_type: CorrectionType;
  note: string;
  corrected_values?: Record<string, unknown>;
  created_by?: string;
}

// ---------------------------------------------------------------------------
// GET /api/admin/corrections?type=merge&commitment_id=15
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const url = new URL(request.url);
  const typeFilter = url.searchParams.get('type');
  const commitmentIdFilter = url.searchParams.get('commitment_id');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  let query = supabase
    .from('ai_corrections')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (typeFilter && VALID_CORRECTION_TYPES.includes(typeFilter as CorrectionType)) {
    query = query.eq('correction_type', typeFilter);
  }

  if (commitmentIdFilter) {
    const cid = parseInt(commitmentIdFilter, 10);
    if (Number.isFinite(cid)) {
      query = query.eq('commitment_id', cid);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: (data || []).length, corrections: data || [] });
}

// ---------------------------------------------------------------------------
// POST /api/admin/corrections
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CorrectionBody;

    // Validate
    if (!body.correction_type || !VALID_CORRECTION_TYPES.includes(body.correction_type)) {
      return NextResponse.json(
        { error: `correction_type must be one of: ${VALID_CORRECTION_TYPES.join(', ')}` },
        { status: 400 },
      );
    }
    if (!body.note || typeof body.note !== 'string' || body.note.trim().length === 0) {
      return NextResponse.json({ error: 'note is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Capture original values from the signal before applying corrections
    let originalValues: Record<string, unknown> = {};
    if (body.signal_id) {
      const { data: signal } = await supabase
        .from('intelligence_signals')
        .select('classification, relevance_score, matched_promise_ids, extracted_data, metadata')
        .eq('id', body.signal_id)
        .single();
      if (signal) {
        originalValues = {
          classification: signal.classification,
          relevance_score: signal.relevance_score,
          matched_promise_ids: signal.matched_promise_ids,
          extracted_data: signal.extracted_data,
          metadata: signal.metadata,
        };
      }
    }

    // Execute the correction and get the action_taken description
    const actionTaken = await executeCorrection(supabase, body);

    // Store in ai_corrections table
    const { data: correction, error: insertErr } = await supabase
      .from('ai_corrections')
      .insert({
        correction_type: body.correction_type,
        signal_id: body.signal_id || null,
        commitment_id: body.commitment_id || null,
        note: body.note.trim(),
        action_taken: actionTaken,
        original_values: originalValues,
        corrected_values: body.corrected_values || null,
        created_by: body.created_by || 'admin',
        ai_acknowledged: false,
      })
      .select('id')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      correction_id: correction?.id,
      action_taken: actionTaken,
    });
  } catch (err) {
    console.error('[Corrections API] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Execute a correction immediately
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeCorrection(supabase: any, body: CorrectionBody): Promise<string> {
  switch (body.correction_type) {
    case 'merge':
      return await executeMerge(supabase, body);
    case 'reclassify':
      return await executeReclassify(supabase, body);
    case 'wrong_commitment':
      return await executeWrongCommitment(supabase, body);
    case 'not_a_commitment':
      return await executeNotACommitment(supabase, body);
    case 'wrong_ministry':
      return await executeWrongMinistry(supabase, body);
    case 'wrong_progress':
      return await executeWrongProgress(supabase, body);
    case 'custom':
      return 'stored_note_only';
    default:
      return 'no_action';
  }
}

/**
 * merge: Update signal's matched_promise_ids, remove from community_commitments
 * if it was auto-approved.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeMerge(supabase: any, body: CorrectionBody): Promise<string> {
  if (!body.signal_id) return 'no_signal_id';

  const newMatchedIds = (body.corrected_values?.matched_promise_ids as number[]) || [];

  // Update signal's matched_promise_ids
  await supabase
    .from('intelligence_signals')
    .update({ matched_promise_ids: newMatchedIds })
    .eq('id', body.signal_id);

  // Remove from community_commitments if it was auto-approved
  const { data: communityRows } = await supabase
    .from('community_commitments')
    .select('id')
    .eq('source_signal_id', body.signal_id);

  if (communityRows && communityRows.length > 0) {
    const ids = communityRows.map((r: { id: number }) => r.id);
    await supabase
      .from('community_commitments')
      .delete()
      .in('id', ids);
  }

  return `merged_signal_to_commitments_${newMatchedIds.join(',')}`;
}

/**
 * reclassify: Update signal's classification and relevance_score.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeReclassify(supabase: any, body: CorrectionBody): Promise<string> {
  if (!body.signal_id) return 'no_signal_id';

  const updates: Record<string, unknown> = {};
  if (body.corrected_values?.classification) {
    updates.classification = body.corrected_values.classification;
  }
  if (typeof body.corrected_values?.relevance_score === 'number') {
    updates.relevance_score = body.corrected_values.relevance_score;
  }

  if (Object.keys(updates).length === 0) return 'no_values_to_update';

  await supabase
    .from('intelligence_signals')
    .update(updates)
    .eq('id', body.signal_id);

  return `reclassified_to_${updates.classification || 'unchanged'}`;
}

/**
 * wrong_commitment: Update signal's matched_promise_ids to the correct ones.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeWrongCommitment(supabase: any, body: CorrectionBody): Promise<string> {
  if (!body.signal_id) return 'no_signal_id';

  const newMatchedIds = (body.corrected_values?.matched_promise_ids as number[]) || [];

  await supabase
    .from('intelligence_signals')
    .update({ matched_promise_ids: newMatchedIds })
    .eq('id', body.signal_id);

  return `reassigned_to_commitments_${newMatchedIds.join(',')}`;
}

/**
 * not_a_commitment: Set classification to neutral, discovery_status to rejected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeNotACommitment(supabase: any, body: CorrectionBody): Promise<string> {
  if (!body.signal_id) return 'no_signal_id';

  // Get current metadata
  const { data: signal } = await supabase
    .from('intelligence_signals')
    .select('metadata')
    .eq('id', body.signal_id)
    .single();

  const metadata = (signal?.metadata as Record<string, unknown>) || {};

  await supabase
    .from('intelligence_signals')
    .update({
      classification: 'neutral',
      review_status: 'rejected',
      metadata: {
        ...metadata,
        discovery_status: 'rejected',
        discovery_rejected_at: new Date().toISOString(),
        discovery_rejected_by: body.created_by || 'admin',
        rejection_reason: body.note,
      },
    })
    .eq('id', body.signal_id);

  // Also remove from community_commitments if auto-approved
  await supabase
    .from('community_commitments')
    .delete()
    .eq('source_signal_id', body.signal_id);

  return 'rejected_as_not_a_commitment';
}

/**
 * wrong_ministry: Update extracted_data.organizations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeWrongMinistry(supabase: any, body: CorrectionBody): Promise<string> {
  if (!body.signal_id) return 'no_signal_id';

  const { data: signal } = await supabase
    .from('intelligence_signals')
    .select('extracted_data')
    .eq('id', body.signal_id)
    .single();

  const extractedData = (signal?.extracted_data as Record<string, unknown>) || {};
  const newOrgs = (body.corrected_values?.organizations as string[]) || [];

  await supabase
    .from('intelligence_signals')
    .update({
      extracted_data: {
        ...extractedData,
        organizations: newOrgs,
      },
    })
    .eq('id', body.signal_id);

  return `updated_organizations_to_${newOrgs.join(',')}`;
}

/**
 * wrong_progress: Update metadata.progress_extraction.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeWrongProgress(supabase: any, body: CorrectionBody): Promise<string> {
  if (!body.signal_id) return 'no_signal_id';

  const { data: signal } = await supabase
    .from('intelligence_signals')
    .select('metadata')
    .eq('id', body.signal_id)
    .single();

  const metadata = (signal?.metadata as Record<string, unknown>) || {};
  const newProgress = body.corrected_values?.progress_extraction || body.corrected_values;

  await supabase
    .from('intelligence_signals')
    .update({
      metadata: {
        ...metadata,
        progress_extraction: newProgress,
        progress_corrected_at: new Date().toISOString(),
        progress_corrected_by: body.created_by || 'admin',
      },
    })
    .eq('id', body.signal_id);

  return `updated_progress_extraction`;
}
