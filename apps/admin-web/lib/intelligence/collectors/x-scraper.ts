/**
 * Dedicated X/Twitter Scraper
 *
 * Three-tier approach for scraping public X/Twitter posts:
 *
 * Approach 1 (preferred): Apify's tweet-scraper actor
 *   - Rich data: full tweet text, likes, retweets, replies, quotes
 *   - Requires APIFY_API_TOKEN (free tier: $5/month)
 *   - Fetches tweets from the last 3 days for efficiency
 *
 * Approach 2 (free, no key): Nitter public instances
 *   - Nitter is an open-source Twitter frontend that exposes public tweets
 *   - Rotates through multiple instances (they go up and down)
 *   - Parses HTML for tweet content, stats, and metadata
 *   - Zero cost, no API key needed
 *
 * Approach 3 (free fallback): DuckDuckGo site-specific search
 *   - Uses `site:twitter.com OR site:x.com "query"` to find recent posts
 *   - Parses search result snippets for signal content
 *   - Least reliable, but always available
 *
 * ETHICAL USAGE:
 *   - Public figures, journalists, and news outlets ONLY
 *   - Public data ONLY (no private/protected tweets)
 *   - Polite scraping with 3s delays between requests
 *   - Data used for government accountability tracking
 *
 * Environment:
 *   APIFY_API_TOKEN — optional, enables Approach 1
 */

import { getSupabase } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface XAccountConfig {
  /** Internal ID, e.g. 'x-balen-shah' */
  id: string;
  /** X/Twitter username (without @) */
  username: string;
  /** Display name */
  name: string;
  /** Category for grouping */
  category: 'politician' | 'party' | 'news_outlet' | 'journalist' | 'civil_society';
  /** Related promise IDs for cross-referencing */
  relatedPromiseIds: number[];
  /** Official ID in the officials table, if any */
  officialId?: number;
  /** Max tweets to fetch per scrape */
  maxTweets: number;
}

interface ScrapedTweet {
  externalId: string;
  text: string;
  url: string;
  author: string;
  username: string;
  publishedAt: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  videoUrl?: string;
  imageUrls?: string[];
}

interface ScrapeResult {
  tweetsFound: number;
  newTweets: number;
  errors: string[];
}

// ─── Tracked Accounts ────────────────────────────────────────────────────────

