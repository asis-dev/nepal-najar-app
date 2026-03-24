/**
 * Dedicated TikTok Scraper
 *
 * Two-tier approach for scraping TikTok content related to Nepal politics:
 *
 * Approach 1 (preferred): Apify TikTok scraper actors
 *   - Rich data: video descriptions, engagement metrics, author info
 *   - Requires APIFY_API_TOKEN (free tier: $5/month)
 *   - Scrapes by hashtag and by user profile
 *
 * Approach 2 (free fallback): DuckDuckGo site-specific search
 *   - Uses `site:tiktok.com "query"` to find recent videos
 *   - Parses search result snippets for signal content
 *   - Less reliable, but zero cost and no API key needed
 *
 * ETHICAL USAGE:
 *   - Public figures and government-related accounts ONLY
 *   - Public data ONLY (no private content)
 *   - Polite scraping with 3s delays between requests
 *   - Data used for government accountability tracking
 *
 * Environment:
 *   APIFY_API_TOKEN — optional, enables Approach 1
 */

import { getSupabase } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TikTokAccountConfig {
  /** Internal source ID, e.g. 'tiktok-balen-shah' */
  id: string;
  /** Display name */
  name: string;
  /** Nepali name */
  nameNe: string;
  /** TikTok username (without @) */
  username: string;
  /** Category for grouping */
  category: 'politician' | 'party' | 'news' | 'government';
  /** Related promise IDs for cross-referencing */
  relatedPromiseIds: number[];
  /** Official ID in the officials table, if any */
  officialId?: number;
  /** Max videos to fetch per scrape */
  maxVideos: number;
}

interface ScrapedVideo {
  externalId: string;
  description: string;
  url: string;
  publishedAt: string;
  author: string;
  authorUsername: string;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  videoUrl?: string;
  thumbnailUrl?: string;
}

interface ScrapeResult {
  videosFound: number;
  newVideos: number;
  errors: string[];
}

// ─── Tracked Accounts ────────────────────────────────────────────────────────

export const TIKTOK_ACCOUNTS: TikTokAccountConfig[] = [
  // --- Politicians ---
  {
    id: 'tiktok-balen-shah',
    name: 'Balen Shah',
    nameNe: 'बालेन शाह',
    username: 'balenshah',
    category: 'politician',
    relatedPromiseIds: [],
    maxVideos: 10,
  },

  // --- Parties ---
  {
    id: 'tiktok-rsp-official',
    name: 'Rastriya Swatantra Party',
    nameNe: 'राष्ट्रिय स्वतन्त्र पार्टी',
    username: 'raborspnepal',
    category: 'party',
    relatedPromiseIds: [],
    maxVideos: 10,
  },

  // --- News Channels ---
  {
    id: 'tiktok-kantipur-tv',
    name: 'Kantipur TV',
    nameNe: 'कान्तिपुर टिभी',
    username: 'kantaboripurtv',
    category: 'news',
    relatedPromiseIds: [],
    maxVideos: 10,
  },
  {
    id: 'tiktok-news24',
    name: 'News24 Nepal',
    nameNe: 'न्युज २४ नेपाल',
    username: 'news24nepal',
    category: 'news',
    relatedPromiseIds: [],
    maxVideos: 10,
  },
  {
    id: 'tiktok-onlinekhabar',
    name: 'Online Khabar',
    nameNe: 'अनलाइन खबर',
    username: 'onlinekhabar',
    category: 'news',
    relatedPromiseIds: [],
    maxVideos: 10,
  },
  {
    id: 'tiktok-setopati',
    name: 'Setopati',
    nameNe: 'सेतोपाटी',
    username: 'setopati',
    category: 'news',
    relatedPromiseIds: [],
    maxVideos: 10,
  },
];

// ─── Tracked Hashtags ────────────────────────────────────────────────────────

export const TIKTOK_HASHTAGS: string[] = [
  // English
  'NepalPolitics',
  'BalenShah',
  'RSP',
  'NepalGovernment',
  'KathmanduDevelopment',
  'NepalProgress',
  // Nepali (Devanagari)
  'नेपालसरकार',
  'बालेनशाह',
];

// ─── Approach 1: Apify-based scraping ────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || '';
const APIFY_BASE = 'https://api.apify.com/v2';

