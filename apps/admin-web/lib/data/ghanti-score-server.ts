/**
 * Server-only time-adjusted Republic Score
 *
 * This file imports server-side dependencies (Supabase, etc.) and CANNOT
 * be imported from client components or pages/ directory.
 *
 * Use in: API routes, server components, cron handlers.
 */

import { computeGhantiScore, getGovPhase, type GhantiScore } from './ghanti-score';
import { promises as staticPromises, type GovernmentPromise } from './promises';
import { computeGovernmentScore } from '@/lib/intelligence/time-adjusted-score';

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

/**
 * Compute the time-adjusted Republic Score.
 * Returns a GhantiScore that uses the AI-powered engine instead of the static formula.
 * Falls back to static formula if the time-adjusted engine fails.
 *
 * SERVER-ONLY — do not import from client components.
 */
export async function computeTimeAdjustedGhantiScore(
  promiseList?: GovernmentPromise[],
  voteAggregates?: Record<string, { up: number; down: number }>,
): Promise<GhantiScore> {
  try {
    const govScore = await computeGovernmentScore();
    const promises = promiseList ?? staticPromises;

    // Compute sub-scores from promise data for backward compatibility
    const total = promises.length;
    const delivered = promises.filter((p) => p.status === 'delivered').length;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const avgProgress = total > 0 ? Math.round(promises.reduce((sum, p) => sum + p.progress, 0) / total) : 0;

    const trustScore = promises.reduce((sum, p) => {
      if (p.trustLevel === 'verified') return sum + 100;
      if (p.trustLevel === 'partial') return sum + 50;
      return sum;
    }, 0);

    const withBudget = promises.filter((p) => p.estimatedBudgetNPR != null && p.estimatedBudgetNPR > 0);
    const totalEstimated = withBudget.reduce((s, p) => s + (p.estimatedBudgetNPR ?? 0), 0);
    const totalSpent = withBudget.reduce((s, p) => s + (p.spentNPR ?? 0), 0);
    const budgetUtil = totalEstimated > 0 ? Math.min(100, (totalSpent / totalEstimated) * 100) : 0;

    let citizenSentiment = 0;
    if (voteAggregates) {
      let totalUp = 0, totalDown = 0;
      Object.values(voteAggregates).forEach(({ up, down }) => { totalUp += up; totalDown += down; });
      const t = totalUp + totalDown;
      citizenSentiment = t > 0 ? Math.round((totalUp / t) * 100) : 0;
    }

    const { phase, dayInTerm, label: phaseLabel } = getGovPhase();

    return {
      score: govScore.score,
      change: 0,
      grade: scoreToGrade(govScore.score),
      subScores: {
        deliveryRate,
        avgProgress,
        trustScore: Math.round(total > 0 ? trustScore / total : 0),
        budgetUtilization: Math.round(budgetUtil),
        citizenSentiment,
      },
      dataConfidence: govScore.dataConfidence === 'sufficient' ? 'sufficient'
        : govScore.dataConfidence === 'partial' ? 'partial' : 'insufficient',
      verifiedDataPoints: govScore.gradedCommitments,
      phase,
      dayInTerm,
      phaseLabel,
    };
  } catch (err) {
    console.warn('[GhantiScore] Time-adjusted engine failed, using static formula:', err instanceof Error ? err.message : 'unknown');
    return computeGhantiScore(promiseList, voteAggregates);
  }
}
