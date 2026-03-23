import { NextResponse } from 'next/server';
import {
  computeCombinedScore,
  computeAllCombinedScores,
  type CombinedScore,
} from '@/lib/intelligence/combined-scoring';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// In-memory cache for all scores (15 min TTL)
let _allScoresCache: { data: CombinedScore[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const promiseId = searchParams.get('promise_id');

  try {
    // Single promise score
    if (promiseId) {
      const score = await withTimeout(
        computeCombinedScore(promiseId),
        10000,
        null,
      );

      if (!score) {
        return NextResponse.json(
          { error: 'Failed to compute score' },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { score, updatedAt: new Date().toISOString() },
        {
          headers: {
            'Cache-Control': 'public, max-age=300',
          },
        },
      );
    }

    // All scores — use cache if valid
    if (_allScoresCache && Date.now() < _allScoresCache.expiresAt) {
      return NextResponse.json(
        {
          scores: _allScoresCache.data,
          count: _allScoresCache.data.length,
          updatedAt: new Date(_allScoresCache.expiresAt - CACHE_TTL_MS).toISOString(),
          cached: true,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=900',
          },
        },
      );
    }

    const scores = await withTimeout(
      computeAllCombinedScores(),
      30000,
      [] as CombinedScore[],
    );

    // Update cache
    _allScoresCache = {
      data: scores,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return NextResponse.json(
      {
        scores,
        count: scores.length,
        updatedAt: new Date().toISOString(),
        cached: false,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=900',
        },
      },
    );
  } catch (err) {
    console.error('[API /scores] Error:', err);
    return NextResponse.json(
      {
        scores: [],
        count: 0,
        updatedAt: new Date().toISOString(),
        error: 'Internal error computing scores',
      },
      { status: 500 },
    );
  }
}
