/**
 * YouTube Intelligence Collector
 *
 * Monitors government channels, news channels, political talk shows
 * Downloads captions/transcripts for AI analysis
 * Uses YouTube Data API v3 (free 10,000 units/day)
 *
 * Enhanced with:
 * - Groq Whisper fallback transcription for videos without captions
 * - Free fallback mode: DuckDuckGo scraping when YOUTUBE_API_KEY is absent
 * - YouTube page transcript extraction from ytInitialPlayerResponse
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
  {
    id: 'yt-nepali-comment',
    name: 'The Nepali Comment',
    channelId: 'UC_placeholder_nepali_comment',
    type: 'talk_show',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
  {
    id: 'yt-indepth-story',
    name: 'INDepth Story',
    channelId: 'UC_placeholder_indepth_story',
    type: 'talk_show',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
  {
    id: 'yt-anand-nepal',
    name: 'Anand Nepal',
    channelId: 'UC_placeholder_anand_nepal',
    type: 'talk_show',
    relatedPromiseIds: [],
    relatedOfficialIds: [],
  },
  {
    id: 'yt-inside-nepal',
    name: 'Inside Nepal',
    channelId: 'UC_placeholder_inside_nepal',
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

// DuckDuckGo search queries for free fallback mode (no API key needed)
const DUCKDUCKGO_YOUTUBE_QUERIES = [
  'site:youtube.com "Nepal government" 2026',
  'site:youtube.com "Nepal parliament" session 2026',
  'site:youtube.com "Balen Shah" prime minister',
  'site:youtube.com "RSP" Nepal government',
  'site:youtube.com Nepal budget 2083',
  'site:youtube.com Nepal press conference government 2026',
  'site:youtube.com "The Nepali Comment" Nepal',
  'site:youtube.com "INDepth Story" Nepal',
  'site:youtube.com "Anand Nepal" politics',
  'site:youtube.com "Inside Nepal" politics',
];

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/** Max videos to attempt Groq Whisper transcription per sweep (free tier limits) */
const GROQ_WHISPER_BATCH_LIMIT = 5;

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

// ---------------------------------------------------------------------------
// Free fallback: scrape YouTube video IDs from DuckDuckGo
// ---------------------------------------------------------------------------

/**
 * Search DuckDuckGo for YouTube video URLs. No API key required.
 * Returns an array of partial YouTubeVideo objects (videoId + title).
 */
export async function searchYouTubeViaDuckDuckGo(
  query: string,
  maxResults = 5,
): Promise<YouTubeVideo[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; NepalProgressBot/1.0; +https://nepalprogress.com)',
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) return [];

    const html = await res.text();
    const videos: YouTubeVideo[] = [];

    // Extract YouTube video links from DuckDuckGo HTML results
    // Links come as redirects through duckduckgo.com/l/?uddg=...
    // or directly as youtube.com/watch?v= links
    const videoIdRegex =
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g;
    const seen = new Set<string>();
    let vidMatch;

    while (
      (vidMatch = videoIdRegex.exec(html)) !== null &&
      videos.length < maxResults
    ) {
      const videoId = vidMatch[1];
      if (seen.has(videoId)) continue;
      seen.add(videoId);

      // Try to extract the title near this link
      const linkIdx = html.indexOf(vidMatch[0]);
      const surroundingChunk = html.slice(
        Math.max(0, linkIdx - 500),
        linkIdx + 500,
      );
      const titleMatch = surroundingChunk.match(
        /class="result__a"[^>]*>([^<]+)</,
      );
      const snippetMatch = surroundingChunk.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\//,
      );

      videos.push({
        videoId,
        title: titleMatch
          ? decodeHtmlEntities(titleMatch[1]).trim()
          : '',
        description: snippetMatch
          ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, '')).trim()
          : '',
        channelTitle: '',
        channelId: '',
        publishedAt: '',
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }

    return videos;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// YouTube page transcript extraction (from ytInitialPlayerResponse)
// ---------------------------------------------------------------------------

/**
 * Fetch the YouTube watch page and extract transcript data from the embedded
 * player config (ytInitialPlayerResponse / ytInitialData).
 *
 * This works for videos that have auto-generated or manual captions embedded
 * in the page data, even when the timedtext API doesn't return them.
 */
