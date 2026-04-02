/**
 * Social Media Intelligence Collector
 *
 * Monitors government officials' social media accounts
 * Tracks hashtags, mentions, policy announcements
 */

interface SocialPost {
  platform: 'twitter' | 'facebook';
  postId: string;
  author: string;
  authorHandle: string;
  content: string;
  url: string;
  publishedAt: string;
  metrics?: { likes?: number; shares?: number; comments?: number };
  media?: string[];
}

interface TrackedAccount {
  id: string;
  platform: 'twitter' | 'facebook';
  handle: string;
  name: string;
  officialId?: number;
  relatedPromiseIds: number[];
}

// Key accounts to monitor
// NOTE: Nepal banned major social media platforms (including X/Twitter) in
// September 2025. Government X presence is minimal as a result. The accounts
// below are the few verified handles that existed pre-ban.
export const TRACKED_ACCOUNTS: TrackedAccount[] = [
  // Twitter/X accounts (verified)
  {
    id: 'tw-pm-nepal',
    platform: 'twitter',
    handle: 'PM_Nepal',
    name: 'PM Office Nepal',
    relatedPromiseIds: [1, 2, 3, 6, 33],
  },
  {
    id: 'tw-nepal-government',
    platform: 'twitter',
    handle: 'nepalgovernment',
    name: 'Nepal Government',
    relatedPromiseIds: [],
  },
  {
    id: 'tw-dot-nepal',
    platform: 'twitter',
    handle: 'hello_dotnpl',
    name: 'Department of Tourism Nepal',
    relatedPromiseIds: [],
  },

  // Facebook pages (using public page data)
  {
    id: 'fb-gov-nepal',
    platform: 'facebook',
    handle: 'governmentofnepal',
    name: 'Government of Nepal',
    relatedPromiseIds: [],
  },
  {
    id: 'fb-parliament',
    platform: 'facebook',
    handle: 'nepalparliament',
    name: 'Nepal Parliament',
    relatedPromiseIds: [1, 2, 5, 29, 30],
  },
];

// Hashtags to monitor
export const TRACKED_HASHTAGS = [
  '#NepalGov',
  '#Nepal2082',
  '#BachaPatr',
  '#RSP',
  '#NepalBudget',
  '#NepalDevelopment',
  '#NepalProgress',
  '#नेपालसरकार',
  '#बाचापत्र',
  '#विकास',
];

/**
 * Twitter/X API collector
 * Uses Twitter API v2 (free tier: 1 app, read-only, limited)
 * For more, consider Nitter instances or social media monitoring APIs
 */
async function collectTwitter(
  account: TrackedAccount,
): Promise<SocialPost[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) return [];

  try {
    // Get recent tweets from user
    // Note: Free tier is very limited (1500 tweets/month read)
    const params = new URLSearchParams({
      max_results: '10',
      'tweet.fields': 'created_at,public_metrics,text',
      'user.fields': 'name,username',
    });

    // First get user ID from username
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${account.handle}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!userRes.ok) return [];
    const userData = await userRes.json();
    const userId = userData.data?.id;
    if (!userId) return [];

    // Get recent tweets
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?${params}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!tweetsRes.ok) return [];
    const tweetsData = await tweetsRes.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tweetsData.data || []).map((tweet: any) => ({
      platform: 'twitter' as const,
      postId: tweet.id,
      author: account.name,
      authorHandle: account.handle,
      content: tweet.text || '',
      url: `https://twitter.com/${account.handle}/status/${tweet.id}`,
      publishedAt: tweet.created_at || new Date().toISOString(),
      metrics: tweet.public_metrics
        ? {
            likes: tweet.public_metrics.like_count,
            shares: tweet.public_metrics.retweet_count,
            comments: tweet.public_metrics.reply_count,
          }
        : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Facebook public page collector
 * Uses Facebook Graph API (requires page token or app token)
 * Falls back to scraping public page if no API access
 */
async function collectFacebook(
  account: TrackedAccount,
): Promise<SocialPost[]> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    // Fallback: scrape public page (limited but works)
    return collectFacebookPublic(account);
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${account.handle}/posts?fields=message,created_time,permalink_url,shares&limit=10&access_token=${accessToken}`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!res.ok) return [];
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data || []).map((post: any) => ({
      platform: 'facebook' as const,
      postId: post.id,
      author: account.name,
      authorHandle: account.handle,
      content: post.message || '',
      url:
        post.permalink_url ||
        `https://facebook.com/${account.handle}`,
      publishedAt: post.created_time || new Date().toISOString(),
      metrics: {
        shares: post.shares?.count || 0,
      },
    }));
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function collectFacebookPublic(
  _account: TrackedAccount,
): Promise<SocialPost[]> {
  // Basic public page scraping as fallback
  // This is fragile but better than nothing
  // Facebook public pages are heavily JavaScript-rendered
  // This won't get much data, but it's a placeholder
  return [];
}

export async function collectAllSocial(): Promise<{
  postsFound: number;
  newPosts: number;
  errors: string[];
}> {
  const { getSupabase } = await import('@/lib/supabase/server');
  const supabase = getSupabase();
  let postsFound = 0;
  let newPosts = 0;
  const errors: string[] = [];

  for (const account of TRACKED_ACCOUNTS) {
    try {
      let posts: SocialPost[] = [];

      if (account.platform === 'twitter') {
        posts = await collectTwitter(account);
      } else if (account.platform === 'facebook') {
        posts = await collectFacebook(account);
      }

      postsFound += posts.length;

      for (const post of posts) {
        const { data, error } = await supabase
          .from('intelligence_signals')
          .upsert(
            {
              source_id: account.id,
              signal_type:
                post.platform === 'twitter' ? 'tweet' : 'post',
              external_id: post.postId,
              title: post.content.slice(0, 200),
              content: post.content,
              url: post.url,
              author: post.author,
              author_official_id: account.officialId || null,
              published_at: post.publishedAt,
              matched_promise_ids: account.relatedPromiseIds,
              language: /[\u0900-\u097F]/.test(post.content)
                ? 'ne'
                : 'en',
              media_type: 'text',
              metadata: {
                platform: post.platform,
                handle: post.authorHandle,
                metrics: post.metrics,
              },
            },
            {
              onConflict: 'source_id,external_id',
              ignoreDuplicates: true,
            },
          )
          .select('id');

        if (!error && Array.isArray(data) && data.length > 0) {
          newPosts++;
        }
      }

      // Update source
      await supabase.from('intelligence_sources').upsert(
        {
          id: account.id,
          name: account.name,
          source_type:
            account.platform === 'twitter'
              ? ('twitter_account' as const)
              : ('facebook_page' as const),
          url:
            account.platform === 'twitter'
              ? `https://twitter.com/${account.handle}`
              : `https://facebook.com/${account.handle}`,
          config: {
            handle: account.handle,
            platform: account.platform,
          },
          related_promise_ids: account.relatedPromiseIds,
          related_official_ids: account.officialId
            ? [account.officialId]
            : [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      errors.push(
        `${account.platform}/${account.handle}: ${err instanceof Error ? err.message : 'error'}`,
      );
    }

    await new Promise((r) => setTimeout(r, 1000)); // Rate limit
  }

  return { postsFound, newPosts, errors };
}
