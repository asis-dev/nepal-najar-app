import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSignalAnalysisJobsQueued,
  processIntelligenceJobs,
  type IntelligenceJobType,
} from '@/lib/intelligence/jobs';
import { translatePendingNepaliSignals } from '@/lib/intelligence/translate';
import { generateDailyBrief } from '@/lib/intelligence/daily-brief';
import { generateAndStoreDailyAudio } from '@/lib/intelligence/brief-narrator';
import { refreshTrendingSnapshot } from '@/lib/intelligence/trending';
import { sendOpsAlert } from '@/lib/intelligence/ops-alerts';
import {
  bearerMatchesSecret,
  getBearerToken,
  secretsEqual,
} from '@/lib/security/request-auth';

function isAuthorized(request: NextRequest): boolean {
  const bearerSecret = getBearerToken(request);
  const cronHeaderSecret = request.headers.get('x-vercel-cron-secret');

  const cronSecret = process.env.CRON_SECRET;
  const scrapeSecret = process.env.SCRAPE_SECRET;

  const isCronAuth =
    !!cronSecret &&
    (secretsEqual(cronHeaderSecret, cronSecret) || secretsEqual(bearerSecret, cronSecret));
  const isScrapeAuth =
    bearerMatchesSecret(request, scrapeSecret);

  return isCronAuth || isScrapeAuth;
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

function parseJobTypesFromSearchParams(
  value: string | null,
): IntelligenceJobType[] | undefined {
  if (!value) return undefined;
  const raw = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (raw.length === 0) return undefined;
  return parseJobTypes(raw);
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
    const limit = parseBoundedInt(body.limit, 1, 1, 25);
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

    const trendingResult =
      includesSignalAnalysis(jobTypes) && result.completed > 0
        ? await regenerateTrendingSnapshot()
        : null;

    // Auto-regenerate daily brief + audio after signal processing
    let briefResult: { regenerated: boolean; audioGenerated: boolean; error?: string } | null = null;
    if (includesSignalAnalysis(jobTypes) && body.regenerateBrief !== false) {
      briefResult = await regenerateBriefAndAudio();
    }

    // Pre-warm commitment briefings made stale by freshly classified signals
    const briefingPrewarm = includesSignalAnalysis(jobTypes) && result.completed > 0
      ? await prewarmStaleBriefings()
      : null;

    return NextResponse.json({
      status: 'ok',
      bootstrap,
      translation,
      trendingResult,
      briefResult,
      briefingPrewarm,
      ...result,
    });
  } catch (err) {
    await sendOpsAlert({
      severity: 'error',
      source: 'worker',
      title: 'Manual worker failed',
      message: err instanceof Error ? err.message : 'Worker failed with unknown error',
    });
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
    const limit = Math.max(1, Math.min(Number.isFinite(limitParam) ? limitParam : 1, 25));
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
    const jobTypes = parseJobTypesFromSearchParams(
      request.nextUrl.searchParams.get('jobTypes'),
    );
    const bootstrap = includesSignalAnalysis(jobTypes)
      ? await ensureSignalAnalysisJobsQueued({
          batchSize,
          trigger: `scheduled-worker-${Date.now()}`,
        })
      : null;
    const result = await processIntelligenceJobs({
      limit,
      workerId: 'scheduled-worker',
      jobTypes,
    });

    const translation = includesSignalAnalysis(jobTypes)
      ? await translatePendingNepaliSignals(translationBatchSize)
      : null;

    const trendingResult =
      includesSignalAnalysis(jobTypes) && result.completed > 0
        ? await regenerateTrendingSnapshot()
        : null;

    // Auto-regenerate daily brief + audio after scheduled worker run
    const briefResult = includesSignalAnalysis(jobTypes)
      ? await regenerateBriefAndAudio()
      : null;

    // Pre-warm commitment briefings made stale by freshly classified signals
    const briefingPrewarm = includesSignalAnalysis(jobTypes) && result.completed > 0
      ? await prewarmStaleBriefings()
      : null;

    return NextResponse.json({
      status: 'ok',
      bootstrap,
      translation,
      trendingResult,
      briefResult,
      briefingPrewarm,
      ...result,
    });
  } catch (err) {
    await sendOpsAlert({
      severity: 'error',
      source: 'worker',
      title: 'Scheduled worker failed',
      message: err instanceof Error ? err.message : 'Worker failed with unknown error',
    });
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

/**
 * Pre-warm commitment briefings whose newest matched signal is newer than the
 * cached briefing. Runs after the worker classifies signals (matched_promise_ids
 * is set inside the brain pass), so this is the natural place to refresh briefings.
 * Capped at 10 commitments per worker run to bound AI cost.
 */
async function prewarmStaleBriefings(): Promise<{
  warmed: number;
  failed: number;
  candidates: number;
  stale: number;
}> {
  try {
    const { getSupabase } = await import('@/lib/supabase/server');
    const supabase = getSupabase();
    const lookbackIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentMatched } = await supabase
      .from('intelligence_signals')
      .select('matched_promise_ids, discovered_at')
      .gte('discovered_at', lookbackIso)
      .not('matched_promise_ids', 'eq', '{}')
      .limit(5000);

    const newestSignalAt = new Map<number, number>();
    for (const sig of recentMatched || []) {
      const ts = new Date((sig as { discovered_at: string }).discovered_at).getTime();
      const ids = ((sig as { matched_promise_ids: number[] | null }).matched_promise_ids) || [];
      for (const id of ids) {
        const prev = newestSignalAt.get(id) || 0;
        if (ts > prev) newestSignalAt.set(id, ts);
      }
    }

    if (newestSignalAt.size === 0) {
      return { warmed: 0, failed: 0, candidates: 0, stale: 0 };
    }

    const candidateIds = Array.from(newestSignalAt.keys());
    const { data: existing } = await supabase
      .from('commitment_briefings')
      .select('commitment_id, generated_at')
      .in('commitment_id', candidateIds);

    const briefingAt = new Map<number, number>();
    for (const row of existing || []) {
      briefingAt.set(
        (row as { commitment_id: number }).commitment_id,
        new Date((row as { generated_at: string }).generated_at).getTime(),
      );
    }

    const stale = candidateIds.filter((id) => {
      const sig = newestSignalAt.get(id) || 0;
      const brief = briefingAt.get(id) || 0;
      return brief < sig;
    });

    const capped = stale
      .sort((a, b) => (newestSignalAt.get(b)! - (briefingAt.get(b) || 0)) - (newestSignalAt.get(a)! - (briefingAt.get(a) || 0)))
      .slice(0, 10);

    if (capped.length === 0) {
      return { warmed: 0, failed: 0, candidates: candidateIds.length, stale: stale.length };
    }

    const { generateBriefingBatch } = await import('@/lib/intelligence/commitment-briefing');
    const result = await generateBriefingBatch(capped);
    return {
      warmed: result.generated,
      failed: result.failed,
      candidates: candidateIds.length,
      stale: stale.length,
    };
  } catch (err) {
    console.warn('[Worker] Briefing pre-warm error:', err instanceof Error ? err.message : 'unknown');
    return { warmed: 0, failed: 0, candidates: 0, stale: 0 };
  }
}

async function regenerateTrendingSnapshot(): Promise<{
  refreshed: boolean;
  pulse: number;
  error?: string;
}> {
  try {
    const snapshot = await refreshTrendingSnapshot({ force: true });
    return {
      refreshed: !!snapshot,
      pulse: snapshot?.pulse || 0,
    };
  } catch (err) {
    console.warn(
      '[Worker] Trending snapshot refresh error:',
      err instanceof Error ? err.message : 'unknown',
    );
    return {
      refreshed: false,
      pulse: 0,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

export const maxDuration = 800; // ~13 minutes — handles large classification batches
