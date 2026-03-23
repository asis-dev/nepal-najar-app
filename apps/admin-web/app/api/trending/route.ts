import { NextResponse } from 'next/server';
import { computeTrending, computePulse } from '@/lib/intelligence/trending';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);

  try {
    const [trending, pulse] = await Promise.all([
      withTimeout(computeTrending(), 10000, []),
      withTimeout(computePulse(), 10000, 0),
    ]);

    return NextResponse.json(
      {
        trending: trending.slice(0, limit),
        pulse,
        updatedAt: new Date().toISOString(),
        period: '24h',
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
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
