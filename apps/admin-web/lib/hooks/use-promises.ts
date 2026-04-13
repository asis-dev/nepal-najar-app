'use client';

/**
 * Client-side hooks for promises and scraped articles.
 * Reads from Supabase (public anon key — RLS allows reads).
 * Falls back to static data if Supabase is not configured.
 */
import { useQuery } from '@tanstack/react-query';
import { hasPublicSupabaseConfig, supabasePublic } from '@/lib/supabase/client';
import {
  promises as staticPromises,
  type GovernmentPromise,
  type PromiseStatus,
} from '@/lib/data/promises';
import { isPublicCommitment, toPublicCommitment } from '@/lib/data/commitments';

const supabaseConfigured = hasPublicSupabaseConfig;

interface UseAllPromisesOptions {
  publicOnly?: boolean;
}

/* ───────── Map Supabase row → GovernmentPromise ───────── */
function mapPromise(p: Record<string, unknown>): GovernmentPromise {
  return {
    id: String(p.id),
    slug: p.slug as string,
    title: p.title as string,
    title_ne: p.title_ne as string,
    summary: (p.summary || p.description || '') as string,
    summary_ne: (p.summary_ne || p.description_ne || '') as string,
    category: p.category as GovernmentPromise['category'],
    category_ne: (p.category_ne || '') as string,
    status: p.status as GovernmentPromise['status'],
    progress: p.progress as number,
    linkedProjects: (p.linked_projects ?? 0) as number,
    evidenceCount: (p.evidence_count ?? 0) as number,
    lastUpdate: p.last_update as string,
    description: p.description as string,
    description_ne: (p.description_ne ?? '') as string,
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
    lastActivityDate: p.last_activity_date as string | undefined,
    lastActivitySignalCount: (p.last_activity_signal_count ?? 0) as number,
  };
}

/* ───────── Scraped article shape ───────── */
export interface ScrapedArticle {
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
  content_excerpt?: string;
}

/* ═══════════════════════════════════════════
   HOOK: useAllPromises
   ═══════════════════════════════════════════ */
