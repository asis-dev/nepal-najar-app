/**
 * Promise Recomputer — derives promise status, progress, and trust_level
 * from REAL scraped evidence (articles + AI analysis).
 *
 * Called after:
 * 1. Cron scrape cycle completes (recomputeAllPromises)
 * 2. AI analysis processes articles (recomputePromiseStatus for affected promises)
 *
 * This is the bridge between raw scraped data and the promises table metrics.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

interface ArticleEvidence {
  id: string;
  confidence: number;
  classification: string;
  source_name: string;
  scraped_at: string;
}

interface PromiseUpdate {
  id: string;
  field_changed: string;
  new_value: string | null;
  change_reason: string | null;
  created_at: string;
}

interface ComputedMetrics {
  status: 'not_started' | 'in_progress' | 'delivered' | 'stalled';
  progress: number;
  trust_level: 'verified' | 'partial' | 'unverified' | 'disputed';
  evidence_count: number;
  last_update: string | null;
}

/* ═══════════════════════════════════════════════
   STATUS DERIVATION
   ═══════════════════════════════════════════════ */

function deriveStatus(
  articleCount: number,
  updates: PromiseUpdate[],
  avgConfidence: number,
): ComputedMetrics['status'] {
  if (articleCount === 0) return 'not_started';

  // Check for high-confidence signals from AI analysis
  const progressSignals = updates.filter(
    (u) => u.change_reason?.includes('progress') || u.change_reason?.includes('confirms'),
  );
  const completionSignals = updates.filter(
    (u) => u.change_reason?.includes('completion') || u.change_reason?.includes('delivered'),
  );
  const contradictSignals = updates.filter(
    (u) => u.change_reason?.includes('contradicts') || u.change_reason?.includes('stalled'),
  );

  // If we have completion signals with good confidence, mark delivered
  if (completionSignals.length >= 2 && avgConfidence >= 0.6) return 'delivered';

  // If more contradictions than progress, it's stalled
  if (contradictSignals.length > progressSignals.length && contradictSignals.length >= 2) return 'stalled';

  // With progress signals or multiple articles, mark in_progress
  if (progressSignals.length >= 1 || articleCount >= 3) return 'in_progress';

  // Few articles but some coverage — still in_progress
  if (articleCount >= 1) return 'in_progress';

  return 'not_started';
}

/* ═══════════════════════════════════════════════
   PROGRESS DERIVATION
   ═══════════════════════════════════════════════ */

function deriveProgress(
  status: ComputedMetrics['status'],
  articleCount: number,
  updates: PromiseUpdate[],
  avgConfidence: number,
): number {
  if (status === 'not_started') return 0;
  if (status === 'delivered') return 100;
  if (status === 'stalled') return Math.min(30, articleCount * 5);

  // in_progress: base from article evidence + signal boosts
  let progress = 0;

  // Base: each article contributes 5%, capped at 40%
  progress += Math.min(40, articleCount * 5);

  // Signal boosts from AI analysis
  const progressSignals = updates.filter(
    (u) => u.change_reason?.includes('progress') || u.change_reason?.includes('confirms'),
  );
  progress += Math.min(30, progressSignals.length * 10);

  // Confidence multiplier (high confidence = more trustworthy progress)
  if (avgConfidence >= 0.7) progress = Math.min(85, Math.round(progress * 1.2));
  else if (avgConfidence >= 0.5) progress = Math.min(70, Math.round(progress * 1.1));

  return Math.min(90, Math.max(5, progress)); // Never show 100% unless delivered
}

/* ═══════════════════════════════════════════════
   TRUST LEVEL DERIVATION
   ═══════════════════════════════════════════════ */

