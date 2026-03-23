/**
 * Reddit Public JSON API Scraper
 *
 * Scrapes Nepal-related subreddits and search queries using Reddit's
 * public JSON API (no authentication required).
 *
 * Endpoints used:
 *   - /r/{subreddit}/hot.json
 *   - /r/{subreddit}/new.json
 *   - /r/{subreddit}/search.json  (subreddit-scoped search)
 *   - /search.json                (site-wide search)
 *   - /r/{subreddit}/comments/{id}.json  (top comments on high-engagement posts)
 *
 * Rate limiting:
 *   Reddit enforces ~1 request per 2 seconds for unauthenticated access.
 *   We include a polite User-Agent and sleep between requests.
 *
 * ETHICAL USAGE:
 *   - Public data only
 *   - Polite scraping with delays between requests
 *   - Data used for government accountability tracking
 */

import { getSupabase } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  created_utc: number;
  subreddit: string;
  upvote_ratio: number;
  link_flair_text?: string;
  is_self: boolean;
  thumbnail?: string;
}

interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
}

interface ScrapeResult {
  postsFound: number;
  newPosts: number;
  errors: string[];
}

// ─── Configuration ───────────────────────────────────────────────────────────

const USER_AGENT = 'NepalNajar/1.0';
const REQUEST_DELAY_MS = 2100; // >2s to respect Reddit rate limits
const HIGH_ENGAGEMENT_THRESHOLD = 100; // Fetch comments for posts with score > 100
const RELEVANCE_BOOST_THRESHOLD = 50;  // Posts with score > 50 get relevance boost

export const REDDIT_SUBREDDITS = ['Nepal', 'nepalese', 'Kathmandu', 'AskNepal'] as const;

export const REDDIT_QUERIES = [
  'Nepal government',
  'Balen Shah',
  'RSP party',
  'Nepal budget',
  'Nepal infrastructure',
  'Nepal education policy',
  'Nepal health policy',
  'Nepal corruption',
] as const;

// ─── Reddit JSON API helpers ─────────────────────────────────────────────────

/**
 * Fetch a Reddit JSON endpoint with proper User-Agent and timeout.
 */
async function redditFetch(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`[RedditScraper] HTTP ${res.status} for ${url}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`[RedditScraper] Fetch failed for ${url}:`, err);
    return null;
  }
}

/**
 * Sleep to respect Reddit rate limits.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Extract posts from a Reddit listing response.
 */
function extractPosts(data: unknown): RedditPost[] {
  if (!data || typeof data !== 'object') return [];

  const listing = data as Record<string, unknown>;
  const listingData = listing.data as Record<string, unknown> | undefined;
  if (!listingData) return [];

  const children = listingData.children as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(children)) return [];

  const posts: RedditPost[] = [];

  for (const child of children) {
    const d = child.data as Record<string, unknown> | undefined;
    if (!d) continue;

    const id = typeof d.id === 'string' ? d.id : '';
    if (!id) continue;

    posts.push({
      id,
      title: typeof d.title === 'string' ? d.title : '',
      selftext: typeof d.selftext === 'string' ? d.selftext : '',
      author: typeof d.author === 'string' ? d.author : '[deleted]',
      score: typeof d.score === 'number' ? d.score : 0,
      num_comments: typeof d.num_comments === 'number' ? d.num_comments : 0,
      url: typeof d.url === 'string' ? d.url : '',
      permalink: typeof d.permalink === 'string' ? d.permalink : '',
      created_utc: typeof d.created_utc === 'number' ? d.created_utc : 0,
      subreddit: typeof d.subreddit === 'string' ? d.subreddit : '',
      upvote_ratio: typeof d.upvote_ratio === 'number' ? d.upvote_ratio : 0,
      link_flair_text:
        typeof d.link_flair_text === 'string' ? d.link_flair_text : undefined,
      is_self: d.is_self === true,
      thumbnail: typeof d.thumbnail === 'string' ? d.thumbnail : undefined,
    });
  }

  return posts;
}

// ─── Subreddit scraping ──────────────────────────────────────────────────────

/**
 * Fetch hot and new posts from a subreddit.
 */
async function scrapeSubreddit(subreddit: string): Promise<RedditPost[]> {
  const posts: RedditPost[] = [];
  const seen = new Set<string>();

  // Fetch hot posts
  const hotData = await redditFetch(
    `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`,
  );
  for (const post of extractPosts(hotData)) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      posts.push(post);
    }
  }

  await sleep(REQUEST_DELAY_MS);

  // Fetch new posts
  const newData = await redditFetch(
    `https://www.reddit.com/r/${subreddit}/new.json?limit=50`,
  );
  for (const post of extractPosts(newData)) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      posts.push(post);
    }
  }

  return posts;
}

