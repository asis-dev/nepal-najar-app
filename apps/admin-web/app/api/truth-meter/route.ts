import { NextResponse } from 'next/server';
import { computeTruthScore, getAverageTruthScore } from '@/lib/intelligence/truth-meter';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const signalId = searchParams.get('signal_id');
  const promiseId = searchParams.get('promise_id');

  if (!signalId && !promiseId) {
    return NextResponse.json(
      { error: 'Provide signal_id or promise_id query parameter.' },
      { status: 400 },
    );
  }

  try {
    if (signalId) {
      const score = await withTimeout(
        computeTruthScore(signalId),
        15000,
        {
          score: 0,
          label: 'unverified' as const,
          factors: {
            sourceCredibility: 0,
            crossVerification: 0,
            evidenceQuality: 0,
            communityVerification: 0,
          },
          reasoning: 'Timeout computing truth score.',
          sources: [],
        },
      );

      return NextResponse.json(
        { signalId, ...score, computedAt: new Date().toISOString() },
        {
          headers: {
            'Cache-Control': 'public, max-age=600',
          },
        },
      );
    }

    // promise_id path
    const pid = parseInt(promiseId!, 10);
    if (!Number.isFinite(pid)) {
      return NextResponse.json(
        { error: 'promise_id must be a valid number.' },
        { status: 400 },
      );
    }

    const avgScore = await withTimeout(
      getAverageTruthScore(pid),
      15000,
      0,
    );

    return NextResponse.json(
      {
        promiseId: pid,
        averageScore: avgScore,
        label:
          avgScore >= 81
            ? 'verified'
            : avgScore >= 61
              ? 'high'
              : avgScore >= 41
                ? 'moderate'
                : avgScore >= 21
                  ? 'low'
                  : 'unverified',
        computedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=600',
        },
      },
    );
  } catch (err) {
    console.error('[API /truth-meter] Error:', err);
    return NextResponse.json(
      {
        error: 'Failed to compute truth score.',
        details: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    );
  }
}