function deriveTrustLevel(
  articleCount: number,
  uniqueSources: number,
  avgConfidence: number,
  hasAIAnalysis: boolean,
): ComputedMetrics['trust_level'] {
  // Need AI analysis + multiple diverse sources for verified
  if (hasAIAnalysis && uniqueSources >= 3 && avgConfidence >= 0.6) return 'verified';

  // Multiple sources or good AI confidence for partial
  if (uniqueSources >= 2 || (hasAIAnalysis && avgConfidence >= 0.4)) return 'partial';

  // At least some evidence
  if (articleCount >= 1) return 'unverified';

  return 'unverified';
}

/* ═══════════════════════════════════════════════
   SINGLE PROMISE RECOMPUTE
   ═══════════════════════════════════════════════ */

export async function recomputePromiseStatus(promiseId: string): Promise<ComputedMetrics | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    // 1. Count articles matched to this promise
    const { data: articles } = await supabase
      .from('scraped_articles')
      .select('id, confidence, classification, source_name, scraped_at')
      .contains('promise_ids', [promiseId]);

    const articleList = (articles ?? []) as ArticleEvidence[];
    const articleCount = articleList.length;

    // 2. Get promise_updates for this promise
    const { data: updates } = await supabase
      .from('promise_updates')
      .select('id, field_changed, new_value, change_reason, created_at')
      .eq('promise_id', promiseId)
      .order('created_at', { ascending: false });

    const updateList = (updates ?? []) as PromiseUpdate[];

    // 3. Compute metrics
    const avgConfidence = articleCount > 0
      ? articleList.reduce((sum, a) => sum + (Number(a.confidence) || 0), 0) / articleCount
      : 0;

    const uniqueSources = new Set(articleList.map((a) => a.source_name)).size;
    const hasAIAnalysis = updateList.length > 0;

    const status = deriveStatus(articleCount, updateList, avgConfidence);
    const progress = deriveProgress(status, articleCount, updateList, avgConfidence);
    const trust_level = deriveTrustLevel(articleCount, uniqueSources, avgConfidence, hasAIAnalysis);

    // Latest date from articles or updates
    const latestArticleDate = articleList.length > 0
      ? articleList.sort((a, b) => new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime())[0].scraped_at
      : null;
    const latestUpdateDate = updateList.length > 0 ? updateList[0].created_at : null;

    const last_update = latestArticleDate && latestUpdateDate
      ? new Date(latestArticleDate) > new Date(latestUpdateDate) ? latestArticleDate : latestUpdateDate
      : latestArticleDate ?? latestUpdateDate;

    const metrics: ComputedMetrics = {
      status,
      progress,
      trust_level,
      evidence_count: articleCount,
      last_update: last_update ? new Date(last_update).toISOString().split('T')[0] : null,
    };

    // 4. Update promises table
    await supabase
      .from('promises')
      .update({
        status: metrics.status,
        progress: metrics.progress,
        trust_level: metrics.trust_level,
        evidence_count: metrics.evidence_count,
        last_update: metrics.last_update,
        updated_at: new Date().toISOString(),
      })
      .eq('id', promiseId);

    return metrics;
  } catch (err) {
    console.error(`[recomputer] Failed for promise ${promiseId}:`, err);
    return null;
  }
}

/* ═══════════════════════════════════════════════
   BATCH RECOMPUTE ALL PROMISES
   ═══════════════════════════════════════════════ */

export async function recomputeAllPromises(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  if (!isSupabaseConfigured()) return { processed: 0, updated: 0, errors: 0 };

  const result = { processed: 0, updated: 0, errors: 0 };

  try {
    // Get all promise IDs from the database
    const { data: promises } = await supabase
      .from('promises')
      .select('id')
      .order('id');

    if (!promises || promises.length === 0) {
      console.warn('[recomputer] No promises found in database');
      return result;
    }

    for (const promise of promises) {
      const metrics = await recomputePromiseStatus(promise.id as string);
      result.processed++;
      if (metrics) result.updated++;
      else result.errors++;
    }

    console.log(
      `[recomputer] Recomputed ${result.processed} promises: ${result.updated} updated, ${result.errors} errors`,
    );
  } catch (err) {
    console.error('[recomputer] Batch recompute failed:', err);
  }

  return result;
}
