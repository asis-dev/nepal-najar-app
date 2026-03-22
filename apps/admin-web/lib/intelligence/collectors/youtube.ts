/**
 * YouTube Intelligence Collector
 *
 * Monitors government channels, news channels, political talk shows
 * Downloads captions/transcripts for AI analysis
 * Uses YouTube Data API v3 (free 10,000 units/day)
 */

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount?: number;
  duration?: string;
}

interface YouTubeChannel {
  id: string;
  name: string;
  channelId: string;
  type: 'government' | 'news' | 'political' | 'talk_show';
  relatedPromiseIds: number[];
  relatedOfficialIds: number[];
}

// Key Nepal YouTube channels to monitor
export const YOUTUBE_CHANNELS: YouTubeChannel[] = [
  // Government
  {
    id: 'yt-gov-nepal',
    name: 'Government of Nepal',
    channelId: 'UCq6JI-0X8f5CgYKj_4J1Q8Q',
    type: 'government',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
  {
    id: 'yt-parliament',
    name: 'Nepal Parliament',
    channelId: 'UCPfU3zM5s8Y6M8bMYDfKmWA',
    type: 'government',
    relatedPromiseIds: [1, 2, 5, 29, 30],
    relatedOfficialIds: [],
  },

  // News channels
  {
    id: 'yt-kantipur-tv',
    name: 'Kantipur TV',
    channelId: 'UCSRxYHJiAX3GqG-c2VbJbHQ',
    type: 'news',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
  {
    id: 'yt-ap1-tv',
    name: 'AP1 TV',
    channelId: 'UCsKTOBPSMqoQbPYiTzTqMbQ',
    type: 'news',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
  {
    id: 'yt-himalaya-tv',
    name: 'Himalaya TV',
    channelId: 'UCMhIEwx5axkVIXVEiKJTb8A',
    type: 'news',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
  {
    id: 'yt-news24-nepal',
    name: 'News24 Nepal',
    channelId: 'UCPdYLLm_kVwMFSRiB5nh-Wg',
    type: 'news',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
  {
    id: 'yt-online-khabar',
    name: 'Online Khabar TV',
    channelId: 'UCbLVKI88BkwFm0hXhp5Z6Bg',
    type: 'news',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },

  // Talk shows / Political analysis
  {
    id: 'yt-tough-talk',
    name: 'Tough Talk',
    channelId: 'UClgqAXWBfF1p4sGKtcvs39Q',
    type: 'talk_show',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
];

// Search queries for discovering new content
export const YOUTUBE_SEARCH_QUERIES = [
  'Nepal government policy 2082',
  'RSP bacha patra',
  'बालेन सरकार',
  'Nepal parliament session',
  'Nepal budget 2082',
  'Nepal hydropower development',
  'Nepal infrastructure project',
  'Nepal education reform',
  'Nepal health insurance',
  'Nepal anti corruption',
  'Nepal constitution amendment',
  'नेपाल सरकार प्रगति',
  'प्रधानमन्त्री नेपाल',
  'Nepal press conference government',
  'RSP government formation 2026',
  'Balen Shah prime minister',
  'राष्ट्रिय स्वतन्त्र पार्टी',
  'बालेन शाह प्रधानमन्त्री',
  'Nepal budget 2083',
  'Nepal government accountability 2026',
];

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function searchYouTube(
  query: string,
  maxResults = 10,
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    order: 'date',
    relevanceLanguage: 'ne',
    regionCode: 'NP',
    publishedAfter: getDateDaysAgo(7).toISOString(), // last 7 days
    key: YOUTUBE_API_KEY,
  });

  try {
    const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items || []).map((item: any) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelTitle: item.snippet?.channelTitle || '',
      channelId: item.snippet?.channelId || '',
      publishedAt: item.snippet?.publishedAt || '',
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
    }));
  } catch {
    return [];
  }
}

export async function getChannelVideos(
  channelId: string,
  maxResults = 10,
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    type: 'video',
    maxResults: String(maxResults),
    order: 'date',
    publishedAfter: getDateDaysAgo(3).toISOString(), // last 3 days for channels
    key: YOUTUBE_API_KEY,
  });

  try {
    const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items || []).map((item: any) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelTitle: item.snippet?.channelTitle || '',
      channelId: item.snippet?.channelId || '',
      publishedAt: item.snippet?.publishedAt || '',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || '',
    }));
  } catch {
    return [];
  }
}

