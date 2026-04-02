/**
 * Status Update Pipeline
 *
 * Reads classified intelligence signals and generates status recommendations
 * for tracked commitments. Recommendations are persisted for review and can
 * be applied later by an operator.
 */

import { getSupabase } from '@/lib/supabase/server';
import { computeCommitmentProgress } from './progress-extractor';
import { aiComplete } from './ai-router';

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
  source_id: string;
  title: string | null;
  content: string | null;
  url: string | null;
  published_at: string | null;
  classification: string;
  matched_promise_ids?: number[] | null;
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
  metadata?: Record<string, unknown> | null;
}

interface PipelineResult {
  analyzed: number;
  updated: number;
  persisted: number;
  autoReviewed: number;
  autoApproved: number;
  autoApplied: number;
  autoDeferred: number;
  recommendations: StatusRecommendation[];
}

interface SignalEvidence {
  id: string;
  sourceId: string;
  classification: string;
  confidence: number;
  relevanceScore: number;
  title: string;
  excerpt: string;
  url: string;
  publishedAt: string | null;
}

interface AutopilotGateResult {
  eligible: boolean;
  reasons: string[];
  metrics: {
    uniqueSources: number;
    confirms: number;
    contradicts: number;
    signalCount: number;
  };
}

interface VerifierDecision {
  approved: boolean;
  confidence: number;
  rationale: string;
  blocker?: string;
}

