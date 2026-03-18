/**
 * Nepal Najar Index — Single 0-100 governance performance score
 *
 * Composite of 5 sub-scores:
 *   - Delivery Rate (25%): % of promises delivered
 *   - Average Progress (30%): mean progress across all promises
 *   - Trust Score (15%): % of promises verified or partially verified
 *   - Budget Utilization (20%): spent / estimated across budgeted promises
 *   - Citizen Sentiment (10%): approval ratio from voting aggregates
 */

import { promises, computeStats } from './promises';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type NajarGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface NajarSubScores {
  deliveryRate: number;
  avgProgress: number;
  trustScore: number;
  budgetUtilization: number;
  citizenSentiment: number;
}

export interface NajarIndex {
  score: number;        // 0-100
  change: number;       // mock weekly change (-3 to +3)
  grade: NajarGrade;
  subScores: NajarSubScores;
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
  const trusted = promises.filter(
    (p) => p.trustLevel === 'verified' || p.trustLevel === 'partial',
  );
  // Verified = 100%, partial = 50%
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
  // Cap at 100
  return totalEstimated > 0 ? Math.min(100, (totalSpent / totalEstimated) * 100) : 0;
}

/**
 * Compute citizen sentiment from vote aggregates.
 * Pass in aggregates map or defaults to a mock 62% approval.
 */
function computeCitizenSentiment(
  voteAggregates?: Record<string, { up: number; down: number }>,
): number {
  if (!voteAggregates) {
    // Default mock: 62% approval (realistic starting point)
    return 62;
  }
  let totalUp = 0;
  let totalDown = 0;
  Object.values(voteAggregates).forEach(({ up, down }) => {
    totalUp += up;
    totalDown += down;
  });
  const total = totalUp + totalDown;
  return total > 0 ? Math.round((totalUp / total) * 100) : 50;
}

/** Deterministic mock "change" from date — makes it feel dynamic */
function computeWeeklyChange(): number {
  const now = new Date();
  // Simple hash from week number
  const weekNum = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 86400000),
  );
  const hash = ((weekNum * 2654435761) >>> 0) % 7;
  return hash - 3; // range: -3 to +3
}

function scoreToGrade(score: number): NajarGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

/* ═══════════════════════════════════════════════
   MAIN COMPUTATION
   ═══════════════════════════════════════════════ */

/**
 * Compute the Nepal Najar Index — a single 0-100 governance score.
 *
 * Weighted formula:
 *   score = 0.25×deliveryRate + 0.30×avgProgress + 0.15×trustScore
 *         + 0.20×budgetUtilization + 0.10×citizenSentiment
 *
 * @param voteAggregates - Optional per-promise vote data ({ up, down } per promise ID).
 *   If omitted, uses a mock 62% approval rate.
 * @returns NajarIndex with score, grade, weekly change, and 5 sub-scores
 */
export function computeNajarIndex(
  voteAggregates?: Record<string, { up: number; down: number }>,
): NajarIndex {
  const stats = computeStats();

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
    change: computeWeeklyChange(),
    grade: scoreToGrade(score),
    subScores,
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
