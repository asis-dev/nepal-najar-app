/**
 * Time-Adjusted Scoring Engine
 *
 * Replaces the static Republic Score formula with a dynamic system that answers:
 * "Are they doing what we'd EXPECT at this point in time?"
 *
 * On Day 9, intent signals (speeches, plans) are expected and valuable.
 * On Day 180, only delivery matters.
 *
 * Each commitment is scored against its own AI-assigned timeline, not against
 * a universal finish line.
 *
 * Zero additional AI cost per computation — reads data already classified by brain.ts.
 * The only AI cost is the one-time timeline seeding (~$0.50 for all 109).
 */

import { getSupabase } from '@/lib/supabase/server';
import { dayInOffice as getDayInOffice, INAUGURATION_DATE } from './government-era';
import {
  type ComplexityTier,
  type TimelinePhase,
  type Trajectory,
  type EffortTier,
  type TimeAdjustedCommitmentScore,
  type TimeAdjustedGovernmentScore,
  type CommitmentTimeline,
  TIER_DEFAULTS,
  getTimelinePhase,
  getEffortWeights,
  getTierImportanceWeights,
  scoreToGrade,
  inferEffortTier,
} from './commitment-timeline';

/* ═══════════════════════════════════════════════
   SIGNAL SCORING INFRASTRUCTURE
   Reused from live-score-engine.ts
   ═══════════════════════════════════════════════ */

const SOURCE_TYPE_AUTHORITY: Record<string, number> = {
  document: 1.5, press_release: 1.5, budget_doc: 1.5,
  gov_portal: 1.3, article: 1.0, youtube: 0.9,
  post: 0.7, tweet: 0.7, reddit: 0.5,
};

function recencyDecay(publishedAt: string | null, now: number): number {
  if (!publishedAt) return 0.5;
  const daysSince = (now - new Date(publishedAt).getTime()) / (24 * 60 * 60 * 1000);
  return Math.exp(-daysSince / 30);
}

/* ═══════════════════════════════════════════════
   FETCH TIMELINES
   ═══════════════════════════════════════════════ */

let _timelineCache: { data: Map<number, CommitmentTimeline>; at: number } | null = null;
const TIMELINE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchTimelines(): Promise<Map<number, CommitmentTimeline>> {
  if (_timelineCache && Date.now() - _timelineCache.at < TIMELINE_CACHE_TTL) {
    return _timelineCache.data;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('commitment_timelines')
    .select('*');

  const map = new Map<number, CommitmentTimeline>();
  if (data && !error) {
    for (const row of data) {
      map.set(row.commitment_id, {
        commitmentId: row.commitment_id,
        complexityTier: row.complexity_tier as ComplexityTier,
        expectedStartByDay: row.expected_start_by_day,
        expectedCompletionByDay: row.expected_completion_by_day,
        startMilestones: row.start_milestones || [],
        completionMilestones: row.completion_milestones || [],
        rationale: row.rationale || '',
        generatedAt: row.generated_at,
        generatedByModel: row.generated_by_model || '',
        adminOverride: row.admin_override || false,
      });
    }
  }

  _timelineCache = { data: map, at: Date.now() };
  return map;
}

/** Get timeline for a commitment, falling back to default tier values */
function getTimeline(
  timelines: Map<number, CommitmentTimeline>,
  commitmentId: number,
): CommitmentTimeline {
  const stored = timelines.get(commitmentId);
  if (stored) return stored;

  // Fallback: assume medium complexity
  return {
    commitmentId,
    complexityTier: 'medium',
    expectedStartByDay: TIER_DEFAULTS.medium.startBy,
    expectedCompletionByDay: TIER_DEFAULTS.medium.completeBy,
    startMilestones: [],
    completionMilestones: [],
    rationale: 'Default timeline (AI timeline not yet assigned)',
    generatedAt: new Date().toISOString(),
    generatedByModel: 'default',
    adminOverride: false,
  };
}

/* ═══════════════════════════════════════════════
   FETCH SIGNALS
   ═══════════════════════════════════════════════ */

interface SignalRow {
  id: string;
  matched_promise_ids: number[] | null;
  classification: string | null;
  effort_tier: string | null;
  confidence: number | null;
  signal_type: string;
  source_id: string;
  published_at: string | null;
  discovered_at: string;
}

async function fetchPostInaugurationSignals(): Promise<SignalRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('intelligence_signals')
    .select('id, matched_promise_ids, classification, effort_tier, confidence, signal_type, source_id, published_at, discovered_at')
    .gte('discovered_at', INAUGURATION_DATE)
    .not('classification', 'is', null)
    .not('matched_promise_ids', 'is', null);

  if (error || !data) return [];
  return data as SignalRow[];
}

