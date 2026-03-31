import { NextResponse } from 'next/server';
import {
  getCachedCommitmentBriefing,
  getCommitmentBriefing,
} from '@/lib/intelligence/commitment-briefing';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * GET /api/briefing?commitment_id=15
 *
 * Returns the AI-generated briefing for a commitment.
 * If no cached briefing exists or it's stale (>6h), generates on the fly.
 * Public — no auth required.
 */
export async function GET(request: Request) {
  const allowOnDemandAi = process.env.INTELLIGENCE_ALLOW_ON_DEMAND_PUBLIC_AI === 'true';
  const { searchParams } = new URL(request.url);
  const commitmentIdStr = searchParams.get('commitment_id');

  if (!commitmentIdStr) {
    return NextResponse.json(
      { error: 'Missing required parameter: commitment_id' },
      { status: 400 },
    );
  }

  const commitmentId = parseInt(commitmentIdStr, 10);
  if (!Number.isFinite(commitmentId) || commitmentId <= 0) {
    return NextResponse.json(
      { error: 'Invalid commitment_id: must be a positive integer' },
      { status: 400 },
    );
  }

  try {
    const briefing = allowOnDemandAi
      ? await withTimeout(getCommitmentBriefing(commitmentId), 30_000, null)
      : await withTimeout(
          getCachedCommitmentBriefing(commitmentId, { allowStale: true }),
          2_500,
          null,
        );

    if (!briefing) {
      return NextResponse.json(
        {
          error: allowOnDemandAi
            ? 'Briefing not available for this commitment'
            : 'Briefing not pre-generated yet for this commitment',
          commitmentId,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(briefing, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[API /briefing] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate commitment briefing' },
      { status: 500 },
    );
  }
}
