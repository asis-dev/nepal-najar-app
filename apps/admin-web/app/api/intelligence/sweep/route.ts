import { NextRequest, NextResponse } from 'next/server';
import { runFullSweep } from '@/lib/intelligence/sweep';

// POST: Trigger a manual sweep
export async function POST(request: NextRequest) {
  // Auth check
  const auth = request.headers.get('Authorization');
  const secret = process.env.SCRAPE_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const result = await runFullSweep({
      skipCollection: body.skipCollection,
      skipAnalysis: body.skipAnalysis,
      analysisBatchSize: body.batchSize || 15,
      sweepType: 'manual',
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sweep failed' },
      { status: 500 },
    );
  }
}

// GET: Trigger scheduled sweep (for Vercel Cron)
export async function GET(request: NextRequest) {
  const cronSecret =
    request.headers.get('x-vercel-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (
    cronSecret !== process.env.CRON_SECRET &&
    cronSecret !== process.env.SCRAPE_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runFullSweep({
      sweepType: 'scheduled',
      analysisBatchSize: 10,
    });

    return NextResponse.json({
      status: result.status,
      signals: result.totalSignals,
      promisesUpdated: result.analysis.promisesUpdated,
      cost: result.analysis.totalCostUsd,
      duration: result.duration,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sweep failed' },
      { status: 500 },
    );
  }
}

export const maxDuration = 300; // 5 minutes for Vercel