/* ═══════════════════════════════════════════════
   PER-COMMITMENT SCORING
   ═══════════════════════════════════════════════ */

function computeCommitmentScore(
  commitmentId: number,
  signals: SignalRow[],
  timeline: CommitmentTimeline,
  currentDay: number,
): TimeAdjustedCommitmentScore {
  const now = Date.now();

  // Count signals by effort tier
  let intentCount = 0, actionCount = 0, deliveryCount = 0;
  let totalWeightedEffort = 0;

  for (const s of signals) {
    const tier: EffortTier = (s.effort_tier as EffortTier) || inferEffortTier(s.classification);
    const confidence = s.confidence ?? 0.5;
    const recency = recencyDecay(s.published_at || s.discovered_at, now);
    const authority = SOURCE_TYPE_AUTHORITY[s.signal_type] || 1.0;
    const signalWeight = confidence * recency * authority;

    switch (tier) {
      case 'intent': intentCount++; break;
      case 'action': actionCount++; break;
      case 'delivery': deliveryCount++; break;
    }
    totalWeightedEffort += signalWeight;
  }

  const signalCount = signals.length;

  // Get dynamic effort weights for current time + tier (use actual timeline, not default)
  const weights = getEffortWeights(currentDay, timeline.complexityTier, timeline.expectedCompletionByDay);

  // Weighted effort score: how much meaningful effort has been detected
  const rawEffort =
    intentCount * weights.intent +
    actionCount * weights.action +
    deliveryCount * weights.delivery;

  // Normalize to 0-100 (sigmoid-like curve)
  // At 4 weighted signals: 4/(4+4) = 50%. At 10: 10/(10+4) = 71%. At 20: 20/(20+4) = 83%.
  const effortScore = Math.min(100, Math.round((rawEffort / (rawEffort + 4)) * 100));

  // Determine timeline phase
  const phase = getTimelinePhase(
    currentDay,
    timeline.expectedStartByDay,
    timeline.expectedCompletionByDay,
  );

  // Time-adjusted score: modify effort score based on timeline expectations
  let timeAdjustedScore = effortScore;
  let trajectory: Trajectory = 'on-track';

  switch (phase) {
    case 'pre-start':
      // It's too early for this commitment
      if (signalCount === 0) {
        timeAdjustedScore = 50; // Neutral — not expected to have started
        trajectory = 'too-early';
      } else if (actionCount > 0 || deliveryCount > 0) {
        // Concrete action/delivery before expected start = genuinely ahead
        timeAdjustedScore = Math.min(80, effortScore + 15);
        trajectory = 'ahead';
      } else {
        // Only intent signals — good but not remarkable pre-start
        // Cap at 55 so pre-start intent doesn't inflate the overall score
        timeAdjustedScore = Math.min(55, effortScore + 5);
        trajectory = signalCount >= 3 ? 'ahead' : 'too-early';
      }
      break;

    case 'should-start':
      // We expect at least intent signals by now
      if (signalCount === 0) {
        timeAdjustedScore = 35; // Slightly concerning
        trajectory = 'behind';
      } else if (intentCount > 0 || actionCount > 0) {
        timeAdjustedScore = Math.max(effortScore, 55); // At least adequate
        trajectory = effortScore >= 40 ? 'on-track' : 'on-track';
      }
      break;

    case 'in-window':
      // Active window — score reflects how far along they should be
      {
        const windowProgress = (currentDay - timeline.expectedStartByDay) /
          (timeline.expectedCompletionByDay - timeline.expectedStartByDay);
        const expectedEffort = windowProgress * 70; // By end of window, expect ~70% effort

        if (effortScore >= expectedEffort * 1.2) {
          trajectory = 'ahead';
          timeAdjustedScore = Math.min(100, effortScore + 10);
        } else if (effortScore >= expectedEffort * 0.6) {
          trajectory = 'on-track';
          timeAdjustedScore = Math.max(effortScore, 45); // On-track = at least 45
        } else if (signalCount > 0) {
          trajectory = 'behind';
          timeAdjustedScore = Math.max(20, effortScore - 10);
        } else {
          // No signals — but how far into the window are we?
          // Early in window (< 20%): give benefit of the doubt (40 = slightly below neutral)
          // Mid window (20-50%): concerning (30)
          // Late window (> 50%): clearly behind (15)
          if (windowProgress < 0.2) {
            trajectory = 'on-track'; // Very early in window, no panic
            timeAdjustedScore = 40;
          } else if (windowProgress < 0.5) {
            trajectory = 'behind';
            timeAdjustedScore = 30;
          } else {
            trajectory = 'behind';
            timeAdjustedScore = 15;
          }
        }
      }
      break;

    case 'overdue':
      // Past expected completion — delivery signals are critical
      if (deliveryCount > 0) {
        trajectory = 'on-track'; // Better late than never
      } else if (actionCount > 0) {
        trajectory = 'behind';
        timeAdjustedScore = Math.max(15, effortScore - 20);
      } else {
        trajectory = 'overdue';
        timeAdjustedScore = Math.max(5, effortScore - 30);
      }
      break;
  }

  // Data confidence
  const dataConfidence =
    signalCount >= 8 ? 'sufficient' :
    signalCount >= 3 ? 'partial' : 'insufficient';

  return {
    commitmentId,
    dayInOffice: currentDay,
    complexityTier: timeline.complexityTier,
    expectedStartByDay: timeline.expectedStartByDay,
    expectedCompletionByDay: timeline.expectedCompletionByDay,
    timelinePhase: phase,
    intentSignals: intentCount,
    actionSignals: actionCount,
    deliverySignals: deliveryCount,
    effortScore,
    timeAdjustedScore,
    trajectory,
    dataConfidence,
    signalCount,
  };
}

