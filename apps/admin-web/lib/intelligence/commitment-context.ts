import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE } from './knowledge-base';

interface CommitmentCatalogEntry {
  id: number;
  title: string;
  category: string;
  summary: string;
  actors: string[];
  scope: string;
  reviewState: string;
  isPublic: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let catalogCache:
  | {
      expiresAt: number;
      entries: CommitmentCatalogEntry[];
    }
  | null = null;

function sortByNumericId(
  left: Pick<CommitmentCatalogEntry, 'id'>,
  right: Pick<CommitmentCatalogEntry, 'id'>,
): number {
  return left.id - right.id;
}

function buildFallbackCatalog(): CommitmentCatalogEntry[] {
  return PROMISES_KNOWLEDGE.map((promise) => ({
    id: promise.id,
    title: promise.title,
    category: promise.category,
    summary: promise.description || promise.keyAspects,
    actors: [...promise.keyOfficials, ...promise.keyMinistries].slice(0, 4),
    scope: 'unknown',
    reviewState: 'reviewed',
    isPublic: true,
  })).sort(sortByNumericId);
}

export async function getCommitmentCatalog(): Promise<CommitmentCatalogEntry[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.entries;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('promises')
      .select(
        'id, title, category, summary, description, actors, scope, review_state, is_public, merged_into_id',
      )
      .is('merged_into_id', null);

    if (error) {
      throw new Error(error.message);
    }

    const entries = (data || [])
      .filter((row) => row.review_state !== 'rejected')
      .map((row) => {
        const numericId = parseInt(String(row.id), 10);
        return {
          id: Number.isFinite(numericId) ? numericId : 0,
          title: String(row.title || `Commitment ${row.id}`),
          category: String(row.category || 'Governance'),
          summary: String(row.summary || row.description || '').trim(),
          actors: Array.isArray(row.actors)
            ? row.actors.map((value) => String(value))
            : [],
          scope: String(row.scope || 'unknown'),
          reviewState: String(row.review_state || 'reviewed'),
          isPublic: row.is_public !== false,
        } satisfies CommitmentCatalogEntry;
      })
      .filter((entry) => entry.id > 0)
      .sort(sortByNumericId);

    if (entries.length > 0) {
      catalogCache = {
        entries,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return entries;
    }
  } catch {
    // Fall back to the static knowledge base if Supabase is unavailable.
  }

  const fallback = buildFallbackCatalog();
  catalogCache = {
    entries: fallback,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return fallback;
}

export async function getCommitmentCatalogSummary(
  limit = 140,
): Promise<{
  lines: string[];
  knownIds: Set<number>;
  total: number;
}> {
  const catalog = await getCommitmentCatalog();
  const slice = catalog.slice(0, limit);

  // Compact format — keep id, title, category, and top-2 actors (cheap signals
  // for disambiguation). Drop the summary blob, which was the bulky part.
  // Was ~6K tokens for the full catalog → now ~2.5K. Leaves room for signal
  // payloads and output even at 8K-context local models.
  return {
    lines: slice.map((entry) => {
      const actors = entry.actors.length > 0
        ? ` · ${entry.actors.slice(0, 2).join(', ')}`
        : '';
      return `${entry.id}: ${entry.title} [${entry.category}]${actors}`;
    }),
    knownIds: new Set(catalog.map((entry) => entry.id)),
    total: catalog.length,
  };
}

export async function getCommitmentDetailContext(ids: number[]): Promise<string> {
  const catalog = await getCommitmentCatalog();
  const byId = new Map(catalog.map((entry) => [entry.id, entry]));
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));

  if (uniqueIds.length === 0) {
    return 'No specific commitment IDs were matched yet. If the signal is only generally relevant, return an empty analysis array instead of forcing a weak match.';
  }

  const lines = uniqueIds
    .map((id) => {
      const entry = byId.get(id);
      if (!entry) return null;
      const actorLabel =
        entry.actors.length > 0 ? `Actors: ${entry.actors.join(', ')}.` : '';
      const summary = entry.summary ? `Summary: ${entry.summary}.` : '';
      return `Commitment #${entry.id}: ${entry.title}. Category: ${entry.category}. Scope: ${entry.scope}. ${actorLabel} ${summary}`.trim();
    })
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return 'Matched commitment IDs were provided, but no detailed catalog entries were found. Use the signal content cautiously and return an empty analysis array if there is no clear commitment-level impact.';
  }

  return lines.join('\n---\n');
}

export function getCurrentDateContext(): string {
  const now = new Date();
  return `Today is ${now.toISOString().slice(0, 10)}. Do not assume political officeholders, election outcomes, or other time-sensitive facts unless they are explicitly supported by the signal content or the commitment catalog shown here.`;
}
