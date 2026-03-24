/**
 * Trending / Pulse System for Nepal Progress Intelligence Engine
 *
 * Analyzes recent intelligence signals to determine what topics,
 * commitments, people, and events are getting the most attention
 * right now. Provides a real-time pulse of the political news cycle.
 */

import { getSupabase } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TrendingItem {
  id: string;
  type: 'commitment' | 'topic' | 'person' | 'event';
  title: string;
  titleNe?: string;
  score: number; // trending score 0-100
  signalCount: number; // how many signals in last 24h
  signalCountPrev: number; // signals 24-48h ago (for trend direction)
  trend: 'rising' | 'falling' | 'stable' | 'new';
  topSignals: { id: string; title: string; url: string; source: string }[];
  engagement: number; // total engagement across all signals
  lastActivity: string; // ISO timestamp
}

interface RawSignal {
  id: string;
  title: string;
  title_ne: string | null;
  url: string;
  source_id: string;
  signal_type: string;
  published_at: string | null;
  discovered_at: string;
  matched_promise_ids: number[] | null;
  relevance_score: number | null;
  classification: string | null;
  extracted_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  content: string | null;
  author: string | null;
}

interface TrendingCache {
  items: TrendingItem[];
  pulse: number;
  updatedAt: string;
  expiresAt: number; // epoch ms
}

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const HOURS_48_MS = 48 * 60 * 60 * 1000;

/** Source types considered official / authoritative get a 2x weight boost */
const OFFICIAL_SOURCE_TYPES = new Set([
  'gov_portal',
  'parliament',
  'government',
  'official',
  'ministry',
]);

/** Common Nepali stop words to skip during keyword extraction */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'not',
  'no', 'so', 'if', 'than', 'that', 'this', 'it', 'its', 'as', 'also',
  'more', 'some', 'any', 'all', 'most', 'other', 'just', 'only', 'very',
  'how', 'what', 'when', 'where', 'who', 'why', 'nepal', 'nepali',
  'said', 'says', 'government', 'minister', 'according', 'report',
  'new', 'year', 'been', 'being', 'about', 'after', 'before',
  // Common Nepali particles
  'को', 'मा', 'ले', 'र', 'छ', 'छन्', 'गरेको', 'भएको', 'हुने',
]);

// ── Cache ────────────────────────────────────────────────────────────────────

let _trendingCache: TrendingCache | null = null;

