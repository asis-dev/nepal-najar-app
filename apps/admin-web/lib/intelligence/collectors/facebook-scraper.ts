/**
 * Dedicated Facebook Public Page Scraper
 *
 * Two-tier approach for scraping public Facebook pages WITHOUT the official
 * Facebook API token:
 *
 * Approach 1 (preferred): Apify's facebook-posts-scraper actor
 *   - Rich data: full post text, reactions, shares, comments, video URLs
 *   - Requires APIFY_API_TOKEN (free tier: $5/month)
 *   - Only fetches posts from the last 3 days for efficiency
 *
 * Approach 2 (free fallback): DuckDuckGo site-specific search
 *   - Uses `site:facebook.com "query"` to find recent posts
 *   - Parses search result snippets for signal content
 *   - Less reliable, but zero cost and no API key needed
 *
 * ETHICAL USAGE:
 *   - Public figures and government pages ONLY
 *   - Public data ONLY (no private/friend-only content)
 *   - Polite scraping with delays between requests
 *   - Data used for government accountability tracking
 *
 * Environment:
 *   APIFY_API_TOKEN — optional, enables Approach 1
 */

import { getSupabase } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FacebookPageConfig {
  /** Internal source ID, e.g. 'fb-balen-shah' */
  id: string;
  /** Display name */
  name: string;
  /** Nepali name */
  nameNe: string;
  /** Facebook page URL or handle */
  pageUrl: string;
  /** Category for grouping */
  category: 'politician' | 'party' | 'government' | 'ministry' | 'news';
  /** Related promise IDs for cross-referencing */
  relatedPromiseIds: number[];
  /** Official ID in the officials table, if any */
  officialId?: number;
  /** Max posts to fetch per scrape */
  maxPosts: number;
}

interface ScrapedPost {
  externalId: string;
  text: string;
  url: string;
  publishedAt: string;
  reactions: number;
  shares: number;
  comments: number;
  postType: 'text' | 'photo' | 'video' | 'link' | 'other';
  videoUrl?: string;
  imageUrls?: string[];
}

interface ScrapeResult {
  postsFound: number;
  newPosts: number;
  errors: string[];
}

// ─── Tracked Pages ───────────────────────────────────────────────────────────

