import { NextResponse } from 'next/server';
import {
  getCachedImpactPrediction,
  getImpactPrediction,
} from '@/lib/intelligence/impact-predictor';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * GET /api/impact?commitment_id=15
 *
 * Returns the AI-generated impact prediction for a commitment.
 * If no cached prediction exists or it's stale (>7d), generates on the fly.
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
    const prediction = allowOnDemandAi
      ? await withTimeout(getImpactPrediction(commitmentId), 30_000, null)
      : await withTimeout(
          getCachedImpactPrediction(commitmentId, { allowStale: true }),
          2_500,
          null,
        );

    if (!prediction) {
      return NextResponse.json(
        {
          error: allowOnDemandAi
            ? 'Impact prediction not available for this commitment'
            : 'Impact prediction not pre-generated yet for this commitment',
          commitmentId,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(prediction, {
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[API /impact] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate impact prediction' },
      { status: 500 },
    );
  }
}