function isCacheValid(): boolean {
  return _trendingCache !== null && Date.now() < _trendingCache.expiresAt;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute a time-decay weight for a signal based on its age.
 * - 0-12h: full weight (1.0)
 * - 12-18h: half weight (0.5)
 * - 18-24h: quarter weight (0.25)
 */
function timeDecayWeight(publishedAt: string | null, discoveredAt: string, now: number): number {
  const ts = publishedAt ? new Date(publishedAt).getTime() : new Date(discoveredAt).getTime();
  const ageMs = now - ts;
  const ageHours = ageMs / (60 * 60 * 1000);

  if (ageHours <= 12) return 1.0;
  if (ageHours <= 18) return 0.5;
  return 0.25;
}

/**
 * Extract engagement metrics from signal metadata.
 * Looks for metadata.engagement.{likes, shares, comments, views}.
 */
function extractEngagement(metadata: Record<string, unknown> | null): number {
  if (!metadata) return 0;
  const eng = metadata.engagement as Record<string, number> | undefined;
  if (!eng || typeof eng !== 'object') return 0;

  return (
    (Number(eng.likes) || 0) +
    (Number(eng.shares) || 0) * 2 + // shares weighted 2x
    (Number(eng.comments) || 0) * 1.5 + // comments weighted 1.5x
    (Number(eng.views) || 0) * 0.01 // views at 0.01x
  );
}

/**
 * Determine trend direction by comparing current vs previous period signal counts.
 */
function computeTrend(current: number, previous: number): 'rising' | 'falling' | 'stable' | 'new' {
  if (previous === 0 && current > 0) return 'new';
  if (previous === 0 && current === 0) return 'stable';

  const ratio = current / previous;
  if (ratio >= 1.5) return 'rising';
  if (ratio <= 0.6) return 'falling';
  return 'stable';
}

/**
 * Extract keywords from text for topic detection.
 * Returns lowercased tokens with stop words removed.
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Extract person names from extracted_data.officials arrays across signals.
 */
function extractPersonsFromSignals(
  signals: RawSignal[],
): Map<string, { count: number; title: string; signalIds: Set<string> }> {
  const persons = new Map<string, { count: number; title: string; signalIds: Set<string> }>();

  for (const signal of signals) {
    const data = signal.extracted_data;
    if (!data) continue;

    const officials = data.officials as Array<{ name: string; title: string }> | undefined;
    if (!Array.isArray(officials)) continue;

    for (const official of officials) {
      if (!official.name || official.name.length < 2) continue;
      const key = official.name.toLowerCase().trim();
      const existing = persons.get(key);
      if (existing) {
        existing.count++;
        existing.signalIds.add(signal.id);
        if (official.title && official.title.length > existing.title.length) {
          existing.title = official.title;
        }
      } else {
        persons.set(key, {
          count: 1,
          title: official.title || '',
          signalIds: new Set([signal.id]),
        });
      }
    }
  }

  return persons;
}

/**
 * Normalize the trending score to a 0-100 scale using logarithmic normalization.
 */
function normalizeScore(rawScore: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  // Use log scale so extreme outliers don't crush everything else
  const normalized = (Math.log1p(rawScore) / Math.log1p(maxScore)) * 100;
  return Math.min(100, Math.round(normalized));
}

// ── Main computation ─────────────────────────────────────────────────────────

/**
 * Compute trending data from recent intelligence signals.
 * Results are cached for 15 minutes.
 */
export async function computeTrending(): Promise<TrendingItem[]> {
  if (isCacheValid()) {
    return _trendingCache!.items;
  }

  const supabase = getSupabase();
  const now = Date.now();
  const cutoff24h = new Date(now - HOURS_24_MS).toISOString();
  const cutoff48h = new Date(now - HOURS_48_MS).toISOString();

  // Fetch signals from last 48 hours (need previous period for trend comparison)
  const { data: rawSignals, error } = await supabase
    .from('intelligence_signals')
    .select(
      'id, title, title_ne, url, source_id, signal_type, published_at, discovered_at, ' +
      'matched_promise_ids, relevance_score, classification, extracted_data, metadata, content, author',
    )
    .gte('discovered_at', cutoff48h)
    .gte('relevance_score', 0.2)
    .or('metadata.is.null,metadata->>duplicate_of.is.null') // exclude duplicates
    .order('discovered_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('[Trending] Failed to fetch signals:', error.message);
    return _trendingCache?.items || [];
  }

  const signals = (rawSignals || []) as unknown as RawSignal[];

  // Split into current (0-24h) and previous (24-48h) periods
  const currentSignals = signals.filter(
    (s) => (s.published_at || s.discovered_at) >= cutoff24h,
  );
  const prevSignals = signals.filter(
    (s) => (s.published_at || s.discovered_at) < cutoff24h,
  );

  const trendingItems: TrendingItem[] = [];

  // ── 1. Trending commitments (grouped by matched_promise_ids) ───────────

  const commitmentMap = new Map<
    number,
    { current: RawSignal[]; prev: RawSignal[]; engagement: number }
  >();

  for (const signal of currentSignals) {
    const ids = signal.matched_promise_ids || [];
    for (const pid of ids) {
      const entry = commitmentMap.get(pid) || { current: [], prev: [], engagement: 0 };
      entry.current.push(signal);
      entry.engagement += extractEngagement(signal.metadata);
      commitmentMap.set(pid, entry);
    }
  }

  for (const signal of prevSignals) {
    const ids = signal.matched_promise_ids || [];
    for (const pid of ids) {
      const entry = commitmentMap.get(pid) || { current: [], prev: [], engagement: 0 };
      entry.prev.push(signal);
      commitmentMap.set(pid, entry);
    }
  }

  // Fetch commitment titles for matched IDs
  const commitmentIds = [...commitmentMap.keys()];
  let commitmentTitles = new Map<number, { title: string; titleNe?: string }>();

  if (commitmentIds.length > 0) {
    const { data: commitments } = await supabase
      .from('promises')
      .select('id, title, title_ne')
      .in('id', commitmentIds);

    if (commitments) {
      commitmentTitles = new Map(
        commitments.map((c) => [c.id, { title: c.title, titleNe: c.title_ne }]),
      );
    }
  }

  for (const [pid, data] of commitmentMap) {
    if (data.current.length === 0) continue;

    const titleData = commitmentTitles.get(pid);
    const sourceTypes = new Set(data.current.map((s) => s.signal_type));
    const hasOfficialSource = data.current.some(
      (s) => OFFICIAL_SOURCE_TYPES.has(s.signal_type) || OFFICIAL_SOURCE_TYPES.has(s.source_id),
    );

    // Compute raw score
    let rawScore = 0;
    for (const signal of data.current) {
      const decay = timeDecayWeight(signal.published_at, signal.discovered_at, now);
      const officialBoost = (
        OFFICIAL_SOURCE_TYPES.has(signal.signal_type) ||
        OFFICIAL_SOURCE_TYPES.has(signal.source_id)
      ) ? 2.0 : 1.0;
      rawScore += decay * officialBoost;
    }

    // Cross-platform boost: more source types = more trending
    rawScore *= 1 + (sourceTypes.size - 1) * 0.3;

    // Engagement boost (capped at 2x)
    const engagementBoost = Math.min(2.0, 1 + data.engagement / 500);
    rawScore *= engagementBoost;

    const topSignals = data.current
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        title: s.title_ne || s.title,
        url: s.url,
        source: s.source_id,
      }));

    const lastSignal = data.current[0];

    trendingItems.push({
      id: `commitment-${pid}`,
      type: 'commitment',
      title: titleData?.title || `Commitment #${pid}`,
      titleNe: titleData?.titleNe,
      score: rawScore, // normalized later
      signalCount: data.current.length,
      signalCountPrev: data.prev.length,
      trend: computeTrend(data.current.length, data.prev.length),
      topSignals,
      engagement: data.engagement,
      lastActivity: lastSignal.published_at || lastSignal.discovered_at,
    });
  }

  // ── 2. Trending persons (from extracted_data.officials) ────────────────

  const persons = extractPersonsFromSignals(currentSignals);
  const prevPersons = extractPersonsFromSignals(prevSignals);

  for (const [name, data] of persons) {
    if (data.count < 2) continue; // need at least 2 mentions to trend

    const prevCount = prevPersons.get(name)?.count || 0;
    const relatedSignals = currentSignals.filter((s) => data.signalIds.has(s.id));
    const sourceTypes = new Set(relatedSignals.map((s) => s.signal_type));
    const totalEngagement = relatedSignals.reduce(
      (sum, s) => sum + extractEngagement(s.metadata), 0,
    );

    let rawScore = data.count;
    rawScore *= 1 + (sourceTypes.size - 1) * 0.3;
    rawScore *= Math.min(2.0, 1 + totalEngagement / 500);

    const topSignals = relatedSignals
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        title: s.title_ne || s.title,
        url: s.url,
        source: s.source_id,
      }));

    const lastSignal = relatedSignals[0];

    trendingItems.push({
      id: `person-${name.replace(/\s+/g, '-')}`,
      type: 'person',
      title: `${data.title ? `${data.title} ` : ''}${name.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
      score: rawScore,
      signalCount: data.count,
      signalCountPrev: prevCount,
      trend: computeTrend(data.count, prevCount),
      topSignals,
      engagement: totalEngagement,
      lastActivity: lastSignal?.published_at || lastSignal?.discovered_at || new Date().toISOString(),
    });
  }

  // ── 3. Trending topics (keyword frequency for unmatched signals) ───────

  // Signals not tied to any specific commitment
  const unmatchedCurrent = currentSignals.filter(
    (s) => !s.matched_promise_ids || s.matched_promise_ids.length === 0,
  );

  const keywordFreq = new Map<string, { count: number; signalIds: Set<string> }>();

  for (const signal of unmatchedCurrent) {
    const text = [signal.title_ne || signal.title, signal.content || ''].join(' ');
    const keywords = extractKeywords(text);
    const seen = new Set<string>(); // dedupe within a signal

    for (const kw of keywords) {
      if (seen.has(kw)) continue;
      seen.add(kw);

      const entry = keywordFreq.get(kw) || { count: 0, signalIds: new Set() };
      entry.count++;
      entry.signalIds.add(signal.id);
      keywordFreq.set(kw, entry);
    }
  }

  // Find co-occurring keyword pairs for better topic names
  const topKeywords = [...keywordFreq.entries()]
    .filter(([, data]) => data.count >= 3) // need at least 3 signals
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);

  // Group overlapping keywords into topics by signal co-occurrence
  const usedSignalIds = new Set<string>();

  for (const [keyword, data] of topKeywords) {
    // Skip if most signals already covered by an earlier topic
    const uncoveredSignals = [...data.signalIds].filter((id) => !usedSignalIds.has(id));
    if (uncoveredSignals.length < 2) continue;

    // Find the best co-occurring keyword for a richer topic name
    let bestCoKeyword = '';
    let bestCoCount = 0;
    for (const [otherKw, otherData] of keywordFreq) {
      if (otherKw === keyword) continue;
      const overlap = [...data.signalIds].filter((id) => otherData.signalIds.has(id)).length;
      if (overlap > bestCoCount) {
        bestCoCount = overlap;
        bestCoKeyword = otherKw;
      }
    }

    const topicName = bestCoCount >= 2
      ? `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} & ${bestCoKeyword}`
      : keyword.charAt(0).toUpperCase() + keyword.slice(1);

    const relatedSignals = currentSignals.filter((s) => data.signalIds.has(s.id));
    const totalEngagement = relatedSignals.reduce(
      (sum, s) => sum + extractEngagement(s.metadata), 0,
    );

    // Count previous period signals mentioning this keyword
    let prevCount = 0;
    for (const signal of prevSignals) {
      const text = [signal.title_ne || signal.title, signal.content || ''].join(' ');
      if (extractKeywords(text).includes(keyword)) prevCount++;
    }

    const sourceTypes = new Set(relatedSignals.map((s) => s.signal_type));

    let rawScore = data.count;
    rawScore *= 1 + (sourceTypes.size - 1) * 0.3;
    rawScore *= Math.min(2.0, 1 + totalEngagement / 500);

    const topSignals = relatedSignals
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        title: s.title_ne || s.title,
        url: s.url,
        source: s.source_id,
      }));

    const lastSignal = relatedSignals[0];

    trendingItems.push({
      id: `topic-${keyword}`,
      type: 'topic',
      title: topicName,
      score: rawScore,
      signalCount: data.count,
      signalCountPrev: prevCount,
      trend: computeTrend(data.count, prevCount),
      topSignals,
      engagement: totalEngagement,
      lastActivity: lastSignal?.published_at || lastSignal?.discovered_at || new Date().toISOString(),
    });

    for (const id of data.signalIds) usedSignalIds.add(id);
  }

  // ── Normalize scores to 0-100 ─────────────────────────────────────────

  const maxRawScore = Math.max(...trendingItems.map((t) => t.score), 1);
  for (const item of trendingItems) {
    item.score = normalizeScore(item.score, maxRawScore);
  }

  // Sort by score descending
  trendingItems.sort((a, b) => b.score - a.score);

  // ── Compute pulse and cache ────────────────────────────────────────────

  const pulse = computePulseFromSignals(currentSignals, prevSignals);

  _trendingCache = {
    items: trendingItems,
    pulse,
    updatedAt: new Date().toISOString(),
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return trendingItems;
}

// ── Pulse computation ────────────────────────────────────────────────────────

/**
 * Compute a single "pulse" number 0-100 indicating overall activity level.
 * How active is the political news cycle right now?
 */
function computePulseFromSignals(
  currentSignals: RawSignal[],
  prevSignals: RawSignal[],
): number {
  const currentCount = currentSignals.length;
  const prevCount = prevSignals.length;

  if (currentCount === 0) return 0;

  // Base pulse from signal volume (log scale, calibrated so ~50 signals/day = 50)
  const volumePulse = Math.min(60, (Math.log1p(currentCount) / Math.log1p(50)) * 50);

  // Source diversity bonus: more source types = more active cycle
  const sourceTypes = new Set(currentSignals.map((s) => s.signal_type));
  const diversityBonus = Math.min(15, sourceTypes.size * 3);

  // Momentum bonus: rising activity
  let momentumBonus = 0;
  if (prevCount > 0) {
    const ratio = currentCount / prevCount;
    if (ratio > 1.5) momentumBonus = 15;
    else if (ratio > 1.2) momentumBonus = 10;
    else if (ratio > 1.0) momentumBonus = 5;
  } else if (currentCount > 0) {
    momentumBonus = 10; // new activity after silence
  }

  // High-relevance signal bonus
  const highRelevance = currentSignals.filter((s) => (s.relevance_score || 0) >= 0.7).length;
  const relevanceBonus = Math.min(10, highRelevance * 2);

  const pulse = Math.min(100, Math.round(volumePulse + diversityBonus + momentumBonus + relevanceBonus));
  return pulse;
}

/**
 * Get the current pulse value (0-100).
 * Triggers a full compute if cache is stale.
 */
export async function computePulse(): Promise<number> {
  if (isCacheValid()) {
    return _trendingCache!.pulse;
  }

  // computeTrending also computes and caches pulse
  await computeTrending();
  return _trendingCache?.pulse || 0;
}

// ── Filtered accessors ───────────────────────────────────────────────────────

/**
 * Get only commitment-type trending items.
 */
export async function getTrendingCommitments(limit = 10): Promise<TrendingItem[]> {
  const all = await computeTrending();
  return all.filter((t) => t.type === 'commitment').slice(0, limit);
}

/**
 * Get only topic-type trending items.
 */
export async function getTrendingTopics(limit = 10): Promise<TrendingItem[]> {
  const all = await computeTrending();
  return all.filter((t) => t.type === 'topic').slice(0, limit);
}