export async function getVideoCaptions(
  videoId: string,
): Promise<string | null> {
  // YouTube auto-generated captions can be fetched via the timedtext API
  // This doesn't require API key but may not always work
  const captionUrls = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=ne&fmt=srv3`, // Nepali
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`, // English
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=ne&kind=asr&fmt=srv3`, // Auto-generated Nepali
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3`, // Auto-generated English
  ];

  for (const url of captionUrls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (!res.ok) continue;

      const xml = await res.text();
      if (!xml || xml.length < 50) continue;

      // Extract text from XML caption format
      const textParts: string[] = [];
      const segRegex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
      let match;
      while ((match = segRegex.exec(xml)) !== null) {
        const text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .trim();
        if (text) textParts.push(text);
      }

      if (textParts.length > 0) {
        return textParts.join(' ');
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function collectAllYouTube(): Promise<{
  videosFound: number;
  newVideos: number;
  captionsExtracted: number;
  errors: string[];
}> {
  const { getSupabase } = await import('@/lib/supabase/server');
  const supabase = getSupabase();
  let videosFound = 0;
  let newVideos = 0;
  let captionsExtracted = 0;
  const errors: string[] = [];

  // 1. Check monitored channels
  for (const channel of YOUTUBE_CHANNELS) {
    if (channel.channelId.startsWith('UC_placeholder')) continue;

    try {
      const videos = await getChannelVideos(channel.channelId, 5);
      videosFound += videos.length;

      for (const video of videos) {
        const { error } = await supabase
          .from('intelligence_signals')
          .upsert(
            {
              source_id: channel.id,
              signal_type: 'video',
              external_id: video.videoId,
              title: video.title,
              content: video.description,
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              author: video.channelTitle,
              published_at: video.publishedAt,
              language: 'ne',
              media_type: 'video',
              thumbnail_url: video.thumbnailUrl,
              metadata: {
                channelId: video.channelId,
                channelTitle: video.channelTitle,
                viewCount: video.viewCount,
              },
            },
            {
              onConflict: 'source_id,external_id',
              ignoreDuplicates: true,
            },
          );

        if (!error) newVideos++;
      }

      // Update source
      await supabase.from('intelligence_sources').upsert(
        {
          id: channel.id,
          name: channel.name,
          source_type: 'youtube_channel' as const,
          url: `https://www.youtube.com/channel/${channel.channelId}`,
          config: { channelId: channel.channelId, type: channel.type },
          related_promise_ids: channel.relatedPromiseIds,
          is_active: true,
          last_checked_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      errors.push(
        `YouTube channel ${channel.name}: ${err instanceof Error ? err.message : 'error'}`,
      );
    }

    await new Promise((r) => setTimeout(r, 200)); // API rate limiting
  }

  // 2. Run search queries
  for (const query of YOUTUBE_SEARCH_QUERIES) {
    try {
      const videos = await searchYouTube(query, 5);
      videosFound += videos.length;

      for (const video of videos) {
        const sourceId = `yt-search-${query.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`;

        const { error } = await supabase
          .from('intelligence_signals')
          .upsert(
            {
              source_id: sourceId,
              signal_type: 'video',
              external_id: video.videoId,
              title: video.title,
              content: video.description,
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              author: video.channelTitle,
              published_at: video.publishedAt,
              language: 'ne',
              media_type: 'video',
              thumbnail_url: video.thumbnailUrl,
              metadata: {
                searchQuery: query,
                channelId: video.channelId,
              },
            },
            {
              onConflict: 'source_id,external_id',
              ignoreDuplicates: true,
            },
          );

        if (!error) newVideos++;
      }
    } catch (err) {
      errors.push(
        `YouTube search "${query}": ${err instanceof Error ? err.message : 'error'}`,
      );
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  // 3. Try to get captions for new videos without content
  const { data: uncaptioned } = await supabase
    .from('intelligence_signals')
    .select('id, external_id')
    .eq('signal_type', 'video')
    .eq('tier2_processed', false)
    .is('content_summary', null)
    .limit(20);

  if (uncaptioned) {
    for (const signal of uncaptioned) {
      const captions = await getVideoCaptions(signal.external_id!);
      if (captions) {
        await supabase
          .from('intelligence_signals')
          .update({ content: captions.slice(0, 10000) })
          .eq('id', signal.id);
        captionsExtracted++;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { videosFound, newVideos, captionsExtracted, errors };
}

function getDateDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
