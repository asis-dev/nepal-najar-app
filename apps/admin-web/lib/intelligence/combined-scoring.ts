/**
 * Combined Scoring: AI + Community → Progress %
 *
 * Computes the final progress percentage for each commitment by combining
 * AI intelligence signals and citizen community evidence.
 */

import { getSupabase } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CombinedScore {
  promiseId: string;
  aiScore: number;               // 0-100, from AI signal analysis
  communityScore: number;        // 0-100, from citizen evidence + verifications
  finalScore: number;            // weighted combination
  confidence: number;            // 0-1, how confident we are
  aiSignalCount: number;
  communityEvidenceCount: number;
  verificationCount: number;
  suggestedStatus: 'not_started' | 'in_progress' | 'stalled' | 'completed';
}

interface SignalRow {
  id: string;
  classification: string;
  confidence: number | null;
  tier3_processed: boolean;
  review_status: string | null;
}

interface EvidenceRow {
  id: string;
  direction: string | null;
  status: string | null;
  upvotes: number;
  submitted_by_verifier: boolean;
}

interface VerificationRow {
  id: string;
  verdict: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COMMUNITY_OVERRIDE_MIN_ITEMS = 5;
const COMMUNITY_OVERRIDE_AGREEMENT_THRESHOLD = 0.8;
const COMMUNITY_WEIGHT_THRESHOLD = 3; // min evidence items for community weighting
const UPVOTE_WEIGHT = 0.5;
const VERIFIER_MULTIPLIER = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeAiScore(signals: SignalRow[]): { score: number; confirms: number; contradicts: number; statements: number } {
  let confirms = 0;
  let contradicts = 0;
  let statements = 0;

  for (const signal of signals) {
    switch (signal.classification) {
      case 'confirms':
      case 'budget_allocation':
      case 'policy_change':
        confirms++;
        break;
      case 'contradicts':
        contradicts++;
        break;
      case 'statement':
        statements++;
        break;
    }
  }

  if (signals.length === 0) {
    return { score: 0, confirms, contradicts, statements };
  }

  if (confirms === 0 && contradicts === 0 && statements > 0) {
    return { score: 20, confirms, contradicts, statements };
  }

  const total = confirms + contradicts;
  if (total === 0) {
    return { score: 0, confirms, contradicts, statements };
  }

  const score = Math.round((confirms / total) * 100);
  return { score, confirms, contradicts, statements };
}

function computeCommunityScore(
  evidence: EvidenceRow[],
  verifications: VerificationRow[],
): { score: number; weightedConfirms: number; weightedContradicts: number } {
  let weightedConfirms = 0;
  let weightedContradicts = 0;

  // Only count approved evidence
  const approvedEvidence = evidence.filter((e) => e.status === 'approved');

  for (const item of approvedEvidence) {
    // Base weight of 1, plus 0.5 per upvote
    let weight = 1 + (item.upvotes || 0) * UPVOTE_WEIGHT;

    // Verifier-submitted evidence counts 2x
    if (item.submitted_by_verifier) {
      weight *= VERIFIER_MULTIPLIER;
    }

    if (item.direction === 'confirms' || item.direction === 'supports') {
      weightedConfirms += weight;
    } else if (item.direction === 'contradicts' || item.direction === 'refutes') {
      weightedContradicts += weight;
    }
  }

  const totalWeighted = weightedConfirms + weightedContradicts;
  if (totalWeighted === 0) {
    return { score: 0, weightedConfirms, weightedContradicts };
  }

  let score = Math.round((weightedConfirms / totalWeighted) * 100);

  // Factor in progress verifications: if majority say "accurate", boost
  const accurateVerifications = verifications.filter(
    (v) => v.verdict === 'accurate' || v.verdict === 'confirmed',
  ).length;
  const totalVerifications = verifications.length;

  if (totalVerifications >= 3) {
    const verificationRatio = accurateVerifications / totalVerifications;
    if (verificationRatio > 0.6) {
      // Boost score by up to 10 points based on verification agreement
      score = Math.min(100, score + Math.round(verificationRatio * 10));
    }
  }

  return { score, weightedConfirms, weightedContradicts };
}

function determineSuggestedStatus(
  finalScore: number,
  aiConfirms: number,
  aiContradicts: number,
  communityWeightedConfirms: number,
  communityWeightedContradicts: number,
): 'not_started' | 'in_progress' | 'stalled' | 'completed' {
  if (finalScore >= 80) return 'completed';
  if (finalScore >= 30) return 'in_progress';

  // Check if contradicts dominate
  const totalContradicts = aiContradicts + communityWeightedContradicts;
  const totalConfirms = aiConfirms + communityWeightedConfirms;
  if (finalScore > 0 && totalContradicts > totalConfirms) {
    return 'stalled';
  }

  return 'not_started';
}

// ── Main functions ───────────────────────────────────────────────────────────

/**
 * Compute the combined score for a single commitment.
 */
export async function computeCombinedScore(promiseId: string): Promise<CombinedScore> {
  const supabase = getSupabase();

  // Fetch AI signals for this promise
  const { data: rawSignals, error: signalError } = await supabase
    .from('intelligence_signals')
    .select('id, classification, confidence, tier3_processed, review_status')
    .contains('matched_promise_ids', [parseInt(promiseId, 10)]);

  if (signalError) {
    console.error(`[CombinedScoring] Signal fetch error for ${promiseId}:`, signalError.message);
  }

  const signals: SignalRow[] = ((rawSignals as SignalRow[]) ?? []).filter(
    (s) => s.tier3_processed === true && (s.confidence ?? 0) >= 0.3 && s.review_status !== 'rejected',
  );

  // Fetch community evidence for this promise
  const { data: rawEvidence, error: evidenceError } = await supabase
    .from('evidence_submissions')
    .select('id, direction, status, upvotes, submitted_by_verifier')
    .eq('promise_id', promiseId);

  if (evidenceError) {
    console.error(`[CombinedScoring] Evidence fetch error for ${promiseId}:`, evidenceError.message);
  }

  const evidence: EvidenceRow[] = (rawEvidence as EvidenceRow[]) ?? [];
  const approvedEvidence = evidence.filter((e) => e.status === 'approved');

  // Fetch verifications for this promise
  const { data: rawVerifications, error: verificationError } = await supabase
    .from('progress_verifications')
    .select('id, verdict')
    .eq('promise_id', promiseId);

  if (verificationError) {
    console.error(`[CombinedScoring] Verification fetch error for ${promiseId}:`, verificationError.message);
  }

  const verifications: VerificationRow[] = (rawVerifications as VerificationRow[]) ?? [];

  // Compute individual scores
  const ai = computeAiScore(signals);
  const community = computeCommunityScore(evidence, verifications);

  // Compute final score with weighting
  let finalScore: number;
  let confidence: number;

  const hasCommunityEvidence = approvedEvidence.length >= COMMUNITY_WEIGHT_THRESHOLD;
  const hasStrongCommunityConsensus =
    approvedEvidence.length >= COMMUNITY_OVERRIDE_MIN_ITEMS &&
    (community.weightedConfirms + community.weightedContradicts) > 0 &&
    community.weightedConfirms / (community.weightedConfirms + community.weightedContradicts) >= COMMUNITY_OVERRIDE_AGREEMENT_THRESHOLD;

  if (hasStrongCommunityConsensus) {
    // Strong community consensus overrides AI
    finalScore = community.score;
    confidence = Math.min(1, 0.7 + approvedEvidence.length * 0.03);
  } else if (hasCommunityEvidence) {
    // Weighted combination: 40% AI + 60% community
    finalScore = Math.round(ai.score * 0.4 + community.score * 0.6);
    confidence = Math.min(1, 0.4 + (signals.length * 0.03) + (approvedEvidence.length * 0.05));
  } else if (signals.length > 0) {
    // Only AI signals available
    finalScore = ai.score;
    confidence = Math.min(1, 0.2 + signals.length * 0.05);
  } else {
    // No data at all
    finalScore = 0;
    confidence = 0;
  }

  // Round confidence
  confidence = Math.round(confidence * 100) / 100;

  const suggestedStatus = determineSuggestedStatus(
    finalScore,
    ai.confirms,
    ai.contradicts,
    community.weightedConfirms,
    community.weightedContradicts,
  );

  return {
    promiseId,
    aiScore: ai.score,
    communityScore: community.score,
    finalScore,
    confidence,
    aiSignalCount: signals.length,
    communityEvidenceCount: approvedEvidence.length,
    verificationCount: verifications.length,
    suggestedStatus,
  };
}

/**
 * Compute combined scores for all trackable commitments.
 */
export async function computeAllCombinedScores(): Promise<CombinedScore[]> {
  const supabase = getSupabase();

  // Load all trackable promises
  const { data: promises, error } = await supabase
    .from('promises')
    .select('id')
    .is('merged_into_id', null);

  if (error) {
    console.error('[CombinedScoring] Failed to load promises:', error.message);
    return [];
  }

  const scores: CombinedScore[] = [];

  for (const promise of promises || []) {
    try {
      const score = await computeCombinedScore(String(promise.id));
      scores.push(score);
    } catch (err) {
      console.error(
        `[CombinedScoring] Failed to compute score for promise ${promise.id}:`,
        err instanceof Error ? err.message : 'unknown error',
      );
    }
  }

  // Sort by finalScore descending
  scores.sort((a, b) => b.finalScore - a.finalScore);

  return scores;
}
