import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

/**
 * GET /api/promises/[id]/signals?date=YYYY-MM-DD&limit=20
 *
 * Returns intelligence signals matched to a specific promise on a given date.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabase();

  // Default to today in Nepal time (UTC+5:45)
  const nepalNow = new Date(Date.now() + 345 * 60_000);
  const defaultDate = nepalNow.toISOString().slice(0, 10);
  const date = request.nextUrl.searchParams.get('date') || defaultDate;
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get('limit') || '20'),
    100,
  );

  // Compute Nepal timezone boundaries for the date
  const todayStart = new Date(`${date}T00:00:00+05:45`).toISOString();
  const tomorrowStart = new Date(
    new Date(`${date}T00:00:00+05:45`).getTime() + 86_400_000,
  ).toISOString();

  const promiseIdNum = Number(id);

  // Fetch signals where matched_promise_ids contains this promise ID
  const { data: signals, error } = await supabase
    .from('intelligence_signals')
    .select(
      'id, title, url, source_id, classification, confidence, relevance_score, discovered_at, content_summary, signal_type',
    )
    .contains('matched_promise_ids', [promiseIdNum])
    .gte('discovered_at', todayStart)
    .lt('discovered_at', tomorrowStart)
    .order('relevance_score', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    promiseId: id,
    date,
    signals: signals || [],
    count: signals?.length || 0,
  });
}
