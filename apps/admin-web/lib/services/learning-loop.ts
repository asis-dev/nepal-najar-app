import type { SupabaseClient } from '@supabase/supabase-js';
import { insertTaskEventBestEffort } from './task-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedbackType =
  | 'route_correction' // user was sent to wrong service
  | 'draft_edit' // user edited AI-generated draft
  | 'submission_failed' // submission rejected
  | 'department_rejection' // department rejected field/doc
  | 'answer_wrong' // user marked AI answer as wrong
  | 'case_reassigned' // ops reassigned case
  | 'positive' // user confirmed good experience
  | 'triage_override' // user overrode triage decision
  | 'extraction_correction' // user corrected extracted document data
  | 'draft_correction'; // user corrected a pre-filled draft field

export interface FeedbackEntry {
  id?: string;
  userId: string;
  taskId?: string;
  serviceSlug?: string;
  feedbackType: FeedbackType;
  originalValue: string;
  correctedValue?: string;
  userComment?: string;
  context?: Record<string, unknown>;
  createdAt?: string;
}

export interface LearningInsight {
  pattern: string;
  frequency: number;
  suggestedFix: string;
  affectedService: string;
  severity: 'low' | 'medium' | 'high';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a Supabase error indicates a missing table. */
function isMissingTable(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('could not find the table') ||
    m.includes('relation')
  );
}

/**
 * Try to insert into service_feedback table. If the table doesn't exist,
 * fall back to logging the feedback as a service_task_events row.
 */
