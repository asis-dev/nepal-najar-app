import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

/**
 * GET /api/promises/daily-activity?date=YYYY-MM-DD
 *
 * Returns which promises had activity on a given date and which did not.
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  // Default to today in Nepal time (UTC+5:45)
  const nepalNow = new Date(Date.now() + 345 * 60_000);
  const defaultDate = nepalNow.toISOString().slice(0, 10);
  const date = request.nextUrl.searchParams.get('date') || defaultDate;

  // Fetch daily activity rows for this date
  const { data: activityRows, error: activityError } = await supabase
    .from('promise_daily_activity')
    .select('*')
    .eq('date', date)
    .order('signal_count', { ascending: false });

  if (activityError) {
    return NextResponse.json(
      { error: activityError.message },
      { status: 500 },
    );
  }

  // Fetch all promises (basic info)
  const { data: allPromises, error: promisesError } = await supabase
    .from('promises')
    .select('id, title, title_ne, status, category, last_activity_date, last_activity_signal_count');

  if (promisesError) {
    return NextResponse.json(
      { error: promisesError.message },
      { status: 500 },
    );
  }

  const activityMap = new Map(
    (activityRows || []).map((row) => [row.promise_id, row]),
  );

  const activePromises = [];
  const inactivePromises = [];
  let totalSignals = 0;

  for (const promise of allPromises || []) {
    const activity = activityMap.get(promise.id);
    if (activity) {
      activePromises.push({
        ...promise,
        signalCount: activity.signal_count,
        confirmsCount: activity.confirms_count,
        contradictsCount: activity.contradicts_count,
        neutralCount: activity.neutral_count,
        topHeadline: activity.top_headline,
        maxConfidence: activity.max_confidence,
        sourceTypes: activity.source_types,
      });
      totalSignals += activity.signal_count || 0;
    } else {
      const lastDate = promise.last_activity_date
        ? new Date(promise.last_activity_date)
        : null;
      const queryDate = new Date(date);
      const daysSinceLastActivity = lastDate
        ? Math.floor(
            (queryDate.getTime() - lastDate.getTime()) / 86_400_000,
          )
        : null;

      inactivePromises.push({
        ...promise,
        daysSinceLastActivity,
      });
    }
  }

  // Sort inactive by staleness (most stale first)
  inactivePromises.sort((a, b) => {
    if (a.daysSinceLastActivity === null) return 1;
    if (b.daysSinceLastActivity === null) return -1;
    return b.daysSinceLastActivity - a.daysSinceLastActivity;
  });

  return NextResponse.json({
    date,
    summary: {
      activeCount: activePromises.length,
      inactiveCount: inactivePromises.length,
      totalSignals,
    },
    activePromises,
    inactivePromises,
  });
}
