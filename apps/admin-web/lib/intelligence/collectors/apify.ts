/**
 * Apify Collector — Facebook Profile & Video Intelligence
 *
 * Uses Apify actors to scrape public Facebook profiles of politicians
 * and government officials. Captures:
 * - All public posts (text, images, links)
 * - Video posts with auto-transcripts (what they SAID)
 * - Comments on their posts
 * - Historical archive for promise verification
 *
 * Why Apify:
 * - Handles Facebook's JS rendering
 * - Extracts video transcripts automatically
 * - Scheduled runs (cron-like)
 * - No Facebook API tokens needed
 * - Works on public profiles only
 *
 * ETHICAL USAGE:
 * - Public figures (politicians, government officials) ONLY
 * - Public profile data ONLY (no private/friend-only content)
 * - Polite scraping with delays
 * - Data used for government accountability, not harassment
 *
 * Environment:
 *   APIFY_API_TOKEN — Your Apify API token (free tier: 5 USD/month)
 */

import { getSupabase } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApifyFacebookPost {
  postId: string;
  postUrl: string;
  postText: string;
  timestamp: string; // ISO date
  likes: number;
  comments: number;
  shares: number;
  type: 'text' | 'photo' | 'video' | 'link' | 'event' | 'other';
  videoUrl?: string;
  videoTranscript?: string; // Auto-extracted from video captions
  imageUrls?: string[];
  topComments?: { author: string; text: string; timestamp: string }[];
}

interface TrackedProfile {
  id: string; // internal ID like 'fb-profile-pm'
  name: string;
  nameNe: string;
  facebookUrl: string; // e.g., 'https://www.facebook.com/SomeOfficial'
  role: string;
  officialId?: number;
  relatedPromiseIds: number[];
  scrapeFrequencyHours: number; // how often to check
  maxPostsPerScrape: number;
}

// ─── Tracked Profiles ────────────────────────────────────────────────────────
// Add the public Facebook profiles of key politicians here.
// IMPORTANT: Only public profiles of public figures.

export const TRACKED_PROFILES: TrackedProfile[] = [
  // NOTE: Replace placeholder URLs with actual public profile URLs
  // These are examples — update with real Nepal politician profiles
  {
    id: 'fb-profile-gov-nepal',
    name: 'Government of Nepal',
    nameNe: 'नेपाल सरकार',
    facebookUrl: 'https://www.facebook.com/governmentofnepal',
    role: 'Official Government Page',
    relatedPromiseIds: [],
    scrapeFrequencyHours: 12,
    maxPostsPerScrape: 20,
  },
  {
    id: 'fb-profile-parliament',
    name: 'Nepal Parliament',
    nameNe: 'नेपाल संसद',
    facebookUrl: 'https://www.facebook.com/nepalparliament',
    role: 'Parliament',
    relatedPromiseIds: [1, 2, 4, 5, 29, 30],
    scrapeFrequencyHours: 12,
    maxPostsPerScrape: 15,
  },
  // Add more profiles as needed. Example structure:
  // {
  //   id: 'fb-profile-pm',
  //   name: 'Prime Minister Name',
  //   nameNe: 'प्रधानमन्त्री नाम',
  //   facebookUrl: 'https://www.facebook.com/PMHandle',
  //   role: 'Prime Minister',
  //   officialId: 1, // matches officials table
  //   relatedPromiseIds: [1, 2, 3, 6, 33],
  //   scrapeFrequencyHours: 12,
  //   maxPostsPerScrape: 20,
  // },
];

// ─── Apify Integration ──────────────────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';
const APIFY_BASE = 'https://api.apify.com/v2';

// Apify actor for Facebook posts scraping
// "apify/facebook-posts-scraper" — well-maintained, handles public profiles
const FB_POSTS_ACTOR = 'apify/facebook-posts-scraper';

// Alternative actors you can swap in:
// "apify/facebook-scraper" — broader scraper
// "curious_coder/facebook-profile-scraper" — profile-focused

/**
 * Start an Apify actor run to scrape a Facebook profile
 */
async function startApifyRun(profile: TrackedProfile): Promise<string | null> {
  if (!APIFY_TOKEN) {
    console.warn('[Apify] No APIFY_API_TOKEN set, skipping');
    return null;
  }

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${FB_POSTS_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: profile.facebookUrl }],
          maxPosts: profile.maxPostsPerScrape,
          maxPostDate: getDateDaysAgo(7).toISOString(), // Last 7 days
          commentsMode: 'RANKED_THREADED', // Get top comments
          maxComments: 5,
          maxReviews: 0,
          scrapeAbout: false,
          // Polite scraping
          maxRequestRetries: 3,
          maxConcurrency: 1,
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.error(`[Apify] Failed to start run for ${profile.name}: ${res.status} ${errText}`);
      return null;
    }

    const data = await res.json();
    return data.data?.id || null; // Run ID
  } catch (err) {
    console.error(`[Apify] Error starting run for ${profile.name}:`, err);
    return null;
  }
}

