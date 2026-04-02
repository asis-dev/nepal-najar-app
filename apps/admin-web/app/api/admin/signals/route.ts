/**
 * GET /api/admin/signals
 *
 * Admin-only: fetch intelligence signals with filters.
 * Auth: admin Supabase session (legacy ADMIN_SECRET is optional via env opt-in).
 *
 * Query params:
 *   review_status  — pending | approved | edited | rejected
 *   classification — confirms | contradicts | neutral | statement | budget_allocation | policy_change
 *   confidence     — low | medium | high
 *   sort           — date | confidence | relevance_score
 *   limit          — number (default 200)
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/auth/admin';
import { getSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const reviewStatus = sp.get('review_status');
  const classification = sp.get('classification');
  const confidence = sp.get('confidence');
  const sort = sp.get('sort') || 'date';
  const limit = Math.min(Number(sp.get('limit') || '200'), 500);

  const supabase = getSupabase();

  let query = supabase
    .from('intelligence_signals')
    .select(
      'id, title, url, source_id, classification, confidence, relevance_score, matched_promise_ids, review_status, review_required, review_notes, reasoning, discovered_at, content_summary, metadata',
    );

  // Filters
  if (reviewStatus === 'pending') {
    query = query.or('review_status.is.null,review_status.eq.pending');
  } else if (reviewStatus) {
    query = query.eq('review_status', reviewStatus);
  }

  if (classification) {
    query = query.eq('classification', classification);
  }

  if (confidence === 'low') {
    query = query.lt('confidence', 0.5);
  } else if (confidence === 'medium') {
    query = query.gte('confidence', 0.5).lt('confidence', 0.8);
  } else if (confidence === 'high') {
    query = query.gte('confidence', 0.8);
  }

  // Sort
  if (sort === 'confidence') {
    query = query.order('confidence', { ascending: false, nullsFirst: false });
  } else if (sort === 'relevance_score') {
    query = query.order('relevance_score', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('discovered_at', { ascending: false });
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ signals: data || [] });
}