export const FACEBOOK_PAGES: FacebookPageConfig[] = [
  // --- Politicians ---
  {
    id: 'fb-balen-shah',
    name: 'Balen Shah',
    nameNe: 'बालेन शाह',
    pageUrl: 'https://www.facebook.com/baaborshahh',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 15,
  },

  // --- Parties ---
  {
    id: 'fb-rsp-official',
    name: 'Rastriya Swatantra Party',
    nameNe: 'राष्ट्रिय स्वतन्त्र पार्टी',
    pageUrl: 'https://www.facebook.com/RastriyaSwatantraParty',
    category: 'party',
    relatedPromiseIds: [],
    maxPosts: 15,
  },

  // --- Government ---
  {
    id: 'fb-gov-nepal',
    name: 'Government of Nepal',
    nameNe: 'नेपाल सरकार',
    pageUrl: 'https://www.facebook.com/governmentofnepal',
    category: 'government',
    relatedPromiseIds: [],
    maxPosts: 15,
  },

  // --- Ministries ---
  {
    id: 'fb-mofa-nepal',
    name: 'Ministry of Foreign Affairs',
    nameNe: 'परराष्ट्र मन्त्रालय',
    pageUrl: 'https://www.facebook.com/MoFANepal',
    category: 'ministry',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-mof-nepal',
    name: 'Ministry of Finance',
    nameNe: 'अर्थ मन्त्रालय',
    pageUrl: 'https://www.facebook.com/MoFNepal',
    category: 'ministry',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-moha-nepal',
    name: 'Ministry of Home Affairs',
    nameNe: 'गृह मन्त्रालय',
    pageUrl: 'https://www.facebook.com/MoHANepal',
    category: 'ministry',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-moe-nepal',
    name: 'Ministry of Education',
    nameNe: 'शिक्षा मन्त्रालय',
    pageUrl: 'https://www.facebook.com/MoESTNepal',
    category: 'ministry',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-mohp-nepal',
    name: 'Ministry of Health',
    nameNe: 'स्वास्थ्य मन्त्रालय',
    pageUrl: 'https://www.facebook.com/mohabornepal',
    category: 'ministry',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // --- News Outlets ---
  {
    id: 'fb-kantipur',
    name: 'Kantipur Daily',
    nameNe: 'कान्तिपुर',
    pageUrl: 'https://www.facebook.com/kantaboripurdaily',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-himalayan-times',
    name: 'The Himalayan Times',
    nameNe: 'द हिमालयन टाइम्स',
    pageUrl: 'https://www.facebook.com/TheHimalayanTimes',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-republica',
    name: 'Republica Daily',
    nameNe: 'रिपब्लिका',
    pageUrl: 'https://www.facebook.com/myaborrepublica',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-onlinekhabar',
    name: 'Online Khabar',
    nameNe: 'अनलाइन खबर',
    pageUrl: 'https://www.facebook.com/onlineaborboraborrkhabar',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // ── Politicians (additional) ──────────────────────────────────────────────
  {
    id: 'fb-gagan-thapa',
    name: 'Gagan Thapa',
    nameNe: 'गगन थापा',
    pageUrl: 'https://www.facebook.com/thapagk',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-harka-sampang',
    name: 'Harka Sampang',
    nameNe: 'हर्क सम्पाङ',
    pageUrl: 'https://www.facebook.com/haborkarksampang',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-kulman-ghising',
    name: 'Kulman Ghising',
    nameNe: 'कुलमान घिसिङ',
    pageUrl: 'https://www.facebook.com/kulabormanghising',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-kp-oli',
    name: 'KP Sharma Oli',
    nameNe: 'केपी शर्मा ओली',
    pageUrl: 'https://www.facebook.com/kaborpoli',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-prachanda',
    name: 'Pushpa Kamal Dahal',
    nameNe: 'पुष्पकमल दाहाल',
    pageUrl: 'https://www.facebook.com/cabormprachanda',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-sher-bahadur',
    name: 'Sher Bahadur Deuba',
    nameNe: 'शेरबहादुर देउवा',
    pageUrl: 'https://www.facebook.com/sherbaborhaduaborr',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // ── Parties (additional) ────────────────────────────────────────────────
  {
    id: 'fb-nepali-congress',
    name: 'Nepali Congress',
    nameNe: 'नेपाली काँग्रेस',
    pageUrl: 'https://www.facebook.com/nepalicongress',
    category: 'party',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-cpn-uml',
    name: 'CPN-UML',
    nameNe: 'नेकपा एमाले',
    pageUrl: 'https://www.facebook.com/cpnuml',
    category: 'party',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // ── Civic / Think Tanks ─────────────────────────────────────────────────
  {
    id: 'fb-accountability-lab',
    name: 'Accountability Lab Nepal',
    nameNe: 'एकाउन्टेबिलिटी ल्याब',
    pageUrl: 'https://www.facebook.com/accountlabnp',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-south-asia-check',
    name: 'South Asia Check',
    nameNe: 'साउथ एसिया चेक',
    pageUrl: 'https://www.facebook.com/southasiacheck',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // ── News (additional) ───────────────────────────────────────────────────
  {
    id: 'fb-pahilopost',
    name: 'PahiloPost',
    nameNe: 'पहिलो पोस्ट',
    pageUrl: 'https://www.facebook.com/pahilopost',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-naya-patrika',
    name: 'Naya Patrika',
    nameNe: 'नयाँ पत्रिका',
    pageUrl: 'https://www.facebook.com/nayapatrikadaily',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-ujyaalo',
    name: 'Ujyaalo Online',
    nameNe: 'उज्यालो अनलाइन',
    pageUrl: 'https://www.facebook.com/Ujyaalo',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-nepal-press',
    name: 'Nepal Press',
    nameNe: 'नेपाल प्रेस',
    pageUrl: 'https://www.facebook.com/nepalpressnews',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-record-nepal',
    name: 'The Record Nepal',
    nameNe: 'द रेकर्ड',
    pageUrl: 'https://www.facebook.com/recordnepal',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
  {
    id: 'fb-routine-nepal-banda',
    name: 'Routine of Nepal Banda',
    nameNe: 'रुटिन अफ नेपाल बन्द',
    pageUrl: 'https://www.facebook.com/Aboroutineofnepalbanda',
    category: 'news',
    relatedPromiseIds: [],
    maxPosts: 10,
  },

  // ── Independent / Opinion ──────────────────────────────────────────────────
  {
    id: 'fb-sasmit-pokhrel',
    name: 'Sasmit Pokhrel',
    nameNe: 'ससमित पोखरेल',
    pageUrl: 'https://www.facebook.com/sasmitpokhrel',
    category: 'politician',
    relatedPromiseIds: [],
    maxPosts: 10,
  },
];

// ─── Approach 1: Apify-based scraping ────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || '';
const APIFY_BASE = 'https://api.apify.com/v2';
const FB_POSTS_ACTOR = 'apify/facebook-posts-scraper';

/**
 * Scrape a single Facebook page using Apify actor.
 * Only fetches posts from the last 3 days for efficiency.
 */
async function scrapeViaApify(page: FacebookPageConfig): Promise<ScrapedPost[]> {
  if (!APIFY_TOKEN) return [];

  try {
    // Start the actor run
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const res = await fetch(
      `${APIFY_BASE}/acts/${FB_POSTS_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: page.pageUrl }],
          maxPosts: page.maxPosts,
          maxPostDate: threeDaysAgo.toISOString(),
          commentsMode: 'RANKED_THREADED',
          maxComments: 3,
          maxReviews: 0,
          scrapeAbout: false,
          maxRequestRetries: 3,
          maxConcurrency: 1,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.error(`[FacebookScraper/Apify] Failed to start run for ${page.name}: HTTP ${res.status} — Actor: ${FB_POSTS_ACTOR} — Response: ${errText.slice(0, 500)}`);
      return [];
    }

    const runData = await res.json();
    const runId = runData.data?.id;
    if (!runId) return [];

    // Poll for completion (max 5 minutes)
    const completed = await pollApifyRun(runId);
    if (!completed) {
      console.warn(`[FacebookScraper/Apify] Run ${runId} did not complete for ${page.name}`);
      return [];
    }

    // Fetch dataset items
    return await fetchApifyDataset(runId);
  } catch (err) {
    console.error(`[FacebookScraper/Apify] Error scraping ${page.name}:`, err);
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

async function fetchApifyDataset(runId: string): Promise<ScrapedPost[]> {
  try {
    const res = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&format=json`,
      { signal: AbortSignal.timeout(30_000) },
    );
    if (!res.ok) return [];

    const items: Record<string, unknown>[] = await res.json();

    return (items || [])
      .map((item): ScrapedPost | null => {
        const postId = (item.postId as string) || (item.id as string) || '';
        const postUrl = (item.postUrl as string) || (item.url as string) || '';
        if (!postId && !postUrl) return null;

        const postType = inferPostType(item);

        return {
          externalId: postId || postUrl,
          text: (item.text as string) || (item.postText as string) || (item.message as string) || '',
          url: postUrl,
          publishedAt:
            (item.time as string) ||
            (item.timestamp as string) ||
            (item.date as string) ||
            new Date().toISOString(),
          reactions: (item.likes as number) || (item.likesCount as number) || (item.reactionsCount as number) || 0,
          shares: (item.shares as number) || (item.sharesCount as number) || 0,
          comments: (item.comments as number) || (item.commentsCount as number) || 0,
          postType,
          videoUrl: postType === 'video' ? ((item.videoUrl as string) || undefined) : undefined,
          imageUrls: Array.isArray(item.images) ? (item.images as string[]) : undefined,
        };
      })
      .filter((p): p is ScrapedPost => p !== null);
  } catch {
    return [];
  }
}

function inferPostType(item: Record<string, unknown>): ScrapedPost['postType'] {
  if (item.videoUrl || item.type === 'video') return 'video';
  if (item.images && Array.isArray(item.images) && (item.images as unknown[]).length > 0) return 'photo';
  if (item.link || item.type === 'link') return 'link';
  return 'text';
}

// ─── Approach 2: DuckDuckGo free fallback ────────────────────────────────────

/**
 * Free fallback: use DuckDuckGo site-specific search to find recent
 * Facebook posts. Less reliable, but zero cost and no API key needed.
 */
async function scrapeViaDuckDuckGo(page: FacebookPageConfig): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  // Build search queries — page-specific and Nepali terms
  const pageHandle = page.pageUrl.split('/').pop() || page.name;
  const queries = [
    `site:facebook.com "${pageHandle}"`,
  ];

  // Add Nepali name search for non-English pages
  if (page.nameNe) {
    queries.push(`site:facebook.com "${page.nameNe}"`);
  }

  for (const query of queries) {
    try {
      const results = await duckDuckGoSearch(query);
      for (const result of results) {
        // Only include results that are actually Facebook URLs
        if (!result.url.includes('facebook.com')) continue;

        posts.push({
          externalId: `ddg-${hashString(result.url)}`,
          text: result.snippet,
          url: result.url,
          publishedAt: result.date || new Date().toISOString(),
          reactions: 0,
          shares: 0,
          comments: 0,
          postType: 'text',
        });
      }
    } catch (err) {
      console.warn(`[FacebookScraper/DDG] Search failed for "${query}":`, err);
    }

    // Rate limit between queries
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}

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
 * The lite HTML version has a simpler structure than the JS-rendered page.
 */
function parseDDGResults(html: string): DDGResult[] {
  const results: DDGResult[] = [];

  // Match result blocks: each result has a link and snippet
  // DuckDuckGo HTML lite format uses <a class="result__a"> for links
  // and <a class="result__snippet"> for snippets
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g;

  const links: { url: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    // DDG wraps URLs in a redirect — extract the actual URL
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
      date: undefined, // DDG doesn't reliably give dates in HTML results
    });
  }

  return results;
}

// ─── Broader free search queries ─────────────────────────────────────────────

/**
 * Run broader DuckDuckGo searches for Nepal political Facebook content.
 * These are general queries that catch content not tied to specific pages.
 */
async function scrapeBroadSearches(): Promise<ScrapedPost[]> {
  const broadQueries = [
    'facebook.com nepal government news 2026',
    'site:facebook.com "Nepal government" OR "RSP" OR "बालेन"',
    'facebook.com "Rastriya Swatantra Party" Nepal news',
    'facebook.com nepal politics balen shah kathmandu',
  ];

  const posts: ScrapedPost[] = [];

  for (const query of broadQueries) {
    try {
      const results = await duckDuckGoSearch(query);
      for (const result of results) {
        if (!result.url.includes('facebook.com')) continue;

        posts.push({
          externalId: `ddg-broad-${hashString(result.url)}`,
          text: result.snippet,
          url: result.url,
          publishedAt: new Date().toISOString(),
          reactions: 0,
          shares: 0,
          comments: 0,
          postType: 'text',
        });
      }
    } catch {
      // Silently skip failed broad searches
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  // Deduplicate
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}

// ─── Main export: scrape all Facebook pages ──────────────────────────────────

/**
 * Scrape all tracked Facebook pages using the best available approach.
 *
 * If APIFY_API_TOKEN is set, uses Apify for rich data.
 * Otherwise, falls back to DuckDuckGo site-search for free scraping.
 */
export async function scrapeFacebookPages(): Promise<ScrapeResult> {
  const supabase = getSupabase();
  const useApify = !!APIFY_TOKEN;
  let postsFound = 0;
  let newPosts = 0;
  const errors: string[] = [];

  console.log(
    `[FacebookScraper] Starting scrape of ${FACEBOOK_PAGES.length} pages ` +
      `(mode: ${useApify ? 'Apify' : 'DuckDuckGo fallback'})`,
  );

  for (const page of FACEBOOK_PAGES) {
    try {
      // Fetch posts using the available approach
      const posts = useApify
        ? await scrapeViaApify(page)
        : await scrapeViaDuckDuckGo(page);

      postsFound += posts.length;

      // Upsert each post into intelligence_signals
      for (const post of posts) {
        if (!post.text && !post.url) continue;

        const mediaType = post.postType === 'video' ? 'video' : 'text';
        const signalType = post.postType === 'video' ? 'video' : 'post';

        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: page.id,
            signal_type: signalType,
            external_id: post.externalId,
            title: (post.text || 'Facebook post').slice(0, 200),
            content: post.text.slice(0, 15000),
            url: post.url,
            author: page.name,
            author_official_id: page.officialId || null,
            published_at: safeISODate(post.publishedAt),
            matched_promise_ids: page.relatedPromiseIds,
            language: detectLanguage(post.text),
            media_type: mediaType,
            thumbnail_url: post.imageUrls?.[0] || undefined,
            metadata: {
              platform: 'facebook',
              pageUrl: page.pageUrl,
              pageName: page.name,
              pageNameNe: page.nameNe,
              category: page.category,
              postType: post.postType,
              scrapeMethod: useApify ? 'apify' : 'duckduckgo',
              video_url: post.videoUrl || undefined,
              engagement: {
                reactions: post.reactions,
                shares: post.shares,
                comments: post.comments,
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
          id: page.id,
          name: `${page.name} (Facebook)`,
          source_type: 'facebook_page' as const,
          url: page.pageUrl,
          config: {
            type: 'facebook_page_scraper',
            category: page.category,
            nameNe: page.nameNe,
            scrapeMethod: useApify ? 'apify' : 'duckduckgo',
            maxPosts: page.maxPosts,
          },
          related_promise_ids: page.relatedPromiseIds,
          related_official_ids: page.officialId ? [page.officialId] : [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at: posts.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      const msg = `${page.name}: ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
      console.error(`[FacebookScraper] ${msg}`);
    }

    // Rate limit between pages
    await new Promise((r) => setTimeout(r, useApify ? 5000 : 2000));
  }

  // Run broad searches if using the free fallback
  if (!useApify) {
    try {
      const broadPosts = await scrapeBroadSearches();
      postsFound += broadPosts.length;

      for (const post of broadPosts) {
        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: 'fb-broad-search',
            signal_type: post.postType === 'video' ? 'video' : 'post',
            external_id: post.externalId,
            title: (post.text || 'Facebook post').slice(0, 200),
            content: post.text.slice(0, 15000),
            url: post.url,
            author: 'Facebook (broad search)',
            published_at: safeISODate(post.publishedAt),
            matched_promise_ids: [],
            language: detectLanguage(post.text),
            media_type: 'text',
            metadata: {
              platform: 'facebook',
              scrapeMethod: 'duckduckgo-broad',
              postType: post.postType,
              engagement: {
                reactions: post.reactions,
                shares: post.shares,
                comments: post.comments,
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
          id: 'fb-broad-search',
          name: 'Facebook Broad Search (Nepal Politics)',
          source_type: 'facebook_page' as const,
          url: 'https://facebook.com',
          config: {
            type: 'facebook_broad_search',
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
    `[FacebookScraper] Complete: ${postsFound} posts found, ${newPosts} new, ${errors.length} errors`,
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
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
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
