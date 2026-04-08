/**
 * Republic Index — Single 0-100 governance performance score
 *
 * IMPORTANT: Includes data confidence gating. When insufficient verified data
 * exists, the index reports 'insufficient' confidence rather than showing
 * a misleading number computed from unverified or empty data.
 *
 * Now accepts promises as a parameter — caller passes real data from Supabase.
 * Falls back to static data import when no promises are provided.
 *
 * v2: Supports time-adjusted scoring via computeTimeAdjustedGhantiScore().
 * The time-adjusted engine answers "are they on track for THIS point in time?"
 * rather than penalizing a 9-day-old government for not delivering everything.
 */

import { promises as staticPromises, type GovernmentPromise } from './promises';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type GhantiGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type GovPhase = 'early' | 'ramp' | 'delivery';
export type DataConfidence = 'insufficient' | 'partial' | 'sufficient';

export interface GhantiSubScores {
  deliveryRate: number;
  avgProgress: number;
  trustScore: number;
  budgetUtilization: number;
  citizenSentiment: number;
}

export interface GhantiScore {
  score: number;        // 0-100
  change: number;       // weekly change
  grade: GhantiGrade;
  subScores: GhantiSubScores;
  /** Data confidence level — UI should NOT show score when 'insufficient' */
  dataConfidence: DataConfidence;
  /** Number of promises with verified/partial trust level */
  verifiedDataPoints: number;
  /** Government phase — determines if letter grades should be shown */
  phase: GovPhase;
  /** Days since government took office */
  dayInTerm: number;
  /** Human-readable phase label */
  phaseLabel: { en: string; ne: string };
}

/* ═══════════════════════════════════════════════
   GOVERNMENT PHASE
   ═══════════════════════════════════════════════ */

const GOV_START = new Date('2026-03-26T00:00:00+05:45').getTime();

export function getGovPhase(): { phase: GovPhase; dayInTerm: number; label: { en: string; ne: string } } {
  const dayInTerm = Math.max(0, Math.floor((Date.now() - GOV_START) / (1000 * 60 * 60 * 24)));

  if (dayInTerm <= 30) {
    return {
      phase: 'early',
      dayInTerm,
      label: {
        en: `Day ${dayInTerm} — Early Assessment`,
        ne: `दिन ${dayInTerm} — प्रारम्भिक मूल्यांकन`,
      },
    };
  }
  if (dayInTerm <= 100) {
    return {
      phase: 'ramp',
      dayInTerm,
      label: {
        en: `Day ${dayInTerm} — First 100 Days`,
        ne: `दिन ${dayInTerm} — पहिलो १०० दिन`,
      },
    };
  }
  return {
    phase: 'delivery',
    dayInTerm,
    label: {
      en: `Day ${dayInTerm}`,
      ne: `दिन ${dayInTerm}`,
    },
  };
}

/**
 * In the early phase (0-30 days), letter grades are misleading.
 * We show "Too Early to Grade" instead. After 30 days, grades appear.
 */
export function shouldShowGrade(phase: GovPhase): boolean {
  return phase !== 'early';
}

/* ═══════════════════════════════════════════════
   WEIGHTS
   ═══════════════════════════════════════════════ */

const WEIGHTS = {
  deliveryRate: 0.25,
  avgProgress: 0.30,
  trustScore: 0.15,
  budgetUtilization: 0.20,
  citizenSentiment: 0.10,
} as const;

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function computeStatsFromPromises(promiseList: GovernmentPromise[]) {
  const total = promiseList.length;
  const delivered = promiseList.filter((p) => p.status === 'delivered').length;
  const inProgress = promiseList.filter((p) => p.status === 'in_progress').length;
  const stalled = promiseList.filter((p) => p.status === 'stalled').length;
  const notStarted = promiseList.filter((p) => p.status === 'not_started').length;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const avgProgress = total > 0 ? Math.round(promiseList.reduce((sum, p) => sum + p.progress, 0) / total) : 0;

  return { total, delivered, inProgress, stalled, notStarted, deliveryRate, avgProgress };
}

function computeTrustScore(promiseList: GovernmentPromise[]): number {
  const score = promiseList.reduce((sum, p) => {
    if (p.trustLevel === 'verified') return sum + 100;
    if (p.trustLevel === 'partial') return sum + 50;
    return sum;
  }, 0);
  return promiseList.length > 0 ? score / promiseList.length : 0;
}

