import { getSupabase } from '@/lib/supabase/server';

export async function recordSignalReviewAudit(input: {
  signalId: string;
  action: 'approved' | 'rejected' | 'edited';
  reviewer?: string | null;
  previousClassification?: string | null;
  newClassification?: string | null;
  previousConfidence?: number | null;
  newConfidence?: number | null;
  notes?: string | null;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('intelligence_review_audit').insert({
      signal_id: input.signalId,
      action: input.action,
      reviewer: input.reviewer || 'admin',
      previous_classification: input.previousClassification || null,
      new_classification: input.newClassification || null,
      previous_confidence:
        typeof input.previousConfidence === 'number'
          ? input.previousConfidence
          : null,
      new_confidence:
        typeof input.newConfidence === 'number' ? input.newConfidence : null,
      notes: input.notes || null,
    });

    if (error) {
      console.error('[ReviewAudit] Failed to record audit row:', error.message);
    }
  } catch (err) {
    console.error(
      '[ReviewAudit] Unexpected audit write failure:',
      err instanceof Error ? err.message : err,
    );
  }
}
