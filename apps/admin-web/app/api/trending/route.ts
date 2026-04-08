import { NextResponse } from 'next/server';
import {
  computePulse,
  computeTrending,
  getLatestTrendingSnapshot,
  refreshTrendingSnapshot,
  type TrendingItem,
} from '@/lib/intelligence/trending';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const SNAPSHOT_STALE_MS =
  Math.max(
    10 * 60 * 1000,
    Number.parseInt(process.env.INTELLIGENCE_TRENDING_STALE_MS || '', 10) ||
      6 * 60 * 60 * 1000,
  );

function asResponsePayload(
  data: { items: TrendingItem[]; pulse: number; updatedAt: string; period: string },
  limit: number,
) {
  return {
    trending: data.items.slice(0, limit),
    pulse: data.pulse,
    updatedAt: data.updatedAt,
    period: data.period,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);

  try {
    const snapshot = await getLatestTrendingSnapshot('24h');
    if (snapshot) {
      const ageMs = Date.now() - new Date(snapshot.updatedAt).getTime();
      if (ageMs > SNAPSHOT_STALE_MS) {
        void refreshTrendingSnapshot({ force: true }).catch((err) => {
          console.warn(
            '[API /trending] Background snapshot refresh failed:',
            err instanceof Error ? err.message : 'unknown',
          );
        });
      }

      return NextResponse.json(
        asResponsePayload(
          {
            items: snapshot.items,
            pulse: snapshot.pulse,
            updatedAt: snapshot.updatedAt,
            period: snapshot.period,
          },
          limit,
        ),
        {
          headers: {
            'Cache-Control': 'public, max-age=300',
            'CDN-Cache-Control': 'public, max-age=300',
            'Vercel-CDN-Cache-Control': 'public, max-age=300',
          },
        },
      );
    }

    const refreshed = await withTimeout(refreshTrendingSnapshot({ force: true }), 10000, null);
    if (refreshed) {
      return NextResponse.json(
        asResponsePayload(
          {
            items: refreshed.items,
            pulse: refreshed.pulse,
            updatedAt: refreshed.updatedAt,
            period: refreshed.period,
          },
          limit,
        ),
        {
          headers: {
            'Cache-Control': 'public, max-age=300',
            'CDN-Cache-Control': 'public, max-age=300',
            'Vercel-CDN-Cache-Control': 'public, max-age=300',
          },
        },
      );
    }

    // Final fallback for bootstrapping before DB snapshot migration.
    const trending = await withTimeout(computeTrending(), 8000, []);
    const pulse = await withTimeout(computePulse(), 1000, 0);

    return NextResponse.json(
      asResponsePayload(
        {
          items: trending,
          pulse,
          updatedAt: new Date().toISOString(),
          period: '24h',
        },
        limit,
      ),
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
            'CDN-Cache-Control': 'public, max-age=300',
            'Vercel-CDN-Cache-Control': 'public, max-age=300',
        },
      },
    );
  } catch (err) {
    console.error('[API /trending] Error:', err);
    return NextResponse.json(
      { trending: [], pulse: 0, updatedAt: new Date().toISOString(), period: '24h' },
      { status: 200 },
    );
  }
}
