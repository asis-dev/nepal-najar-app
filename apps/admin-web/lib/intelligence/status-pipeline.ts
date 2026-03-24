/**
 * Status Update Pipeline
 *
 * Reads classified intelligence signals and generates status recommendations
 * for tracked commitments. Recommendations are persisted for review and can
 * be applied later by an operator.
 */

import { getSupabase } from '@/lib/supabase/server';
import { computeCommitmentProgress } from './progress-extractor';

export interface StatusRecommendation {
  id?: string;
  promiseId: number;
  promiseTitle?: string;
  currentStatus: string;
  recommendedStatus: string;
  confidence: number;
  reason: string;
  signalCount: number;
  confirmsCount: number;
  contradictsCount: number;
  progressPercent?: number | null;
  progressConfidence?: number | null;
  progressMethod?: string | null;
  reviewState?: 'pending' | 'approved' | 'rejected' | 'applied';
  createdAt?: string;
}

interface SignalRow {
  id: string;
  title: string | null;
  content: string | null;
  classification: string;
  matched_promise_ids: number[];
  relevance_score: number;
  confidence: number | null;
  tier3_processed: boolean;
  review_status: string | null;
}

interface PromiseRow {
  id: string;
  title: string | null;
  status: string | null;
  review_state: string | null;
  merged_into_id: string | null;
}

interface RecommendationRow {
  id: string;
  promise_id: string;
  promise_title: string | null;
  current_status: string;
  recommended_status: string;
  confidence: number;
  reason: string;
  signal_count: number;
  confirms_count: number;
  contradicts_count: number;
  review_state: 'pending' | 'approved' | 'rejected' | 'applied';
  created_at: string;
}

interface PipelineResult {
  analyzed: number;
  updated: number;
  persisted: number;
  recommendations: StatusRecommendation[];
}

const COMPLETION_KEYWORDS = [
  'completed',
  'inaugurated',
  'launched',
  'delivered',
  'operational',
  'opened',
  'commissioned',
  'handed over',
  'सम्पन्न',
  'उद्घाटन',
  'शुभारम्भ',
  'सञ्चालन',
];

function containsCompletionEvidence(text: string): boolean {
  const lower = text.toLowerCase();
  return COMPLETION_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function mapRecommendationRow(row: RecommendationRow): StatusRecommendation {
  return {
    id: row.id,
    promiseId: parseInt(row.promise_id, 10),
    promiseTitle: row.promise_title || undefined,
    currentStatus: row.current_status,
    recommendedStatus: row.recommended_status,
    confidence: row.confidence,
    reason: row.reason,
    signalCount: row.signal_count,
    confirmsCount: row.confirms_count,
    contradictsCount: row.contradicts_count,
    reviewState: row.review_state,
    createdAt: row.created_at,
  };
}

async function loadTrackablePromises(): Promise<PromiseRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('promises')
    .select('id, title, status, review_state, merged_into_id')
    .is('merged_into_id', null);

  if (error) {
    throw new Error(error.message);
  }

  return (data || [])
    .filter((row) => row.review_state !== 'rejected')
    .sort((left, right) => {
      const leftId = parseInt(String(left.id), 10);
      const rightId = parseInt(String(right.id), 10);
      if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
        return leftId - rightId;
      }
      return String(left.id).localeCompare(String(right.id));
    }) as PromiseRow[];
}

async function upsertStatusRecommendation(
  recommendation: StatusRecommendation,
): Promise<void> {
  const supabase = getSupabase();
  const promiseId = String(recommendation.promiseId);

  const { data: existing, error: existingError } = await supabase
    .from('intelligence_status_recommendations')
    .select('id')
    .eq('promise_id', promiseId)
    .eq('review_state', 'pending')
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const payload = {
    promise_id: promiseId,
    promise_title: recommendation.promiseTitle || null,
    current_status: recommendation.currentStatus,
    recommended_status: recommendation.recommendedStatus,
    confidence: recommendation.confidence,
    reason: recommendation.reason,
    signal_count: recommendation.signalCount,
    confirms_count: recommendation.confirmsCount,
    contradicts_count: recommendation.contradictsCount,
    review_state: 'pending',
    source_run_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      generated_by: 'status_pipeline',
    },
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('intelligence_status_recommendations')
      .update(payload)
      .eq('id', existing.id);

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase
    .from('intelligence_status_recommendations')
    .insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listStatusRecommendations(options?: {
  reviewState?: 'pending' | 'approved' | 'rejected' | 'applied';
  limit?: number;
}): Promise<StatusRecommendation[]> {
  const supabase = getSupabase();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);

  let query = supabase
    .from('intelligence_status_recommendations')
    .select(
      'id, promise_id, promise_title, current_status, recommended_status, confidence, reason, signal_count, confirms_count, contradicts_count, review_state, created_at',
    )
    .order('confidence', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.reviewState) {
    query = query.eq('review_state', options.reviewState);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as RecommendationRow[]).map(mapRecommendationRow);
}

