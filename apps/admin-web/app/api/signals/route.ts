import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { isSignalVisibleToPublic } from '@/lib/intelligence/review-visibility';

interface SignalRow {
  id: string;
  classification: string | null;
  matched_promise_ids: number[] | null;
  discovered_at: string | null;
  review_required: boolean | null;
  review_status: string | null;
}

/**
 * GET /api/signals
 *
 * Lightweight public endpoint used by the homepage contradiction badge.
 * Query params:
 * - classification (optional): e.g. contradicts, confirms
 * - days (optional, default 7, max 90)
 * - limit (optional, default 500, max 2000)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const classification = searchParams.get('classification');
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 7, 1), 90);
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 500, 1), 2000);

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabase();

  let query = supabase
    .from('intelligence_signals')
    .select(
      'id, classification, matched_promise_ids, discovered_at, review_required, review_status',
    )
    .not('matched_promise_ids', 'is', null)
    .gte('discovered_at', cutoff)
    .order('discovered_at', { ascending: false })
    .limit(limit);

  if (classification) {
    query = query.eq('classification', classification);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load signals', details: error.message },
      { status: 500 },
    );
  }

  const rows = ((data || []) as SignalRow[]).filter((row) =>
    isSignalVisibleToPublic({
      review_required: row.review_required,
      review_status: row.review_status,
    }),
  );
  const commitmentIds = new Set<number>();

  const signals = rows.map((row) => {
    const ids = Array.isArray(row.matched_promise_ids)
      ? row.matched_promise_ids.filter((id) => Number.isFinite(Number(id)))
      : [];

    for (const id of ids) {
      commitmentIds.add(Number(id));
    }

    const firstId = ids[0] ?? null;
    return {
      id: row.id,
      classification: row.classification,
      discovered_at: row.discovered_at,
      matched_promise_ids: ids,
      promise_id: firstId,
      commitment_id: firstId,
    };
  });

  return NextResponse.json({
    commitmentCount: commitmentIds.size,
    signalCount: signals.length,
    signals,
    updated_at: new Date().toISOString(),
  });
}