export const X_ACCOUNTS: XAccountConfig[] = [
  // --- Politicians ---
  {
    id: 'x-balen-shah',
    username: 'balenshah',
    name: 'Balen Shah',
    category: 'politician',
    relatedPromiseIds: [],
    maxTweets: 15,
  },
  {
    id: 'x-pradeep-gyawali',
    username: 'PradeepGyawali',
    name: 'Pradeep Gyawali',
    category: 'politician',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-swarnim-wagle',
    username: 'SwarnimWagle',
    name: 'Swarnim Wagle',
    category: 'politician',
    relatedPromiseIds: [],
    maxTweets: 10,
  },

  // --- Parties ---
  {
    id: 'x-rsp-nepal',
    username: 'RSPNepal',
    name: 'Rastriya Swatantra Party',
    category: 'party',
    relatedPromiseIds: [],
    maxTweets: 10,
  },

  // --- News Outlets ---
  {
    id: 'x-kathmandu-post',
    username: 'KathmanduPost',
    name: 'The Kathmandu Post',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 15,
  },
  {
    id: 'x-myrepublica',
    username: 'myrepublica',
    name: 'myRepublica',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 15,
  },
  {
    id: 'x-himalayan-times',
    username: 'HimalayaTimes',
    name: 'The Himalayan Times',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-online-khabar',
    username: 'online_khabar',
    name: 'Online Khabar',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-record-nepal',
    username: 'therecordnepal',
    name: 'The Record Nepal',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-nepali-times',
    username: 'nepalitimes',
    name: 'Nepali Times',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 10,
  },

  // --- Additional accounts ---
  {
    id: 'x-kunda-dixit',
    username: 'kundadixit',
    name: 'Kunda Dixit',
    category: 'journalist',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-gagan-thapa',
    username: 'thapagk',
    name: 'Gagan Thapa',
    category: 'politician',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-dorje-gurung',
    username: 'Dorje_sDooing',
    name: 'Dorje Gurung',
    category: 'journalist',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-pahilopost',
    username: 'PahiloPost',
    name: 'PahiloPost',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-nepali-comment',
    username: 'NepaliComment',
    name: 'The Nepali Comment',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
  {
    id: 'x-record-nepal-2',
    username: 'recordnepal',
    name: 'The Record Nepal',
    category: 'news_outlet',
    relatedPromiseIds: [],
    maxTweets: 10,
  },
];

// ─── Search Queries ──────────────────────────────────────────────────────────

export const X_QUERIES: string[] = [
  'Nepal government',
  'Balen Shah',
  'RSP Nepal',
  'Nepal budget 2025',
  'Nepal infrastructure',
  'Kathmandu development',
  'Nepal policy',
  '#NepalPolitics',
  '#BalenShah',
];

// ─── Nitter Instances ────────────────────────────────────────────────────────

const NITTER_INSTANCES = [
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
  'https://xcancel.com',
];

// ─── Apify Config ────────────────────────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || '';
const APIFY_BASE = 'https://api.apify.com/v2';
const TWEET_SCRAPER_ACTOR = 'quacker/twitter-scraper';

// ─── Approach 1: Apify-based scraping ────────────────────────────────────────

/**
 * Scrape tweets from a user profile using the Apify twitter-scraper actor.
 */
async function scrapeAccountViaApify(account: XAccountConfig): Promise<ScrapedTweet[]> {
  if (!APIFY_TOKEN) return [];

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${TWEET_SCRAPER_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: `https://x.com/${account.username}` }],
          maxTweets: account.maxTweets,
          maxRequestRetries: 3,
          maxConcurrency: 1,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.error(`[XScraper/Apify] Failed to start run for ${account.name}: ${res.status} ${errText}`);
      return [];
    }

    const runData = await res.json();
    const runId = runData.data?.id;
    if (!runId) return [];

    const completed = await pollApifyRun(runId);
    if (!completed) {
      console.warn(`[XScraper/Apify] Run ${runId} did not complete for ${account.name}`);
      return [];
    }

    return await fetchApifyTweetDataset(runId, account.username);
  } catch (err) {
    console.error(`[XScraper/Apify] Error scraping ${account.name}:`, err);
    return [];
  }
}

/**
 * Scrape tweets by search query using the Apify twitter-scraper actor.
 */
async function scrapeSearchViaApify(query: string): Promise<ScrapedTweet[]> {
  if (!APIFY_TOKEN) return [];

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${TWEET_SCRAPER_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms: [query],
          maxTweets: 10,
          maxRequestRetries: 3,
          maxConcurrency: 1,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) return [];

    const runData = await res.json();
    const runId = runData.data?.id;
    if (!runId) return [];

    const completed = await pollApifyRun(runId);
    if (!completed) return [];

    return await fetchApifyTweetDataset(runId);
  } catch {
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

async function fetchApifyTweetDataset(
  runId: string,
  defaultUsername?: string,
): Promise<ScrapedTweet[]> {
  try {
    const res = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&format=json`,
      { signal: AbortSignal.timeout(30_000) },
    );
    if (!res.ok) return [];

    const items: Record<string, unknown>[] = await res.json();

    return (items || [])
      .map((item): ScrapedTweet | null => {
        const tweetId =
          (item.id as string) ||
          (item.tweetId as string) ||
          (item.id_str as string) ||
          '';
        const username =
          (item.author as Record<string, unknown>)?.userName as string ||
          (item.user as Record<string, unknown>)?.screen_name as string ||
          (item.username as string) ||
          (item.screen_name as string) ||
          defaultUsername ||
          'unknown';
        const tweetUrl =
          (item.url as string) ||
          (item.tweetUrl as string) ||
          (tweetId ? `https://x.com/${username}/status/${tweetId}` : '');
        if (!tweetId && !tweetUrl) return null;

        const text =
          (item.text as string) ||
          (item.full_text as string) ||
          (item.tweetText as string) ||
          '';

        const authorName =
          (item.author as Record<string, unknown>)?.name as string ||
          (item.user as Record<string, unknown>)?.name as string ||
          (item.name as string) ||
          username;

        // Extract media
        let videoUrl: string | undefined;
        let imageUrls: string[] | undefined;
        if (item.media && Array.isArray(item.media)) {
          const media = item.media as Record<string, unknown>[];
          const videos = media.filter((m) => m.type === 'video' || m.type === 'animated_gif');
          const images = media.filter((m) => m.type === 'photo');
          if (videos.length > 0) {
            videoUrl = (videos[0].video_url as string) || (videos[0].url as string);
          }
          if (images.length > 0) {
            imageUrls = images.map((m) => (m.media_url_https as string) || (m.url as string)).filter(Boolean);
          }
        }

        return {
          externalId: tweetId || hashString(tweetUrl),
          text,
          url: tweetUrl,
          author: authorName,
          username,
          publishedAt:
            (item.createdAt as string) ||
            (item.created_at as string) ||
            (item.timestamp as string) ||
            (item.date as string) ||
            new Date().toISOString(),
          likes: (item.likeCount as number) || (item.favorite_count as number) || (item.likes as number) || 0,
          retweets: (item.retweetCount as number) || (item.retweet_count as number) || (item.retweets as number) || 0,
          replies: (item.replyCount as number) || (item.reply_count as number) || (item.replies as number) || 0,
          quotes: (item.quoteCount as number) || (item.quote_count as number) || 0,
          videoUrl,
          imageUrls,
        };
      })
      .filter((t): t is ScrapedTweet => t !== null);
  } catch {
    return [];
  }
}

