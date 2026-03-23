/**
 * GET /api/admin/signals/stats
 *
 * Returns review stats: pending count, approved/rejected/edited today, classification breakdown.
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

  // Pending review count
  const { count: pendingCount } = await supabase
    .from('intelligence_signals')
    .select('*', { count: 'exact', head: true })
    .or('review_status.is.null,review_status.eq.pending')
    .eq('review_required', true);

  // Today's boundary (Nepal timezone UTC+5:45)
  const nepalNow = new Date(Date.now() + 345 * 60_000);
  const todayStr = nepalNow.toISOString().slice(0, 10);
  const todayStart = new Date(`${todayStr}T00:00:00+05:45`).toISOString();

  // All signals with review history from today
  const { data: allSignals } = await supabase
    .from('intelligence_signals')
    .select('review_status, classification, metadata')
    .not('review_status', 'is', null);

  // Count today's actions from metadata.review_history
  let approvedToday = 0;
  let rejectedToday = 0;
  let editedToday = 0;

  // Classification breakdown
  const classificationCounts: Record<string, number> = {};

  for (const s of allSignals || []) {
    // Classification stats
    const cls = (s.classification as string) || 'unclassified';
    classificationCounts[cls] = (classificationCounts[cls] || 0) + 1;

    // Today review stats
    const meta = s.metadata as Record<string, unknown> | null;
    if (meta && Array.isArray(meta.review_history)) {
      for (const entry of meta.review_history as Array<{ action: string; reviewed_at: string }>) {
        if (entry.reviewed_at >= todayStart) {
          if (entry.action === 'approved') approvedToday++;
          else if (entry.action === 'rejected') rejectedToday++;
          else if (entry.action === 'edited' || entry.action === 'edit') editedToday++;
        }
      }
    }
  }

  return NextResponse.json({
    pending: pendingCount || 0,
    approvedToday,
    rejectedToday,
    editedToday,
    classifications: classificationCounts,
  });
}
