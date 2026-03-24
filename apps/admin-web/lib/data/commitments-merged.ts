/**
 * Hybrid commitment data source
 *
 * Merges the hardcoded 109 commitments from promises.ts with
 * community-discovered commitments stored in the community_commitments
 * Supabase table. This allows approved discoveries to appear in the
 * live app without a code deploy.
 */

import {
  promises as hardcodedPromises,
  CATEGORY_NE,
  type GovernmentPromise,
  type PromiseCategory,
  type PromiseStatus,
  type CommitmentScope,
} from './promises';

const USE_LIVE_DATA = process.env.NEXT_PUBLIC_USE_LIVE_DATA !== 'false';

/**
 * Maximum hardcoded commitment ID — community IDs start after this.
 * Computed once from the static seed data.
 */
const MAX_HARDCODED_ID = Math.max(
  0,
  ...hardcodedPromises
    .map((p) => parseInt(p.id, 10))
    .filter((n) => Number.isFinite(n)),
);

interface CommunityCommitmentRow {
  id: number;
  title: string;
  title_ne: string | null;
  description: string | null;
  description_ne: string | null;
  category: string;
  category_ne: string | null;
  status: string;
  progress: number;
  assigned_to: string | null;
  department: string | null;
  scope: string | null;
  actors: string[] | null;
  estimated_budget_npr: number | null;
  source_signal_id: string | null;
  discovered_at: string;
  approved_at: string | null;
  approved_by: string | null;
  metadata: Record<string, unknown> | null;
}

function toCategory(raw: string): PromiseCategory {
  const valid: PromiseCategory[] = [
    'Governance', 'Anti-Corruption', 'Infrastructure', 'Transport',
    'Energy', 'Technology', 'Health', 'Education', 'Environment',
    'Economy', 'Social',
  ];
  return (valid.includes(raw as PromiseCategory) ? raw : 'Governance') as PromiseCategory;
}

function communityRowToPromise(
  row: CommunityCommitmentRow,
  index: number,
): GovernmentPromise {
  const category = toCategory(row.category);
  const id = String(MAX_HARDCODED_ID + 1 + index);

  return {
    id,
    slug: `community-${row.id}`,
    title: row.title,
    title_ne: row.title_ne || row.title,
    summary: row.description || row.title,
    summary_ne: row.description_ne || row.title_ne || row.title,
    category,
    category_ne: row.category_ne || CATEGORY_NE[category] || category,
    status: (row.status || 'not_started') as PromiseStatus,
    progress: row.progress || 0,
    linkedProjects: 0,
    evidenceCount: 0,
    lastUpdate: (row.approved_at || row.discovered_at || new Date().toISOString()).slice(0, 10),
    description: row.description || row.title,
    description_ne: row.description_ne || row.title_ne || row.title,
    trustLevel: 'partial',
    signalType: 'discovered',
    reviewState: 'published',
    isPublic: true,
    scope: (row.scope || 'unknown') as CommitmentScope,
    actors: row.actors || [],
    sourceCount: 1,
    lastSignalAt: row.approved_at || row.discovered_at,
    originSignalId: row.source_signal_id || undefined,
    estimatedBudgetNPR: row.estimated_budget_npr || undefined,
  };
}

/**
 * Get all commitments — hardcoded seed data + community-discovered.
 *
 * If Supabase is unavailable or USE_LIVE_DATA is false, returns
 * only the hardcoded commitments (safe fallback).
 */
export async function getAllCommitments(): Promise<GovernmentPromise[]> {
  const all = [...hardcodedPromises];

  if (!USE_LIVE_DATA) return all;

  try {
    const { getSupabase } = await import('@/lib/supabase/server');
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('community_commitments')
      .select('*')
      .neq('status', 'rejected')
      .order('id');

    if (error) {
      console.warn('[commitments-merged] Failed to fetch community commitments:', error.message);
      return all;
    }

    if (data && data.length > 0) {
      const communityPromises = (data as CommunityCommitmentRow[]).map(
        (row, i) => communityRowToPromise(row, i),
      );
      all.push(...communityPromises);
    }
  } catch {
    // DB not available — return hardcoded only
  }

  return all;
}