// ─── Approach 2: Nitter-based scraping ───────────────────────────────────────

/** Track which Nitter instance is currently working. */
let workingNitterInstance: string | null = null;

/**
 * Find a working Nitter instance by trying each one.
 * Caches the result for the duration of the scrape session.
 */
async function getWorkingNitterInstance(): Promise<string | null> {
  if (workingNitterInstance) return workingNitterInstance;

  for (const instance of NITTER_INSTANCES) {
    try {
      const res = await fetch(instance, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; NepalProgressBot/1.0; +https://nepalprogress.com)',
        },
        signal: AbortSignal.timeout(10_000),
        redirect: 'follow',
      });
      if (res.ok) {
        workingNitterInstance = instance;
        console.log(`[XScraper/Nitter] Using instance: ${instance}`);
        return instance;
      }
    } catch {
      // Try next instance
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.warn('[XScraper/Nitter] No working Nitter instance found');
  return null;
}

/**
 * Scrape tweets from a user timeline via Nitter.
 */
async function scrapeAccountViaNitter(account: XAccountConfig): Promise<ScrapedTweet[]> {
  const instance = await getWorkingNitterInstance();
  if (!instance) return [];

  try {
    const res = await fetch(`${instance}/${account.username}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NepalProgressBot/1.0; +https://nepalprogress.com)',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });

    if (!res.ok) {
      // This instance may have gone down, reset cache
      if (res.status >= 500) workingNitterInstance = null;
      return [];
    }

    const html = await res.text();
    return parseNitterTimeline(html, account.username, instance);
  } catch (err) {
    console.warn(`[XScraper/Nitter] Failed to scrape @${account.username}:`, err);
    workingNitterInstance = null; // Reset on network error
    return [];
  }
}

/**
 * Search tweets via Nitter search.
 */
async function scrapeSearchViaNitter(query: string): Promise<ScrapedTweet[]> {
  const instance = await getWorkingNitterInstance();
  if (!instance) return [];

  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(`${instance}/search?q=${encodedQuery}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NepalProgressBot/1.0; +https://nepalprogress.com)',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });

    if (!res.ok) {
      if (res.status >= 500) workingNitterInstance = null;
      return [];
    }

    const html = await res.text();
    return parseNitterTimeline(html, undefined, instance);
  } catch {
    workingNitterInstance = null;
    return [];
  }
}

/**
 * Parse Nitter HTML timeline into ScrapedTweet objects.
 *
 * Nitter HTML structure:
 *   .timeline-item contains each tweet
 *     .tweet-header .fullname — display name
 *     .tweet-header .username — @handle
 *     .tweet-content or .tweet-body — tweet text
 *     .tweet-stat spans — engagement stats
 *     time[datetime] — timestamp
 *     a.tweet-link — link to tweet
 */
function parseNitterTimeline(
  html: string,
  defaultUsername?: string,
  instance?: string,
): ScrapedTweet[] {
  const tweets: ScrapedTweet[] = [];

  // Split by timeline items
  const itemRegex = /<div[^>]*class="[^"]*timeline-item[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*timeline-item|$)/g;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(html)) !== null) {
    const block = itemMatch[1];

    // Extract author fullname
    const fullnameMatch = block.match(/<a[^>]*class="[^"]*fullname[^"]*"[^>]*>([^<]*)<\/a>/);
    const author = fullnameMatch ? stripHtml(fullnameMatch[1]).trim() : '';

    // Extract username
    const usernameMatch = block.match(/<a[^>]*class="[^"]*username[^"]*"[^>]*>@?([^<]*)<\/a>/);
    const username = usernameMatch ? stripHtml(usernameMatch[1]).trim().replace(/^@/, '') : defaultUsername || 'unknown';

    // Extract tweet text (try .tweet-content first, then .tweet-body)
    const textMatch =
      block.match(/<div[^>]*class="[^"]*tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
      block.match(/<div[^>]*class="[^"]*tweet-body[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const text = textMatch ? stripHtml(textMatch[1]).trim() : '';

    if (!text) continue;

    // Extract timestamp
    const timeMatch = block.match(/<time[^>]*datetime="([^"]*)"[^>]*>/);
    const publishedAt = timeMatch ? timeMatch[1] : new Date().toISOString();

    // Extract tweet link for building URL and external ID
    const linkMatch = block.match(/<a[^>]*class="[^"]*tweet-link[^"]*"[^>]*href="([^"]*)"[^>]*>/);
    const tweetPath = linkMatch ? linkMatch[1] : '';

    // Extract tweet ID from path (e.g., /username/status/1234567890)
    const tweetIdMatch = tweetPath.match(/\/status\/(\d+)/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : '';

    const tweetUrl = tweetId
      ? `https://x.com/${username}/status/${tweetId}`
      : tweetPath
        ? `https://x.com${tweetPath}`
        : '';

    // Extract engagement stats from .tweet-stat spans
    const stats = parseNitterStats(block);

    // Extract media (video/images)
    const videoMatch = block.match(/data-url="([^"]*\.mp4[^"]*)"/);
    const videoUrl = videoMatch ? videoMatch[1] : undefined;

    // Extract images
    const imageUrls: string[] = [];
    const imgRegex = /<img[^>]*class="[^"]*still-image[^"]*"[^>]*src="([^"]*)"/g;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(block)) !== null) {
      const imgSrc = imgMatch[1];
      // Nitter proxies images; construct the full URL
      const fullImgUrl = imgSrc.startsWith('http') ? imgSrc : `${instance || ''}${imgSrc}`;
      imageUrls.push(fullImgUrl);
    }

    tweets.push({
      externalId: tweetId || hashString(tweetUrl || text),
      text,
      url: tweetUrl,
      author: author || username,
      username,
      publishedAt: safeISODate(publishedAt),
      likes: stats.likes,
      retweets: stats.retweets,
      replies: stats.replies,
      quotes: stats.quotes,
      videoUrl,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });
  }

  return tweets;
}

