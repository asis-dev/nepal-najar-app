/**
 * Promise Status Bridge
 *
 * Reads classified intelligence signals grouped by promise_id,
 * determines promise status based on signal counts and types,
 * and updates the promises table accordingly.
 */

import { getSupabase } from '@/lib/supabase/server';

interface SignalSummary {
  promiseId: number;
  confirms: number;
  contradicts: number;
  neutral: number;
  related: number;
  highConfidenceConfirms: number;
  uniqueSourceTypes: Set<string>;
}

interface SyncResult {
  promisesChecked: number;
  statusesUpdated: number;
  evidenceCountsUpdated: number;
  errors: string[];
}

/**
 * Determine the promise status based on signal analysis.
 *
 * - 0 signals = "not_started"
 * - Has confirms with high confidence = "in_progress"
 * - Has strong contradictions = "at_risk" (mapped to "stalled")
 * - Multiple strong confirms from different sources = "on_track" (mapped to "in_progress")
 */
function determineStatus(summary: SignalSummary): 'not_started' | 'in_progress' | 'stalled' | null {
  const total = summary.confirms + summary.contradicts + summary.neutral + summary.related;

  if (total === 0) return 'not_started';

  // Multiple strong confirms from different source types -> in_progress
  if (summary.highConfidenceConfirms >= 2 && summary.uniqueSourceTypes.size >= 2) {
    return 'in_progress';
  }

  // Strong contradictions outweigh confirms -> stalled (at_risk)
  if (summary.contradicts > summary.confirms && summary.contradicts >= 2) {
    return 'stalled';
  }

  // Has confirms with high confidence -> in_progress
  if (summary.highConfidenceConfirms >= 1) {
    return 'in_progress';
  }

  // Has any confirms -> in_progress
  if (summary.confirms > 0) {
    return 'in_progress';
  }

  // Only neutral/related signals - don't change status
  return null;
}

/**
 * Sync promise statuses based on intelligence signals.
 * Called after each sweep to update promise statuses and evidence counts.
 */
export async function syncPromiseStatuses(): Promise<SyncResult> {
  const supabase = getSupabase();
  const result: SyncResult = {
    promisesChecked: 0,
    statusesUpdated: 0,
    evidenceCountsUpdated: 0,
    errors: [],
  };

  try {
    // 1. Get all classified signals grouped conceptually by promise
    const { data: signals, error: signalsError } = await supabase
      .from('intelligence_signals')
      .select('id, matched_promise_ids, classification, confidence, signal_type, relevance_score')
      .eq('tier1_processed', true)
      .gte('relevance_score', 0.3);

    if (signalsError) {
      result.errors.push(`Signals query error: ${signalsError.message}`);
      return result;
    }

    if (!signals || signals.length === 0) {
      return result;
    }

    // 2. Build per-promise summaries
    const summaries = new Map<number, SignalSummary>();

    for (const signal of signals) {
      const promiseIds = (signal.matched_promise_ids as number[]) || [];
      const classification = signal.classification as string;
      const confidence = (signal.confidence as number) || 0;
      const signalType = signal.signal_type as string;

      for (const pid of promiseIds) {
        if (!summaries.has(pid)) {
          summaries.set(pid, {
            promiseId: pid,
            confirms: 0,
            contradicts: 0,
            neutral: 0,
            related: 0,
            highConfidenceConfirms: 0,
            uniqueSourceTypes: new Set(),
          });
        }

        const s = summaries.get(pid)!;
        s.uniqueSourceTypes.add(signalType);

        switch (classification) {
          case 'confirms':
          case 'budget_allocation':
          case 'policy_change':
            s.confirms++;
            if (confidence >= 0.6) s.highConfidenceConfirms++;
            break;
          case 'contradicts':
            s.contradicts++;
            break;
          case 'neutral':
            s.neutral++;
            break;
          default:
            s.related++;
            break;
        }
      }
    }

    // 3. Get evidence counts per promise
    const { data: evidenceRows, error: evidenceError } = await supabase
      .from('evidence_vault')
      .select('promise_ids');

    const evidenceCounts = new Map<number, number>();
    if (!evidenceError && evidenceRows) {
      for (const row of evidenceRows) {
        const pids = (row.promise_ids as number[]) || [];
        for (const pid of pids) {
          evidenceCounts.set(pid, (evidenceCounts.get(pid) || 0) + 1);
        }
      }
    }

    // 4. Update each promise
    const allPromiseIds = new Set([...summaries.keys(), ...evidenceCounts.keys()]);

    for (const promiseId of allPromiseIds) {
      result.promisesChecked++;
      const summary = summaries.get(promiseId);
      const evidenceCount = evidenceCounts.get(promiseId) || 0;

      const updateData: Record<string, unknown> = {};

      // Determine status if we have signals
      if (summary) {
        const newStatus = determineStatus(summary);
        if (newStatus) {
          updateData.status = newStatus;
        }
      }

      // Update evidence count if column exists
      if (evidenceCount > 0) {
        updateData.evidence_count = evidenceCount;
      }

      if (Object.keys(updateData).length === 0) continue;

      // Try to update - the column may or may not exist
      const { error: updateError } = await supabase
        .from('promises')
        .update(updateData)
        .eq('id', promiseId);

      if (updateError) {
        // If evidence_count column doesn't exist, retry without it
        if (updateError.message.includes('evidence_count')) {
          const { status, ...withoutEvidence } = updateData as { status?: string };
          if (status) {
            const { error: retryError } = await supabase
              .from('promises')
              .update({ status })
              .eq('id', promiseId);

            if (retryError) {
              result.errors.push(`Update promise ${promiseId}: ${retryError.message}`);
            } else {
              result.statusesUpdated++;
            }
          }
        } else {
          result.errors.push(`Update promise ${promiseId}: ${updateError.message}`);
        }
      } else {
        if (updateData.status) result.statusesUpdated++;
        if (updateData.evidence_count) result.evidenceCountsUpdated++;
      }
    }

    console.log(
      `[StatusSync] Checked ${result.promisesChecked} promises, ` +
      `updated ${result.statusesUpdated} statuses, ` +
      `${result.evidenceCountsUpdated} evidence counts, ` +
      `${result.errors.length} errors`,
    );
  } catch (err) {
    result.errors.push(
      `Sync error: ${err instanceof Error ? err.message : 'unknown'}`,
    );
  }

  return result;
}