// Apify actors for TikTok scraping
const TIKTOK_PROFILE_ACTOR = 'clockworks/free-tiktok-scraper';
const TIKTOK_HASHTAG_ACTOR = 'microworlds/tiktok-scraper';

/**
 * Scrape a TikTok user profile using Apify actor.
 */
async function scrapeProfileViaApify(account: TikTokAccountConfig): Promise<ScrapedVideo[]> {
  if (!APIFY_TOKEN) return [];

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${TIKTOK_PROFILE_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profiles: [`https://www.tiktok.com/@${account.username}`],
          resultsPerPage: account.maxVideos,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.error(`[TikTokScraper/Apify] Failed to start profile run for ${account.name}: ${res.status} ${errText}`);
      return [];
    }

    const runData = await res.json();
    const runId = runData.data?.id;
    if (!runId) return [];

    const completed = await pollApifyRun(runId);
    if (!completed) {
      console.warn(`[TikTokScraper/Apify] Profile run ${runId} did not complete for ${account.name}`);
      return [];
    }

    return await fetchApifyTikTokDataset(runId, account.username);
  } catch (err) {
    console.error(`[TikTokScraper/Apify] Error scraping profile ${account.name}:`, err);
    return [];
  }
}

/**
 * Scrape a TikTok hashtag using Apify actor.
 */
async function scrapeHashtagViaApify(hashtag: string, maxVideos = 15): Promise<ScrapedVideo[]> {
  if (!APIFY_TOKEN) return [];

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${TIKTOK_HASHTAG_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hashtags: [hashtag],
          resultsPerPage: maxVideos,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.error(`[TikTokScraper/Apify] Failed to start hashtag run for #${hashtag}: ${res.status} ${errText}`);
      return [];
    }

    const runData = await res.json();
    const runId = runData.data?.id;
    if (!runId) return [];

    const completed = await pollApifyRun(runId);
    if (!completed) {
      console.warn(`[TikTokScraper/Apify] Hashtag run ${runId} did not complete for #${hashtag}`);
      return [];
    }

    return await fetchApifyTikTokDataset(runId);
  } catch (err) {
    console.error(`[TikTokScraper/Apify] Error scraping hashtag #${hashtag}:`, err);
    return [];
  }
}

/**
 * Poll an Apify actor run until it completes (max 5 minutes).
 */
async function pollApifyRun(runId: string, maxWaitMs = 300_000): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(
        `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) return false;

      const data = await res.json();
      const status = data.data?.status;

      if (status === 'SUCCEEDED') return true;
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') return false;

      await new Promise((r) => setTimeout(r, 10_000));
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Fetch and parse TikTok video data from an Apify run dataset.
 */
async function fetchApifyTikTokDataset(runId: string, defaultUsername?: string): Promise<ScrapedVideo[]> {
  try {
    const res = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&format=json`,
      { signal: AbortSignal.timeout(30_000) },
    );
    if (!res.ok) return [];

    const items: Record<string, unknown>[] = await res.json();

    return (items || [])
      .map((item): ScrapedVideo | null => {
        const videoId =
          (item.id as string) ||
          (item.videoId as string) ||
          (item.aweme_id as string) ||
          '';
        const webVideoUrl =
          (item.webVideoUrl as string) ||
          (item.url as string) ||
          (item.videoUrl as string) ||
          '';
        if (!videoId && !webVideoUrl) return null;

        const authorUsername =
          (item.authorMeta as Record<string, unknown>)?.name as string ||
          (item.author as Record<string, unknown>)?.uniqueId as string ||
          (item.authorName as string) ||
          defaultUsername ||
          'unknown';

        const authorName =
          (item.authorMeta as Record<string, unknown>)?.nickName as string ||
          (item.author as Record<string, unknown>)?.nickname as string ||
          (item.authorNickname as string) ||
          authorUsername;

        return {
          externalId: videoId || hashString(webVideoUrl),
          description:
            (item.text as string) ||
            (item.desc as string) ||
            (item.description as string) ||
            '',
          url: webVideoUrl || `https://www.tiktok.com/@${authorUsername}/video/${videoId}`,
          publishedAt:
            parseTimestamp(item.createTime as number | string) ||
            (item.createTimeISO as string) ||
            new Date().toISOString(),
          author: authorName,
          authorUsername,
          likes:
            (item.diggCount as number) ||
            (item.likes as number) ||
            (item.stats as Record<string, unknown>)?.diggCount as number ||
            0,
          shares:
            (item.shareCount as number) ||
            (item.shares as number) ||
            (item.stats as Record<string, unknown>)?.shareCount as number ||
            0,
          comments:
            (item.commentCount as number) ||
            (item.comments as number) ||
            (item.stats as Record<string, unknown>)?.commentCount as number ||
            0,
          views:
            (item.playCount as number) ||
            (item.plays as number) ||
            (item.views as number) ||
            (item.stats as Record<string, unknown>)?.playCount as number ||
            0,
          videoUrl:
            (item.videoUrl as string) ||
            (item.downloadUrl as string) ||
            webVideoUrl ||
            undefined,
          thumbnailUrl:
            (item.coverUrl as string) ||
            (item.thumbnail as string) ||
            (item.video as Record<string, unknown>)?.cover as string ||
            undefined,
        };
      })
      .filter((v): v is ScrapedVideo => v !== null);
  } catch {
    return [];
  }
}