/**
 * Parse engagement stats from a Nitter tweet block.
 * Stats appear as .tweet-stat spans with icons indicating type.
 */
function parseNitterStats(block: string): {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
} {
  const stats = { likes: 0, retweets: 0, replies: 0, quotes: 0 };

  // Nitter uses .icon-comment, .icon-retweet, .icon-heart, .icon-quote
  const statRegex = /<span[^>]*class="[^"]*tweet-stat[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*icon-(comment|retweet|heart|quote)[^"]*"[^>]*>[\s\S]*?<\/span>[\s\S]*?(\d[\d,]*)/g;
  let statMatch: RegExpExecArray | null;

  while ((statMatch = statRegex.exec(block)) !== null) {
    const type = statMatch[1];
    const value = parseInt(statMatch[2].replace(/,/g, ''), 10) || 0;

    switch (type) {
      case 'comment':
        stats.replies = value;
        break;
      case 'retweet':
        stats.retweets = value;
        break;
      case 'heart':
        stats.likes = value;
        break;
      case 'quote':
        stats.quotes = value;
        break;
    }
  }

  return stats;
}

// ─── Approach 3: DuckDuckGo free fallback ────────────────────────────────────

/**
 * Free fallback: use DuckDuckGo site-specific search to find recent
 * X/Twitter posts for a given account.
 */
async function scrapeAccountViaDuckDuckGo(account: XAccountConfig): Promise<ScrapedTweet[]> {
  const posts: ScrapedTweet[] = [];

  const queries = [
    `site:x.com "@${account.username}"`,
    `site:x.com "${account.name}"`,
  ];

  for (const query of queries) {
    try {
      const results = await duckDuckGoSearch(query);
      for (const result of results) {
        if (!result.url.includes('twitter.com') && !result.url.includes('x.com')) continue;

        // Try to extract tweet ID from URL
        const tweetIdMatch = result.url.match(/\/status\/(\d+)/);
        const tweetId = tweetIdMatch ? tweetIdMatch[1] : '';

        posts.push({
          externalId: tweetId || `ddg-${hashString(result.url)}`,
          text: result.snippet,
          url: result.url,
          author: account.name,
          username: account.username,
          publishedAt: result.date || new Date().toISOString(),
          likes: 0,
          retweets: 0,
          replies: 0,
          quotes: 0,
        });
      }
    } catch (err) {
      console.warn(`[XScraper/DDG] Search failed for "${query}":`, err);
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

/**
 * Search for tweets by query via DuckDuckGo.
 */
async function scrapeSearchViaDuckDuckGo(query: string): Promise<ScrapedTweet[]> {
  const posts: ScrapedTweet[] = [];
  const ddgQuery = `site:x.com "${query}"`;

  try {
    const results = await duckDuckGoSearch(ddgQuery);
    for (const result of results) {
      if (!result.url.includes('twitter.com') && !result.url.includes('x.com')) continue;

      // Try to extract username and tweet ID from URL
      const pathMatch = result.url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/);
      const username = pathMatch ? pathMatch[1] : 'unknown';
      const tweetId = pathMatch ? pathMatch[2] : '';

      posts.push({
        externalId: tweetId || `ddg-search-${hashString(result.url)}`,
        text: result.snippet,
        url: result.url,
        author: username,
        username,
        publishedAt: result.date || new Date().toISOString(),
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
      });
    }
  } catch {
    // Silently skip
  }

  return posts;
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

// ─── Broad search queries ────────────────────────────────────────────────────

const BROAD_SEARCH_QUERIES = [
  'site:x.com "Nepal government" OR "RSP" OR "बालेन"',
  'site:x.com "Balen Shah" Kathmandu',
  'site:x.com "Rastriya Swatantra Party"',
  'site:x.com "Nepal budget" OR "Nepal infrastructure"',
  'site:x.com "#NepalPolitics" OR "#BalenShah"',
  'site:x.com "नेपाल सरकार" OR "काठमाडौं"',
];

/**
 * Run broader DuckDuckGo searches for Nepal-related X/Twitter content.
 * These are general queries that catch content not tied to specific accounts.
 */
async function scrapeBroadSearches(): Promise<ScrapedTweet[]> {
  const posts: ScrapedTweet[] = [];

  for (const query of BROAD_SEARCH_QUERIES) {
    try {
      const results = await duckDuckGoSearch(query);
      for (const result of results) {
        if (!result.url.includes('twitter.com') && !result.url.includes('x.com')) continue;

        const pathMatch = result.url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/);
        const username = pathMatch ? pathMatch[1] : 'unknown';
        const tweetId = pathMatch ? pathMatch[2] : '';

        posts.push({
          externalId: tweetId || `ddg-broad-${hashString(result.url)}`,
          text: result.snippet,
          url: result.url,
          author: username,
          username,
          publishedAt: new Date().toISOString(),
          likes: 0,
          retweets: 0,
          replies: 0,
          quotes: 0,
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

// ─── Main export: scrape all X/Twitter accounts and queries ──────────────────

/**
 * Scrape all tracked X/Twitter accounts and search queries using the best
 * available approach (priority: Apify > Nitter > DuckDuckGo).
 *
 * If APIFY_API_TOKEN is set, uses Apify for rich data.
 * Otherwise, tries Nitter instances for free scraping.
 * Falls back to DuckDuckGo site-search as last resort.
 */
export async function scrapeX(): Promise<ScrapeResult> {
  const supabase = getSupabase();
  const useApify = !!APIFY_TOKEN;
  let tweetsFound = 0;
  let newTweets = 0;
  const errors: string[] = [];

  // Reset Nitter instance cache at start of each scrape
  workingNitterInstance = null;

  const scrapeMode = useApify
    ? 'Apify'
    : (await getWorkingNitterInstance())
      ? 'Nitter'
      : 'DuckDuckGo fallback';

  console.log(
    `[XScraper] Starting scrape of ${X_ACCOUNTS.length} accounts + ${X_QUERIES.length} queries ` +
      `(mode: ${scrapeMode})`,
  );

  // ── Scrape tracked accounts ──
  for (const account of X_ACCOUNTS) {
    try {
      let tweets: ScrapedTweet[] = [];

      if (useApify) {
        tweets = await scrapeAccountViaApify(account);
      } else {
        // Try Nitter first, fall back to DDG
        tweets = await scrapeAccountViaNitter(account);
        if (tweets.length === 0) {
          tweets = await scrapeAccountViaDuckDuckGo(account);
        }
      }

      tweetsFound += tweets.length;

      // Upsert each tweet into intelligence_signals
      for (const tweet of tweets) {
        if (!tweet.text && !tweet.url) continue;

        const totalEngagement = tweet.likes + tweet.retweets + tweet.replies + tweet.quotes;
        const relevanceBoosted = tweet.likes > 100;

        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: `x-${account.username}`,
            signal_type: 'social_post',
            external_id: tweet.externalId,
            title: (tweet.text || 'X/Twitter post').slice(0, 200),
            content: tweet.text.slice(0, 15000),
            url: tweet.url,
            author: tweet.author,
            author_official_id: account.officialId || null,
            published_at: safeISODate(tweet.publishedAt),
            matched_promise_ids: account.relatedPromiseIds,
            language: detectLanguage(tweet.text),
            media_type: tweet.videoUrl ? 'video' : 'text',
            thumbnail_url: tweet.imageUrls?.[0] || undefined,
            metadata: {
              platform: 'x',
              username: tweet.username,
              accountName: account.name,
              category: account.category,
              scrapeMethod: useApify ? 'apify' : workingNitterInstance ? 'nitter' : 'duckduckgo',
              video_url: tweet.videoUrl || undefined,
              engagement: {
                likes: tweet.likes,
                retweets: tweet.retweets,
                replies: tweet.replies,
                quotes: tweet.quotes,
              },
              total_engagement: totalEngagement,
              relevance_boosted: relevanceBoosted,
            },
          },
          { onConflict: 'source_id,external_id', ignoreDuplicates: true },
        );

        if (!error) newTweets++;
      }

      // Update or create the intelligence source record
      await supabase.from('intelligence_sources').upsert(
        {
          id: account.id,
          name: `${account.name} (X/Twitter)`,
          source_type: 'social_media' as const,
          url: `https://x.com/${account.username}`,
          config: {
            type: 'x_scraper',
            category: account.category,
            username: account.username,
            scrapeMethod: useApify ? 'apify' : workingNitterInstance ? 'nitter' : 'duckduckgo',
            maxTweets: account.maxTweets,
          },
          related_promise_ids: account.relatedPromiseIds,
          related_official_ids: account.officialId ? [account.officialId] : [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at: tweets.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      const msg = `${account.name}: ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
      console.error(`[XScraper] ${msg}`);
    }

    // Rate limit between accounts (3s)
    await new Promise((r) => setTimeout(r, 3000));
  }

  // ── Scrape search queries ──
  for (const query of X_QUERIES) {
    try {
      let tweets: ScrapedTweet[] = [];

      if (useApify) {
        tweets = await scrapeSearchViaApify(query);
      } else {
        tweets = await scrapeSearchViaNitter(query);
        if (tweets.length === 0) {
          tweets = await scrapeSearchViaDuckDuckGo(query);
        }
      }

      tweetsFound += tweets.length;

      for (const tweet of tweets) {
        if (!tweet.text && !tweet.url) continue;

        const totalEngagement = tweet.likes + tweet.retweets + tweet.replies + tweet.quotes;
        const relevanceBoosted = tweet.likes > 100;

        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: 'x-search',
            signal_type: 'social_post',
            external_id: tweet.externalId,
            title: (tweet.text || 'X/Twitter post').slice(0, 200),
            content: tweet.text.slice(0, 15000),
            url: tweet.url,
            author: tweet.author,
            published_at: safeISODate(tweet.publishedAt),
            matched_promise_ids: [],
            language: detectLanguage(tweet.text),
            media_type: tweet.videoUrl ? 'video' : 'text',
            thumbnail_url: tweet.imageUrls?.[0] || undefined,
            metadata: {
              platform: 'x',
              username: tweet.username,
              searchQuery: query,
              scrapeMethod: useApify ? 'apify' : workingNitterInstance ? 'nitter' : 'duckduckgo',
              video_url: tweet.videoUrl || undefined,
              engagement: {
                likes: tweet.likes,
                retweets: tweet.retweets,
                replies: tweet.replies,
                quotes: tweet.quotes,
              },
              total_engagement: totalEngagement,
              relevance_boosted: relevanceBoosted,
            },
          },
          { onConflict: 'source_id,external_id', ignoreDuplicates: true },
        );

        if (!error) newTweets++;
      }
    } catch (err) {
      const msg = `Search "${query}": ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
      console.error(`[XScraper] ${msg}`);
    }

    // Rate limit between queries (3s)
    await new Promise((r) => setTimeout(r, 3000));
  }

  // ── Broad searches (only when not using Apify) ──
  if (!useApify) {
    try {
      const broadTweets = await scrapeBroadSearches();
      tweetsFound += broadTweets.length;

      for (const tweet of broadTweets) {
        const totalEngagement = tweet.likes + tweet.retweets + tweet.replies + tweet.quotes;

        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: 'x-broad-search',
            signal_type: 'social_post',
            external_id: tweet.externalId,
            title: (tweet.text || 'X/Twitter post').slice(0, 200),
            content: tweet.text.slice(0, 15000),
            url: tweet.url,
            author: tweet.author,
            published_at: safeISODate(tweet.publishedAt),
            matched_promise_ids: [],
            language: detectLanguage(tweet.text),
            media_type: 'text',
            metadata: {
              platform: 'x',
              username: tweet.username,
              scrapeMethod: 'duckduckgo-broad',
              engagement: {
                likes: tweet.likes,
                retweets: tweet.retweets,
                replies: tweet.replies,
                quotes: tweet.quotes,
              },
              total_engagement: totalEngagement,
              relevance_boosted: false,
            },
          },
          { onConflict: 'source_id,external_id', ignoreDuplicates: true },
        );

        if (!error) newTweets++;
      }

      // Register the broad search source
      await supabase.from('intelligence_sources').upsert(
        {
          id: 'x-broad-search',
          name: 'X/Twitter Broad Search (Nepal Politics)',
          source_type: 'social_media' as const,
          url: 'https://x.com',
          config: {
            type: 'x_broad_search',
            scrapeMethod: 'duckduckgo',
          },
          related_promise_ids: [],
          related_official_ids: [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at: broadTweets.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      errors.push(`Broad search: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  // Register search source
  await supabase.from('intelligence_sources').upsert(
    {
      id: 'x-search',
      name: 'X/Twitter Search (Nepal Politics)',
      source_type: 'social_media' as const,
      url: 'https://x.com/search',
      config: {
        type: 'x_search',
        queries: X_QUERIES,
        scrapeMethod: useApify ? 'apify' : workingNitterInstance ? 'nitter' : 'duckduckgo',
      },
      related_promise_ids: [],
      related_official_ids: [],
      is_active: true,
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  console.log(
    `[XScraper] Complete: ${tweetsFound} tweets found, ${newTweets} new, ${errors.length} errors`,
  );

  return { tweetsFound, newTweets, errors };
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
