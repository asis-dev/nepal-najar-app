import { NextRequest, NextResponse } from 'next/server';
import {
  processIntelligenceJobs,
  type IntelligenceJobType,
} from '@/lib/intelligence/jobs';

function isAuthorized(request: NextRequest): boolean {
  const secret =
    request.headers.get('x-vercel-cron-secret') ||
    request.nextUrl.searchParams.get('secret') ||
    request.headers.get('Authorization');

  const cronSecret = process.env.CRON_SECRET;
  const scrapeSecret = process.env.SCRAPE_SECRET;

  return !!(
    (cronSecret && secret === cronSecret) ||
    (scrapeSecret && secret === scrapeSecret) ||
    (scrapeSecret && secret === `Bearer ${scrapeSecret}`)
  );
}

function parseJobTypes(value: unknown): IntelligenceJobType[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed: IntelligenceJobType[] = [
    'process_signals_batch',
    'discover_commitment',
    'transcribe_url',
    'run_status_pipeline',
    'review_feedback',
  ];
  const parsed = value.filter((item): item is IntelligenceJobType =>
    allowed.includes(item as IntelligenceJobType),
  );
  return parsed.length > 0 ? parsed : undefined;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await processIntelligenceJobs({
      limit:
        typeof body.limit === 'number'
          ? Math.max(1, Math.min(body.limit, 5))
          : 1,
      workerId:
        typeof body.workerId === 'string' && body.workerId.trim().length > 0
          ? body.workerId.trim()
          : 'manual-worker',
      jobTypes: parseJobTypes(body.jobTypes),
    });

    return NextResponse.json({ status: 'ok', ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Worker failed' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limitParam = parseInt(request.nextUrl.searchParams.get('limit') || '1', 10);
    const limit = Math.max(1, Math.min(Number.isFinite(limitParam) ? limitParam : 1, 5));
    const result = await processIntelligenceJobs({
      limit,
      workerId: 'scheduled-worker',
    });

    return NextResponse.json({ status: 'ok', ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Worker failed' },
      { status: 500 },
    );
  }
}

export const maxDuration = 300;