// ─── Search scraping ─────────────────────────────────────────────────────────

/**
 * Search within the main Nepal subreddit for specific queries.
 */
async function scrapeSubredditSearch(query: string): Promise<RedditPost[]> {
  const encodedQuery = encodeURIComponent(query);
  const data = await redditFetch(
    `https://www.reddit.com/r/Nepal/search.json?q=${encodedQuery}&restrict_sr=1&sort=new&limit=25`,
  );
  return extractPosts(data);
}

/**
 * Search site-wide for Nepal-related political content.
 */
async function scrapeSiteWideSearch(query: string): Promise<RedditPost[]> {
  const encodedQuery = encodeURIComponent(query);
  const data = await redditFetch(
    `https://www.reddit.com/search.json?q=${encodedQuery}&sort=new&limit=25`,
  );
  return extractPosts(data);
}

// ─── Comment scraping ────────────────────────────────────────────────────────

/**
 * Fetch top 5 comments on a high-engagement post.
 */
async function fetchTopComments(
  subreddit: string,
  postId: string,
): Promise<RedditComment[]> {
  const data = await redditFetch(
    `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?sort=top&limit=5`,
  );

  if (!Array.isArray(data) || data.length < 2) return [];

  // Reddit returns [post_listing, comments_listing]
  const commentsListing = data[1] as Record<string, unknown>;
  const commentsData = commentsListing?.data as Record<string, unknown> | undefined;
  const children = commentsData?.children as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(children)) return [];

  return children
    .filter((child) => child.kind === 't1') // t1 = comment
    .slice(0, 5)
    .map((child) => {
      const d = child.data as Record<string, unknown>;
      return {
        id: (d.id as string) || '',
        author: (d.author as string) || '[deleted]',
        body: (d.body as string) || '',
        score: (d.score as number) || 0,
        created_utc: (d.created_utc as number) || 0,
      };
    })
    .filter((c) => c.id && c.body);
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Scrape Reddit for Nepal-related political and governance content.
 *
 * 1. Scrapes hot + new from tracked subreddits
 * 2. Runs subreddit-scoped and site-wide searches
 * 3. Fetches top comments on high-engagement posts
 * 4. Upserts everything into intelligence_signals
 *
 * @returns { postsFound, newPosts, errors }
 */
