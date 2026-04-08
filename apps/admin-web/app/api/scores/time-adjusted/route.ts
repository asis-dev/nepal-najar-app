/**
 * GET /api/scores/time-adjusted
 *
 * Returns time-adjusted scores for all commitments.
 * Public endpoint — no auth needed (data is meant for the frontend).
 *
 * Query params:
 *   ?commitmentId=5   — get score for a specific commitment
 *   ?tier=quick-win   — filter by complexity tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeAllTimeAdjustedScores } from '@/lib/intelligence/time-adjusted-score';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const scores = await computeAllTimeAdjustedScores();

    const commitmentId = req.nextUrl.searchParams.get('commitmentId');
    const tier = req.nextUrl.searchParams.get('tier');

    let filtered = scores;
    if (commitmentId) {
      filtered = filtered.filter((s) => s.commitmentId === Number(commitmentId));
    }
    if (tier) {
      filtered = filtered.filter((s) => s.complexityTier === tier);
    }

    return NextResponse.json({
      scores: filtered,
      total: filtered.length,
      dayInOffice: scores[0]?.dayInOffice ?? 0,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
