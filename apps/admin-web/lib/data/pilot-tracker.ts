import { getSupabase } from '@/lib/supabase/server';

interface PilotEventRow {
  event_name: string;
  page_path: string | null;
  visitor_id: string;
  session_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  feedback_type: string;
  message: string;
  rating: number | null;
  page_context: string | null;
  status: string;
  ai_review_status: string | null;
  ai_priority: string | null;
  created_at: string;
}

interface StatusRecommendationRow {
  review_state: string | null;
  created_at: string;
}

interface JobRow {
  job_type: string;
  status: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}

interface PromiseUpdateRow {
  promise_id: string;
  field_changed: string;
  created_at: string;
}

interface EvidenceRow {
  id: string;
  promise_id: string;
  classification: string;
  created_at: string;
}

interface VerificationRow {
  id: string;
  promise_id: string;
  verification: string;
  created_at: string;
}

interface PromiseRow {
  id: string;
  is_public: boolean | null;
  review_state: string | null;
  status: string | null;
}

interface SweepRow {
  id: string;
  status: string;
  sweep_type: string;
  started_at: string;
  finished_at: string | null;
  signals_discovered: number | null;
  tier3_analyzed: number | null;
  promises_updated: number | null;
}

async function safeRows<T>(query: PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>) {
  try {
    const { data, error } = await query;
    if (error) {
      if (error.code !== '42P01') {
        console.warn('[pilot-tracker] query failed:', error.message);
      }
      return [] as T[];
    }
    return data ?? [];
  } catch (error) {
    console.warn('[pilot-tracker] unexpected query failure:', error);
    return [] as T[];
  }
}

function groupCount(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}

function formatDay(iso: string) {
  return iso.slice(0, 10);
}