/**
 * Wait for an Apify run to complete (polls every 10s, max 5 min)
 */
async function waitForRun(runId: string, maxWaitMs = 300_000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetch(
        `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`,
        { signal: AbortSignal.timeout(10_000) }
      );

      if (!res.ok) return false;
      const data = await res.json();
      const status = data.data?.status;

      if (status === 'SUCCEEDED') return true;
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') return false;

      // Still running — wait 10s
      await new Promise(r => setTimeout(r, 10_000));
    } catch {
      return false;
    }
  }

  return false; // Timed out
}

/**
 * Fetch results from a completed Apify run
 */
async function fetchRunResults(runId: string): Promise<ApifyFacebookPost[]> {
  try {
    const res = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&format=json`,
      { signal: AbortSignal.timeout(30_000) }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data || []).map((item: Record<string, unknown>) => ({
      postId: (item.postId as string) || (item.id as string) || '',
      postUrl: (item.postUrl as string) || (item.url as string) || '',
      postText: (item.text as string) || (item.postText as string) || (item.message as string) || '',
      timestamp: (item.time as string) || (item.timestamp as string) || (item.date as string) || new Date().toISOString(),
      likes: (item.likes as number) || (item.likesCount as number) || 0,
      comments: (item.comments as number) || (item.commentsCount as number) || 0,
      shares: (item.shares as number) || (item.sharesCount as number) || 0,
      type: inferPostType(item),
      videoUrl: (item.videoUrl as string) || undefined,
      videoTranscript: (item.videoTranscript as string) || (item.captions as string) || undefined,
      imageUrls: Array.isArray(item.images) ? item.images as string[] : undefined,
      topComments: Array.isArray(item.topComments)
        ? (item.topComments as Record<string, unknown>[]).map(c => ({
            author: (c.profileName as string) || 'Unknown',
            text: (c.text as string) || '',
            timestamp: (c.date as string) || '',
          }))
        : undefined,
    }));
  } catch {
    return [];
  }
}

function inferPostType(item: Record<string, unknown>): ApifyFacebookPost['type'] {
  if (item.videoUrl || item.type === 'video') return 'video';
  if (item.images && Array.isArray(item.images) && (item.images as unknown[]).length > 0) return 'photo';
  if (item.link || item.type === 'link') return 'link';
  return 'text';
}

// ─── Main Collector ──────────────────────────────────────────────────────────

/**
 * Scrape a single Facebook profile via Apify
 */
export async function scrapeProfile(profile: TrackedProfile): Promise<{
  postsFound: number;
  newPosts: number;
  videosWithTranscript: number;
  error?: string;
}> {
  const supabase = getSupabase();

  // Check if we should scrape (respect frequency)
  const { data: source } = await supabase
    .from('intelligence_sources')
    .select('last_checked_at')
    .eq('id', profile.id)
    .single();

  if (source?.last_checked_at) {
    const hoursSince = (Date.now() - new Date(source.last_checked_at).getTime()) / 3_600_000;
    if (hoursSince < profile.scrapeFrequencyHours) {
      return { postsFound: 0, newPosts: 0, videosWithTranscript: 0 };
    }
  }

  // Start Apify run
  const runId = await startApifyRun(profile);
  if (!runId) {
    return { postsFound: 0, newPosts: 0, videosWithTranscript: 0, error: 'Failed to start Apify run' };
  }

  // Wait for completion
  const completed = await waitForRun(runId);
  if (!completed) {
    return { postsFound: 0, newPosts: 0, videosWithTranscript: 0, error: `Apify run ${runId} did not complete` };
  }

  // Fetch results
  const posts = await fetchRunResults(runId);
  let newPosts = 0;
  let videosWithTranscript = 0;

  for (const post of posts) {
    if (!post.postId && !post.postUrl) continue;

    const externalId = post.postId || post.postUrl;

    // Build content: combine post text + video transcript
    let fullContent = post.postText || '';
    if (post.videoTranscript) {
      fullContent += `\n\n[VIDEO TRANSCRIPT]:\n${post.videoTranscript}`;
      videosWithTranscript++;
    }
    if (post.topComments && post.topComments.length > 0) {
      fullContent += `\n\n[TOP COMMENTS]:\n${post.topComments.map(c => `${c.author}: ${c.text}`).join('\n')}`;
    }

    // Determine signal type
    const signalType = post.type === 'video' ? 'speech' : 'post';

    const { error } = await supabase
      .from('intelligence_signals')
      .upsert(
        {
          source_id: profile.id,
          signal_type: signalType,
          external_id: externalId,
          title: (post.postText || 'Facebook post').slice(0, 200),
          content: fullContent.slice(0, 15000), // Keep more content for video transcripts
          url: post.postUrl || `https://facebook.com/${profile.facebookUrl.split('/').pop()}`,
          author: profile.name,
          author_official_id: profile.officialId || null,
          published_at: post.timestamp ? new Date(post.timestamp).toISOString() : null,
          matched_promise_ids: profile.relatedPromiseIds,
          language: detectLanguage(fullContent),
          media_type: post.type === 'video' ? 'video' : 'text',
          thumbnail_url: post.imageUrls?.[0] || undefined,
          metadata: {
            platform: 'facebook',
            profileUrl: profile.facebookUrl,
            officialName: profile.name,
            officialNameNe: profile.nameNe,
            role: profile.role,
            postType: post.type,
            hasVideoTranscript: !!post.videoTranscript,
            metrics: {
              likes: post.likes,
              comments: post.comments,
              shares: post.shares,
            },
            topComments: post.topComments,
          },
        },
        { onConflict: 'source_id,external_id', ignoreDuplicates: true }
      );

    if (!error) newPosts++;
  }

  // Update source tracking
  await supabase.from('intelligence_sources').upsert(
    {
      id: profile.id,
      name: `${profile.name} (Facebook)`,
      source_type: 'facebook_page' as const,
      url: profile.facebookUrl,
      config: {
        type: 'apify_profile',
        role: profile.role,
        nameNe: profile.nameNe,
        maxPosts: profile.maxPostsPerScrape,
      },
      related_promise_ids: profile.relatedPromiseIds,
      related_official_ids: profile.officialId ? [profile.officialId] : [],
      is_active: true,
      last_checked_at: new Date().toISOString(),
      last_found_at: posts.length > 0 ? new Date().toISOString() : undefined,
      total_signals: newPosts,
    },
    { onConflict: 'id' }
  );

  return { postsFound: posts.length, newPosts, videosWithTranscript };
}

