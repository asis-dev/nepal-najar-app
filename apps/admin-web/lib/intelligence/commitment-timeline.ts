/**
 * Commitment Timeline — Types and helpers for time-adjusted scoring.
 *
 * Each commitment has an AI-assigned timeline that defines when it should
 * reasonably start and complete, based on its complexity and political context.
 * The scoring engine uses these to evaluate "are they on track for THIS point in time?"
 * rather than "have they delivered everything?"
 */

import { dayInOffice } from './government-era';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type ComplexityTier = 'quick-win' | 'medium' | 'long-term' | 'structural';
export type TimelinePhase = 'pre-start' | 'should-start' | 'in-window' | 'overdue';
export type Trajectory = 'ahead' | 'on-track' | 'behind' | 'overdue' | 'too-early';
export type EffortTier = 'intent' | 'action' | 'delivery';

export interface CommitmentTimeline {
  commitmentId: number;
  complexityTier: ComplexityTier;
  expectedStartByDay: number;
  expectedCompletionByDay: number;
  startMilestones: string[];
  completionMilestones: string[];
  rationale: string;
  generatedAt: string;
  generatedByModel: string;
  adminOverride: boolean;
}

export interface TimeAdjustedCommitmentScore {
  commitmentId: number;
  dayInOffice: number;
  complexityTier: ComplexityTier;
  expectedStartByDay: number;
  expectedCompletionByDay: number;
  timelinePhase: TimelinePhase;
  intentSignals: number;
  actionSignals: number;
  deliverySignals: number;
  effortScore: number;        // 0-100: raw weighted effort
  timeAdjustedScore: number;  // 0-100: score adjusted for timeline expectations
  trajectory: Trajectory;
  dataConfidence: 'insufficient' | 'partial' | 'sufficient';
  signalCount: number;
}

export interface TimeAdjustedGovernmentScore {
  score: number;
  grade: string;
  dayInOffice: number;
  quickWinScore: number;
  mediumScore: number;
  longTermScore: number;
  structuralScore: number;
  aheadCount: number;
  onTrackCount: number;
  behindCount: number;
  overdueCount: number;
  tooEarlyCount: number;
  activeCommitments: number;
  gradedCommitments: number;
  dataConfidence: 'insufficient' | 'partial' | 'sufficient';
}

/* ═══════════════════════════════════════════════
   TIER DEFAULTS (fallback if no AI timeline)
   ═══════════════════════════════════════════════ */

export const TIER_DEFAULTS: Record<ComplexityTier, { startBy: number; completeBy: number }> = {
  'quick-win':  { startBy: 7,   completeBy: 30 },
  'medium':     { startBy: 30,  completeBy: 180 },
  'long-term':  { startBy: 60,  completeBy: 365 },
  'structural': { startBy: 90,  completeBy: 730 },
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

/** Determine what phase a commitment is in relative to its timeline */
export function getTimelinePhase(
  currentDay: number,
  expectedStart: number,
  expectedCompletion: number,
): TimelinePhase {
  if (currentDay < expectedStart * 0.8) return 'pre-start';
  if (currentDay < expectedStart) return 'should-start';
  if (currentDay <= expectedCompletion) return 'in-window';
  return 'overdue';
}

/** Dynamic effort weights that shift over time.
 * Uses actual commitment completion day when provided, otherwise falls back to tier default. */
export function getEffortWeights(
  currentDay: number,
  tier: ComplexityTier,
  actualCompletionDay?: number,
): { intent: number; action: number; delivery: number } {
  const completionDay = actualCompletionDay || TIER_DEFAULTS[tier].completeBy;
  const phaseRatio = Math.min(1.0, currentDay / completionDay);

  if (phaseRatio < 0.1) {
    // Very early: intent signals are valuable — government is setting direction
    return { intent: 0.60, action: 0.35, delivery: 0.05 };
  } else if (phaseRatio < 0.3) {
    // Early: shift toward concrete actions
    return { intent: 0.30, action: 0.55, delivery: 0.15 };
  } else if (phaseRatio < 0.6) {
    // Mid-term: actions dominant, delivery starting to matter
    return { intent: 0.10, action: 0.50, delivery: 0.40 };
  } else if (phaseRatio < 0.9) {
    // Late: delivery is what counts
    return { intent: 0.05, action: 0.25, delivery: 0.70 };
  } else {
    // At/past deadline: almost entirely delivery
    return { intent: 0.02, action: 0.13, delivery: 0.85 };
  }
}

/** Get tier importance weights for the overall government score at a given day */
export function getTierImportanceWeights(currentDay: number): Record<ComplexityTier, number> {
  if (currentDay <= 14) {
    // First 2 weeks: quick wins are everything
    return { 'quick-win': 0.70, 'medium': 0.25, 'long-term': 0.05, 'structural': 0.00 };
  } else if (currentDay <= 30) {
    return { 'quick-win': 0.55, 'medium': 0.35, 'long-term': 0.08, 'structural': 0.02 };
  } else if (currentDay <= 100) {
    return { 'quick-win': 0.30, 'medium': 0.40, 'long-term': 0.20, 'structural': 0.10 };
  } else if (currentDay <= 365) {
    return { 'quick-win': 0.10, 'medium': 0.25, 'long-term': 0.35, 'structural': 0.30 };
  } else {
    return { 'quick-win': 0.05, 'medium': 0.20, 'long-term': 0.35, 'structural': 0.40 };
  }
}

/** Map a 0-100 score to a letter grade */
export function scoreToGrade(score: number): string {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

/** Infer effort tier from existing classification (for signals without explicit effort_tier) */
export function inferEffortTier(classification: string | null): EffortTier {
  switch (classification) {
    case 'statement': return 'intent';
    case 'policy_change':
    case 'budget_allocation': return 'action';
    case 'confirms': return 'action';
    case 'contradicts': return 'action';
    default: return 'intent';
  }
}
