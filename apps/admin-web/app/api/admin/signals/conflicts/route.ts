/**
 * GET /api/admin/signals/conflicts
 *
 * Returns commitments that have BOTH "confirms" AND "contradicts" signals.
 * Groups them for admin conflict resolution.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

function isAuthed(request: NextRequest): boolean {
  const adminCookie = request.cookies.get('admin_session')?.value;
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  return !!(
    (adminCookie && adminSecret && adminCookie === adminSecret) ||
    (authHeader && adminSecret && authHeader === `Bearer ${adminSecret}`)
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get all confirms signals with their matched_promise_ids
  const { data: confirmsSignals } = await supabase
    .from('intelligence_signals')
    .select('id, title, url, source_id, confidence, relevance_score, matched_promise_ids, discovered_at, reasoning')
    .eq('classification', 'confirms')
    .not('matched_promise_ids', 'is', null);

  // Get all contradicts signals
  const { data: contradictsSignals } = await supabase
    .from('intelligence_signals')
    .select('id, title, url, source_id, confidence, relevance_score, matched_promise_ids, discovered_at, reasoning')
    .eq('classification', 'contradicts')
    .not('matched_promise_ids', 'is', null);

  // Build promise -> signals map
  const promiseMap: Record<number, { confirms: typeof confirmsSignals; contradicts: typeof contradictsSignals }> = {};

  for (const s of confirmsSignals || []) {
    for (const pid of (s.matched_promise_ids || [])) {
      if (!promiseMap[pid]) promiseMap[pid] = { confirms: [], contradicts: [] };
      promiseMap[pid].confirms!.push(s);
    }
  }

  for (const s of contradictsSignals || []) {
    for (const pid of (s.matched_promise_ids || [])) {
      if (!promiseMap[pid]) promiseMap[pid] = { confirms: [], contradicts: [] };
      promiseMap[pid].contradicts!.push(s);
    }
  }

  // Filter to only promises with BOTH confirms AND contradicts
  const conflicts = Object.entries(promiseMap)
    .filter(([, v]) => v.confirms!.length > 0 && v.contradicts!.length > 0)
    .map(([promiseId, v]) => ({
      promise_id: Number(promiseId),
      confirms_count: v.confirms!.length,
      contradicts_count: v.contradicts!.length,
      confirms_signals: v.confirms,
      contradicts_signals: v.contradicts,
    }))
    .sort((a, b) => (b.confirms_count + b.contradicts_count) - (a.confirms_count + a.contradicts_count));

  // Fetch promise titles
  const promiseIds = conflicts.map((c) => c.promise_id);
  let promiseTitles: Record<number, string> = {};

  if (promiseIds.length > 0) {
    const { data: promises } = await supabase
      .from('promises')
      .select('id, title')
      .in('id', promiseIds);

    if (promises) {
      promiseTitles = Object.fromEntries(promises.map((p) => [p.id, p.title]));
    }
  }

  return NextResponse.json({
    conflicts: conflicts.map((c) => ({
      ...c,
      promise_title: promiseTitles[c.promise_id] || `Commitment #${c.promise_id}`,
    })),
  });
}