/* ═══════════════════════════════════════════════
   BATCH COMPUTATION — ALL COMMITMENTS
   ═══════════════════════════════════════════════ */

export async function computeAllTimeAdjustedScores(): Promise<TimeAdjustedCommitmentScore[]> {
  const [timelines, allSignals] = await Promise.all([
    fetchTimelines(),
    fetchPostInaugurationSignals(),
  ]);

  const currentDay = getDayInOffice();

  // Group signals by commitment
  const signalsByCommitment = new Map<number, SignalRow[]>();
  for (const signal of allSignals) {
    const ids = signal.matched_promise_ids || [];
    for (const id of ids) {
      const list = signalsByCommitment.get(id) || [];
      list.push(signal);
      signalsByCommitment.set(id, list);
    }
  }

  // Get all commitment IDs (1-109)
  const allIds = new Set<number>();
  for (let i = 1; i <= 109; i++) allIds.add(i);
  // Also include any IDs from signals
  for (const id of signalsByCommitment.keys()) allIds.add(id);

  const scores: TimeAdjustedCommitmentScore[] = [];
  for (const id of allIds) {
    const timeline = getTimeline(timelines, id);
    const signals = signalsByCommitment.get(id) || [];
    scores.push(computeCommitmentScore(id, signals, timeline, currentDay));
  }

  return scores;
}

/* ═══════════════════════════════════════════════
   GOVERNMENT SCORE
   ═══════════════════════════════════════════════ */