export async function getStatusRecommendationById(
  recommendationId: string,
): Promise<StatusRecommendation | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('intelligence_status_recommendations')
    .select(
      'id, promise_id, promise_title, current_status, recommended_status, confidence, reason, signal_count, confirms_count, contradicts_count, review_state, created_at',
    )
    .eq('id', recommendationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRecommendationRow(data as RecommendationRow) : null;
}

export async function reviewStatusRecommendation(
  recommendationId: string,
  action: 'approved' | 'rejected' | 'applied',
  reviewer = 'admin',
  notes?: string | null,
): Promise<StatusRecommendation | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('intelligence_status_recommendations')
    .update({
      review_state: action,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
      metadata: notes
        ? {
            review_notes: notes,
          }
        : undefined,
      applied_at: action === 'applied' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recommendationId)
    .select(
      'id, promise_id, promise_title, current_status, recommended_status, confidence, reason, signal_count, confirms_count, contradicts_count, review_state, created_at',
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRecommendationRow(data as RecommendationRow) : null;
}

export async function analyzePromiseStatus(
  promiseId: number,
  currentStatus = 'not_started',
  promiseTitle?: string,
): Promise<StatusRecommendation | null> {
  const supabase = getSupabase();

  const { data: signals, error } = await supabase
    .from('intelligence_signals')
    .select(
      'id, title, content, classification, matched_promise_ids, relevance_score, confidence, tier3_processed, review_status',
    )
    .contains('matched_promise_ids', [promiseId]);

  if (error) {
    console.error(
      `[StatusPipeline] Error fetching signals for promise ${promiseId}:`,
      error.message,
    );
    return null;
  }

  const matchedSignals: SignalRow[] = ((signals as SignalRow[]) ?? []).filter(
    (signal) =>
      signal.tier3_processed === true &&
      (signal.confidence ?? 0) >= 0.3 &&
      signal.review_status !== 'rejected',
  );

  if (matchedSignals.length === 0) {
    if (currentStatus === 'not_started') return null;
    return {
      promiseId,
      promiseTitle,
      currentStatus,
      recommendedStatus: 'not_started',
      confidence: 0.5,
      reason: 'No intelligence signals found for this commitment.',
      signalCount: 0,
      confirmsCount: 0,
      contradictsCount: 0,
      reviewState: 'pending',
    };
  }

  let confirms = 0;
  let contradicts = 0;
  let neutral = 0;
  let statement = 0;
  let hasCompletionEvidence = false;

  for (const signal of matchedSignals) {
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
        statement++;
        break;
      case 'neutral':
      default:
        neutral++;
        break;
    }

    const text = [signal.title ?? '', signal.content ?? ''].join(' ');
    if (containsCompletionEvidence(text)) {
      hasCompletionEvidence = true;
    }
  }

  const signalCount = matchedSignals.length;
  let recommendedStatus: string | null = null;
  let confidence = 0;
  let reason = '';

  if (confirms >= 5 && hasCompletionEvidence) {
    recommendedStatus = 'delivered';
    confidence = Math.min(0.95, 0.8 + confirms * 0.01);
    reason = `${confirms} confirming signals with completion evidence detected in signal content.`;
  } else if (confirms >= 3 && contradicts === 0) {
    recommendedStatus = 'in_progress';
    confidence = Math.min(0.9, 0.7 + confirms * 0.02);
    reason = `${confirms} confirming signals with zero contradictions indicate active progress.`;
  } else if (contradicts >= 3 && contradicts > confirms) {
    recommendedStatus = 'stalled';
    confidence = Math.min(0.85, 0.6 + contradicts * 0.03);
    reason = `${contradicts} contradicting signals vs ${confirms} confirming — evidence of stalling.`;
  } else if (confirms > 0 && confirms > contradicts) {
    recommendedStatus = 'in_progress';
    confidence = 0.5 + confirms * 0.05;
    reason = `${confirms} confirming vs ${contradicts} contradicting signals — tentative progress.`;
  } else if (statement > 0 && confirms === 0 && contradicts === 0 && currentStatus === 'not_started') {
    recommendedStatus = 'in_progress';
    confidence = 0.4;
    reason = `${statement} official statement-type signals suggest early movement but limited implementation evidence.`;
  }

  // Compute progress percentage from signal content (regex-based, no AI cost)
  let progressPercent: number | null = null;
  let progressConfidence: number | null = null;
  let progressMethod: string | null = null;

  try {
    const progressResult = await computeCommitmentProgress(promiseId);
    if (progressResult) {
      progressPercent = progressResult.progress;
      progressConfidence = progressResult.confidence;
      progressMethod = progressResult.method;

      // Override status based on progress if applicable
      if (progressPercent >= 80 && recommendedStatus !== 'delivered') {
        recommendedStatus = 'delivered';
        confidence = Math.max(confidence, progressResult.confidence);
        reason = `${reason} Progress extraction indicates ${progressPercent}% completion (method: ${progressMethod}).`;
      } else if (
        progressPercent > 0 &&
        progressPercent < 80 &&
        (recommendedStatus === null || recommendedStatus === 'not_started')
      ) {
        recommendedStatus = 'in_progress';
        confidence = Math.max(confidence, 0.4);
        reason = `Progress extraction indicates ${progressPercent}% completion (method: ${progressMethod}).`;
      }
    }
  } catch (err) {
    console.warn(
      `[StatusPipeline] Progress extraction failed for promise ${promiseId}:`,
      err instanceof Error ? err.message : 'unknown',
    );
  }

  if (recommendedStatus === null || recommendedStatus === currentStatus) {
    return null;
  }

  return {
    promiseId,
    promiseTitle,
    currentStatus,
    recommendedStatus,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    signalCount,
    confirmsCount: confirms,
    contradictsCount: contradicts,
    progressPercent,
    progressConfidence,
    progressMethod,
    reviewState: 'pending',
  };
}