export function useAllPromises(options?: UseAllPromisesOptions) {
  const publicOnly = options?.publicOnly ?? true;

  return useQuery({
    queryKey: ['promises', publicOnly ? 'public' : 'all'],
    queryFn: async (): Promise<GovernmentPromise[]> => {
      if (publicOnly) {
        try {
          const res = await fetch('/api/commitments?limit=250&format=full');
          if (!res.ok) {
            throw new Error(`Failed to fetch public commitments: ${res.status}`);
          }
          const payload = (await res.json()) as {
            commitments?: GovernmentPromise[];
          };
          if (Array.isArray(payload.commitments) && payload.commitments.length > 0) {
            return payload.commitments;
          }
        } catch (err) {
          console.warn('[useAllPromises] Public commitments fetch failed, using fallback:', err);
        }

        return staticPromises.filter((promise) => isPublicCommitment(promise));
      }

      if (!supabaseConfigured) return staticPromises;
      if (!supabasePublic) return staticPromises;

      const { data, error } = await supabasePublic
        .from('promises')
        .select('*')
        .order('id');

      if (error || !data || data.length === 0) {
        console.warn('[useAllPromises] Supabase query failed, using static:', error?.message);
        return staticPromises;
      }

      // Use precomputed evidence_count from database instead of
      // recounting all scraped_articles on every page load (was fetching
      // 1500+ rows client-side, silently truncated to 1000 by Supabase)
      return data.map((row) => mapPromise(row));
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/* ═══════════════════════════════════════════
   HOOK: usePromiseStats — aggregate counts
   ═══════════════════════════════════════════ */
export function usePromiseStats(options?: UseAllPromisesOptions) {
  const { data: promises, isLoading } = useAllPromises(options);
  const publicPromises = promises?.filter((promise) => isPublicCommitment(promise));

  const stats = publicPromises
    ? {
        total: publicPromises.length,
        delivered: publicPromises.filter((p) => p.status === 'delivered').length,
        inProgress: publicPromises.filter((p) => p.status === 'in_progress').length,
        stalled: publicPromises.filter((p) => p.status === 'stalled').length,
        notStarted: publicPromises.filter((p) => p.status === 'not_started').length,
        avgProgress: publicPromises.length > 0
          ? Math.round(
              publicPromises.reduce((sum, p) => sum + p.progress, 0) / publicPromises.length
            )
          : 0,
      }
    : null;

  return { stats, isLoading };
}

export function usePublicCommitments() {
  const { data: promises, isLoading } = useAllPromises({ publicOnly: true });

  return {
    data: promises
      ? promises.filter((commitment) => isPublicCommitment(commitment)).map((commitment) => toPublicCommitment(commitment))
      : undefined,
    isLoading,
  };
}

export function usePublicCommitmentStats() {
  const { data: commitments, isLoading } = usePublicCommitments();

  const stats = commitments
    ? {
        total: commitments.length,
        delivered: commitments.filter((commitment) => commitment.status === 'delivered').length,
        inProgress: commitments.filter((commitment) => commitment.status === 'in_progress').length,
        stalled: commitments.filter((commitment) => commitment.status === 'stalled').length,
        notStarted: commitments.filter((commitment) => commitment.status === 'not_started').length,
        avgProgress: commitments.length > 0
          ? Math.round(
              commitments.reduce((sum, commitment) => sum + commitment.progress, 0) / commitments.length
            )
          : 0,
      }
    : null;

  return { stats, isLoading, total: commitments?.length ?? 0 };
}

/* ═══════════════════════════════════════════
   HOOK: useLatestArticles — real scraped news
   ═══════════════════════════════════════════ */
export function useLatestArticles(limit = 20, promiseId?: string) {
  return useQuery({
    queryKey: ['articles', limit, promiseId],
    queryFn: async (): Promise<ScrapedArticle[]> => {
      if (!supabaseConfigured) return [];
      if (!supabasePublic) return [];

      let query = supabasePublic
        .from('scraped_articles')
        .select(
          'id, headline, headline_ne, source_name, source_url, source_type, published_at, scraped_at, confidence, classification, promise_ids, content_excerpt'
        )
        .order('scraped_at', { ascending: false })
        .limit(limit);

      if (promiseId) {
        query = query.contains('promise_ids', [promiseId]);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[useLatestArticles] Query failed:', error.message);
        return [];
      }

      return (data ?? []) as ScrapedArticle[];
    },
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

/* ═══════════════════════════════════════════
   HOOK: useArticleCount — total articles scraped
   ═══════════════════════════════════════════ */
export function useArticleCount() {
  return useQuery({
    queryKey: ['articles', 'count'],
    queryFn: async (): Promise<number> => {
      if (!supabaseConfigured) return 0;
      if (!supabasePublic) return 0;

      // Count from both tables — scraped_articles (legacy) + intelligence_signals (current pipeline)
      const [articles, signals] = await Promise.all([
        supabasePublic.from('scraped_articles').select('id', { count: 'exact', head: true }),
        supabasePublic.from('intelligence_signals').select('id', { count: 'exact', head: true }),
      ]);

      return (articles.count ?? 0) + (signals.count ?? 0);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: usePromisesByCategory — for province/category views
   ═══════════════════════════════════════════ */
export function usePromisesByCategory() {
  const { data: promises } = useAllPromises({ publicOnly: true });

  if (!promises) return { categories: [], isLoading: true };

  const record: Record<string, { total: number; inProgress: number; delivered: number; stalled: number }> = {};
  for (const p of promises) {
    if (!record[p.category]) record[p.category] = { total: 0, inProgress: 0, delivered: 0, stalled: 0 };
    record[p.category].total++;
    if (p.status === 'in_progress') record[p.category].inProgress++;
    if (p.status === 'delivered') record[p.category].delivered++;
    if (p.status === 'stalled') record[p.category].stalled++;
  }

  const categories = Object.entries(record).map(([name, data]) => ({
    name,
    ...data,
  }));

  return { categories, isLoading: false };
}

/* ═══════════════════════════════════════════
   Daily Activity Response Types
   ═══════════════════════════════════════════ */
export interface DailyActivityPromise {
  promiseId: string;
  title: string;
  title_ne: string;
  slug: string;
  status?: PromiseStatus;
  category?: string;
  signalCount: number;
  confirmsCount: number;
  contradictsCount: number;
  neutralCount: number;
  topHeadline?: string;
  maxConfidence: number;
}

export interface DailyActivityInactive {
  promiseId: string;
  title: string;
  title_ne: string;
  slug: string;
  daysSinceLastActivity: number | null;
  lastActivityDate: string | null;
}

export interface DailyActivitySummary {
  activeCount: number;
  inactiveCount: number;
  totalSignals: number;
}

export interface DailyActivityResponse {
  activePromises: DailyActivityPromise[];
  inactivePromises: DailyActivityInactive[];
  summary: DailyActivitySummary;
}

/* ═══════════════════════════════════════════
   HOOK: useDailyActivity — dashboard data
   ═══════════════════════════════════════════ */
export function useDailyActivity(date?: string) {
  return useQuery<DailyActivityResponse>({
    queryKey: ['daily-activity', date || 'today'],
    queryFn: async () => {
      const params = date ? `?date=${date}` : '';
      const res = await fetch(`/api/promises/daily-activity${params}`);
      if (!res.ok) {
        return {
          activePromises: [],
          inactivePromises: [],
          summary: { activeCount: 0, inactiveCount: 0, totalSignals: 0 },
        };
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: usePromiseTodaySignals — today's signals for one promise
   ═══════════════════════════════════════════ */
export interface PromiseSignal {
  id: string;
  headline: string;
  headline_ne?: string;
  source_name: string;
  source_url: string;
  classification: string;
  confidence: number;
  discovered_at: string;
}

export function usePromiseTodaySignals(promiseId: string) {
  return useQuery<PromiseSignal[]>({
    queryKey: ['promise-signals', promiseId, 'today'],
    queryFn: async () => {
      const res = await fetch(`/api/promises/${promiseId}/signals`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.signals ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });
}
