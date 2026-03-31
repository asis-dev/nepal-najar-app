/**
 * Data access layer — abstracts static vs live data.
 *
 * Default: Supabase is used when NEXT_PUBLIC_SUPABASE_URL is configured.
 * Set NEXT_PUBLIC_USE_LIVE_DATA=false to force static data (for local dev without Supabase).
 */
import { promises as staticPromises, type GovernmentPromise } from './promises';
import { PROMISES_KNOWLEDGE } from '@/lib/intelligence/knowledge-base';
import { computeLiveScoreBatch } from '@/lib/intelligence/live-score-engine';

const USE_LIVE_DATA = process.env.NEXT_PUBLIC_USE_LIVE_DATA !== 'false';
const RECOUNT_EVIDENCE_ON_READ =
  process.env.INTELLIGENCE_RECOUNT_EVIDENCE_ON_READ === 'true';
const ENABLE_LIVE_SCORE_READ_MERGE =
  process.env.INTELLIGENCE_ENABLE_LIVE_SCORE_READ_MERGE === 'true';

// Build a lookup map from knowledge base (id -> knowledge entry)
const knowledgeMap = new Map(PROMISES_KNOWLEDGE.map((k) => [k.id, k]));

/**
 * Merge keyOfficials + keyMinistries from the knowledge base into the actors field
 * for any promise whose actors array is empty or undefined.
 */
function enrichActors(promises: GovernmentPromise[]): GovernmentPromise[] {
  for (const p of promises) {
    if (!p.actors || p.actors.length === 0) {
      const kb = knowledgeMap.get(Number(p.id));
      if (kb) {
        p.actors = [...kb.keyOfficials, ...kb.keyMinistries];
      }
    }
  }
  return promises;
}

/**
 * Get all promises — from Supabase if live data is enabled, static fallback otherwise.
 */
export async function getPromises(): Promise<GovernmentPromise[]> {
  if (!USE_LIVE_DATA) return enrichActors([...staticPromises]);

  try {
    const { supabase } = await import('@/lib/supabase/server');
    const { data, error } = await supabase
      .from('promises')
      .select('*')
      .order('id');

    if (error || !data || data.length === 0) {
      console.warn('[data] Supabase query failed, falling back to static:', error?.message);
      return enrichActors([...staticPromises]);
    }

    // Optional exact recount from scraped_articles (expensive on large datasets).
    // Default behavior trusts persisted evidence_count for fast public page loads.
    const evidenceCountMap: Record<string, number> = {};
    if (RECOUNT_EVIDENCE_ON_READ) {
      try {
        const { data: articles } = await supabase
          .from('scraped_articles')
          .select('promise_ids');
        for (const a of articles || []) {
          const pids = a.promise_ids as string[] | null;
          if (!pids) continue;
          for (const pid of pids) {
            evidenceCountMap[pid] = (evidenceCountMap[pid] || 0) + 1;
          }
        }
      } catch {
        console.warn('[data] Failed to compute evidence counts');
      }
    }

    // Map Supabase snake_case to GovernmentPromise camelCase
    const mapped = enrichActors(data.map((p: Record<string, unknown>) => ({
      id: p.id as string,
      slug: p.slug as string,
      title: p.title as string,
      title_ne: p.title_ne as string,
      summary: (p.summary || p.description || '') as string,
      summary_ne: (p.summary_ne || p.description_ne || '') as string,
      category: p.category as GovernmentPromise['category'],
      category_ne: (p.category_ne || '') as string,
      status: p.status as GovernmentPromise['status'],
      progress: p.progress as number,
      linkedProjects: p.linked_projects as number,
      evidenceCount: RECOUNT_EVIDENCE_ON_READ
        ? evidenceCountMap[p.id as string] || 0
        : (p.evidence_count as number) || 0,
      lastUpdate: p.last_update as string,
      description: p.description as string,
      description_ne: p.description_ne as string,
      trustLevel: p.trust_level as GovernmentPromise['trustLevel'],
      signalType: (p.signal_type || 'inferred') as GovernmentPromise['signalType'],
      reviewState: (p.review_state || 'reviewed') as GovernmentPromise['reviewState'],
      isPublic: p.is_public !== false,
      scope: (p.scope || p.geo_scope || 'unknown') as GovernmentPromise['scope'],
      actors: (p.actors || []) as string[],
      sourceCount: (p.source_count ?? 0) as number,
      lastSignalAt: p.last_signal_at as string | undefined,
      publishedAt: p.published_at as string | undefined,
      originSignalId: p.origin_signal_id as string | undefined,
      mergedIntoId: p.merged_into_id as string | undefined,
      reviewNotes: p.review_notes as string | undefined,
      deadline: p.deadline as string | undefined,
      estimatedBudgetNPR: p.estimated_budget_npr as number | undefined,
      spentNPR: p.spent_npr as number | undefined,
      fundingSource: p.funding_source as string | undefined,
      fundingSource_ne: p.funding_source_ne as string | undefined,
      baselineProgress: (p.baseline_progress ?? p.progress) as number,
      baselineStatus: (p.baseline_status ?? p.status) as string,
    })));

    // Merge live scores from signal analysis (cached 5 min)
    // During grace period (first 30 days), preserve baseline status/progress
    // but still attach live metadata for context
    if (ENABLE_LIVE_SCORE_READ_MERGE) {
      try {
        const { isGracePeriod } = await import('@/lib/intelligence/government-era');
        const grace = isGracePeriod();
        const liveScores = await computeLiveScoreBatch();
        for (const promise of mapped) {
          const live = liveScores.get(Number(promise.id));
          if (live) {
            promise.liveDataConfidence = live.dataConfidence;
            if (live.lastSignalAt) promise.lastSignalAt = live.lastSignalAt;
            if (!grace) {
              // After grace period: use live status/progress
              promise.status = live.liveStatus;
              promise.progress = live.liveProgress;
            }
            // During grace: keep baseline status/progress (already set above)
          }
        }
      } catch (err) {
        console.warn('[data] Live score merge failed, using baseline:', err);
      }
    }

    return mapped;
  } catch (err) {
    console.warn('[data] Failed to fetch from Supabase:', err);
    return enrichActors([...staticPromises]);
  }
}

/**
 * Get latest scraped articles, optionally filtered by promise ID.
 */
export async function getLatestArticles(
  limit = 20,
  promiseId?: string
): Promise<Array<{
  id: string;
  headline: string;
  headline_ne?: string;
  source_name: string;
  source_url: string;
  source_type: string;
  published_at?: string;
  scraped_at: string;
  confidence: number;
  classification: string;
  promise_ids: string[];
}>> {
  if (!USE_LIVE_DATA) return [];

  try {
    const { supabase } = await import('@/lib/supabase/server');
    let query = supabase
      .from('scraped_articles')
      .select('id, headline, headline_ne, source_name, source_url, source_type, published_at, scraped_at, confidence, classification, promise_ids')
      .order('scraped_at', { ascending: false })
      .limit(limit);

    if (promiseId) {
      query = query.contains('promise_ids', [promiseId]);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[data] Articles query failed:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('[data] Failed to fetch articles:', err);
    return [];
  }
}