function computeBudgetUtilization(promiseList: GovernmentPromise[]): number {
  const withBudget = promiseList.filter(
    (p) => p.estimatedBudgetNPR != null && p.estimatedBudgetNPR > 0,
  );
  if (withBudget.length === 0) return 0;
  const totalEstimated = withBudget.reduce((s, p) => s + (p.estimatedBudgetNPR ?? 0), 0);
  const totalSpent = withBudget.reduce((s, p) => s + (p.spentNPR ?? 0), 0);
  return totalEstimated > 0 ? Math.min(100, (totalSpent / totalEstimated) * 100) : 0;
}

function computeCitizenSentiment(
  voteAggregates?: Record<string, { up: number; down: number }>,
): number {
  if (!voteAggregates) return 0; // No fake default — return 0 when no real data
  let totalUp = 0;
  let totalDown = 0;
  Object.values(voteAggregates).forEach(({ up, down }) => {
    totalUp += up;
    totalDown += down;
  });
  const total = totalUp + totalDown;
  return total > 0 ? Math.round((totalUp / total) * 100) : 0;
}

function scoreToGrade(score: number): GhantiGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function computeDataConfidence(promiseList: GovernmentPromise[]): { confidence: DataConfidence; count: number } {
  const verified = promiseList.filter(
    (p) => p.trustLevel === 'verified' || p.trustLevel === 'partial',
  ).length;

  if (verified >= 10) return { confidence: 'sufficient', count: verified };
  if (verified >= 5) return { confidence: 'partial', count: verified };
  return { confidence: 'insufficient', count: verified };
}

/* ═══════════════════════════════════════════════
   MAIN COMPUTATION
   ═══════════════════════════════════════════════ */

/**
 * Compute the Republic Index from real promise data.
 * @param promiseList — Pass Supabase promises for real data. Falls back to static if omitted.
 * @param voteAggregates — Real vote data from Supabase public_votes.
 */
export function computeGhantiScore(
  promiseList?: GovernmentPromise[],
  voteAggregates?: Record<string, { up: number; down: number }>,
): GhantiScore {
  const promises = promiseList ?? staticPromises;
  const stats = computeStatsFromPromises(promises);
  const { confidence, count } = computeDataConfidence(promises);

  const subScores: GhantiSubScores = {
    deliveryRate: stats.deliveryRate,
    avgProgress: stats.avgProgress,
    trustScore: Math.round(computeTrustScore(promises)),
    budgetUtilization: Math.round(computeBudgetUtilization(promises)),
    citizenSentiment: computeCitizenSentiment(voteAggregates),
  };

  const score = Math.round(
    WEIGHTS.deliveryRate * subScores.deliveryRate +
    WEIGHTS.avgProgress * subScores.avgProgress +
    WEIGHTS.trustScore * subScores.trustScore +
    WEIGHTS.budgetUtilization * subScores.budgetUtilization +
    WEIGHTS.citizenSentiment * subScores.citizenSentiment,
  );

  const { phase, dayInTerm, label: phaseLabel } = getGovPhase();

  return {
    score,
    change: 0, // No fake weekly change
    grade: scoreToGrade(score),
    subScores,
    dataConfidence: confidence,
    verifiedDataPoints: count,
    phase,
    dayInTerm,
    phaseLabel,
  };
}

/** Grade display labels */
export const GRADE_LABELS: Record<GhantiGrade, { en: string; ne: string }> = {
  A: { en: 'Excellent', ne: 'उत्कृष्ट' },
  B: { en: 'Good', ne: 'राम्रो' },
  C: { en: 'Average', ne: 'औसत' },
  D: { en: 'Poor', ne: 'कमजोर' },
  F: { en: 'Failing', ne: 'असफल' },
};

/** Grade colors for UI */
export const GRADE_COLORS: Record<GhantiGrade, { text: string; bg: string; glow: string }> = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500/15', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  B: { text: 'text-blue-400', bg: 'bg-blue-500/15', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]' },
  C: { text: 'text-amber-400', bg: 'bg-amber-500/15', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  D: { text: 'text-orange-400', bg: 'bg-orange-500/15', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]' },
  F: { text: 'text-red-400', bg: 'bg-red-500/15', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]' },
};

/* ═══════════════════════════════════════════════
   TIME-ADJUSTED SCORE (v2)
   See lib/data/ghanti-score-server.ts for the server-only
   computeTimeAdjustedGhantiScore() function that delegates
   to the AI-powered scoring engine.
   ═══════════════════════════════════════════════ */