export async function runStatusPipeline(): Promise<PipelineResult> {
  const recommendations: StatusRecommendation[] = [];
  const promises = await loadTrackablePromises();

  for (const promise of promises) {
    const numericId = parseInt(promise.id, 10);
    if (!Number.isFinite(numericId)) {
      continue;
    }

    try {
      const recommendation = await analyzePromiseStatus(
        numericId,
        promise.status || 'not_started',
        promise.title || undefined,
      );

      if (recommendation) {
        recommendations.push(recommendation);
      }
    } catch (err) {
      console.error(
        `[StatusPipeline] Failed to analyze promise ${promise.id}:`,
        err instanceof Error ? err.message : 'unknown error',
      );
    }
  }

  let persisted = 0;
  for (const recommendation of recommendations) {
    await upsertStatusRecommendation(recommendation);
    persisted++;
  }

  console.log(
    `[StatusPipeline] Analyzed ${promises.length} commitments, ` +
      `${recommendations.length} status changes recommended, ` +
      `${persisted} recommendations persisted.`,
  );

  return {
    analyzed: promises.length,
    updated: recommendations.length,
    persisted,
    recommendations,
  };
}

export async function applyStatusUpdate(
  promiseId: number | string,
  newStatus: string,
  reason: string,
  options?: {
    recommendationId?: string;
    reviewer?: string;
  },
): Promise<boolean> {
  const supabase = getSupabase();
  const normalizedPromiseId = String(promiseId);

  const { error: updateError } = await supabase
    .from('promises')
    .update({
      status: newStatus,
      last_update: new Date().toISOString().slice(0, 10),
    })
    .eq('id', normalizedPromiseId);

  if (updateError) {
    console.error(
      `[StatusPipeline] Failed to update promise ${normalizedPromiseId}:`,
      updateError.message,
    );
    return false;
  }

  const { error: activityError } = await supabase
    .from('promise_updates')
    .insert({
      promise_id: normalizedPromiseId,
      field_changed: 'status',
      new_value: newStatus,
      change_reason: reason,
    });

  if (activityError) {
    console.error(
      `[StatusPipeline] Failed to log update for promise ${normalizedPromiseId}:`,
      activityError.message,
    );
  }

  if (options?.recommendationId) {
    await reviewStatusRecommendation(
      options.recommendationId,
      'applied',
      options.reviewer || 'admin',
      reason,
    );
  } else {
    const { data: pendingRecommendation } = await supabase
      .from('intelligence_status_recommendations')
      .select('id')
      .eq('promise_id', normalizedPromiseId)
      .eq('recommended_status', newStatus)
      .eq('review_state', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingRecommendation?.id) {
      await reviewStatusRecommendation(
        pendingRecommendation.id,
        'applied',
        options?.reviewer || 'admin',
        reason,
      );
    }
  }

  return true;
}
