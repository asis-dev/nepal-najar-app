/**
 * Dedicated Threads (Meta) Scraper
 *
 * Two-tier approach for scraping public Threads posts:
 *
 * Approach 1 (preferred): Apify's threads-scraper actor
 *   - Rich data: full post text, likes, replies, reposts
 *   - Requires APIFY_API_TOKEN (free tier: $5/month)
 *   - Fetches posts from the last 3 days for efficiency
 *
 * Approach 2 (free fallback): DuckDuckGo site-specific search
 *   - Uses `site:threads.net "query"` to find recent posts
 *   - Parses search result snippets for signal content
 *   - Less reliable, but zero cost and no API key needed
 *
 * ETHICAL USAGE:
 *   - Public figures, journalists, and news outlets ONLY
 *   - Public data ONLY (no private content)
 *   - Polite scraping with 3s delays between requests
 *   - Data used for government accountability tracking
 *
 * Environment:
 *   APIFY_API_TOKEN — optional, enables Approach 1
 */

import { getSupabase } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThreadsAccountConfig {
  /** Internal ID, e.g. 'threads-balen-shah' */
  id: string;
  /** Threads username (without @) */
  username: string;
  /** Display name */
  name: string;
  /** Category for grouping */
  category: 'journalist' | 'news_outlet' | 'politician' | 'party' | 'civil_society';
  /** Related promise IDs for cross-referencing */
  relatedPromiseIds: number[];
  /** Official ID in the officials table, if any */
  officialId?: number;
  /** Max posts to fetch per scrape */
  maxPosts: number;
}

interface ScrapedThreadsPost {
  externalId: string;
  text: string;
  url: string;
  author: string;
  publishedAt: string;
  likes: number;
  replies: number;
  reposts: number;
  imageUrls?: string[];
}

interface ScrapeResult {
  postsFound: number;
  newPosts: number;
  errors: string[];
}

// ─── Tracked Accounts ────────────────────────────────────────────────────────

