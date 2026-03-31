import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSignalAnalysisJobsQueued,
  processIntelligenceJobs,
  type IntelligenceJobType,
} from '@/lib/intelligence/jobs';
import { translatePendingNepaliSignals } from '@/lib/intelligence/translate';
import { generateDailyBrief } from '@/lib/intelligence/daily-brief';
import { generateAndStoreDailyAudio } from '@/lib/intelligence/brief-narrator';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  const bearerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : authHeader;

  const secret =
    request.headers.get('x-vercel-cron-secret') ||
    request.nextUrl.searchParams.get('secret') ||
    bearerSecret;

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
    'discover_corruption',
    'transcribe_url',
    'run_status_pipeline',
    'review_feedback',
    'summarize_pilot_tracker',
  ];
  const parsed = value.filter((item): item is IntelligenceJobType =>
    allowed.includes(item as IntelligenceJobType),
  );
  return parsed.length > 0 ? parsed : undefined;
}

function parseBoundedInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseInt(value, 10)
        : NaN;

  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function includesSignalAnalysis(jobTypes?: IntelligenceJobType[]): boolean {
  return !jobTypes || jobTypes.includes('process_signals_batch');
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const jobTypes = parseJobTypes(body.jobTypes);
    const limit = parseBoundedInt(body.limit, 1, 1, 10);
    const batchSize = parseBoundedInt(body.batchSize, 5, 1, 50);
    const translationBatchSize = parseBoundedInt(
      body.translationBatchSize,
      10,
      1,
      50,
    );

    const bootstrap = includesSignalAnalysis(jobTypes)
      ? await ensureSignalAnalysisJobsQueued({
          batchSize,
          trigger: `manual-worker-${Date.now()}`,
        })
      : null;

    const result = await processIntelligenceJobs({
      limit,
      workerId:
        typeof body.workerId === 'string' && body.workerId.trim().length > 0
          ? body.workerId.trim()
          : 'manual-worker',
      jobTypes,
    });

    const translation = includesSignalAnalysis(jobTypes)
      ? await translatePendingNepaliSignals(translationBatchSize)
      : null;

    // Auto-regenerate daily brief + audio after signal processing
    let briefResult: { regenerated: boolean; audioGenerated: boolean; error?: string } | null = null;
    if (includesSignalAnalysis(jobTypes) && body.regenerateBrief !== false) {
      briefResult = await regenerateBriefAndAudio();
    }

    return NextResponse.json({ status: 'ok', bootstrap, translation, briefResult, ...result });
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
    const limit = Math.max(1, Math.min(Number.isFinite(limitParam) ? limitParam : 1, 10));
    const batchSize = parseBoundedInt(
      request.nextUrl.searchParams.get('batchSize'),
      5,
      1,
      50,
    );
    const translationBatchSize = parseBoundedInt(
      request.nextUrl.searchParams.get('translationBatchSize'),
      10,
      1,
      50,
    );
    const bootstrap = await ensureSignalAnalysisJobsQueued({
      batchSize,
      trigger: `scheduled-worker-${Date.now()}`,
    });
    const result = await processIntelligenceJobs({
      limit,
      workerId: 'scheduled-worker',
    });

    const translation = await translatePendingNepaliSignals(translationBatchSize);

    // Auto-regenerate daily brief + audio after scheduled worker run
    const briefResult = await regenerateBriefAndAudio();

    return NextResponse.json({ status: 'ok', bootstrap, translation, briefResult, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Worker failed' },
      { status: 500 },
    );
  }
}

async function regenerateBriefAndAudio(): Promise<{
  regenerated: boolean;
  audioGenerated: boolean;
  error?: string;
}> {
  try {
    const brief = await generateDailyBrief();
    let audioGenerated = false;
    try {
      const audioResult = await generateAndStoreDailyAudio(brief);
      audioGenerated = !!audioResult.audioUrl;
    } catch (audioErr) {
      console.warn('[Worker] Brief audio error:', audioErr instanceof Error ? audioErr.message : 'unknown');
    }
    return { regenerated: true, audioGenerated };
  } catch (err) {
    console.warn('[Worker] Brief regen error:', err instanceof Error ? err.message : 'unknown');
    return { regenerated: false, audioGenerated: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

export const maxDuration = 300;
