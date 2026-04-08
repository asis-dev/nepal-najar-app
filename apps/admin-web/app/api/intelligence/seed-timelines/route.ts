/**
 * POST /api/intelligence/seed-timelines
 *
 * Triggers the AI timeline seeder to assign complexity timelines to all commitments.
 * Admin-only endpoint. Costs ~$0.50 for all 109 commitments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateScrapeAuth } from '@/lib/scraper/auth';

export const maxDuration = 300; // 5 min — AI batches take time

export async function POST(req: NextRequest) {
  if (!(await validateScrapeAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const commitmentIds = body.commitmentIds as number[] | undefined;
    const skipExisting = body.skipExisting !== false; // default true
    const batchSize = body.batchSize || 10;

    const { seedTimelines } = await import('@/lib/intelligence/timeline-seeder');
    const result = await seedTimelines({ commitmentIds, skipExisting, batchSize });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