export async function getPilotTracker(days = 14) {
  const db = getSupabase();
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = sinceDate.toISOString();

  const [
    pilotEvents,
    feedbackRows,
    statusRecommendations,
    jobRows,
    promiseUpdates,
    evidenceRows,
    verificationRows,
    promiseRows,
    sweepRows,
  ] = await Promise.all([
    safeRows<PilotEventRow>(
      db
        .from('pilot_events')
        .select('event_name, page_path, visitor_id, session_id, metadata, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false }),
    ),
    safeRows<FeedbackRow>(
      db
        .from('user_feedback')
        .select('id, feedback_type, message, rating, page_context, status, ai_review_status, ai_priority, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(25),
    ),
    safeRows<StatusRecommendationRow>(
      db
        .from('intelligence_status_recommendations')
        .select('review_state, created_at')
        .gte('created_at', sinceIso),
    ),
    safeRows<JobRow>(
      db
        .from('intelligence_jobs')
        .select('job_type, status, attempts, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ),
    safeRows<PromiseUpdateRow>(
      db
        .from('promise_updates')
        .select('promise_id, field_changed, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(100),
    ),
    safeRows<EvidenceRow>(
      db
        .from('citizen_evidence')
        .select('id, promise_id, classification, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false }),
    ),
    safeRows<VerificationRow>(
      db
        .from('progress_verifications')
        .select('id, promise_id, verification, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false }),
    ),
    safeRows<PromiseRow>(
      db
        .from('promises')
        .select('id, is_public, review_state, status'),
    ),
    safeRows<SweepRow>(
      db
        .from('intelligence_sweeps')
        .select('id, status, sweep_type, started_at, finished_at, signals_discovered, tier3_analyzed, promises_updated')
        .order('started_at', { ascending: false })
        .limit(8),
    ),
  ]);

  const pageViews = pilotEvents.filter((event) => event.event_name === 'page_view');
  const actionEvents = pilotEvents.filter((event) => event.event_name !== 'page_view');
  const uniqueVisitors = new Set(pageViews.map((event) => event.visitor_id));
  const sessions = new Set(pageViews.map((event) => event.session_id));

  const visitorSessions = new Map<string, Set<string>>();
  for (const event of pageViews) {
    const existing = visitorSessions.get(event.visitor_id) ?? new Set<string>();
    existing.add(event.session_id);
    visitorSessions.set(event.visitor_id, existing);
  }

  const returningVisitors = [...visitorSessions.values()].filter((sessionSet) => sessionSet.size > 1).length;

  const pageStats = new Map<string, { views: number; visitors: Set<string> }>();
  for (const view of pageViews) {
    const key = view.page_path || '(unknown)';
    const current = pageStats.get(key) ?? { views: 0, visitors: new Set<string>() };
    current.views += 1;
    current.visitors.add(view.visitor_id);
    pageStats.set(key, current);
  }

  const topPages = [...pageStats.entries()]
    .map(([path, stat]) => ({
      path,
      views: stat.views,
      uniqueVisitors: stat.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const dailyViewMap = new Map<string, number>();
  const dailyActionMap = new Map<string, number>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dailyViewMap.set(day, 0);
    dailyActionMap.set(day, 0);
  }

  for (const event of pageViews) {
    const day = formatDay(event.created_at);
    dailyViewMap.set(day, (dailyViewMap.get(day) ?? 0) + 1);
  }

  for (const event of actionEvents) {
    const day = formatDay(event.created_at);
    dailyActionMap.set(day, (dailyActionMap.get(day) ?? 0) + 1);
  }

  const actionCounts = groupCount(actionEvents.map((event) => event.event_name));
  const feedbackTypeCounts = groupCount(feedbackRows.map((row) => row.feedback_type));
  const feedbackReviewCounts = groupCount(feedbackRows.map((row) => row.ai_review_status || 'pending'));
  const jobStatusCounts = groupCount(jobRows.map((row) => row.status));
  const jobTypeCounts = groupCount(jobRows.map((row) => row.job_type));
  const recommendationCounts = groupCount(statusRecommendations.map((row) => row.review_state || 'pending'));

  const ratings = feedbackRows.map((row) => row.rating).filter((rating): rating is number => typeof rating === 'number');
  const averageRating = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : null;

  const latestSweep = sweepRows[0] ?? null;
  const runningSweeps = sweepRows.filter((row) => row.status === 'running').length;
  const publicCommitments = promiseRows.filter((row) => row.is_public !== false).length;
  const candidateCommitments = promiseRows.filter((row) => row.is_public === false).length;
  const reviewedCommitments = promiseRows.filter((row) => row.review_state === 'reviewed').length;
  const rejectedRecommendations = recommendationCounts.get('rejected') ?? 0;
  const acceptedRecommendations = (recommendationCounts.get('approved') ?? 0) + (recommendationCounts.get('applied') ?? 0);
  const recommendationDecisionBase = rejectedRecommendations + acceptedRecommendations;

  return {
    window: {
      days,
      sinceIso,
    },
    usage: {
      pageViews: pageViews.length,
      uniqueVisitors: uniqueVisitors.size,
      sessions: sessions.size,
      returningVisitors,
      topPages,
      dailyActivity: [...dailyViewMap.entries()].map(([day, views]) => ({
        day,
        views,
        actions: dailyActionMap.get(day) ?? 0,
      })),
      actionCounts: {
        watchlistAdds: actionCounts.get('watchlist_add') ?? 0,
        watchlistRemovals: actionCounts.get('watchlist_remove') ?? 0,
        hometownSet: actionCounts.get('hometown_set') ?? 0,
        feedbackSubmits: actionCounts.get('feedback_submit') ?? 0,
        evidenceSubmits: actionCounts.get('evidence_submit') ?? 0,
        verifyProgress: actionCounts.get('verify_progress') ?? 0,
      },
    },
    feedback: {
      total: feedbackRows.length,
      averageRating,
      byType: [...feedbackTypeCounts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      byReviewState: [...feedbackReviewCounts.entries()]
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count),
      recent: feedbackRows.slice(0, 6),
    },
    engine: {
      latestSweep,
      runningSweeps,
      jobs: {
        pending: jobStatusCounts.get('pending') ?? 0,
        running: jobStatusCounts.get('running') ?? 0,
        completed: jobStatusCounts.get('completed') ?? 0,
        failed: jobStatusCounts.get('failed') ?? 0,
        retrying: jobStatusCounts.get('retrying') ?? 0,
      },
      jobTypes: [...jobTypeCounts.entries()]
        .map(([jobType, count]) => ({ jobType, count }))
        .sort((a, b) => b.count - a.count),
      promiseUpdates: promiseUpdates.length,
      evidenceRows: evidenceRows.length,
      verificationRows: verificationRows.length,
      statusRecommendations: {
        pending: recommendationCounts.get('pending') ?? 0,
        approved: recommendationCounts.get('approved') ?? 0,
        rejected: recommendationCounts.get('rejected') ?? 0,
        applied: recommendationCounts.get('applied') ?? 0,
      },
      recommendationRejectionRate:
        recommendationDecisionBase > 0
          ? rejectedRecommendations / recommendationDecisionBase
          : 0,
    },
    trust: {
      publicCommitments,
      candidateCommitments,
      reviewedCommitments,
    },
  };
}