// ─── Approach 2: DuckDuckGo free fallback ────────────────────────────────────

/**
 * Free fallback: use DuckDuckGo site-specific search to find recent
 * TikTok videos. Less reliable, but zero cost and no API key needed.
 */
async function scrapeProfileViaDuckDuckGo(account: TikTokAccountConfig): Promise<ScrapedVideo[]> {
  const queries = [
    // DDG often blocks site: for TikTok, so use broader queries
    `tiktok ${account.name} nepal`,
    `tiktok.com/@${account.username}`,
    `site:tiktok.com/@${account.username}`,
  ];

  if (account.nameNe) {
    queries.push(`tiktok "${account.nameNe}"`);
  }

  const videos: ScrapedVideo[] = [];

  for (const query of queries) {
    try {
      const results = await duckDuckGoSearch(query);
      for (const result of results) {
        if (!result.url.includes('tiktok.com')) continue;

        videos.push({
          externalId: `ddg-${hashString(result.url)}`,
          description: result.snippet,
          url: result.url,
          publishedAt: result.date || new Date().toISOString(),
          author: account.name,
          authorUsername: account.username,
          likes: 0,
          shares: 0,
          comments: 0,
          views: 0,
        });
      }
    } catch (err) {
      console.warn(`[TikTokScraper/DDG] Search failed for "${query}":`, err);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return videos.filter((v) => {
    if (seen.has(v.url)) return false;
    seen.add(v.url);
    return true;
  });
}

/**
 * Run broad DuckDuckGo searches for Nepal political TikTok content.
 */
async function scrapeBroadSearches(): Promise<ScrapedVideo[]> {
  const broadQueries = [
    // DDG often blocks site: for TikTok, so use broader queries without site: restriction
    'tiktok nepal politics balen',
    'tiktok nepal government RSP',
    'tiktok "Rastriya Swatantra Party" nepal',
    'tiktok "बालेन शाह" OR "नेपाल सरकार"',
    'tiktok "Nepal politics" OR "NepalProgress"',
    'tiktok kathmandu development balen shah',
  ];

  const videos: ScrapedVideo[] = [];

  for (const query of broadQueries) {
    try {
      const results = await duckDuckGoSearch(query);
      for (const result of results) {
        if (!result.url.includes('tiktok.com')) continue;

        // Try to extract username from TikTok URL
        const usernameMatch = result.url.match(/tiktok\.com\/@([^/]+)/);
        const username = usernameMatch ? usernameMatch[1] : 'unknown';

        videos.push({
          externalId: `ddg-broad-${hashString(result.url)}`,
          description: result.snippet,
          url: result.url,
          publishedAt: new Date().toISOString(),
          author: result.title || username,
          authorUsername: username,
          likes: 0,
          shares: 0,
          comments: 0,
          views: 0,
        });
      }
    } catch {
      // Silently skip failed broad searches
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  // Deduplicate
  const seen = new Set<string>();
  return videos.filter((v) => {
    if (seen.has(v.url)) return false;
    seen.add(v.url);
    return true;
  });
}

// ─── DuckDuckGo search helpers ───────────────────────────────────────────────

interface DDGResult {
  url: string;
  title: string;
  snippet: string;
  date?: string;
}

async function duckDuckGoSearch(query: string): Promise<DDGResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NepalProgressBot/1.0; +https://nepalprogress.com)',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    return parseDDGResults(html);
  } catch {
    return [];
  }
}

function parseDDGResults(html: string): DDGResult[] {
  const results: DDGResult[] = [];

  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g;

  const links: { url: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    let url = match[1];
    const uddgMatch = url.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      url = decodeURIComponent(uddgMatch[1]);
    }
    links.push({ url, title: stripHtml(match[2]) });
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(stripHtml(match[1]));
  }

  for (let i = 0; i < links.length && i < 10; i++) {
    results.push({
      url: links[i].url,
      title: links[i].title,
      snippet: snippets[i] || '',
      date: undefined,
    });
  }

  return results;
}

// ─── Main export: scrape all TikTok sources ──────────────────────────────────

/**
 * Scrape all tracked TikTok accounts and hashtags using the best available approach.
 *
 * If APIFY_API_TOKEN is set, uses Apify for rich data (profiles + hashtags).
 * Otherwise, falls back to DuckDuckGo site-search for free scraping.
 *
 * @returns { videosFound, newVideos, errors }
 */
export async function scrapeTikTok(): Promise<ScrapeResult> {
  const supabase = getSupabase();
  const useApify = !!APIFY_TOKEN;
  let videosFound = 0;
  let newVideos = 0;
  const errors: string[] = [];

  console.log(
    `[TikTokScraper] Starting scrape of ${TIKTOK_ACCOUNTS.length} accounts + ` +
      `${TIKTOK_HASHTAGS.length} hashtags ` +
      `(mode: ${useApify ? 'Apify' : 'DuckDuckGo fallback'})`,
  );

  // ── Scrape tracked accounts ──────────────────────────────────────────────

  for (const account of TIKTOK_ACCOUNTS) {
    try {
      const videos = useApify
        ? await scrapeProfileViaApify(account)
        : await scrapeProfileViaDuckDuckGo(account);

      videosFound += videos.length;

      for (const video of videos) {
        if (!video.description && !video.url) continue;

        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: account.id,
            signal_type: 'social_post',
            external_id: video.externalId,
            title: (video.description || 'TikTok video').slice(0, 200),
            content: video.description.slice(0, 15000),
            url: video.url,
            author: video.author,
            author_official_id: account.officialId || null,
            published_at: safeISODate(video.publishedAt),
            matched_promise_ids: account.relatedPromiseIds,
            language: detectLanguage(video.description),
            media_type: 'video',
            thumbnail_url: video.thumbnailUrl || undefined,
            metadata: {
              platform: 'tiktok',
              username: video.authorUsername,
              accountName: account.name,
              accountNameNe: account.nameNe,
              category: account.category,
              scrapeMethod: useApify ? 'apify' : 'duckduckgo',
              video_url: video.videoUrl || video.url,
              engagement: {
                likes: video.likes,
                shares: video.shares,
                comments: video.comments,
                views: video.views,
              },
            },
          },
          { onConflict: 'source_id,external_id', ignoreDuplicates: true },
        );

        if (!error) newVideos++;
      }

      // Update or create the intelligence source record
      await supabase.from('intelligence_sources').upsert(
        {
          id: account.id,
          name: `${account.name} (TikTok)`,
          source_type: 'tiktok_account' as const,
          url: `https://www.tiktok.com/@${account.username}`,
          config: {
            type: 'tiktok_profile_scraper',
            category: account.category,
            nameNe: account.nameNe,
            username: account.username,
            scrapeMethod: useApify ? 'apify' : 'duckduckgo',
            maxVideos: account.maxVideos,
          },
          related_promise_ids: account.relatedPromiseIds,
          related_official_ids: account.officialId ? [account.officialId] : [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at: videos.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      const msg = `${account.name}: ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
      console.error(`[TikTokScraper] ${msg}`);
    }

    // Rate limit between accounts (3s)
    await new Promise((r) => setTimeout(r, 3000));
  }

  // ── Scrape tracked hashtags (Apify only) ─────────────────────────────────

  if (useApify) {
    for (const hashtag of TIKTOK_HASHTAGS) {
      try {
        const videos = await scrapeHashtagViaApify(hashtag);
        videosFound += videos.length;

        const sourceId = `tiktok-hashtag-${hashtag.toLowerCase()}`;

        for (const video of videos) {
          if (!video.description && !video.url) continue;

          const { error } = await supabase.from('intelligence_signals').upsert(
            {
              source_id: sourceId,
              signal_type: 'social_post',
              external_id: video.externalId,
              title: (video.description || `TikTok #${hashtag}`).slice(0, 200),
              content: video.description.slice(0, 15000),
              url: video.url,
              author: video.author,
              published_at: safeISODate(video.publishedAt),
              matched_promise_ids: [],
              language: detectLanguage(video.description),
              media_type: 'video',
              thumbnail_url: video.thumbnailUrl || undefined,
              metadata: {
                platform: 'tiktok',
                hashtag,
                username: video.authorUsername,
                scrapeMethod: 'apify',
                video_url: video.videoUrl || video.url,
                engagement: {
                  likes: video.likes,
                  shares: video.shares,
                  comments: video.comments,
                  views: video.views,
                },
              },
            },
            { onConflict: 'source_id,external_id', ignoreDuplicates: true },
          );

          if (!error) newVideos++;
        }

        // Register hashtag source
        await supabase.from('intelligence_sources').upsert(
          {
            id: sourceId,
            name: `#${hashtag} (TikTok)`,
            source_type: 'tiktok_hashtag' as const,
            url: `https://www.tiktok.com/tag/${hashtag}`,
            config: {
              type: 'tiktok_hashtag_scraper',
              hashtag,
              scrapeMethod: 'apify',
            },
            related_promise_ids: [],
            related_official_ids: [],
            is_active: true,
            last_checked_at: new Date().toISOString(),
            last_found_at: videos.length > 0 ? new Date().toISOString() : undefined,
          },
          { onConflict: 'id' },
        );
      } catch (err) {
        const msg = `#${hashtag}: ${err instanceof Error ? err.message : 'unknown error'}`;
        errors.push(msg);
        console.error(`[TikTokScraper] ${msg}`);
      }

      // Rate limit between hashtags (3s)
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // ── Run broad searches if using the free fallback ────────────────────────

  if (!useApify) {
    try {
      const broadVideos = await scrapeBroadSearches();
      videosFound += broadVideos.length;

      for (const video of broadVideos) {
        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: 'tiktok-broad-search',
            signal_type: 'social_post',
            external_id: video.externalId,
            title: (video.description || 'TikTok video').slice(0, 200),
            content: video.description.slice(0, 15000),
            url: video.url,
            author: video.author,
            published_at: safeISODate(video.publishedAt),
            matched_promise_ids: [],
            language: detectLanguage(video.description),
            media_type: 'video',
            metadata: {
              platform: 'tiktok',
              username: video.authorUsername,
              scrapeMethod: 'duckduckgo-broad',
              video_url: video.videoUrl || video.url,
              engagement: {
                likes: video.likes,
                shares: video.shares,
                comments: video.comments,
                views: video.views,
              },
            },
          },
          { onConflict: 'source_id,external_id', ignoreDuplicates: true },
        );

        if (!error) newVideos++;
      }

      // Register the broad search source
      await supabase.from('intelligence_sources').upsert(
        {
          id: 'tiktok-broad-search',
          name: 'TikTok Broad Search (Nepal Politics)',
          source_type: 'tiktok_search' as const,
          url: 'https://tiktok.com',
          config: {
            type: 'tiktok_broad_search',
            scrapeMethod: 'duckduckgo',
          },
          related_promise_ids: [],
          related_official_ids: [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at: broadVideos.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      errors.push(`Broad search: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  console.log(
    `[TikTokScraper] Complete: ${videosFound} videos found, ${newVideos} new, ${errors.length} errors`,
  );

  return { videosFound, newVideos, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detect language based on Devanagari character density.
 */
function detectLanguage(text: string): string {
  if (!text) return 'en';
  const nepaliChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  return nepaliChars / text.length > 0.2 ? 'ne' : 'en';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

function safeISODate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Parse TikTok's createTime which can be a Unix timestamp (seconds) or ISO string.
 */
function parseTimestamp(value: number | string | undefined): string | null {
  if (value === undefined || value === null) return null;

  if (typeof value === 'number') {
    // Unix timestamp in seconds
    const d = new Date(value * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  return null;
}
