/**
 * Signal deduplication engine for the Nepal Progress intelligence system.
 *
 * Identifies and groups duplicate intelligence signals using text similarity
 * (Jaccard on word sets) and URL normalization. Canonical signals are chosen
 * by highest relevance_score; duplicates are tagged in metadata.
 */

import { getSupabase } from '@/lib/supabase/server';

// ── Stop words ────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'not', 'no', 'nor',
  'so', 'if', 'then', 'than', 'that', 'this', 'these', 'those', 'it',
  'its', 'as', 'up', 'out', 'about', 'into', 'over', 'after', 'before',
  'between', 'under', 'above', 'such', 'each', 'which', 'their', 'there',
  'also', 'more', 'some', 'any', 'all', 'most', 'other', 'just', 'only',
  'very', 'how', 'what', 'when', 'where', 'who', 'why',
]);

// ── Similarity threshold ──────────────────────────────────────────────────────

const SIMILARITY_THRESHOLD = 0.7;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Simple 32-bit FNV-1a string hash. Deterministic, fast, good distribution
 * for similarity-matching purposes (not cryptographic).
 */
function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) | 0; // FNV prime, keep 32-bit
  }
  // Convert to unsigned hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Tokenize text into a set of meaningful words: lowercase, strip
 * punctuation, remove stop words.
 */