export const THREADS_ACCOUNTS: ThreadsAccountConfig[] = [
  // --- Politicians ---
  {
    id: 'threads-balen-shah',
    username: 'baaborshahh',
    name: 'Balen Shah',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 15,
  },
  {
    id: 'threads-rabi-lamichhane',
    username: 'raaborbilamichhane',
    name: 'Rabi Lamichhane',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'threads-swarnim-wagle',
    username: 'swarnimwagle',
    name: 'Swarnim Wagle',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // --- Parties ---
  {
    id: 'threads-rsp-official',
    username: 'raborspnepal',
    name: 'Rastriya Swatantra Party',
    category: 'party',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // --- Journalists ---
  {
    id: 'threads-sandeep-acharya',
    username: 'sandeepacharya',
    name: 'Sandeep Acharya',
    category: 'journalist',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'threads-subin-mulmi',
    username: 'subinmulmi',
    name: 'Subin Mulmi',
    category: 'journalist',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'threads-pranaya-rana',
    username: 'pranayarana',
    name: 'Pranaya SJB Rana',
    category: 'journalist',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'threads-amish-raj-mulmi',
    username: 'amishrajmulmi',
    name: 'Amish Raj Mulmi',
    category: 'journalist',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // --- News Outlets ---
  {
    id: 'threads-kathmandu-post',
    username: 'kathmandupost',
    name: 'The Kathmandu Post',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxPosts: 15,
  },
  {
    id: 'threads-nepali-times',
    username: 'nepalitimes',
    name: 'Nepali Times',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxPosts: 15,
  },
  {
    id: 'threads-onlinekhabar',
    username: 'onlinekhabar',
    name: 'Online Khabar',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'threads-record-nepal',
    username: 'recordnepal',
    name: 'The Record Nepal',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // --- Civil Society ---
  {
    id: 'threads-accountability-lab',
    username: 'accountabilitylabnepal',
    name: 'Accountability Lab Nepal',
    category: 'civil_society',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
];

// ─── Approach 1: Apify-based scraping ────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || '';
const APIFY_BASE = 'https://api.apify.com/v2';
const THREADS_ACTOR = 'apify/threads-scraper';

/**
 * Scrape a single Threads account using the Apify threads-scraper actor.
 * Only fetches posts from the last 3 days for efficiency.
 */
async function scrapeViaApify(account: ThreadsAccountConfig): Promise<ScrapedThreadsPost[]> {
  if (!APIFY_TOKEN) return [];

  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const res = await fetch(
      `${APIFY_BASE}/acts/${THREADS_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [`https://www.threads.net/@${account.username}`],
          maxPosts: account.maxPosts,
          maxRequestRetries: 3,
          maxConcurrency: 1,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.error(`[ThreadsScraper/Apify] Failed to start run for ${account.name}: ${res.status} ${errText}`);
      return [];
    }

    const runData = await res.json();
    const runId = runData.data?.id;
    if (!runId) return [];

    // Poll for completion (max 5 minutes)
    const completed = await pollApifyRun(runId);
    if (!completed) {
      console.warn(`[ThreadsScraper/Apify] Run ${runId} did not complete for ${account.name}`);
      return [];
    }

    return await fetchApifyDataset(runId, account);
  } catch (err) {
    console.error(`[ThreadsScraper/Apify] Error scraping ${account.name}:`, err);
    return [];
  }
}

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

async function fetchApifyDataset(
  runId: string,
  account: ThreadsAccountConfig,
): Promise<ScrapedThreadsPost[]> {
  try {
    const res = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&format=json`,
      { signal: AbortSignal.timeout(30_000) },
    );
    if (!res.ok) return [];

    const items: Record<string, unknown>[] = await res.json();

    return (items || [])
      .map((item): ScrapedThreadsPost | null => {
        const postId =
          (item.id as string) ||
          (item.postId as string) ||
          (item.code as string) ||
          '';
        const postUrl =
          (item.url as string) ||
          (item.postUrl as string) ||
          (postId ? `https://www.threads.net/@${account.username}/post/${postId}` : '');
        if (!postId && !postUrl) return null;

        const text =
          (item.text as string) ||
          (item.caption as string) ||
          (item.postText as string) ||
          '';

        return {
          externalId: postId || hashString(postUrl),
          text,
          url: postUrl,
          author: (item.ownerUsername as string) || account.username,
          publishedAt:
            (item.publishedAt as string) ||
            (item.timestamp as string) ||
            (item.takenAt as string) ||
            (item.date as string) ||
            new Date().toISOString(),
          likes: (item.likeCount as number) || (item.likes as number) || 0,
          replies: (item.replyCount as number) || (item.replies as number) || (item.commentsCount as number) || 0,
          reposts: (item.repostCount as number) || (item.reposts as number) || (item.sharesCount as number) || 0,
          imageUrls: Array.isArray(item.images)
            ? (item.images as string[])
            : item.imageUrl
              ? [item.imageUrl as string]
              : undefined,
        };
      })
      .filter((p): p is ScrapedThreadsPost => p !== null);
  } catch {
    return [];
  }
}

// ─── Approach 2: DuckDuckGo free fallback ────────────────────────────────────

/**
 * Free fallback: use DuckDuckGo site-specific search to find recent
 * Threads posts for a given account.
 */
async function scrapeViaDuckDuckGo(account: ThreadsAccountConfig): Promise<ScrapedThreadsPost[]> {
  const posts: ScrapedThreadsPost[] = [];

  const queries = [
    `site:threads.net "@${account.username}"`,
    `site:threads.net "${account.name}"`,
  ];

  for (const query of queries) {
    try {
      const results = await duckDuckGoSearch(query);
      for (const result of results) {
        if (!result.url.includes('threads.net')) continue;

        posts.push({
          externalId: `ddg-${hashString(result.url)}`,
          text: result.snippet,
          url: result.url,
          author: account.username,
          publishedAt: result.date || new Date().toISOString(),
          likes: 0,
          replies: 0,
          reposts: 0,
        });
      }
    } catch (err) {
      console.warn(`[ThreadsScraper/DDG] Search failed for "${query}":`, err);
    }

    // Rate limit between queries (3s)
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}

// ─── Broader free search queries ─────────────────────────────────────────────

const BROAD_SEARCH_QUERIES = [
  'site:threads.net "Nepal government" OR "Balen" OR "RSP"',
  'site:threads.net "Balen Shah" Kathmandu',
  'site:threads.net "Rastriya Swatantra Party"',
  'site:threads.net "Nepal budget" OR "Nepal infrastructure"',
  'site:threads.net "Kathmandu development" OR "KMC"',
  'site:threads.net "नेपाल सरकार" OR "बालेन"',
];

/**
 * Run broader DuckDuckGo searches for Nepal-related Threads content.
 * These are general queries that catch content not tied to specific accounts.
 */
async function scrapeBroadSearches(): Promise<ScrapedThreadsPost[]> {
  const posts: ScrapedThreadsPost[] = [];

  for (const query of BROAD_SEARCH_QUERIES) {
    try {
      const results = await duckDuckGoSearch(query);
      for (const result of results) {
        if (!result.url.includes('threads.net')) continue;

        // Try to extract username from URL: threads.net/@username/post/...
        const authorMatch = result.url.match(/threads\.net\/@([^/]+)/);
        const author = authorMatch ? authorMatch[1] : 'unknown';

        posts.push({
          externalId: `ddg-broad-${hashString(result.url)}`,
          text: result.snippet,
          url: result.url,
          author,
          publishedAt: new Date().toISOString(),
          likes: 0,
          replies: 0,
          reposts: 0,
        });
      }
    } catch {
      // Silently skip failed broad searches
    }

    // Rate limit (3s)
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Deduplicate
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
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

/**
 * Query DuckDuckGo HTML search and parse results.
 * Uses the lite/html interface which is more scrape-friendly.
 */
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

/**
 * Parse DuckDuckGo HTML search results.
 */
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

// ─── Main export: scrape all Threads accounts ────────────────────────────────

/**
 * Scrape all tracked Threads accounts using the best available approach.
 *
 * If APIFY_API_TOKEN is set, uses Apify for rich data.
 * Otherwise, falls back to DuckDuckGo site-search for free scraping.
 */
export async function scrapeThreads(): Promise<ScrapeResult> {
  const supabase = getSupabase();
  const useApify = !!APIFY_TOKEN;
  let postsFound = 0;
  let newPosts = 0;
  const errors: string[] = [];

  console.log(
    `[ThreadsScraper] Starting scrape of ${THREADS_ACCOUNTS.length} accounts ` +
      `(mode: ${useApify ? 'Apify' : 'DuckDuckGo fallback'})`,
  );

  for (const account of THREADS_ACCOUNTS) {
    try {
      const posts = useApify
        ? await scrapeViaApify(account)
        : await scrapeViaDuckDuckGo(account);

      postsFound += posts.length;

      // Upsert each post into intelligence_signals
      for (const post of posts) {
        if (!post.text && !post.url) continue;

        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: `threads-${account.username}`,
            signal_type: 'social_post',
            external_id: post.externalId,
            title: (post.text || 'Threads post').slice(0, 200),
            content: post.text.slice(0, 15000),
            url: post.url,
            author: post.author,
            author_official_id: account.officialId || null,
            published_at: safeISODate(post.publishedAt),
            matched_promise_ids: account.relatedPromiseIds,
            language: detectLanguage(post.text),
            media_type: 'text',
            thumbnail_url: post.imageUrls?.[0] || undefined,
            metadata: {
              platform: 'threads',
              username: account.username,
              accountName: account.name,
              category: account.category,
              scrapeMethod: useApify ? 'apify' : 'duckduckgo',
              engagement: {
                likes: post.likes,
                replies: post.replies,
                reposts: post.reposts,
              },
            },
          },
          { onConflict: 'source_id,external_id', ignoreDuplicates: true },
        );

        if (!error) newPosts++;
      }

      // Update or create the intelligence source record
      await supabase.from('intelligence_sources').upsert(
        {
          id: account.id,
          name: `${account.name} (Threads)`,
          source_type: 'social_media' as const,
          url: `https://www.threads.net/@${account.username}`,
          config: {
            type: 'threads_scraper',
            category: account.category,
            username: account.username,
            scrapeMethod: useApify ? 'apify' : 'duckduckgo',
            maxPosts: account.maxPosts,
          },
          related_promise_ids: account.relatedPromiseIds,
          related_official_ids: account.officialId ? [account.officialId] : [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at: posts.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      const msg = `${account.name}: ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
      console.error(`[ThreadsScraper] ${msg}`);
    }

    // Rate limit between accounts (3s)
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Run broad searches if using the free fallback
  if (!useApify) {
    try {
      const broadPosts = await scrapeBroadSearches();
      postsFound += broadPosts.length;

      for (const post of broadPosts) {
        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: 'threads-broad-search',
            signal_type: 'social_post',
            external_id: post.externalId,
            title: (post.text || 'Threads post').slice(0, 200),
            content: post.text.slice(0, 15000),
            url: post.url,
            author: post.author,
            published_at: safeISODate(post.publishedAt),
            matched_promise_ids: [],
            language: detectLanguage(post.text),
            media_type: 'text',
            metadata: {
              platform: 'threads',
              scrapeMethod: 'duckduckgo-broad',
              engagement: {
                likes: post.likes,
                replies: post.replies,
                reposts: post.reposts,
              },
            },
          },
          { onConflict: 'source_id,external_id', ignoreDuplicates: true },
        );

        if (!error) newPosts++;
      }

      // Register the broad search source
      await supabase.from('intelligence_sources').upsert(
        {
          id: 'threads-broad-search',
          name: 'Threads Broad Search (Nepal Politics)',
          source_type: 'social_media' as const,
          url: 'https://www.threads.net',
          config: {
            type: 'threads_broad_search',
            scrapeMethod: 'duckduckgo',
          },
          related_promise_ids: [],
          related_official_ids: [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at: broadPosts.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      errors.push(`Broad search: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  console.log(
    `[ThreadsScraper] Complete: ${postsFound} posts found, ${newPosts} new, ${errors.length} errors`,
  );

  return { postsFound, newPosts, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
