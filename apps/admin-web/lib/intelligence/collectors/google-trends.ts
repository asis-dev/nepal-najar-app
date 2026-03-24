/**
 * Google Trends Scraper for Nepal — Intelligence Collector
 *
 * Pulls what Nepal is searching for RIGHT NOW using Google Trends'
 * internal JSON APIs. Free, no API key needed.
 *
 * Three data sources:
 *   1. Daily Trends — top 20 trending searches in Nepal today
 *   2. Real-time Trends — stories trending right now across categories
 *   3. Keyword Interest — relative search interest for commitment-related topics
 *
 * ETHICAL USAGE:
 *   - Public aggregate data only (no PII)
 *   - Polite scraping with 5s delays between requests
 *   - Data used for government accountability tracking
 *
 * NOTE: Google Trends API responses are prefixed with `)]}',\n` which
 * must be stripped before JSON.parse.
 */

import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE, type PromiseKnowledge } from '../knowledge-base';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrendArticle {
  title: string;
  url: string;
  source: string;
  snippet: string;
}

interface DailyTrendTopic {
  title: string;
  formattedTraffic: string;
  searchVolume: number;
  relatedQueries: string[];
  articles: TrendArticle[];
  image?: string;
}

interface RealtimeTrendTopic {
  title: string;
  entityNames: string[];
  articles: TrendArticle[];
}

interface KeywordInterest {
  keyword: string;
  commitmentId: number;
  averageInterest: number;
  latestInterest: number;
  direction: 'rising' | 'falling' | 'stable';
  dataPoints: number;
}

interface GoogleTrendsScrapeResult {
  trendsFound: number;
  newTrends: number;
  matchedCommitments: number;
  errors: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Nepal timezone offset: UTC+5:45 = -345 minutes */
const NP_TZ_OFFSET = -345;

const TRENDS_BASE = 'https://trends.google.com/trends/api';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Rate limit: 5 seconds between requests to avoid Google blocking */
const RATE_LIMIT_MS = 5_000;

/** Request timeout */
const REQUEST_TIMEOUT_MS = 20_000;

const SOURCE_ID = 'google-trends-np';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip the `)]}',\n` XSSI prefix Google prepends to JSON responses.
 */
function stripGooglePrefix(raw: string): string {
  const prefixPattern = /^\)]\}',?\s*\n?/;
  return raw.replace(prefixPattern, '');
}

/**
 * Fetch a Google Trends API endpoint with proper headers.
 */
async function fetchTrendsAPI(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://trends.google.com/trends/',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(
        `[GoogleTrends] HTTP ${res.status} for ${url.split('?')[0]}`,
      );
      return null;
    }

    return await res.text();
  } catch (err) {
    console.warn(
      `[GoogleTrends] Fetch failed for ${url.split('?')[0]}:`,
      err instanceof Error ? err.message : 'unknown',
    );
    return null;
  }
}

/**
 * Parse a raw Google Trends response into JSON.
 * Handles both with and without the XSSI prefix.
 */
