import { getSupabase } from '@/lib/supabase/server';
import { getPilotTracker } from '@/lib/data/pilot-tracker';
import { aiComplete } from './ai-router';

export type PilotOverallHealth = 'strong' | 'watch' | 'needs_attention';
export type PilotActionPriority = 'low' | 'medium' | 'high';

export interface PilotSummaryAction {
  title: string;
  why: string;
  priority: PilotActionPriority;
}

export interface PilotSummaryRecord {
  id: string;
  windowDays: number;
  summaryHeadline: string;
  summaryBody: string;
  overallHealth: PilotOverallHealth;
  confidence: number;
  wins: string[];
  watchItems: string[];
  recommendedActions: PilotSummaryAction[];
  metricsSnapshot: Record<string, unknown>;
  provider: string | null;
  model: string | null;
  generatedByJobId: string | null;
  createdAt: string;
}

interface PilotSummaryModel {
  headline: string;
  summary: string;
  overallHealth: PilotOverallHealth;
  confidence: number;
  wins: string[];
  watchItems: string[];
  recommendedActions: PilotSummaryAction[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseJSON<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function normalizeHealth(value: unknown): PilotOverallHealth {
  if (value === 'strong' || value === 'watch' || value === 'needs_attention') {
    return value;
  }
  return 'watch';
}

function normalizePriority(value: unknown): PilotActionPriority {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return 'medium';
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeActions(value: unknown): PilotSummaryAction[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const action = item as Record<string, unknown>;
      const title = typeof action.title === 'string' ? action.title.trim() : '';
      const why = typeof action.why === 'string' ? action.why.trim() : '';
      if (!title || !why) return null;

      return {
        title,
        why,
        priority: normalizePriority(action.priority),
      } satisfies PilotSummaryAction;
    })
    .filter((item): item is PilotSummaryAction => Boolean(item))
    .slice(0, 5);
}

function mapRow(row: Record<string, unknown>): PilotSummaryRecord {
  return {
    id: String(row.id),
    windowDays: typeof row.window_days === 'number' ? row.window_days : 14,
    summaryHeadline: typeof row.summary_headline === 'string' ? row.summary_headline : 'Pilot summary',
    summaryBody: typeof row.summary_body === 'string' ? row.summary_body : '',
    overallHealth: normalizeHealth(row.overall_health),
    confidence:
      typeof row.confidence === 'number'
        ? clamp(Math.round(row.confidence * 1000) / 1000, 0, 1)
        : 0.5,
    wins: normalizeStringArray(row.wins),
    watchItems: normalizeStringArray(row.watch_items),
    recommendedActions: normalizeActions(row.recommended_actions),
    metricsSnapshot:
      row.metrics_snapshot && typeof row.metrics_snapshot === 'object'
        ? (row.metrics_snapshot as Record<string, unknown>)
        : {},
    provider: typeof row.provider === 'string' ? row.provider : null,
    model: typeof row.model === 'string' ? row.model : null,
    generatedByJobId:
      typeof row.generated_by_job_id === 'string' ? row.generated_by_job_id : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  };
}

function buildMetricsSnapshot(tracker: Awaited<ReturnType<typeof getPilotTracker>>) {
  return {
    window: tracker.window,
    usage: {
      pageViews: tracker.usage.pageViews,
      uniqueVisitors: tracker.usage.uniqueVisitors,
      sessions: tracker.usage.sessions,
      returningVisitors: tracker.usage.returningVisitors,
      topPages: tracker.usage.topPages.slice(0, 5),
      actionCounts: tracker.usage.actionCounts,
      dailyActivity: tracker.usage.dailyActivity,
    },
    feedback: {
      total: tracker.feedback.total,
      averageRating: tracker.feedback.averageRating,
      byType: tracker.feedback.byType,
      byReviewState: tracker.feedback.byReviewState,
      recent: tracker.feedback.recent.map((item) => ({
        feedbackType: item.feedback_type,
        pageContext: item.page_context,
        createdAt: item.created_at,
        aiReviewStatus: item.ai_review_status,
        aiPriority: item.ai_priority,
      })),
    },
    engine: tracker.engine,
    trust: tracker.trust,
  };
}

function buildFallbackSummary(
  tracker: Awaited<ReturnType<typeof getPilotTracker>>,
): PilotSummaryModel {
  const wins: string[] = [];
  const watchItems: string[] = [];
  const recommendedActions: PilotSummaryAction[] = [];

  if (tracker.trust.publicCommitments > 0) {
    wins.push(
      `${tracker.trust.publicCommitments} reviewed public commitments are live in the tracker.`,
    );
  }

  if (tracker.engine.promiseUpdates > 0) {
    wins.push(
      `The engine generated ${tracker.engine.promiseUpdates} commitment updates in the current 14-day window.`,
    );
  }

  if (tracker.usage.pageViews === 0) {
    watchItems.push('Pilot analytics just went live, so there is no visitor traffic data yet.');
    recommendedActions.push({
      title: 'Get first pilot traffic in',
      why: 'You need a small burst of real friend usage before the tracker can tell you what is sticky.',
      priority: 'high',
    });
  }

  if (tracker.engine.jobs.pending > 0) {
    watchItems.push(
      `${tracker.engine.jobs.pending} intelligence jobs are still pending, so some fresh signals are not fully processed yet.`,
    );
    recommendedActions.push({
      title: 'Watch the engine queue',
      why: 'A growing pending queue is the clearest sign that the pilot experience may drift behind the latest evidence.',
      priority: 'medium',
    });
  }

  if (tracker.engine.statusRecommendations.pending > 0) {
    watchItems.push(
      `${tracker.engine.statusRecommendations.pending} status recommendations still need human review before they affect public truth.`,
    );
    recommendedActions.push({
      title: 'Review pending status recommendations',
      why: 'This is one of the highest-leverage ways to keep the public tracker credible during pilot.',
      priority: 'high',
    });
  }

  if (tracker.feedback.total === 0) {
    recommendedActions.push({
      title: 'Prompt pilot users to leave feedback',
      why: 'The feedback loop is live, but you need at least a few real responses to learn what feels confusing or compelling.',
      priority: 'medium',
    });
  }

  const overallHealth: PilotOverallHealth =
    tracker.usage.pageViews === 0 || tracker.engine.jobs.pending > 5
      ? 'watch'
      : 'strong';

  const headline =
    tracker.usage.pageViews === 0
      ? 'Tracking is live, but pilot traffic has not started yet.'
      : 'The pilot is generating real signals and is ready for close watching.';

  return {
    headline,
    summary:
      'OpenClaw summary fallback: the instrumentation is live, the engine is producing real backend facts, and the next truth will come from how friends actually use the product over the next few days.',
    overallHealth,
    confidence: 0.62,
    wins: wins.slice(0, 4),
    watchItems: watchItems.slice(0, 4),
    recommendedActions: recommendedActions.slice(0, 4),
  };
}

function buildPrompt(snapshot: Record<string, unknown>, windowDays: number) {
  return `
You are OpenClaw, the pilot tracker analyst for Nepal Najar.

Your job is to read real backend and usage facts about the app and produce a concise operator summary.

Focus on:
- what is actually happening in the pilot
- whether the product is getting traction yet
- whether the engine looks healthy or risky
- what the founder should pay attention to next

Return ONLY valid JSON with this exact shape:
{
  "headline": "short sentence",
  "summary": "2-4 sentence operator summary",
  "overallHealth": "strong" | "watch" | "needs_attention",
  "confidence": 0.0,
  "wins": ["string"],
  "watchItems": ["string"],
  "recommendedActions": [
    {
      "title": "string",
      "why": "string",
      "priority": "low" | "medium" | "high"
    }
  ]
}

Rules:
- Use only the supplied facts.
- Do not invent traffic, feedback, or adoption.
- If traffic is zero, say so plainly.
- If the engine queue or review backlog is meaningful, call it out.
- Keep the tone direct, useful, and founder-friendly.
- Prefer plain English over hype.

Window: last ${windowDays} days

Facts:
${JSON.stringify(snapshot, null, 2)}
`.trim();
}

function hasMeaningfulSummary(summary: PilotSummaryModel | null) {
  if (!summary) return false;

  const headline = summary.headline.trim().toLowerCase();
  const body = summary.summary.trim().toLowerCase();

  if (
    headline === 'pilot summary' ||
    body === 'openclaw reviewed the current pilot metrics.'
  ) {
    return false;
  }

  return (
    summary.wins.length > 0 ||
    summary.watchItems.length > 0 ||
    summary.recommendedActions.length > 0
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Pilot summary timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function summarizePilotTracker(
  windowDays = 14,
  options?: { trigger?: string; generatedByJobId?: string | null },
): Promise<PilotSummaryRecord> {
  const tracker = await getPilotTracker(windowDays);
  const snapshot = buildMetricsSnapshot(tracker);
  const systemPrompt =
    'You analyze real application telemetry and backend health for a civic product. Be crisp, factual, and conservative.';

  let parsed: PilotSummaryModel | null = null;
  let provider: string | null = null;
  let model: string | null = null;

  try {
    const completion = await withTimeout(
      aiComplete(
        'summarize',
        systemPrompt,
        buildPrompt(snapshot, windowDays),
      ),
      45_000,
    );
    provider = completion.provider;
    model = completion.model;

    if (
      completion.content.toLowerCase().includes('embedded run timeout') ||
      completion.content.toLowerCase().includes('timed out during compaction')
    ) {
      throw new Error('OpenClaw returned a timeout stub');
    }

    const raw = parseJSON<Record<string, unknown>>(completion.content);
    if (raw) {
      parsed = {
        headline:
          typeof raw.headline === 'string' && raw.headline.trim().length > 0
            ? raw.headline.trim()
            : 'Pilot summary',
        summary:
          typeof raw.summary === 'string' && raw.summary.trim().length > 0
            ? raw.summary.trim()
            : 'OpenClaw reviewed the current pilot metrics.',
        overallHealth: normalizeHealth(raw.overallHealth),
        confidence:
          typeof raw.confidence === 'number'
            ? clamp(Math.round(raw.confidence * 1000) / 1000, 0, 1)
            : 0.5,
        wins: normalizeStringArray(raw.wins),
        watchItems: normalizeStringArray(raw.watchItems),
        recommendedActions: normalizeActions(raw.recommendedActions),
      };

      if (!hasMeaningfulSummary(parsed)) {
        parsed = null;
      }
    }
  } catch (error) {
    console.warn('[pilot-summary] OpenClaw summary failed, using fallback:', error);
  }

  const summary = parsed ?? buildFallbackSummary(tracker);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('pilot_summaries')
    .insert({
      window_days: windowDays,
      summary_headline: summary.headline,
      summary_body: summary.summary,
      overall_health: summary.overallHealth,
      confidence: summary.confidence,
      wins: summary.wins,
      watch_items: summary.watchItems,
      recommended_actions: summary.recommendedActions,
      metrics_snapshot: snapshot,
      provider,
      model,
      generated_by_job_id: options?.generatedByJobId ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to persist pilot summary');
  }

  return mapRow(data as Record<string, unknown>);
}

export async function getLatestPilotSummary(
  windowDays = 14,
): Promise<PilotSummaryRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('pilot_summaries')
    .select('*')
    .eq('window_days', windowDays)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code !== '42P01') {
      throw new Error(error.message);
    }
    return null;
  }

  return data ? mapRow(data as Record<string, unknown>) : null;
}