/**
 * Scrape all tracked Facebook profiles
 */
export async function collectAllApify(): Promise<{
  profilesScraped: number;
  totalPosts: number;
  newPosts: number;
  videosWithTranscript: number;
  errors: string[];
}> {
  let profilesScraped = 0;
  let totalPosts = 0;
  let newPosts = 0;
  let videosWithTranscript = 0;
  const errors: string[] = [];

  if (!APIFY_TOKEN) {
    errors.push('APIFY_API_TOKEN not set — skipping Facebook profile scraping');
    return { profilesScraped, totalPosts, newPosts, videosWithTranscript, errors };
  }

  for (const profile of TRACKED_PROFILES) {
    try {
      const result = await scrapeProfile(profile);

      totalPosts += result.postsFound;
      newPosts += result.newPosts;
      videosWithTranscript += result.videosWithTranscript;
      if (result.postsFound > 0) profilesScraped++;
      if (result.error) errors.push(`${profile.name}: ${result.error}`);
    } catch (err) {
      errors.push(`${profile.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }

    // Wait between profiles (be polite, avoid rate limits)
    await new Promise(r => setTimeout(r, 5000));
  }

  return { profilesScraped, totalPosts, newPosts, videosWithTranscript, errors };
}

// ─── Promise Verification Search ─────────────────────────────────────────────

/**
 * Search archived posts for a specific promise claim
 *
 * Example usage:
 *   searchArchiveForClaim("I will build 100 hospitals by December 2025")
 *
 * Returns posts where the official made this (or similar) claim,
 * plus any follow-up posts that reference it.
 */
export async function searchArchiveForClaim(
  claimText: string,
  officialId?: number
): Promise<{
  originalClaims: Array<{ id: string; content: string; date: string; url: string; author: string }>;
  followUps: Array<{ id: string; content: string; date: string; url: string; author: string }>;
}> {
  const supabase = getSupabase();

  // Search for posts containing the claim keywords
  const keywords = claimText
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5);

  if (keywords.length === 0) {
    return { originalClaims: [], followUps: [] };
  }

  // Build text search query
  const searchPattern = keywords.join(' & ');

  let query = supabase
    .from('intelligence_signals')
    .select('id, content, published_at, url, author')
    .or(`signal_type.eq.post,signal_type.eq.speech`)
    .textSearch('content', searchPattern, { type: 'websearch' })
    .order('published_at', { ascending: true })
    .limit(20);

  if (officialId) {
    query = query.eq('author_official_id', officialId);
  }

  const { data } = await query;

  if (!data || data.length === 0) {
    return { originalClaims: [], followUps: [] };
  }

  // Split into original claims (older) and follow-ups (newer)
  const midpoint = Math.floor(data.length / 2);

  return {
    originalClaims: data.slice(0, midpoint).map(d => ({
      id: d.id,
      content: (d.content || '').slice(0, 500),
      date: d.published_at || '',
      url: d.url,
      author: d.author || '',
    })),
    followUps: data.slice(midpoint).map(d => ({
      id: d.id,
      content: (d.content || '').slice(0, 500),
      date: d.published_at || '',
      url: d.url,
      author: d.author || '',
    })),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function detectLanguage(text: string): string {
  // Simple Devanagari script detection for Nepali
  const nepaliChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.length;
  return nepaliChars / totalChars > 0.2 ? 'ne' : 'en';
}