function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Normalize a URL for comparison: strip query params, fragments, trailing
 * slashes, and lowercase the host.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}`;
  } catch {
    return url.trim().toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');
  }
}

// ── Exported functions ────────────────────────────────────────────────────────

/**
 * Create a normalized fingerprint for a signal by lowercasing, removing
 * punctuation and stop words, sorting remaining words, and hashing.
 */
export function computeSignalFingerprint(signal: {
  title: string;
  content?: string | null;
  url?: string | null;
}): string {
  const raw = [signal.title, signal.content ?? ''].join(' ');
  const words = tokenize(raw);
  const sorted = [...words].sort();
  const canonical = sorted.join(' ');
  const urlPart = signal.url ? `|${normalizeUrl(signal.url)}` : '';
  return fnv1aHash(canonical + urlPart);
}

/**
 * Compute Jaccard similarity between two strings.
 * Returns a value between 0 (no overlap) and 1 (identical word sets).
 */
export function computeSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Group signals that are likely duplicates.
 *
 * Two signals are considered duplicates when:
 * - They share the same normalized URL (ignoring query params / trailing slashes), OR
 * - Their combined title+content text has Jaccard similarity > 0.7
 *
 * Returns a Map where each key is the canonical signal ID and the value is an
 * array of duplicate signal IDs belonging to that group (excluding the
 * canonical itself).
 */
export function findDuplicates(
  signals: Array<{
    id: string;
    title: string;
    content?: string | null;
    url?: string | null;
  }>,
): Map<string, string[]> {
  const n = signals.length;
  if (n < 2) return new Map();

  // Union-Find for grouping
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    // Path compression
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(a: string, b: string): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return;
    const rankA = rank.get(rootA) ?? 0;
    const rankB = rank.get(rootB) ?? 0;
    if (rankA < rankB) {
      parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      parent.set(rootB, rootA);
    } else {
      parent.set(rootB, rootA);
      rank.set(rootA, rankA + 1);
    }
  }

  // Initialize union-find
  for (const s of signals) {
    parent.set(s.id, s.id);
    rank.set(s.id, 0);
  }

  // Build URL index for O(n) URL-based matching
  const urlIndex = new Map<string, string[]>();
  for (const s of signals) {
    if (s.url) {
      const norm = normalizeUrl(s.url);
      const group = urlIndex.get(norm);
      if (group) {
        group.push(s.id);
      } else {
        urlIndex.set(norm, [s.id]);
      }
    }
  }

  // URL-based duplicates
  for (const ids of urlIndex.values()) {
    for (let i = 1; i < ids.length; i++) {
      union(ids[0], ids[i]);
    }
  }

  // Pre-compute combined text for each signal
  const texts = signals.map((s) =>
    [s.title, s.content ?? ''].join(' '),
  );

  // Pairwise text similarity (O(n^2) — acceptable for bounded signal sets)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (find(signals[i].id) === find(signals[j].id)) continue; // already grouped
      const sim = computeSimilarity(texts[i], texts[j]);
      if (sim > SIMILARITY_THRESHOLD) {
        union(signals[i].id, signals[j].id);
      }
    }
  }

  // Collect groups (only groups with > 1 member)
  const groups = new Map<string, string[]>();
  for (const s of signals) {
    const root = find(s.id);
    const group = groups.get(root);
    if (group) {
      group.push(s.id);
    } else {
      groups.set(root, [s.id]);
    }
  }

  // Build result: canonical = first member, duplicates = the rest
  const result = new Map<string, string[]>();
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    // Canonical is just the first; the caller (deduplicateSignals) picks by
    // relevance_score when it has that data. Here we use the first member as
    // a placeholder canonical.
    const [canonical, ...duplicates] = members;
    result.set(canonical, duplicates);
  }

  return result;
}

/**
 * Full deduplication pipeline.
 *
 * 1. Fetches all intelligence signals from Supabase.
 * 2. Identifies duplicate groups via `findDuplicates`.
 * 3. Within each group, picks the signal with the highest `relevance_score`
 *    as canonical and marks the rest with `metadata.duplicate_of`.
 * 4. Returns counts of merged (marked-as-duplicate) and canonical signals.
 */
export async function deduplicateSignals(): Promise<{
  merged: number;
  canonical: number;
}> {
  const supabase = getSupabase();

  // Fetch all signals
  const { data: signals, error } = await supabase
    .from('intelligence_signals')
    .select('id, title, content, url, relevance_score, metadata');

  if (error) {
    throw new Error(`Failed to fetch intelligence signals: ${error.message}`);
  }

  if (!signals || signals.length === 0) {
    return { merged: 0, canonical: 0 };
  }

  // Find duplicate groups (using placeholder canonical from findDuplicates)
  const rawGroups = findDuplicates(signals);

  let merged = 0;
  let canonical = 0;

  // Process each group: re-pick canonical by highest relevance_score
  for (const [placeholderCanonical, duplicateIds] of rawGroups) {
    const allIds = [placeholderCanonical, ...duplicateIds];
    const groupSignals = allIds
      .map((id) => signals.find((s) => s.id === id)!)
      .filter(Boolean);

    // Pick the signal with the highest relevance_score as canonical
    groupSignals.sort(
      (a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0),
    );
    const canonicalSignal = groupSignals[0];
    const dupes = groupSignals.slice(1);

    if (dupes.length === 0) continue;

    canonical++;

    // Update each duplicate's metadata
    for (const dupe of dupes) {
      const existingMetadata =
        typeof dupe.metadata === 'object' && dupe.metadata !== null
          ? dupe.metadata
          : {};

      const { error: updateError } = await supabase
        .from('intelligence_signals')
        .update({
          metadata: {
            ...existingMetadata,
            duplicate_of: canonicalSignal.id,
          },
        })
        .eq('id', dupe.id);

      if (updateError) {
        console.error(
          `[dedup] Failed to mark signal ${dupe.id} as duplicate: ${updateError.message}`,
        );
        continue;
      }

      merged++;
    }
  }

  return { merged, canonical };
}

/**
 * Count signals that are NOT marked as duplicates.
 */
export async function getDeduplicatedCount(): Promise<number> {
  const supabase = getSupabase();

  // Count signals where metadata->duplicate_of is null or metadata is null
  const { count, error } = await supabase
    .from('intelligence_signals')
    .select('id', { count: 'exact', head: true })
    .or('metadata.is.null,metadata->>duplicate_of.is.null');

  if (error) {
    throw new Error(
      `Failed to count deduplicated signals: ${error.message}`,
    );
  }

  return count ?? 0;
}