export async function extractTranscriptFromPage(
  videoId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,ne;q=0.8',
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) return null;

    const html = await res.text();

    // Try to find caption track URLs from ytInitialPlayerResponse
    const playerResponseMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});\s*(?:var|<\/script>)/,
    );
    if (!playerResponseMatch) return null;

    let playerResponse;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch {
      return null;
    }

    // Extract caption tracks
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks;
    if (!captionTracks || !Array.isArray(captionTracks)) return null;

    // Prefer Nepali, then English, then any available
    const preferred = captionTracks.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => t.languageCode === 'ne',
    ) ||
      captionTracks.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (t: any) => t.languageCode === 'en',
      ) ||
      captionTracks[0];

    if (!preferred?.baseUrl) return null;

    // Fetch the caption track
    const captionRes = await fetch(preferred.baseUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!captionRes.ok) return null;

    const xml = await captionRes.text();
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

    return textParts.length > 0 ? textParts.join(' ') : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Groq Whisper transcription fallback
// ---------------------------------------------------------------------------

/**
 * Extract an audio stream URL from the YouTube watch page.
 * Looks for adaptive audio formats in ytInitialPlayerResponse.
 */
export async function extractAudioStreamUrl(
  videoId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) return null;

    const html = await res.text();

    const playerResponseMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});\s*(?:var|<\/script>)/,
    );
    if (!playerResponseMatch) return null;

    let playerResponse;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch {
      return null;
    }

    // Look for adaptive audio formats
    const adaptiveFormats =
      playerResponse?.streamingData?.adaptiveFormats;
    if (!Array.isArray(adaptiveFormats)) return null;

    // Prefer audio-only formats (mimeType starts with "audio/")
    const audioFormats = adaptiveFormats.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) =>
        typeof f.mimeType === 'string' &&
        f.mimeType.startsWith('audio/') &&
        f.url,
    );

    if (audioFormats.length === 0) return null;

    // Pick the lowest bitrate audio to minimize download size
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audioFormats.sort((a: any, b: any) => (a.bitrate || 0) - (b.bitrate || 0));
    return audioFormats[0].url;
  } catch {
    return null;
  }
}

/**
 * Transcribe a YouTube video using Groq Whisper API.
 *
 * Flow:
 *   1. Extract audio stream URL from the YouTube watch page
 *   2. Download the audio (first ~25MB to stay within Groq limits)
 *   3. Send to Groq Whisper for transcription
 *
 * Returns the transcript text or null on failure.
 */