function parseTrendsResponse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const cleaned = stripGooglePrefix(raw);
    return JSON.parse(cleaned) as T;
  } catch {
    // The XSSI prefix format may have changed — try parsing raw directly
    try {
      return JSON.parse(raw) as T;
    } catch (err2) {
      console.warn(
        '[GoogleTrends] JSON parse failed (both stripped and raw):',
        err2 instanceof Error ? err2.message : 'unknown',
      );
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Normalize a title into a slug for external_id generation.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/**
 * Parse formatted traffic string like "200K+" or "2M+" into a number.
 */
function parseTrafficVolume(formatted: string): number {
  if (!formatted) return 0;
  const cleaned = formatted.replace(/[+,\s]/g, '').toUpperCase();
  const match = cleaned.match(/^([\d.]+)([KMB])?$/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === 'K') return Math.round(num * 1_000);
  if (suffix === 'M') return Math.round(num * 1_000_000);
  if (suffix === 'B') return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

/**
 * Get today's date formatted as YYYYMMDD for external IDs.
 */
function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function detectLanguage(text: string): string {
  if (!text) return 'en';
  const nepaliChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  return nepaliChars / text.length > 0.2 ? 'ne' : 'en';
}

// ─── Commitment Keyword Matching ─────────────────────────────────────────────

/**
 * Build keyword sets from commitment knowledge base for matching
 * against trending topics.
 */
function buildCommitmentKeywords(): Map<
  number,
  { title: string; keywords: string[] }
> {
  const map = new Map<number, { title: string; keywords: string[] }>();

  for (const promise of PROMISES_KNOWLEDGE) {
    const keywords: string[] = [];

    // Extract words from title
    const titleWords = promise.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    keywords.push(...titleWords);

    // Extract key phrases from keyAspects
    if (promise.keyAspects) {
      const aspects = promise.keyAspects
        .toLowerCase()
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);
      keywords.push(...aspects);
    }

    // Include key ministries and officials
    for (const m of promise.keyMinistries || []) {
      keywords.push(m.toLowerCase());
    }

    // Include Nepali title words
    if (promise.titleNe) {
      keywords.push(promise.titleNe);
    }

    map.set(promise.id, { title: promise.title, keywords });
  }

  return map;
}

/**
 * Match a trending topic against commitment keywords.
 * Returns matched promise IDs sorted by relevance.
 */
function matchCommitments(
  topicTitle: string,
  topicQueries: string[],
  commitmentKeywords: Map<number, { title: string; keywords: string[] }>,
): number[] {
  const matched: { id: number; score: number }[] = [];
  const searchText = [topicTitle, ...topicQueries]
    .join(' ')
    .toLowerCase();

  for (const [id, { keywords }] of Array.from(commitmentKeywords.entries())) {
    let score = 0;

    for (const kw of keywords) {
      if (searchText.includes(kw)) {
        // Longer keyword matches are more meaningful
        score += kw.length > 10 ? 2 : 1;
      }
    }

    // Simple fuzzy: check if individual words from the topic appear
    // in the commitment keywords
    const topicWords = searchText.split(/\s+/).filter((w) => w.length > 4);
    for (const word of topicWords) {
      for (const kw of keywords) {
        if (kw.includes(word) || word.includes(kw)) {
          score += 0.5;
        }
      }
    }

    if (score >= 1.5) {
      matched.push({ id, score });
    }
  }

  return matched
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((m) => m.id);
}

// ─── Data Fetchers ───────────────────────────────────────────────────────────

/**
 * Fetch daily trending searches in Nepal.
 */
async function fetchDailyTrends(): Promise<DailyTrendTopic[]> {
  const url =
    `${TRENDS_BASE}/dailytrends?hl=en&tz=${NP_TZ_OFFSET}&geo=NP&ns=15`;

  const raw = await fetchTrendsAPI(url);
  const data = parseTrendsResponse<{
    default?: {
      trendingSearchesDays?: Array<{
        date: string;
        trendingSearches?: Array<{
          title?: { query?: string };
          formattedTraffic?: string;
          relatedQueries?: Array<{ query?: string }>;
          image?: { newsUrl?: string; source?: string; imageUrl?: string };
          articles?: Array<{
            title?: string;
            url?: string;
            source?: string;
            snippet?: string;
          }>;
        }>;
      }>;
    };
  }>(raw);

  if (!data?.default?.trendingSearchesDays) {
    console.warn('[GoogleTrends] No daily trends data from API, trying public trending page fallback');
    return await fetchTrendingPageFallback();
  }

  const topics: DailyTrendTopic[] = [];

  for (const day of data.default.trendingSearchesDays) {
    for (const search of day.trendingSearches || []) {
      const title = search.title?.query;
      if (!title) continue;

      topics.push({
        title,
        formattedTraffic: search.formattedTraffic || '0',
        searchVolume: parseTrafficVolume(search.formattedTraffic || '0'),
        relatedQueries: (search.relatedQueries || [])
          .map((q) => q.query || '')
          .filter(Boolean),
        articles: (search.articles || []).map((a) => ({
          title: a.title || '',
          url: a.url || '',
          source: a.source || '',
          snippet: a.snippet || '',
        })),
        image: search.image?.imageUrl,
      });
    }
  }

  return topics;
}

/**
 * Fallback: scrape the public Google Trends trending page for Nepal.
 * Used when the internal API fails or returns no data.
 */
async function fetchTrendingPageFallback(): Promise<DailyTrendTopic[]> {
  try {
    const res = await fetch('https://trends.google.com/trending?geo=NP', {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[GoogleTrends] Trending page fallback HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const topics: DailyTrendTopic[] = [];

    // The trending page embeds JSON data in script tags or renders trend titles
    // Try to extract from the page structure
    const titleRegex = /<div[^>]*class="[^"]*mZ3RIc[^"]*"[^>]*>([^<]+)<\/div>/g;
    let match: RegExpExecArray | null;
    while ((match = titleRegex.exec(html)) !== null) {
      const title = match[1].trim();
      if (title && title.length > 2) {
        topics.push({
          title,
          formattedTraffic: '0',
          searchVolume: 0,
          relatedQueries: [],
          articles: [],
        });
      }
    }

    // Alternative pattern: look for trending search text in other structures
    if (topics.length === 0) {
      const altRegex = /<a[^>]*href="\/trends\/explore\?q=([^"&]+)[^"]*"[^>]*>/g;
      while ((match = altRegex.exec(html)) !== null) {
        const title = decodeURIComponent(match[1]).trim();
        if (title && title.length > 2) {
          topics.push({
            title,
            formattedTraffic: '0',
            searchVolume: 0,
            relatedQueries: [],
            articles: [],
          });
        }
      }
    }

    console.log(`[GoogleTrends] Trending page fallback found ${topics.length} topics`);
    return topics;
  } catch (err) {
    console.warn(
      '[GoogleTrends] Trending page fallback failed:',
      err instanceof Error ? err.message : 'unknown',
    );
    return [];
  }
}

/**
 * Fetch real-time trending stories in Nepal.
 */
async function fetchRealtimeTrends(): Promise<RealtimeTrendTopic[]> {
  const url =
    `${TRENDS_BASE}/realtimetrends?hl=en&tz=${NP_TZ_OFFSET}&geo=NP&cat=all&fi=0&fs=0&ri=300&rs=20&sort=0`;

  const raw = await fetchTrendsAPI(url);
  const data = parseTrendsResponse<{
    storySummaries?: {
      trendingStories?: Array<{
        title?: string;
        entityNames?: string[];
        articles?: Array<{
          articleTitle?: string;
          url?: string;
          source?: string;
          snippet?: string;
        }>;
      }>;
    };
  }>(raw);

  if (!data?.storySummaries?.trendingStories) {
    // Real-time trends may not be available for NP — not an error
    console.log('[GoogleTrends] No real-time trends data (may not be available for NP)');
    return [];
  }

  return (data.storySummaries.trendingStories || [])
    .map((story) => ({
      title: story.title || '',
      entityNames: story.entityNames || [],
      articles: (story.articles || []).map((a) => ({
        title: a.articleTitle || '',
        url: a.url || '',
        source: a.source || '',
        snippet: a.snippet || '',
      })),
    }))
    .filter((t) => t.title);
}

/**
 * Fetch relative search interest for a keyword in Nepal over the last 7 days.
 * Returns hourly interest data to determine if the topic is rising or falling.
 */
async function fetchKeywordInterest(
  keyword: string,
): Promise<{ average: number; latest: number; direction: 'rising' | 'falling' | 'stable'; points: number } | null> {
  const req = JSON.stringify({
    time: 'now 7-d',
    resolution: 'HOUR',
    locale: 'en',
    comparisonItem: [
      {
        geo: { country: 'NP' },
        complexKeywordsRestriction: {
          keyword: [{ type: 'BROAD', value: keyword }],
        },
      },
    ],
    requestOptions: {
      property: '',
      backend: 'IZG',
      category: 0,
    },
  });

  const encodedReq = encodeURIComponent(req);
  const url = `${TRENDS_BASE}/widgetdata/multiline?hl=en&tz=${NP_TZ_OFFSET}&req=${encodedReq}`;

  const raw = await fetchTrendsAPI(url);
  const data = parseTrendsResponse<{
    default?: {
      timelineData?: Array<{
        time?: string;
        value?: number[];
        formattedValue?: string[];
      }>;
    };
  }>(raw);

  const timeline = data?.default?.timelineData;
  if (!timeline || timeline.length === 0) return null;

  const values = timeline
    .map((p) => (p.value?.[0] ?? 0))
    .filter((v) => typeof v === 'number');

  if (values.length === 0) return null;

  const average = Math.round(
    values.reduce((a, b) => a + b, 0) / values.length,
  );
  const latest = values[values.length - 1];

  // Compare last 24h average to previous 24h average
  const recentCount = Math.min(24, Math.floor(values.length / 2));
  const recentSlice = values.slice(-recentCount);
  const prevSlice = values.slice(-recentCount * 2, -recentCount);

  let direction: 'rising' | 'falling' | 'stable' = 'stable';
  if (recentSlice.length > 0 && prevSlice.length > 0) {
    const recentAvg =
      recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
    const prevAvg =
      prevSlice.reduce((a, b) => a + b, 0) / prevSlice.length;

    if (prevAvg > 0) {
      const change = (recentAvg - prevAvg) / prevAvg;
      if (change > 0.15) direction = 'rising';
      else if (change < -0.15) direction = 'falling';
    } else if (recentAvg > 5) {
      direction = 'rising';
    }
  }

  return { average, latest, direction, points: values.length };
}

// ─── Commitment Interest Tracker ─────────────────────────────────────────────

/**
 * Get top 10 commitment keywords and check their relative interest on
 * Google Trends. Useful for understanding which government promises
 * the public is actively searching for.
 */
async function fetchCommitmentInterest(): Promise<KeywordInterest[]> {
  // Pick top 10 commitments with concise searchable keywords
  const topCommitments: { id: number; keyword: string }[] =
    PROMISES_KNOWLEDGE.slice(0, 10).map((p) => ({
      id: p.id,
      keyword: extractSearchKeyword(p),
    }));

  const results: KeywordInterest[] = [];

  for (const { id, keyword } of topCommitments) {
    try {
      const interest = await fetchKeywordInterest(keyword);
      if (interest) {
        results.push({
          keyword,
          commitmentId: id,
          averageInterest: interest.average,
          latestInterest: interest.latest,
          direction: interest.direction,
          dataPoints: interest.points,
        });
      }
    } catch (err) {
      console.warn(
        `[GoogleTrends] Interest check failed for "${keyword}":`,
        err instanceof Error ? err.message : 'unknown',
      );
    }

    await sleep(RATE_LIMIT_MS);
  }

  return results;
}

/**
 * Extract a concise, searchable keyword from a commitment.
 * Google Trends works best with 1-3 word queries.
 */
function extractSearchKeyword(promise: PromiseKnowledge): string {
  // Use a hand-picked short keyword based on the category/title
  const title = promise.title.toLowerCase();

  // Try to find the most distinctive 2-3 word phrase
  if (title.includes('election')) return 'Nepal election reform';
  if (title.includes('parliament')) return 'Nepal parliament reform';
  if (title.includes('corruption')) return 'Nepal anti corruption';
  if (title.includes('education')) return 'Nepal education reform';
  if (title.includes('health')) return 'Nepal health system';
  if (title.includes('infrastructure')) return 'Nepal infrastructure';
  if (title.includes('agriculture')) return 'Nepal agriculture';
  if (title.includes('tourism')) return 'Nepal tourism development';
  if (title.includes('energy') || title.includes('hydropower'))
    return 'Nepal hydropower';
  if (title.includes('digital') || title.includes('technology'))
    return 'Nepal digital';
  if (title.includes('budget') || title.includes('fiscal'))
    return 'Nepal budget';
  if (title.includes('federalism')) return 'Nepal federalism';
  if (title.includes('judiciary')) return 'Nepal judiciary reform';

  // Fallback: "Nepal" + first two meaningful words from the title
  const words = promise.title
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['the', 'and', 'for', 'with'].includes(w.toLowerCase()))
    .slice(0, 2)
    .join(' ');

  return `Nepal ${words}`;
}

// ─── Main Scraper ────────────────────────────────────────────────────────────

/**
 * Scrape Google Trends for Nepal — the main entry point.
 *
 * Fetches daily trends, real-time trends, and commitment keyword interest,
 * then stores results as intelligence signals in Supabase.
 */
export async function scrapeGoogleTrends(): Promise<GoogleTrendsScrapeResult> {
  const supabase = getSupabase();
  let trendsFound = 0;
  let newTrends = 0;
  let matchedCommitments = 0;
  const errors: string[] = [];
  const commitmentKeywords = buildCommitmentKeywords();
  const dateTag = todayString();

  console.log('[GoogleTrends] Starting Nepal trends scrape');

  // ── 1. Daily Trends ──────────────────────────────────────────────────────

  try {
    const dailyTopics = await fetchDailyTrends();
    trendsFound += dailyTopics.length;
    console.log(`[GoogleTrends] Found ${dailyTopics.length} daily trending topics`);

    for (const topic of dailyTopics) {
      const externalId = `gtrend-${dateTag}-${normalizeTitle(topic.title)}`;
      const matchedIds = matchCommitments(
        topic.title,
        topic.relatedQueries,
        commitmentKeywords,
      );

      if (matchedIds.length > 0) matchedCommitments++;

      const { error } = await supabase.from('intelligence_signals').upsert(
        {
          source_id: SOURCE_ID,
          signal_type: 'trend',
          external_id: externalId,
          title: topic.title.slice(0, 200),
          content: buildTrendContent(topic),
          url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(topic.title)}&geo=NP`,
          author: 'Google Trends',
          published_at: new Date().toISOString(),
          matched_promise_ids: matchedIds,
          language: detectLanguage(topic.title),
          media_type: 'text',
          relevance_score: matchedIds.length > 0 ? 0.7 : 0.5,
          metadata: {
            platform: 'google_trends',
            trend_type: 'daily',
            search_volume: topic.searchVolume,
            formatted_traffic: topic.formattedTraffic,
            trend_direction: topic.searchVolume > 100000 ? 'rising' : 'stable',
            related_queries: topic.relatedQueries.slice(0, 10),
            related_articles: topic.articles.slice(0, 5).map((a) => ({
              title: a.title,
              url: a.url,
              source: a.source,
              snippet: a.snippet.slice(0, 300),
            })),
            image_url: topic.image,
          },
        },
        { onConflict: 'source_id,external_id', ignoreDuplicates: true },
      );

      if (error) {
        errors.push(`Daily trend "${topic.title}": ${error.message}`);
      } else {
        newTrends++;
      }
    }
  } catch (err) {
    const msg = `Daily trends: ${err instanceof Error ? err.message : 'unknown error'}`;
    errors.push(msg);
    console.error(`[GoogleTrends] ${msg}`);
  }

  await sleep(RATE_LIMIT_MS);

  // ── 2. Real-time Trends ──────────────────────────────────────────────────

  try {
    const realtimeTopics = await fetchRealtimeTrends();
    trendsFound += realtimeTopics.length;
    console.log(
      `[GoogleTrends] Found ${realtimeTopics.length} real-time trending stories`,
    );

    for (const topic of realtimeTopics) {
      const externalId = `gtrend-rt-${dateTag}-${normalizeTitle(topic.title)}`;
      const matchedIds = matchCommitments(
        topic.title,
        topic.entityNames,
        commitmentKeywords,
      );

      if (matchedIds.length > 0) matchedCommitments++;

      const { error } = await supabase.from('intelligence_signals').upsert(
        {
          source_id: SOURCE_ID,
          signal_type: 'trend',
          external_id: externalId,
          title: topic.title.slice(0, 200),
          content: [
            topic.title,
            topic.entityNames.length > 0
              ? `Entities: ${topic.entityNames.join(', ')}`
              : '',
            ...topic.articles.map(
              (a) => `- ${a.title} (${a.source})`,
            ),
          ]
            .filter(Boolean)
            .join('\n'),
          url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(topic.title)}&geo=NP`,
          author: 'Google Trends',
          published_at: new Date().toISOString(),
          matched_promise_ids: matchedIds,
          language: detectLanguage(topic.title),
          media_type: 'text',
          relevance_score: matchedIds.length > 0 ? 0.7 : 0.5,
          metadata: {
            platform: 'google_trends',
            trend_type: 'realtime',
            entity_names: topic.entityNames,
            trend_direction: 'rising',
            related_articles: topic.articles.slice(0, 5).map((a) => ({
              title: a.title,
              url: a.url,
              source: a.source,
              snippet: a.snippet.slice(0, 300),
            })),
          },
        },
        { onConflict: 'source_id,external_id', ignoreDuplicates: true },
      );

      if (error) {
        errors.push(`Realtime trend "${topic.title}": ${error.message}`);
      } else {
        newTrends++;
      }
    }
  } catch (err) {
    const msg = `Realtime trends: ${err instanceof Error ? err.message : 'unknown error'}`;
    errors.push(msg);
    console.error(`[GoogleTrends] ${msg}`);
  }

  await sleep(RATE_LIMIT_MS);

  // ── 3. Commitment Keyword Interest ───────────────────────────────────────

  try {
    const interests = await fetchCommitmentInterest();
    console.log(
      `[GoogleTrends] Checked interest for ${interests.length} commitment keywords`,
    );

    for (const interest of interests) {
      const externalId = `gtrend-interest-${dateTag}-${normalizeTitle(interest.keyword)}`;

      const { error } = await supabase.from('intelligence_signals').upsert(
        {
          source_id: SOURCE_ID,
          signal_type: 'trend',
          external_id: externalId,
          title: `Search interest: "${interest.keyword}" — ${interest.direction}`,
          content:
            `Public search interest for "${interest.keyword}" (commitment #${interest.commitmentId}): ` +
            `Average interest ${interest.averageInterest}/100, latest ${interest.latestInterest}/100, ` +
            `trend: ${interest.direction} (based on ${interest.dataPoints} hourly data points over 7 days)`,
          url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(interest.keyword)}&geo=NP&date=now%207-d`,
          author: 'Google Trends',
          published_at: new Date().toISOString(),
          matched_promise_ids: [interest.commitmentId],
          language: 'en',
          media_type: 'text',
          relevance_score: 0.6,
          metadata: {
            platform: 'google_trends',
            trend_type: 'keyword_interest',
            search_volume: interest.averageInterest,
            trend_direction: interest.direction,
            keyword: interest.keyword,
            commitment_id: interest.commitmentId,
            average_interest: interest.averageInterest,
            latest_interest: interest.latestInterest,
            data_points: interest.dataPoints,
          },
        },
        { onConflict: 'source_id,external_id', ignoreDuplicates: true },
      );

      if (error) {
        errors.push(
          `Interest "${interest.keyword}": ${error.message}`,
        );
      } else {
        newTrends++;
        if (interest.direction === 'rising') matchedCommitments++;
      }
    }
  } catch (err) {
    const msg = `Commitment interest: ${err instanceof Error ? err.message : 'unknown error'}`;
    errors.push(msg);
    console.error(`[GoogleTrends] ${msg}`);
  }

  // ── 4. Register / update the intelligence source ─────────────────────────

  try {
    await supabase.from('intelligence_sources').upsert(
      {
        id: SOURCE_ID,
        name: 'Google Trends Nepal',
        source_type: 'google_trends' as const,
        url: 'https://trends.google.com/trends/?geo=NP',
        config: {
          type: 'google_trends_scraper',
          geo: 'NP',
          timezone: NP_TZ_OFFSET,
          scrapeMethod: 'api',
        },
        related_promise_ids: [],
        related_official_ids: [],
        is_active: true,
        last_checked_at: new Date().toISOString(),
        last_found_at:
          trendsFound > 0 ? new Date().toISOString() : undefined,
      },
      { onConflict: 'id' },
    );
  } catch (err) {
    errors.push(
      `Source registration: ${err instanceof Error ? err.message : 'unknown'}`,
    );
  }

  console.log(
    `[GoogleTrends] Complete: ${trendsFound} trends found, ${newTrends} new, ` +
      `${matchedCommitments} matched commitments, ${errors.length} errors`,
  );

  return { trendsFound, newTrends, matchedCommitments, errors };
}

// ─── Lightweight Export ──────────────────────────────────────────────────────

/**
 * Get just the list of trending topic titles in Nepal.
 * Lightweight — for use in trending UI without full signal processing.
 */
export async function getNepalTrendingTopics(): Promise<string[]> {
  const topics: string[] = [];

  try {
    const daily = await fetchDailyTrends();
    for (const t of daily) {
      topics.push(t.title);
    }
  } catch {
    // Silently fail — best effort
  }

  if (topics.length === 0) {
    // Try realtime if daily returned nothing
    try {
      await sleep(RATE_LIMIT_MS);
      const realtime = await fetchRealtimeTrends();
      for (const t of realtime) {
        topics.push(t.title);
      }
    } catch {
      // Silently fail
    }
  }

  return topics;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Build a content summary string for a daily trend topic.
 */
function buildTrendContent(topic: DailyTrendTopic): string {
  const parts: string[] = [
    `Trending search in Nepal: "${topic.title}"`,
    `Search volume: ${topic.formattedTraffic}`,
  ];

  if (topic.relatedQueries.length > 0) {
    parts.push(`Related queries: ${topic.relatedQueries.slice(0, 5).join(', ')}`);
  }

  if (topic.articles.length > 0) {
    parts.push('Related articles:');
    for (const article of topic.articles.slice(0, 3)) {
      parts.push(`- ${article.title} (${article.source})`);
      if (article.snippet) {
        parts.push(`  ${article.snippet.slice(0, 200)}`);
      }
    }
  }

  return parts.join('\n');
}