export async function scrapeReddit(): Promise<ScrapeResult> {
  const supabase = getSupabase();
  let postsFound = 0;
  let newPosts = 0;
  const errors: string[] = [];

  // Deduplicate across all sources
  const allPosts = new Map<string, RedditPost>();

  console.log(
    `[RedditScraper] Starting scrape of ${REDDIT_SUBREDDITS.length} subreddits ` +
      `and ${REDDIT_QUERIES.length} search queries`,
  );

  // ── Phase 1: Scrape subreddits ──────────────────────────────────────────

  for (const subreddit of REDDIT_SUBREDDITS) {
    try {
      const posts = await scrapeSubreddit(subreddit);
      for (const post of posts) {
        allPosts.set(post.id, post);
      }
      console.log(`[RedditScraper] r/${subreddit}: ${posts.length} posts`);
    } catch (err) {
      const msg = `r/${subreddit}: ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
      console.error(`[RedditScraper] ${msg}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  // ── Phase 2: Subreddit-scoped searches ──────────────────────────────────

  for (const query of REDDIT_QUERIES) {
    try {
      const posts = await scrapeSubredditSearch(query);
      for (const post of posts) {
        allPosts.set(post.id, post);
      }
    } catch (err) {
      const msg = `Search "${query}": ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  // ── Phase 3: Site-wide searches ─────────────────────────────────────────

  const siteWideQueries = [
    'nepal government policy',
    'nepal balen shah mayor',
    'nepal budget infrastructure',
  ];

  for (const query of siteWideQueries) {
    try {
      const posts = await scrapeSiteWideSearch(query);
      for (const post of posts) {
        allPosts.set(post.id, post);
      }
    } catch (err) {
      const msg = `Site search "${query}": ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  postsFound = allPosts.size;
  console.log(`[RedditScraper] Total unique posts collected: ${postsFound}`);

  // ── Phase 4: Fetch comments for high-engagement posts ───────────────────

  const highEngagementPosts = [...allPosts.values()].filter(
    (p) => p.score > HIGH_ENGAGEMENT_THRESHOLD,
  );

  const commentsMap = new Map<string, RedditComment[]>();

  for (const post of highEngagementPosts) {
    try {
      const comments = await fetchTopComments(post.subreddit, post.id);
      if (comments.length > 0) {
        commentsMap.set(post.id, comments);
      }
    } catch (err) {
      console.warn(`[RedditScraper] Failed to fetch comments for ${post.id}:`, err);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(
    `[RedditScraper] Fetched comments for ${commentsMap.size}/${highEngagementPosts.length} high-engagement posts`,
  );

  // ── Phase 5: Upsert into intelligence_signals ──────────────────────────

  for (const post of allPosts.values()) {
    try {
      const fullText = [post.title, post.selftext].filter(Boolean).join('\n\n');
      if (!fullText) continue;

      const postUrl = `https://www.reddit.com${post.permalink}`;
      const topComments = commentsMap.get(post.id);
      const language = detectLanguage(fullText);
      const relevanceBoost = post.score > RELEVANCE_BOOST_THRESHOLD;

      const metadata: Record<string, unknown> = {
        platform: 'reddit',
        subreddit: post.subreddit,
        is_self_post: post.is_self,
        flair: post.link_flair_text || undefined,
        relevance_boosted: relevanceBoost,
        engagement: {
          upvotes: post.score,
          comments: post.num_comments,
          upvote_ratio: post.upvote_ratio,
        },
      };

      if (topComments && topComments.length > 0) {
        metadata.top_comments = topComments.map((c) => ({
          author: c.author,
          body: c.body.slice(0, 2000),
          score: c.score,
          created_utc: c.created_utc,
        }));
      }

      const sourceId = `reddit-r-${post.subreddit.toLowerCase()}`;

      const { error } = await supabase.from('intelligence_signals').upsert(
        {
          source_id: sourceId,
          signal_type: 'social_post',
          external_id: `reddit-${post.id}`,
          title: post.title.slice(0, 200),
          content: fullText.slice(0, 15000),
          url: postUrl,
          author: post.author,
          published_at: safeISODate(post.created_utc),
          matched_promise_ids: [],
          language,
          media_type: post.is_self ? 'text' : 'link',
          thumbnail_url: validThumbnail(post.thumbnail),
          metadata,
        },
        { onConflict: 'source_id,external_id', ignoreDuplicates: true },
      );

      if (!error) newPosts++;
    } catch (err) {
      const msg = `Upsert ${post.id}: ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
    }
  }

  // ── Phase 6: Register intelligence sources ─────────────────────────────

  for (const subreddit of REDDIT_SUBREDDITS) {
    const sourceId = `reddit-r-${subreddit.toLowerCase()}`;
    const subredditPosts = [...allPosts.values()].filter(
      (p) => p.subreddit.toLowerCase() === subreddit.toLowerCase(),
    );

    try {
      await supabase.from('intelligence_sources').upsert(
        {
          id: sourceId,
          name: `r/${subreddit} (Reddit)`,
          source_type: 'social_media' as const,
          url: `https://www.reddit.com/r/${subreddit}`,
          config: {
            type: 'reddit_subreddit_scraper',
            subreddit,
            scrapeMethod: 'public_json_api',
            queries: [...REDDIT_QUERIES],
          },
          related_promise_ids: [],
          related_official_ids: [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at:
            subredditPosts.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      console.warn(`[RedditScraper] Failed to register source ${sourceId}:`, err);
    }
  }

  console.log(
    `[RedditScraper] Complete: ${postsFound} posts found, ${newPosts} new, ${errors.length} errors`,
  );

  return { postsFound, newPosts, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectLanguage(text: string): string {
  if (!text) return 'en';
  const nepaliChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  return nepaliChars / text.length > 0.2 ? 'ne' : 'en';
}

/**
 * Convert a Unix timestamp (seconds) or ISO string to a safe ISO date.
 */
function safeISODate(input: number | string): string {
  try {
    const d = typeof input === 'number' ? new Date(input * 1000) : new Date(input);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Reddit thumbnails can be "self", "default", "nsfw", or an actual URL.
 */
function validThumbnail(thumbnail: string | undefined): string | undefined {
  if (!thumbnail) return undefined;
  if (thumbnail.startsWith('http')) return thumbnail;
  return undefined;
}
