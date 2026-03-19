/**
 * Nepal Najar Index — Single 0-100 governance performance score
 *
 * IMPORTANT: Includes data confidence gating. When insufficient verified data
 * exists, the index reports 'insufficient' confidence rather than showing
 * a misleading number computed from unverified or empty data.
 */

import { promises, computeStats } from './promises';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type NajarGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type DataConfidence = 'insufficient' | 'partial' | 'sufficient';

export interface NajarSubScores {
  deliveryRate: number;
  avgProgress: number;
  trustScore: number;
  budgetUtilization: number;
  citizenSentiment: number;
}

export interface NajarIndex {
  score: number;        // 0-100
  change: number;       // weekly change
  grade: NajarGrade;
  subScores: NajarSubScores;
  /** Data confidence level — UI should NOT show score when 'insufficient' */
  dataConfidence: DataConfidence;
  /** Number of promises with verified/partial trust level */
  verifiedDataPoints: number;
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

function computeTrustScore(): number {
  const score = promises.reduce((sum, p) => {
    if (p.trustLevel === 'verified') return sum + 100;
    if (p.trustLevel === 'partial') return sum + 50;
    return sum;
  }, 0);
  return promises.length > 0 ? score / promises.length : 0;
}

function computeBudgetUtilization(): number {
  const withBudget = promises.filter(
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

function scoreToGrade(score: number): NajarGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function computeDataConfidence(): { confidence: DataConfidence; count: number } {
  const verified = promises.filter(
    (p) => p.trustLevel === 'verified' || p.trustLevel === 'partial',
  ).length;

  if (verified >= 10) return { confidence: 'sufficient', count: verified };
  if (verified >= 5) return { confidence: 'partial', count: verified };
  return { confidence: 'insufficient', count: verified };
}

/* ═══════════════════════════════════════════════
   MAIN COMPUTATION
   ═══════════════════════════════════════════════ */

export function computeNajarIndex(
  voteAggregates?: Record<string, { up: number; down: number }>,
): NajarIndex {
  const stats = computeStats();
  const { confidence, count } = computeDataConfidence();

  const subScores: NajarSubScores = {
    deliveryRate: stats.deliveryRate,
    avgProgress: stats.avgProgress,
    trustScore: Math.round(computeTrustScore()),
    budgetUtilization: Math.round(computeBudgetUtilization()),
    citizenSentiment: computeCitizenSentiment(voteAggregates),
  };

  const score = Math.round(
    WEIGHTS.deliveryRate * subScores.deliveryRate +
    WEIGHTS.avgProgress * subScores.avgProgress +
    WEIGHTS.trustScore * subScores.trustScore +
    WEIGHTS.budgetUtilization * subScores.budgetUtilization +
    WEIGHTS.citizenSentiment * subScores.citizenSentiment,
  );

  return {
    score,
    change: 0, // No fake weekly change
    grade: scoreToGrade(score),
    subScores,
    dataConfidence: confidence,
    verifiedDataPoints: count,
  };
}

/** Grade display labels */
export const GRADE_LABELS: Record<NajarGrade, { en: string; ne: string }> = {
  A: { en: 'Excellent', ne: 'उत्कृष्ट' },
  B: { en: 'Good', ne: 'राम्रो' },
  C: { en: 'Average', ne: 'औसत' },
  D: { en: 'Poor', ne: 'कमजोर' },
  F: { en: 'Failing', ne: 'असफल' },
};

/** Grade colors for UI */
export const GRADE_COLORS: Record<NajarGrade, { text: string; bg: string; glow: string }> = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500/15', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  B: { text: 'text-blue-400', bg: 'bg-blue-500/15', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]' },
  C: { text: 'text-amber-400', bg: 'bg-amber-500/15', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  D: { text: 'text-orange-400', bg: 'bg-orange-500/15', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]' },
  F: { text: 'text-red-400', bg: 'bg-red-500/15', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]' },
};