async function insertFeedbackRow(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  taskId?: string,
): Promise<boolean> {
  const { error } = await supabase.from('service_feedback').insert(row);

  if (!error) return true;

  if (isMissingTable(error.message)) {
    console.warn(
      '[learning-loop] service_feedback table not found — storing as task event fallback',
    );

    // Fall back to service_task_events if we have a taskId
    if (taskId) {
      await insertTaskEventBestEffort(supabase, {
        task_id: taskId,
        event_type: 'user_action',
        title: `Feedback: ${row.feedback_type}`,
        detail: JSON.stringify({
          original: row.original_value,
          corrected: row.corrected_value,
          comment: row.user_comment,
          context: row.context,
        }),
        actor: 'user',
      });
    }
    return true; // "success" via fallback
  }

  console.warn('[learning-loop] insertFeedbackRow failed:', error.message);
  return false;
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Record a feedback entry. Inserts into `service_feedback` if the table
 * exists, otherwise falls back to logging as a task event.
 */
export async function recordFeedback(
  supabase: SupabaseClient,
  entry: FeedbackEntry,
): Promise<boolean> {
  const row: Record<string, unknown> = {
    user_id: entry.userId,
    task_id: entry.taskId || null,
    service_slug: entry.serviceSlug || null,
    feedback_type: entry.feedbackType,
    original_value: entry.originalValue,
    corrected_value: entry.correctedValue || null,
    user_comment: entry.userComment || null,
    context: entry.context || null,
    created_at: entry.createdAt || new Date().toISOString(),
  };

  return insertFeedbackRow(supabase, row, entry.taskId);
}

/**
 * Record when a user edits a draft field — tracks what the AI got wrong so
 * we can improve auto-fill accuracy over time.
 */
export async function recordDraftCorrection(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  fieldKey: string,
  originalValue: string,
  correctedValue: string,
  source: string = 'unknown',
): Promise<void> {
  await recordFeedback(supabase, {
    userId,
    taskId,
    feedbackType: 'draft_correction',
    originalValue,
    correctedValue,
    context: { field_key: fieldKey, source },
  });
}

/**
 * Record when a user chose a different service than the AI suggested.
 */
export async function recordRouteCorrection(
  supabase: SupabaseClient,
  userId: string,
  originalQuery: string,
  suggestedService: string,
  chosenService: string,
  triageMethod: 'ai' | 'keyword' = 'ai',
): Promise<void> {
  await recordFeedback(supabase, {
    userId,
    feedbackType: 'route_correction',
    originalValue: suggestedService,
    correctedValue: chosenService,
    context: { user_query: originalQuery, triage_method: triageMethod },
  });
}

/**
 * Record when extracted data from a document is wrong — tracks OCR/extraction
 * accuracy so we can improve document processing over time.
 */
export async function recordDocumentCorrection(
  supabase: SupabaseClient,
  userId: string,
  docType: string,
  fieldKey: string,
  extractedValue: string,
  correctedValue: string,
): Promise<void> {
  await recordFeedback(supabase, {
    userId,
    feedbackType: 'extraction_correction',
    originalValue: extractedValue,
    correctedValue,
    context: { doc_type: docType, field_key: fieldKey },
  });
}

/**
 * Aggregate feedback entries into learning insights. Groups corrections by
 * pattern and identifies recurring issues.
 */
export async function getLearningInsights(
  supabase: SupabaseClient,
  serviceSlug?: string,
): Promise<LearningInsight[]> {
  const insights: LearningInsight[] = [];

  try {
    let query = supabase
      .from('service_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (serviceSlug) {
      query = query.eq('service_slug', serviceSlug);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTable(error.message)) return [];
      console.warn('[learning-loop] getLearningInsights query failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Group by feedback_type + service_slug
    const groups = new Map<string, { count: number; slug: string; type: string }>();

    for (const row of data) {
      const key = `${row.feedback_type}:${row.service_slug || 'general'}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, {
          count: 1,
          slug: (row.service_slug as string) || 'general',
          type: row.feedback_type as string,
        });
      }
    }

    // Convert groups to insights
    for (const [, group] of Array.from(groups)) {
      const severity: LearningInsight['severity'] =
        group.count >= 10 ? 'high' : group.count >= 5 ? 'medium' : 'low';

      let suggestedFix: string;
      let pattern: string;

      switch (group.type) {
        case 'route_correction':
          pattern = `Users are being routed to the wrong service for ${group.slug}`;
          suggestedFix = 'Review and update routing keywords/intent matching for this service.';
          break;
        case 'draft_edit':
          pattern = `AI-generated drafts for ${group.slug} are frequently edited`;
          suggestedFix = 'Review auto-fill logic and field defaults for this service.';
          break;
        case 'submission_failed':
          pattern = `Submissions for ${group.slug} are frequently failing`;
          suggestedFix = 'Check form validation rules and required fields.';
          break;
        case 'department_rejection':
          pattern = `Department is rejecting ${group.slug} applications`;
          suggestedFix = 'Review document requirements and form field accuracy.';
          break;
        case 'answer_wrong':
          pattern = `AI answers about ${group.slug} are being marked as wrong`;
          suggestedFix = 'Update the knowledge base and FAQ for this service.';
          break;
        case 'extraction_correction':
          pattern = `Document extraction for ${group.slug} is frequently corrected`;
          suggestedFix = 'Review OCR/extraction logic and field mapping for this document type.';
          break;
        case 'draft_correction':
          pattern = `Pre-filled draft fields for ${group.slug} are frequently corrected`;
          suggestedFix = 'Review autofill data sources and field mapping accuracy.';
          break;
        default:
          pattern = `${group.type} feedback for ${group.slug}`;
          suggestedFix = 'Review feedback entries for patterns.';
      }

      insights.push({
        pattern,
        frequency: group.count,
        suggestedFix,
        affectedService: group.slug,
        severity,
      });
    }

    // Sort by frequency descending
    insights.sort((a, b) => b.frequency - a.frequency);
  } catch {
    // Table doesn't exist or query failed — return empty
  }

  return insights;
}

/**
 * Compute accuracy metrics across all feedback data. Returns zeros if no
 * data is available.
 */
export async function getAccuracyMetrics(
  supabase: SupabaseClient,
): Promise<{
  routeAccuracy: number;
  draftAccuracy: number;
  submissionSuccessRate: number;
  averageFieldsAutoFilled: number;
  averageUserEdits: number;
  totalFeedback: number;
}> {
  const defaults = {
    routeAccuracy: 0,
    draftAccuracy: 0,
    submissionSuccessRate: 0,
    averageFieldsAutoFilled: 0,
    averageUserEdits: 0,
    totalFeedback: 0,
  };

  try {
    const { data, error } = await supabase
      .from('service_feedback')
      .select('feedback_type')
      .limit(10_000);

    if (error) {
      if (isMissingTable(error.message)) return defaults;
      console.warn('[learning-loop] getAccuracyMetrics query failed:', error.message);
      return defaults;
    }

    if (!data || data.length === 0) return defaults;

    const totalFeedback = data.length;

    // Count by type
    const counts: Record<string, number> = {};
    for (const row of data) {
      const t = row.feedback_type as string;
      counts[t] = (counts[t] || 0) + 1;
    }

    const routeCorrections = counts['route_correction'] || 0;
    const draftEdits = (counts['draft_edit'] || 0) + (counts['draft_correction'] || 0);
    const extractionCorrections = counts['extraction_correction'] || 0;
    const submissionsFailed = counts['submission_failed'] || 0;
    const positives = counts['positive'] || 0;

    // Route accuracy: % of routing decisions that were NOT corrected
    // We approximate total routes as (positives + routeCorrections) or totalFeedback
    const totalRouteDecisions = positives + routeCorrections || 1;
    const routeAccuracy = Math.round(
      ((totalRouteDecisions - routeCorrections) / totalRouteDecisions) * 100,
    );

    // Draft accuracy: % of interactions that had NO draft edits
    // Approximate as total minus draft edits / total
    const draftAccuracy =
      totalFeedback > 0
        ? Math.round(((totalFeedback - draftEdits) / totalFeedback) * 100)
        : 0;

    // Submission success rate
    const totalSubmissionAttempts = totalFeedback - draftEdits - routeCorrections || 1;
    const submissionSuccessRate = Math.round(
      ((totalSubmissionAttempts - submissionsFailed) / totalSubmissionAttempts) * 100,
    );

    // Average edits — we only know total edit feedback, not per-task breakdown
    const averageUserEdits = totalFeedback > 0 ? draftEdits / totalFeedback : 0;

    return {
      routeAccuracy: Math.min(100, Math.max(0, routeAccuracy)),
      draftAccuracy: Math.min(100, Math.max(0, draftAccuracy)),
      submissionSuccessRate: Math.min(100, Math.max(0, submissionSuccessRate)),
      averageFieldsAutoFilled: 0, // requires per-task field tracking — not yet available
      averageUserEdits: Math.round(averageUserEdits * 100) / 100,
      totalFeedback,
    };
  } catch {
    return defaults;
  }
}

// ---------------------------------------------------------------------------
// Correction Stats
// ---------------------------------------------------------------------------

export interface CorrectionStat {
  key: string;
  count: number;
  examples: Array<{ original: string; corrected: string }>;
}

export interface CorrectionStats {
  routeCorrections: CorrectionStat[];
  documentCorrections: CorrectionStat[];
  draftCorrections: CorrectionStat[];
  totals: {
    routeCorrections: number;
    documentCorrections: number;
    draftCorrections: number;
  };
}

/**
 * Aggregate correction signals to show accuracy breakdowns:
 * - Most commonly corrected routes (triage accuracy)
 * - Most commonly corrected document fields (OCR accuracy)
 * - Most commonly corrected draft fields (autofill accuracy)
 */
export async function getCorrectionStats(
  supabase: SupabaseClient,
): Promise<CorrectionStats> {
  const empty: CorrectionStats = {
    routeCorrections: [],
    documentCorrections: [],
    draftCorrections: [],
    totals: { routeCorrections: 0, documentCorrections: 0, draftCorrections: 0 },
  };

  try {
    const { data, error } = await supabase
      .from('service_feedback')
      .select('feedback_type, original_value, corrected_value, context')
      .in('feedback_type', ['route_correction', 'extraction_correction', 'draft_correction'])
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      if (isMissingTable(error.message)) return empty;
      console.warn('[learning-loop] getCorrectionStats query failed:', error.message);
      return empty;
    }

    if (!data || data.length === 0) return empty;

    // Group by type and key
    const routeMap = new Map<string, { count: number; examples: Array<{ original: string; corrected: string }> }>();
    const docMap = new Map<string, { count: number; examples: Array<{ original: string; corrected: string }> }>();
    const draftMap = new Map<string, { count: number; examples: Array<{ original: string; corrected: string }> }>();

    for (const row of data) {
      const ctx = (row.context as Record<string, unknown>) || {};
      const original = (row.original_value as string) || '';
      const corrected = (row.corrected_value as string) || '';

      if (row.feedback_type === 'route_correction') {
        const key = `${original} → ${corrected}`;
        const entry = routeMap.get(key) || { count: 0, examples: [] };
        entry.count += 1;
        if (entry.examples.length < 3) {
          entry.examples.push({ original, corrected });
        }
        routeMap.set(key, entry);
      } else if (row.feedback_type === 'extraction_correction') {
        const fieldKey = (ctx.field_key as string) || 'unknown';
        const docType = (ctx.doc_type as string) || 'unknown';
        const key = `${docType}:${fieldKey}`;
        const entry = docMap.get(key) || { count: 0, examples: [] };
        entry.count += 1;
        if (entry.examples.length < 3) {
          entry.examples.push({ original, corrected });
        }
        docMap.set(key, entry);
      } else if (row.feedback_type === 'draft_correction') {
        const fieldKey = (ctx.field_key as string) || 'unknown';
        const entry = draftMap.get(fieldKey) || { count: 0, examples: [] };
        entry.count += 1;
        if (entry.examples.length < 3) {
          entry.examples.push({ original, corrected });
        }
        draftMap.set(fieldKey, entry);
      }
    }

    const toSorted = (map: Map<string, { count: number; examples: Array<{ original: string; corrected: string }> }>): CorrectionStat[] =>
      Array.from(map.entries())
        .map(([key, val]) => ({ key, count: val.count, examples: val.examples }))
        .sort((a, b) => b.count - a.count);

    const routeCorrections = toSorted(routeMap);
    const documentCorrections = toSorted(docMap);
    const draftCorrections = toSorted(draftMap);

    return {
      routeCorrections,
      documentCorrections,
      draftCorrections,
      totals: {
        routeCorrections: routeCorrections.reduce((sum, r) => sum + r.count, 0),
        documentCorrections: documentCorrections.reduce((sum, r) => sum + r.count, 0),
        draftCorrections: draftCorrections.reduce((sum, r) => sum + r.count, 0),
      },
    };
  } catch {
    return empty;
  }
}

/**
 * Check if there's a previous routing correction for a similar query that
 * was routed to the same slug. If so, return the corrected slug so the
 * router can learn from past mistakes.
 */
export async function hasRoutingCorrection(
  supabase: SupabaseClient,
  query: string,
  suggestedSlug: string,
): Promise<{ corrected: boolean; betterSlug?: string }> {
  try {
    // Look for route_correction entries where the original value matches the suggested slug
    const { data, error } = await supabase
      .from('service_feedback')
      .select('corrected_value, context')
      .eq('feedback_type', 'route_correction')
      .eq('original_value', suggestedSlug)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      if (isMissingTable(error.message)) return { corrected: false };
      console.warn('[learning-loop] hasRoutingCorrection query failed:', error.message);
      return { corrected: false };
    }

    if (!data || data.length === 0) return { corrected: false };

    // Simple string matching: check if any previous correction had a similar query
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    for (const row of data) {
      const ctx = row.context as Record<string, unknown> | null;
      const prevQuery = ((ctx?.user_query as string) || '').toLowerCase().trim();

      if (!prevQuery) continue;

      // Check if queries share significant words (simple overlap)
      const prevWords = prevQuery.split(/\s+/).filter((w: string) => w.length > 2);
      const overlap = queryWords.filter((w) => prevWords.includes(w));

      // If at least half the query words match, consider it a match
      if (overlap.length >= Math.max(1, Math.floor(queryWords.length / 2))) {
        return {
          corrected: true,
          betterSlug: (row.corrected_value as string) || undefined,
        };
      }
    }

    return { corrected: false };
  } catch {
    return { corrected: false };
  }
}
