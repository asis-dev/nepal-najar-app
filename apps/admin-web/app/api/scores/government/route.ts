/**
 * GET /api/scores/government
 *
 * Returns the current time-adjusted government score.
 * Public endpoint — powers the hero score on the landing page.
 *
 * Query params:
 *   ?recompute=1  — force recompute and store daily snapshot (admin/cron only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeGovernmentScore, recomputeDailyGovernmentScore } from '@/lib/intelligence/time-adjusted-score';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const recompute = req.nextUrl.searchParams.get('recompute') === '1';

    if (recompute) {
      // Check auth for recompute
      const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
      const cronSecret = req.headers.get('x-vercel-cron-secret');
      const expected = process.env.SCRAPE_SECRET;
      const expectedCron = process.env.CRON_SECRET;

      const authed =
        (expected && secret === expected) ||
        (expectedCron && cronSecret === expectedCron);

      if (!authed) {
        return NextResponse.json({ error: 'Unauthorized for recompute' }, { status: 401 });
      }

      const score = await recomputeDailyGovernmentScore();
      return NextResponse.json(score);
    }

    const score = await computeGovernmentScore();
    return NextResponse.json(score, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