export async function transcribeWithGroqWhisper(
  videoId: string,
): Promise<string | null> {
  if (!GROQ_API_KEY) return null;

  try {
    // Step 1: Get audio stream URL
    const audioUrl = await extractAudioStreamUrl(videoId);
    if (!audioUrl) {
      console.log(
        `[YouTube/Groq] No audio stream found for ${videoId}`,
      );
      return null;
    }

    // Step 2: Download audio (limit to ~24MB for Groq free tier)
    const audioRes = await fetch(audioUrl, {
      headers: {
        Range: 'bytes=0-25165824', // ~24MB
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(60_000), // 60s for large downloads
    });

    if (!audioRes.ok && audioRes.status !== 206) {
      console.log(
        `[YouTube/Groq] Failed to download audio for ${videoId}: ${audioRes.status}`,
      );
      return null;
    }

    const audioBuffer = await audioRes.arrayBuffer();
    if (audioBuffer.byteLength < 1000) {
      console.log(
        `[YouTube/Groq] Audio too small for ${videoId}: ${audioBuffer.byteLength} bytes`,
      );
      return null;
    }

    // Step 3: Send to Groq Whisper
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], {
      type: 'audio/webm',
    });
    formData.append('file', audioBlob, `${videoId}.webm`);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'ne'); // Hint: Nepali
    formData.append('response_format', 'text');

    const groqRes = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
        signal: AbortSignal.timeout(120_000), // 2 min for transcription
      },
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => 'unknown');
      console.log(
        `[YouTube/Groq] Groq API error for ${videoId}: ${groqRes.status} — ${errText.slice(0, 200)}`,
      );
      return null;
    }

    const transcript = await groqRes.text();
    if (!transcript || transcript.trim().length < 20) return null;

    console.log(
      `[YouTube/Groq] Transcribed ${videoId}: ${transcript.length} chars`,
    );
    return transcript.trim();
  } catch (err) {
    console.log(
      `[YouTube/Groq] Error transcribing ${videoId}: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

export async function collectAllYouTube(): Promise<{
  videosFound: number;
  newVideos: number;
  captionsExtracted: number;
  groqTranscriptions: number;
  errors: string[];
}> {
  const { getSupabase } = await import('@/lib/supabase/server');
  const supabase = getSupabase();
  let videosFound = 0;
  let newVideos = 0;
  let captionsExtracted = 0;
  let groqTranscriptions = 0;
  const errors: string[] = [];

  const hasApiKey = !!YOUTUBE_API_KEY;

  // -----------------------------------------------------------------------
  // 1. Check monitored channels (requires API key)
  // -----------------------------------------------------------------------
  if (hasApiKey) {
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

    // -----------------------------------------------------------------------
    // 2. Run search queries (requires API key)
    // -----------------------------------------------------------------------
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
  }

  // -----------------------------------------------------------------------
  // 2b. Free fallback: DuckDuckGo YouTube search (no API key needed)
  // -----------------------------------------------------------------------
  if (!hasApiKey) {
    console.log(
      '[YouTube] No YOUTUBE_API_KEY — using DuckDuckGo free fallback',
    );

    for (const query of DUCKDUCKGO_YOUTUBE_QUERIES) {
      try {
        const videos = await searchYouTubeViaDuckDuckGo(query, 5);
        videosFound += videos.length;

        for (const video of videos) {
          if (!video.videoId) continue;

          const sourceId = `yt-ddg-${query.slice(0, 30).replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase()}`;

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
                author: video.channelTitle || 'Unknown',
                published_at: video.publishedAt || new Date().toISOString(),
                language: 'ne',
                media_type: 'video',
                thumbnail_url: video.thumbnailUrl,
                metadata: {
                  searchQuery: query,
                  discoveryMethod: 'duckduckgo_fallback',
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
          `DuckDuckGo YouTube "${query}": ${err instanceof Error ? err.message : 'error'}`,
        );
      }

      await new Promise((r) => setTimeout(r, 1000)); // be polite to DDG
    }
  }

  // -----------------------------------------------------------------------
  // 3. Try to get captions for videos without content (timedtext API)
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // 3b. Try page-embedded transcript extraction for remaining uncaptioned
  // -----------------------------------------------------------------------
  const { data: stillUncaptioned } = await supabase
    .from('intelligence_signals')
    .select('id, external_id, content')
    .eq('signal_type', 'video')
    .eq('tier2_processed', false)
    .is('content_summary', null)
    .limit(10);

  if (stillUncaptioned) {
    // Filter to only videos whose content is still just the short description
    const needsTranscript = stillUncaptioned.filter(
      (s) => !s.content || s.content.length < 200,
    );

    for (const signal of needsTranscript) {
      const transcript = await extractTranscriptFromPage(
        signal.external_id!,
      );
      if (transcript) {
        await supabase
          .from('intelligence_signals')
          .update({ content: transcript.slice(0, 10000) })
          .eq('id', signal.id);
        captionsExtracted++;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // -----------------------------------------------------------------------
  // 4. Groq Whisper fallback transcription for videos still without content
  // -----------------------------------------------------------------------
  if (GROQ_API_KEY) {
    const { data: noContent } = await supabase
      .from('intelligence_signals')
      .select('id, external_id, content')
      .eq('signal_type', 'video')
      .eq('tier2_processed', false)
      .is('content_summary', null)
      .limit(GROQ_WHISPER_BATCH_LIMIT);

    if (noContent) {
      // Only attempt for videos that still have no meaningful content
      const needsWhisper = noContent.filter(
        (s) => !s.content || s.content.length < 200,
      );

      console.log(
        `[YouTube/Groq] Attempting Whisper transcription for ${needsWhisper.length} videos`,
      );

      for (const signal of needsWhisper) {
        try {
          const transcript = await transcribeWithGroqWhisper(
            signal.external_id!,
          );
          if (transcript) {
            await supabase
              .from('intelligence_signals')
              .update({
                content: transcript.slice(0, 10000),
                tier2_processed: true,
                metadata: {
                  transcription_source: 'groq_whisper',
                  transcribed_at: new Date().toISOString(),
                },
              })
              .eq('id', signal.id);
            groqTranscriptions++;
          } else {
            // Mark as tier2_processed so we don't retry on next sweep
            await supabase
              .from('intelligence_signals')
              .update({
                tier2_processed: true,
                metadata: {
                  transcription_attempted: true,
                  transcription_failed: true,
                  attempted_at: new Date().toISOString(),
                },
              })
              .eq('id', signal.id);
          }
        } catch (err) {
          errors.push(
            `Groq Whisper ${signal.external_id}: ${err instanceof Error ? err.message : 'error'}`,
          );
        }

        // Rate limit between Groq requests
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  return {
    videosFound,
    newVideos,
    captionsExtracted,
    groqTranscriptions,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}
