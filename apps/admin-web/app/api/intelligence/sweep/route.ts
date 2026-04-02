import { NextRequest, NextResponse } from 'next/server';
import { runFullSweep } from '@/lib/intelligence/sweep';
import { validateScrapeAuth } from '@/lib/scraper/auth';
import { getSupabase } from '@/lib/supabase/server';
import { sendOpsAlert } from '@/lib/intelligence/ops-alerts';
import {
  bearerMatchesSecret,
  secretsEqual,
} from '@/lib/security/request-auth';

async function releaseStaleRunningSweeps(maxAgeMinutes = 120): Promise<number> {
  const supabase = getSupabase();
  const cutoffIso = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();
  const { data: staleSweeps, error } = await supabase
    .from('intelligence_sweeps')
    .select('id')
    .eq('status', 'running')
    .lt('started_at', cutoffIso);

  if (error || !staleSweeps || staleSweeps.length === 0) return 0;

  const staleIds = staleSweeps.map((row) => row.id);
  const { error: updateError } = await supabase
    .from('intelligence_sweeps')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      summary: 'Sweep marked failed by route guard after exceeding stale threshold.',
    })
    .in('id', staleIds);

  if (updateError) return 0;
  return staleIds.length;
}

async function hasActiveRunningSweep(): Promise<boolean> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from('intelligence_sweeps')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'running');
  return (count || 0) > 0;
}

// POST: Trigger a manual sweep
export async function POST(request: NextRequest) {
  if (!(await validateScrapeAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const staleMinutes = Math.max(
      30,
      Number.parseInt(process.env.INTELLIGENCE_STALE_SWEEP_MINUTES || '90', 10) ||
        90,
    );
    await releaseStaleRunningSweeps(staleMinutes);
    const alreadyRunning = await hasActiveRunningSweep();
    if (alreadyRunning) {
      await sendOpsAlert({
        severity: 'warning',
        source: 'sweep',
        title: 'Sweep skipped (already running)',
        message: 'Manual sweep request skipped because another sweep is already running.',
      });
      return NextResponse.json(
        { status: 'skipped', reason: 'Another sweep is already running' },
        { status: 409 },
      );
    }

    const result = await runFullSweep({
      skipCollection: body.skipCollection,
      skipAnalysis: body.skipAnalysis,
      analysisBatchSize: body.batchSize || 15,
      sweepType: 'manual',
    });

    return NextResponse.json(result);
  } catch (err) {
    await sendOpsAlert({
      severity: 'error',
      source: 'sweep',
      title: 'Manual sweep failed',
      message: err instanceof Error ? err.message : 'Sweep failed with unknown error',
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sweep failed' },
      { status: 500 },
    );
  }
}

// GET: Trigger scheduled sweep (for Vercel Cron)
export async function GET(request: NextRequest) {
  const cronHeaderSecret = request.headers.get('x-vercel-cron-secret');
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth =
    !!cronSecret &&
    (secretsEqual(cronHeaderSecret, cronSecret) || bearerMatchesSecret(request, cronSecret));
  const isScrapeAuth = await validateScrapeAuth(request);

  if (!isCronAuth && !isScrapeAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const staleMinutes = Math.max(
      30,
      Number.parseInt(process.env.INTELLIGENCE_STALE_SWEEP_MINUTES || '90', 10) ||
        90,
    );
    await releaseStaleRunningSweeps(staleMinutes);
    const alreadyRunning = await hasActiveRunningSweep();
    if (alreadyRunning) {
      await sendOpsAlert({
        severity: 'warning',
        source: 'sweep',
        title: 'Scheduled sweep skipped (already running)',
        message: 'Scheduled sweep skipped because another sweep is already running.',
      });
      return NextResponse.json({
        status: 'skipped',
        reason: 'Another sweep is already running',
      });
    }

    const mode = request.nextUrl.searchParams.get('mode') || 'full';
    const isRssOnly = mode === 'rss-only';
    // Scheduled sweeps on Vercel have 300s timeout — ALWAYS skip heavy AI analysis
    // and let the worker cron (runs 15 min later) handle classification.
    // Only manual sweeps (POST) run analysis inline.
    const skipAnalysisByDefault = true;

    const result = await runFullSweep({
      sweepType: 'scheduled',
      analysisBatchSize: isRssOnly ? 5 : 10,
      rssOnly: isRssOnly,
      skipAnalysis: skipAnalysisByDefault,
    });

    return NextResponse.json({
      status: result.status,
      signals: result.totalSignals,
      promisesUpdated: result.analysis.promisesUpdated,
      cost: result.analysis.totalCostUsd,
      duration: result.duration,
    });
  } catch (err) {
    await sendOpsAlert({
      severity: 'error',
      source: 'sweep',
      title: 'Scheduled sweep failed',
      message: err instanceof Error ? err.message : 'Sweep failed with unknown error',
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sweep failed' },
      { status: 500 },
    );
  }
}

export const maxDuration = 300; // 5 minutes for Vercel