interface AutopilotResult {
  reviewed: boolean;
  approved: boolean;
  applied: boolean;
  deferred: boolean;
  reason: string;
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

function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function parseBoundedFloat(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseFloat(value || '');
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function getAutopilotConfig() {
  return {
    enabled: process.env.INTELLIGENCE_STATUS_AUTOPILOT_ENABLED !== 'false',
    // Launch-safe default: recommendations are reviewed but not auto-applied
    // unless explicitly enabled.
    autoApply: process.env.INTELLIGENCE_STATUS_AUTOPILOT_AUTO_APPLY === 'true',
    minSignals: parseBoundedInt(process.env.INTELLIGENCE_STATUS_AUTOPILOT_MIN_SIGNALS, 5, 2, 25),
    minUniqueSources: parseBoundedInt(process.env.INTELLIGENCE_STATUS_AUTOPILOT_MIN_UNIQUE_SOURCES, 2, 1, 10),
    minConfidence: parseBoundedFloat(process.env.INTELLIGENCE_STATUS_AUTOPILOT_MIN_CONFIDENCE, 0.75, 0.3, 0.99),
  };
}

function cleanText(value: string | null | undefined, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function buildSignalEvidence(signals: SignalRow[]): SignalEvidence[] {
  return signals
    .map((signal) => ({
      id: signal.id,
      sourceId: signal.source_id,
      classification: cleanText(signal.classification, 'neutral'),
      confidence: signal.confidence ?? 0,
      relevanceScore: signal.relevance_score ?? 0,
      title: cleanText(signal.title, 'Untitled signal'),
      excerpt: cleanText(signal.content, '').slice(0, 500),
      url: cleanText(signal.url, ''),
      publishedAt: signal.published_at,
    }))
    .sort((left, right) => {
      if (right.confidence !== left.confidence) return right.confidence - left.confidence;
      return right.relevanceScore - left.relevanceScore;
    })
    .slice(0, 12);
}

function evaluateAutopilotGate(
  recommendation: StatusRecommendation,
  evidence: SignalEvidence[],
): AutopilotGateResult {
  const config = getAutopilotConfig();
  const reasons: string[] = [];
  const uniqueSources = new Set(evidence.map((item) => item.sourceId).filter(Boolean));
  const confirms = evidence.filter((item) =>
    item.classification === 'confirms' ||
    item.classification === 'budget_allocation' ||
    item.classification === 'policy_change',
  ).length;
  const contradicts = evidence.filter((item) => item.classification === 'contradicts').length;
  const signalCount = recommendation.signalCount;

  if (signalCount < config.minSignals) {
    reasons.push(`Only ${signalCount} signals (minimum ${config.minSignals} required).`);
  }

  if (uniqueSources.size < config.minUniqueSources) {
    reasons.push(`Only ${uniqueSources.size} unique sources (minimum ${config.minUniqueSources} required).`);
  }

  if (recommendation.confidence < config.minConfidence) {
    reasons.push(
      `Recommendation confidence ${recommendation.confidence.toFixed(2)} below threshold ${config.minConfidence.toFixed(2)}.`,
    );
  }

  if (
    recommendation.recommendedStatus === 'delivered' &&
    (confirms < 5 || contradicts > 0)
  ) {
    reasons.push('Delivered status requires at least 5 confirming signals and zero contradictions.');
  }

  if (
    recommendation.recommendedStatus === 'stalled' &&
    (contradicts < 3 || contradicts <= confirms)
  ) {
    reasons.push('Stalled status requires at least 3 contradictions and more contradictions than confirmations.');
  }

  if (
    recommendation.currentStatus === 'not_started' &&
    recommendation.recommendedStatus === 'in_progress' &&
    confirms < 3
  ) {
    reasons.push('Not-started → in-progress requires at least 3 confirming signals.');
  }

  if (recommendation.reason.toLowerCase().includes('statement-type signals')) {
    reasons.push('Statement-only evidence is not auto-applicable.');
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    metrics: {
      uniqueSources: uniqueSources.size,
      confirms,
      contradicts,
      signalCount,
    },
  };
}

function parseVerifierDecision(content: string): VerifierDecision | null {
  const trimmed = content
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const approved = parsed.approved;
    const confidence = parsed.confidence;
    const rationale = parsed.rationale;
    if (typeof approved !== 'boolean') return null;
    if (typeof confidence !== 'number' || !Number.isFinite(confidence)) return null;
    if (typeof rationale !== 'string' || rationale.trim().length === 0) return null;
    return {
      approved,
      confidence: Math.max(0, Math.min(1, confidence)),
      rationale: rationale.trim(),
      blocker: typeof parsed.blocker === 'string' ? parsed.blocker.trim() : undefined,
    };
  } catch {
    return null;
  }
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

async function updateRecommendationMetadata(
  recommendationId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from('intelligence_status_recommendations')
    .select('metadata')
    .eq('id', recommendationId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingMetadata =
    existing?.metadata &&
    typeof existing.metadata === 'object' &&
    !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const { error } = await supabase
    .from('intelligence_status_recommendations')
    .update({
      metadata: {
        ...existingMetadata,
        ...patch,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', recommendationId);

  if (error) {
    throw new Error(error.message);
  }
}

async function runAIVerifier(
  recommendation: StatusRecommendation,
  evidence: SignalEvidence[],
  gate: AutopilotGateResult,
): Promise<VerifierDecision | null> {
  const systemPrompt = `You are a strict civic accountability verifier.
You validate whether a proposed public status change should be auto-published.
Reject if evidence is weak, contradictory, or not implementation-focused.
Return JSON only with:
{
  "approved": boolean,
  "confidence": number,
  "rationale": string,
  "blocker": string | null
}`;

  const signalLines = evidence.map((item, index) =>
    `${index + 1}. [${item.classification}] c=${item.confidence.toFixed(2)} r=${item.relevanceScore.toFixed(2)} src=${item.sourceId} date=${item.publishedAt || 'unknown'} title="${item.title}"`,
  );

  const userPrompt = `Validate this status-change recommendation.

Current status: ${recommendation.currentStatus}
Recommended status: ${recommendation.recommendedStatus}
Recommendation confidence: ${recommendation.confidence}
Recommendation reason: ${recommendation.reason}
Signal count: ${recommendation.signalCount}
Confirms: ${recommendation.confirmsCount}
Contradicts: ${recommendation.contradictsCount}
Progress percent: ${recommendation.progressPercent ?? 'unknown'}

Deterministic gate metrics:
- unique sources: ${gate.metrics.uniqueSources}
- confirms: ${gate.metrics.confirms}
- contradicts: ${gate.metrics.contradicts}
- signal count: ${gate.metrics.signalCount}

Top evidence:
${signalLines.join('\n')}

Rules:
- Approve only if evidence clearly supports a real implementation-status change.
- Do NOT approve based on announcements or statements alone.
- If contradictions are material, reject.
- Be conservative for "delivered".`;

  try {
    const response = await aiComplete('reason', systemPrompt, userPrompt);
    return parseVerifierDecision(response.content);
  } catch (err) {
    console.warn(
      '[StatusPipeline] AI verifier failed:',
      err instanceof Error ? err.message : 'unknown',
    );
    return null;
  }
}

async function maybeAutopilotRecommendation(
  recommendation: StatusRecommendation,
  evidence: SignalEvidence[],
): Promise<AutopilotResult> {
  const config = getAutopilotConfig();
  if (!config.enabled) {
    return {
      reviewed: false,
      approved: false,
      applied: false,
      deferred: true,
      reason: 'Autopilot disabled by configuration.',
    };
  }

  if (!recommendation.id) {
    return {
      reviewed: false,
      approved: false,
      applied: false,
      deferred: true,
      reason: 'Recommendation ID missing.',
    };
  }

  const gate = evaluateAutopilotGate(recommendation, evidence);
  if (!gate.eligible) {
    await updateRecommendationMetadata(recommendation.id, {
      autopilot: {
        attempted_at: new Date().toISOString(),
        gate_passed: false,
        gate_reasons: gate.reasons,
        metrics: gate.metrics,
      },
    });
    return {
      reviewed: true,
      approved: false,
      applied: false,
      deferred: true,
      reason: gate.reasons.join(' '),
    };
  }

  const verifier = await runAIVerifier(recommendation, evidence, gate);
  if (!verifier) {
    await updateRecommendationMetadata(recommendation.id, {
      autopilot: {
        attempted_at: new Date().toISOString(),
        gate_passed: true,
        ai_verifier: 'unavailable',
        metrics: gate.metrics,
      },
    });
    return {
      reviewed: true,
      approved: false,
      applied: false,
      deferred: true,
      reason: 'AI verifier unavailable.',
    };
  }

  await updateRecommendationMetadata(recommendation.id, {
    autopilot: {
      attempted_at: new Date().toISOString(),
      gate_passed: true,
      gate_reasons: [],
      metrics: gate.metrics,
      verifier,
    },
  });

  if (!verifier.approved || verifier.confidence < 0.8) {
    return {
      reviewed: true,
      approved: false,
      applied: false,
      deferred: true,
      reason:
        verifier.blocker ||
        `AI verifier rejected with confidence ${verifier.confidence.toFixed(2)}.`,
    };
  }

  await reviewStatusRecommendation(
    recommendation.id,
    'approved',
    'ai-verifier',
    verifier.rationale,
  );

  if (!config.autoApply) {
    return {
      reviewed: true,
      approved: true,
      applied: false,
      deferred: false,
      reason: 'AI verifier approved; waiting for manual apply.',
    };
  }

  const applyReason = `${recommendation.reason} [AI verifier: ${verifier.rationale}]`;
  const applied = await applyStatusUpdate(
    recommendation.promiseId,
    recommendation.recommendedStatus,
    applyReason,
    {
      recommendationId: recommendation.id,
      reviewer: 'ai-verifier',
    },
  );

  return {
    reviewed: true,
    approved: true,
    applied,
    deferred: !applied,
    reason: applied
      ? 'AI verifier approved and status was auto-applied.'
      : 'AI verifier approved but apply step failed.',
  };
}

async function fetchEvidenceForPromise(promiseId: number): Promise<SignalEvidence[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('intelligence_signals')
    .select(
      'id, source_id, title, content, url, published_at, classification, relevance_score, confidence, tier3_processed, review_status',
    )
    .contains('matched_promise_ids', [promiseId]);

  if (error) {
    throw new Error(error.message);
  }

  const matchedSignals: SignalRow[] = ((data as SignalRow[]) ?? []).filter(
    (signal) =>
      signal.tier3_processed === true &&
      (signal.confidence ?? 0) >= 0.3 &&
      signal.review_status !== 'rejected',
  );

  return buildSignalEvidence(matchedSignals);
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
): Promise<StatusRecommendation> {
  const supabase = getSupabase();
  const promiseId = String(recommendation.promiseId);

  const { data: existing, error: existingError } = await supabase
    .from('intelligence_status_recommendations')
      .select('id, created_at')
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

    return {
      ...recommendation,
      id: existing.id,
      createdAt:
        typeof existing.created_at === 'string'
          ? existing.created_at
          : recommendation.createdAt,
      reviewState: 'pending',
    };
  }

  const { data, error } = await supabase
    .from('intelligence_status_recommendations')
    .insert(payload)
    .select('id, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const inserted = data && typeof data === 'object' ? data : null;
  return {
    ...recommendation,
    id:
      inserted &&
      'id' in inserted &&
      typeof (inserted as { id?: unknown }).id === 'string'
        ? (inserted as { id: string }).id
        : recommendation.id,
    createdAt:
      inserted &&
      'created_at' in inserted &&
      typeof (inserted as { created_at?: unknown }).created_at === 'string'
        ? (inserted as { created_at: string }).created_at
        : recommendation.createdAt,
    reviewState: 'pending',
  };
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
  const reviewedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('intelligence_status_recommendations')
    .update({
      review_state: action,
      reviewed_by: reviewer,
      reviewed_at: reviewedAt,
      applied_at: action === 'applied' ? reviewedAt : null,
      updated_at: reviewedAt,
    })
    .eq('id', recommendationId)
    .select(
      'id, promise_id, promise_title, current_status, recommended_status, confidence, reason, signal_count, confirms_count, contradicts_count, review_state, created_at',
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (notes && notes.trim().length > 0) {
    await updateRecommendationMetadata(recommendationId, {
      review_notes: notes.trim(),
      review_action: action,
      review_actor: reviewer,
      review_timestamp: reviewedAt,
    });
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
      'id, source_id, title, content, url, published_at, classification, matched_promise_ids, relevance_score, confidence, tier3_processed, review_status',
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
  let autoReviewed = 0;
  let autoApproved = 0;
  let autoApplied = 0;
  let autoDeferred = 0;
  const persistedRecommendations: StatusRecommendation[] = [];

  for (const recommendation of recommendations) {
    const storedRecommendation = await upsertStatusRecommendation(recommendation);
    persisted++;
    persistedRecommendations.push(storedRecommendation);

    try {
      const evidence = await fetchEvidenceForPromise(storedRecommendation.promiseId);
      const autopilot = await maybeAutopilotRecommendation(
        storedRecommendation,
        evidence,
      );
      if (autopilot.reviewed) autoReviewed++;
      if (autopilot.approved) autoApproved++;
      if (autopilot.applied) autoApplied++;
      if (autopilot.reviewed && autopilot.deferred) autoDeferred++;
    } catch (err) {
      autoDeferred++;
      console.warn(
        `[StatusPipeline] Autopilot verify/apply failed for promise ${storedRecommendation.promiseId}:`,
        err instanceof Error ? err.message : 'unknown',
      );
    }
  }

  console.log(
    `[StatusPipeline] Analyzed ${promises.length} commitments, ` +
      `${recommendations.length} status changes recommended, ` +
      `${persisted} recommendations persisted, ` +
      `${autoReviewed} AI-verified, ${autoApplied} auto-applied.`,
  );

  return {
    analyzed: promises.length,
    updated: recommendations.length,
    persisted,
    autoReviewed,
    autoApproved,
    autoApplied,
    autoDeferred,
    recommendations: persistedRecommendations,
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