export async function computeGovernmentScore(): Promise<TimeAdjustedGovernmentScore> {
  const allScores = await computeAllTimeAdjustedScores();
  const currentDay = getDayInOffice();
  const tierWeights = getTierImportanceWeights(currentDay);

  // Group by tier
  const byTier: Record<ComplexityTier, TimeAdjustedCommitmentScore[]> = {
    'quick-win': [], 'medium': [], 'long-term': [], 'structural': [],
  };
  for (const s of allScores) {
    byTier[s.complexityTier].push(s);
  }

  // Compute average score per tier (only count gradeable commitments)
  function tierAvg(tier: ComplexityTier): { score: number; graded: number } {
    const items = byTier[tier].filter(s => s.trajectory !== 'too-early');
    if (items.length === 0) return { score: 50, graded: 0 }; // Neutral if nothing to grade
    const avg = items.reduce((sum, s) => sum + s.timeAdjustedScore, 0) / items.length;
    return { score: Math.round(avg), graded: items.length };
  }

  const quickWin = tierAvg('quick-win');
  const medium = tierAvg('medium');
  const longTerm = tierAvg('long-term');
  const structural = tierAvg('structural');

  // Weighted overall score
  const overallScore = Math.round(
    quickWin.score * tierWeights['quick-win'] +
    medium.score * tierWeights['medium'] +
    longTerm.score * tierWeights['long-term'] +
    structural.score * tierWeights['structural'],
  );

  // Count trajectories
  let ahead = 0, onTrack = 0, behind = 0, overdue = 0, tooEarly = 0;
  for (const s of allScores) {
    switch (s.trajectory) {
      case 'ahead': ahead++; break;
      case 'on-track': onTrack++; break;
      case 'behind': behind++; break;
      case 'overdue': overdue++; break;
      case 'too-early': tooEarly++; break;
    }
  }

  const gradedCount = allScores.filter(s => s.trajectory !== 'too-early').length;
  const totalSignals = allScores.reduce((sum, s) => sum + s.signalCount, 0);
  const dataConfidence =
    totalSignals >= 50 ? 'sufficient' :
    totalSignals >= 15 ? 'partial' : 'insufficient';

  return {
    score: overallScore,
    grade: scoreToGrade(overallScore),
    dayInOffice: currentDay,
    quickWinScore: quickWin.score,
    mediumScore: medium.score,
    longTermScore: longTerm.score,
    structuralScore: structural.score,
    aheadCount: ahead,
    onTrackCount: onTrack,
    behindCount: behind,
    overdueCount: overdue,
    tooEarlyCount: tooEarly,
    activeCommitments: gradedCount,
    gradedCommitments: gradedCount,
    dataConfidence,
  };
}

/* ═══════════════════════════════════════════════
   STORE DAILY SNAPSHOT
   Called from sweep after signal collection
   ═══════════════════════════════════════════════ */

export async function recomputeDailyGovernmentScore(): Promise<TimeAdjustedGovernmentScore> {
  const govScore = await computeGovernmentScore();
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  // Store daily government score
  await supabase
    .from('government_score_daily')
    .upsert({
      date: today,
      day_in_office: govScore.dayInOffice,
      score: govScore.score,
      grade: govScore.grade,
      quick_win_score: govScore.quickWinScore,
      medium_score: govScore.mediumScore,
      long_term_score: govScore.longTermScore,
      structural_score: govScore.structuralScore,
      ahead_count: govScore.aheadCount,
      on_track_count: govScore.onTrackCount,
      behind_count: govScore.behindCount,
      overdue_count: govScore.overdueCount,
      too_early_count: govScore.tooEarlyCount,
      graded_commitments: govScore.gradedCommitments,
      data_confidence: govScore.dataConfidence,
    }, { onConflict: 'date' });

  // Store per-commitment scores
  const allScores = await computeAllTimeAdjustedScores();
  const rows = allScores.map(s => ({
    commitment_id: s.commitmentId,
    day_in_office: s.dayInOffice,
    complexity_tier: s.complexityTier,
    timeline_phase: s.timelinePhase,
    trajectory: s.trajectory,
    effort_score: s.effortScore,
    time_adjusted_score: s.timeAdjustedScore,
    intent_signals: s.intentSignals,
    action_signals: s.actionSignals,
    delivery_signals: s.deliverySignals,
    data_confidence: s.dataConfidence,
  }));

  // Batch upsert in chunks of 50
  for (let i = 0; i < rows.length; i += 50) {
    await supabase
      .from('time_adjusted_scores')
      .upsert(rows.slice(i, i + 50), { onConflict: 'commitment_id,day_in_office' });
  }

  console.log(
    `[TimeAdjustedScore] Day ${govScore.dayInOffice}: score=${govScore.score} grade=${govScore.grade} ` +
    `ahead=${govScore.aheadCount} onTrack=${govScore.onTrackCount} behind=${govScore.behindCount} ` +
    `tooEarly=${govScore.tooEarlyCount} graded=${govScore.gradedCommitments}`,
  );

  return govScore;
}

/** Clear cache (call after timeline updates) */
export function clearTimelineCache(): void {
  _timelineCache = null;
}
