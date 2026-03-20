/**
 * Data access layer — abstracts static vs live data.
 *
 * Default: Supabase is used when NEXT_PUBLIC_SUPABASE_URL is configured.
 * Set NEXT_PUBLIC_USE_LIVE_DATA=false to force static data (for local dev without Supabase).
 */
import { promises as staticPromises, type GovernmentPromise } from './promises';

const USE_LIVE_DATA = process.env.NEXT_PUBLIC_USE_LIVE_DATA !== 'false';

/**
 * Get all promises — from Supabase if live data is enabled, static fallback otherwise.
 */
export async function getPromises(): Promise<GovernmentPromise[]> {
  if (!USE_LIVE_DATA) return staticPromises;

  try {
    const { supabase } = await import('@/lib/supabase/server');
    const { data, error } = await supabase
      .from('promises')
      .select('*')
      .order('id');

    if (error || !data || data.length === 0) {
      console.warn('[data] Supabase query failed, falling back to static:', error?.message);
      return staticPromises;
    }

    // Compute REAL evidence counts from scraped_articles
    const evidenceCountMap: Record<string, number> = {};
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

    // Map Supabase snake_case to GovernmentPromise camelCase
    return data.map((p: Record<string, unknown>) => ({
      id: p.id as string,
      slug: p.slug as string,
      title: p.title as string,
      title_ne: p.title_ne as string,
      category: p.category as GovernmentPromise['category'],
      category_ne: (p.category_ne || '') as string,
      status: p.status as GovernmentPromise['status'],
      progress: p.progress as number,
      linkedProjects: p.linked_projects as number,
      evidenceCount: evidenceCountMap[p.id as string] || 0, // REAL count from articles
      lastUpdate: p.last_update as string,
      description: p.description as string,
      description_ne: p.description_ne as string,
      trustLevel: p.trust_level as GovernmentPromise['trustLevel'],
      signalType: (p.signal_type || 'inferred') as GovernmentPromise['signalType'],
      deadline: p.deadline as string | undefined,
      estimatedBudgetNPR: p.estimated_budget_npr as number | undefined,
      spentNPR: p.spent_npr as number | undefined,
      fundingSource: p.funding_source as string | undefined,
      fundingSource_ne: p.funding_source_ne as string | undefined,
    }));
  } catch (err) {
    console.warn('[data] Failed to fetch from Supabase:', err);
    return staticPromises;
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
