import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

/**
 * GET /api/scan-stats
 * Returns today's scan statistics for the header badge.
 * Lightweight — just counts.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const today = new Date().toISOString().slice(0, 10);

    // Count signals discovered today
    const { count: signalsToday } = await supabase
      .from('intelligence_signals')
      .select('*', { count: 'exact', head: true })
      .gte('discovered_at', today);

    // Count unique sources active today
    const { data: sourcesData } = await supabase
      .from('intelligence_signals')
      .select('source_id')
      .gte('discovered_at', today);

    const uniqueSources = new Set(sourcesData?.map((s) => s.source_id) || []);

    return NextResponse.json(
      {
        signalsToday: signalsToday || 0,
        sourcesToday: uniqueSources.size,
        date: today,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    console.error('[API /scan-stats] Error:', err);
    return NextResponse.json({ signalsToday: 0, sourcesToday: 0 }, { status: 500 });
  }
}
