/**
 * Politician Research Scraper
 *
 * Deep-dives into a politician's YouTube presence to find speeches,
 * interviews, and public appearances. Transcribes them and extracts
 * commitments using AI analysis.
 *
 * Pipeline:
 *   1. YouTube deep search (API + DuckDuckGo fallback)
 *   2. Transcript extraction (captions -> page scrape -> Groq Whisper)
 *   3. AI commitment extraction via aiComplete('extract', ...)
 *   4. Store results in intelligence_signals
 */

import { aiComplete } from '@/lib/intelligence/ai-router';
import { extractEntities } from '@/lib/intelligence/entity-extractor';
import {
  searchYouTube,
  getChannelVideos,
  getVideoCaptions,
  extractTranscriptFromPage,
  transcribeWithGroqWhisper,
  searchYouTubeViaDuckDuckGo,
  YOUTUBE_CHANNELS,
} from '@/lib/intelligence/collectors/youtube';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PoliticianProfile {
  id: string;
  name: string;
  nameNe?: string;
  party?: string;
  expectedRole?: string;
  youtubeChannels?: string[];
  facebookPages?: string[];
  twitterHandles?: string[];
  websites?: string[];
  threadsHandles?: string[];
}

export interface SpeechExtraction {
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  channelName: string;
  publishedAt: string;
  duration?: number;
  transcript: string;
  language: 'en' | 'ne' | 'mixed';
  commitments: {
    text: string;
    category: string;
    confidence: number;
    timestamp?: string;
    matchesExisting?: number;
  }[];
  keyStatements: string[];
  entities: {
    people: string[];
    amounts: string[];
    dates: string[];
    locations: string[];
  };
}

export interface ResearchResult {
  politician: PoliticianProfile;
  videosFound: number;
  videosTranscribed: number;
  commitmentsExtracted: number;
  newCommitments: number;
  matchedExisting: number;
  speeches: SpeechExtraction[];
  errors: string[];
}

export interface ResearchOptions {
  /** Max videos to process per politician (default: 100) */
  maxVideos?: number;
  /** Max videos to send to Groq Whisper transcription (default: 10) */
  maxWhisperTranscriptions?: number;
  /** Only fetch videos published after this date (default: 2 years ago) */
  publishedAfter?: Date;
  /** Delay between YouTube fetches in ms (default: 2000) */
  fetchDelayMs?: number;
  /** Existing commitment titles for matching (default: []) */
  existingCommitments?: { id: number; title: string }[];
  /** Skip storing results to DB (dry run) */
  dryRun?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

/** Major Nepal news channel IDs to search on */
const NEWS_CHANNEL_IDS: { name: string; channelId: string }[] = [
  { name: 'Kantipur TV', channelId: 'UCSRxYHJiAX3GqG-c2VbJbHQ' },
  { name: 'News24 Nepal', channelId: 'UCPdYLLm_kVwMFSRiB5nh-Wg' },
  { name: 'Tough Talk', channelId: 'UClgqAXWBfF1p4sGKtcvs39Q' },
  { name: 'AP1 TV', channelId: 'UCsKTOBPSMqoQbPYiTzTqMbQ' },
];

// Also pull from YOUTUBE_CHANNELS that have the 'talk_show' type and a real channel ID
const TALK_SHOW_CHANNELS = YOUTUBE_CHANNELS.filter(
  (ch) => ch.type === 'talk_show' && !ch.channelId.startsWith('UC_placeholder'),
);

const COMMITMENT_CATEGORIES = [
  'infrastructure',
  'health',
  'education',
  'governance',
  'economy',
  'anti-corruption',
  'environment',
  'technology',
  'social',
  'foreign-policy',
  'agriculture',
  'energy',
];

// ── Video Discovery ──────────────────────────────────────────────────────────

interface VideoCandidate {
  videoId: string;
  title: string;
  channelName: string;
  publishedAt: string;
  source: string;
}

/**
 * Build search queries for a given politician.
 */
function buildSearchQueries(profile: PoliticianProfile): string[] {
  const queries: string[] = [];
  const name = profile.name;

  queries.push(`"${name}" speech Nepal`);
  queries.push(`"${name}" interview`);
  queries.push(`"${name}" rally campaign`);
  queries.push(`"${name}" parliament`);
  queries.push(`"${name}" press conference`);

  if (profile.nameNe) {
    queries.push(`"${profile.nameNe}"`);
  }

  if (profile.party) {
    queries.push(`"${name}" ${profile.party}`);
  }

  return queries;
}

/**
 * Build DuckDuckGo queries for free fallback YouTube search.
 */
function buildDuckDuckGoQueries(profile: PoliticianProfile): string[] {
  const queries: string[] = [];
  const name = profile.name;

  queries.push(`site:youtube.com "${name}" speech Nepal`);
  queries.push(`site:youtube.com "${name}" interview`);
  queries.push(`site:youtube.com "${name}" press conference`);

  if (profile.nameNe) {
    queries.push(`site:youtube.com "${profile.nameNe}"`);
  }

  if (profile.party) {
    queries.push(`site:youtube.com "${name}" ${profile.party}`);
  }

  return queries;
}

/**
 * Search YouTube for all videos related to a politician.
 * Uses YouTube Data API if available, DuckDuckGo fallback otherwise.
 */
async function discoverVideos(
  profile: PoliticianProfile,
  options: ResearchOptions,
): Promise<VideoCandidate[]> {
  const maxVideos = options.maxVideos ?? 100;
  const publishedAfter = options.publishedAfter ?? getTwoYearsAgo();
  const delayMs = options.fetchDelayMs ?? 2000;
  const seen = new Set<string>();
  const candidates: VideoCandidate[] = [];

  const addCandidate = (v: VideoCandidate) => {
    if (seen.has(v.videoId) || !v.videoId) return;
    // Filter by date if publishedAt is available
    if (v.publishedAt) {
      try {
        const pubDate = new Date(v.publishedAt);
        if (pubDate < publishedAfter) return;
      } catch {
        // Keep it if date parsing fails
      }
    }
    seen.add(v.videoId);
    candidates.push(v);
  };

  const hasApiKey = !!YOUTUBE_API_KEY;

  // --- YouTube Data API searches ---
  if (hasApiKey) {
    const queries = buildSearchQueries(profile);

    for (const query of queries) {
      if (candidates.length >= maxVideos) break;

      try {
        const videos = await searchYouTubeResearch(query, 15, publishedAfter);
        for (const v of videos) {
          addCandidate({
            videoId: v.videoId,
            title: v.title,
            channelName: v.channelTitle,
            publishedAt: v.publishedAt,
            source: `api-search: ${query}`,
          });
        }
      } catch {
        // Skip failed queries
      }

      await delay(delayMs);
    }

    // Search on politician's own channels
    if (profile.youtubeChannels) {
      for (const channelId of profile.youtubeChannels) {
        if (!channelId || candidates.length >= maxVideos) continue;

        try {
          const videos = await getChannelVideos(channelId, 20);
          for (const v of videos) {
            addCandidate({
              videoId: v.videoId,
              title: v.title,
              channelName: v.channelTitle,
              publishedAt: v.publishedAt,
              source: `channel: ${channelId}`,
            });
          }
        } catch {
          // Skip
        }

        await delay(delayMs);
      }
    }

    // Search on major news channels for this politician
    const channelsToSearch = [
      ...NEWS_CHANNEL_IDS,
      ...TALK_SHOW_CHANNELS.map((ch) => ({
        name: ch.name,
        channelId: ch.channelId,
      })),
    ];

    for (const channel of channelsToSearch) {
      if (candidates.length >= maxVideos) break;

      try {
        const videos = await searchYouTubeOnChannel(
          channel.channelId,
          profile.name,
          10,
          publishedAfter,
        );
        for (const v of videos) {
          addCandidate({
            videoId: v.videoId,
            title: v.title,
            channelName: v.channelTitle || channel.name,
            publishedAt: v.publishedAt,
            source: `channel-search: ${channel.name}`,
          });
        }
      } catch {
        // Skip
      }

      await delay(delayMs);
    }
  }

  // --- DuckDuckGo fallback (always runs to supplement) ---
  const ddgQueries = buildDuckDuckGoQueries(profile);

  for (const query of ddgQueries) {
    if (candidates.length >= maxVideos) break;

    try {
      const videos = await searchYouTubeViaDuckDuckGo(query, 10);
      for (const v of videos) {
        addCandidate({
          videoId: v.videoId,
          title: v.title,
          channelName: v.channelTitle || '',
          publishedAt: v.publishedAt || '',
          source: `ddg: ${query}`,
        });
      }
    } catch {
      // Skip
    }

    await delay(delayMs);
  }

  console.log(
    `[Researcher] Discovered ${candidates.length} videos for ${profile.name}`,
  );

  return candidates.slice(0, maxVideos);
}

// ── Transcript Extraction ────────────────────────────────────────────────────

/**
 * Extract transcript for a video using a tiered approach:
 *   1. YouTube captions API (free, instant)
 *   2. YouTube page transcript extraction
 *   3. Groq Whisper transcription (rate limited)
 */
async function getTranscript(
  videoId: string,
  allowWhisper: boolean,
): Promise<{ transcript: string; method: string } | null> {
  // Tier 1: YouTube captions API
  try {
    const captions = await getVideoCaptions(videoId);
    if (captions && captions.length > 50) {
      return { transcript: captions, method: 'captions' };
    }
  } catch {
    // Continue to next tier
  }

  // Tier 2: Page-embedded transcript
  try {
    const pageTranscript = await extractTranscriptFromPage(videoId);
    if (pageTranscript && pageTranscript.length > 50) {
      return { transcript: pageTranscript, method: 'page' };
    }
  } catch {
    // Continue to next tier
  }

  // Tier 3: Groq Whisper (only if allowed — rate limited)
  if (allowWhisper) {
    try {
      const whisperTranscript = await transcribeWithGroqWhisper(videoId);
      if (whisperTranscript && whisperTranscript.length > 50) {
        return { transcript: whisperTranscript, method: 'whisper' };
      }
    } catch {
      // Transcription failed
    }
  }

  return null;
}

// ── Commitment Extraction ────────────────────────────────────────────────────

interface ExtractedCommitment {
  text: string;
  category: string;
  confidence: number;
  timestamp?: string;
  matchesExisting?: number;
}

/**
 * Extract commitments from a transcript using AI.
 */
async function extractCommitments(
  transcript: string,
  profile: PoliticianProfile,
  existingCommitments: { id: number; title: string }[],
): Promise<{
  commitments: ExtractedCommitment[];
  keyStatements: string[];
}> {
  // Truncate very long transcripts to stay within token limits
  const truncatedTranscript = transcript.slice(0, 15000);

  const existingList =
    existingCommitments.length > 0
      ? existingCommitments
          .map((c) => `[${c.id}] ${c.title}`)
          .join('\n')
      : 'No existing commitments to match against.';

  const systemPrompt = `You are analyzing a political speech/interview transcript from Nepal.
Speaker: ${profile.name} (${profile.party || 'Unknown party'})

Extract ALL commitments, promises, pledges, or policy announcements made.

For each commitment found:
- Quote or paraphrase the exact words
- Categorize: ${COMMITMENT_CATEGORIES.join(', ')}
- Rate confidence (0-1): 1.0 = explicit "we will do X", 0.5 = implied/vague
- Note the approximate timestamp if detectable from context

Also check if any commitment matches these existing tracked commitments:
${existingList}

Also extract 3-5 key non-commitment statements that are noteworthy.

Return valid JSON in this exact format:
{
  "commitments": [
    {
      "text": "exact quote or paraphrase",
      "category": "infrastructure",
      "confidence": 0.9,
      "timestamp": "5:30",
      "matchesExisting": null
    }
  ],
  "keyStatements": ["statement 1", "statement 2"]
}

If no commitments found, return: { "commitments": [], "keyStatements": [] }`;

  try {
    const response = await aiComplete('extract', systemPrompt, truncatedTranscript);

    // Parse the AI response as JSON
    const content = response.content.trim();

    // Try to extract JSON from the response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { commitments: [], keyStatements: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      commitments?: ExtractedCommitment[];
      keyStatements?: string[];
    };

    return {
      commitments: Array.isArray(parsed.commitments)
        ? parsed.commitments.map((c) => ({
            text: String(c.text || ''),
            category: String(c.category || 'governance'),
            confidence: Number(c.confidence) || 0.5,
            timestamp: c.timestamp ? String(c.timestamp) : undefined,
            matchesExisting:
              c.matchesExisting != null ? Number(c.matchesExisting) : undefined,
          }))
        : [],
      keyStatements: Array.isArray(parsed.keyStatements)
        ? parsed.keyStatements.map(String)
        : [],
    };
  } catch (err) {
    console.warn(
      `[Researcher] AI extraction failed for ${profile.name}: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    return { commitments: [], keyStatements: [] };
  }
}

// ── Main Research Function ───────────────────────────────────────────────────

/**
 * Research a single politician: discover videos, transcribe, extract commitments.
 */
export async function researchPolitician(
  profile: PoliticianProfile,
  options: ResearchOptions = {},
): Promise<ResearchResult> {
  const maxWhisper = options.maxWhisperTranscriptions ?? 10;
  const delayMs = options.fetchDelayMs ?? 2000;
  const existingCommitments = options.existingCommitments ?? [];
  const dryRun = options.dryRun ?? false;

  const result: ResearchResult = {
    politician: profile,
    videosFound: 0,
    videosTranscribed: 0,
    commitmentsExtracted: 0,
    newCommitments: 0,
    matchedExisting: 0,
    speeches: [],
    errors: [],
  };

  console.log(`[Researcher] Starting research for ${profile.name} (${profile.id})`);

  // Step 1: Discover videos
  let candidates: VideoCandidate[];
  try {
    candidates = await discoverVideos(profile, options);
    result.videosFound = candidates.length;
  } catch (err) {
    result.errors.push(
      `Video discovery failed: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    return result;
  }

  if (candidates.length === 0) {
    console.log(`[Researcher] No videos found for ${profile.name}`);
    return result;
  }

  // Step 2: Transcribe each video
  let whisperCount = 0;

  for (const candidate of candidates) {
    const allowWhisper = whisperCount < maxWhisper;

    try {
      const transcriptResult = await getTranscript(
        candidate.videoId,
        allowWhisper,
      );

      if (!transcriptResult) continue;

      if (transcriptResult.method === 'whisper') {
        whisperCount++;
      }

      result.videosTranscribed++;
      const { transcript } = transcriptResult;

      // Step 3: Extract commitments via AI
      const { commitments, keyStatements } = await extractCommitments(
        transcript,
        profile,
        existingCommitments,
      );

      // Step 3b: Extract entities via regex
      const entities = extractEntities(transcript);

      // Detect language
      const nepaliChars = (transcript.match(/[\u0900-\u097F]/g) || []).length;
      const ratio = nepaliChars / transcript.length;
      const language: 'en' | 'ne' | 'mixed' =
        ratio > 0.4 ? 'ne' : ratio > 0.1 ? 'mixed' : 'en';

      const speech: SpeechExtraction = {
        videoId: candidate.videoId,
        videoTitle: candidate.title,
        videoUrl: `https://www.youtube.com/watch?v=${candidate.videoId}`,
        channelName: candidate.channelName,
        publishedAt: candidate.publishedAt,
        transcript: transcript.slice(0, 50000),
        language,
        commitments,
        keyStatements,
        entities: {
          people: entities.people,
          amounts: entities.amounts,
          dates: entities.dates,
          locations: entities.locations,
        },
      };

      result.speeches.push(speech);
      result.commitmentsExtracted += commitments.length;

      for (const c of commitments) {
        if (c.matchesExisting != null) {
          result.matchedExisting++;
        } else {
          result.newCommitments++;
        }
      }

      // Step 4: Store in DB
      if (!dryRun) {
        await storeSignal(profile, candidate, transcript, speech, transcriptResult.method);
      }
    } catch (err) {
      result.errors.push(
        `Video ${candidate.videoId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    // Rate limit between videos
    await delay(delayMs);
  }

  console.log(
    `[Researcher] Completed ${profile.name}: ` +
      `${result.videosFound} found, ${result.videosTranscribed} transcribed, ` +
      `${result.commitmentsExtracted} commitments (${result.newCommitments} new)`,
  );

  return result;
}

/**
 * Research all politicians sequentially (respects rate limits).
 */
export async function researchAllPoliticians(
  profiles: PoliticianProfile[],
  options: ResearchOptions = {},
): Promise<{
  results: ResearchResult[];
  totalVideos: number;
  totalTranscribed: number;
  totalCommitments: number;
  totalErrors: number;
}> {
  const results: ResearchResult[] = [];
  let totalVideos = 0;
  let totalTranscribed = 0;
  let totalCommitments = 0;
  let totalErrors = 0;

  for (const profile of profiles) {
    const result = await researchPolitician(profile, options);
    results.push(result);

    totalVideos += result.videosFound;
    totalTranscribed += result.videosTranscribed;
    totalCommitments += result.commitmentsExtracted;
    totalErrors += result.errors.length;

    // Extra delay between politicians
    await delay(5000);
  }

  return { results, totalVideos, totalTranscribed, totalCommitments, totalErrors };
}

// ── DB Storage ───────────────────────────────────────────────────────────────

async function storeSignal(
  profile: PoliticianProfile,
  candidate: VideoCandidate,
  transcript: string,
  speech: SpeechExtraction,
  transcriptMethod: string,
): Promise<void> {
  const { getSupabase } = await import('@/lib/supabase/server');
  const supabase = getSupabase();

  const sourceId = `research-${profile.id}`;

  // Upsert the signal
  const { error } = await supabase.from('intelligence_signals').upsert(
    {
      source_id: sourceId,
      signal_type: 'speech' as const,
      external_id: candidate.videoId,
      title: candidate.title.slice(0, 500),
      content: transcript.slice(0, 50000),
      url: `https://www.youtube.com/watch?v=${candidate.videoId}`,
      author: candidate.channelName || profile.name,
      published_at: candidate.publishedAt
        ? safeISODate(candidate.publishedAt)
        : new Date().toISOString(),
      language: speech.language === 'mixed' ? 'ne' : speech.language,
      media_type: 'video' as const,
      thumbnail_url: `https://i.ytimg.com/vi/${candidate.videoId}/hqdefault.jpg`,
      extracted_data: {
        commitments: speech.commitments,
        keyStatements: speech.keyStatements,
        entities: speech.entities,
      },
      metadata: {
        politician_id: profile.id,
        politician_name: profile.name,
        party: profile.party,
        transcript_method: transcriptMethod,
        transcript_length: transcript.length,
        commitment_count: speech.commitments.length,
        potential_new_commitment: speech.commitments.some(
          (c) => c.matchesExisting == null,
        ),
        researched_at: new Date().toISOString(),
      },
    },
    {
      onConflict: 'source_id,external_id',
    },
  );

  if (error) {
    console.warn(
      `[Researcher] DB upsert failed for ${candidate.videoId}: ${error.message}`,
    );
  }

  // Upsert the intelligence source
  await supabase.from('intelligence_sources').upsert(
    {
      id: sourceId,
      name: `${profile.name} Research`,
      source_type: 'youtube_channel' as const,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(profile.name)}`,
      config: {
        type: 'politician_research',
        politicianId: profile.id,
        politicianName: profile.name,
        party: profile.party,
      },
      is_active: true,
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
}

// ── YouTube API Helpers (research-specific, wider date range) ────────────────

interface YouTubeVideoBasic {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
}

/**
 * Search YouTube with a wider date range than the default collector.
 * Used for research — fetches videos from the last 2 years.
 */
async function searchYouTubeResearch(
  query: string,
  maxResults: number,
  publishedAfter: Date,
): Promise<YouTubeVideoBasic[]> {
  if (!YOUTUBE_API_KEY) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    order: 'relevance',
    relevanceLanguage: 'ne',
    regionCode: 'NP',
    publishedAfter: publishedAfter.toISOString(),
    key: YOUTUBE_API_KEY,
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { signal: AbortSignal.timeout(15_000) },
    );

    if (!res.ok) return [];
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items || []).map((item: any) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      channelTitle: item.snippet?.channelTitle || '',
      channelId: item.snippet?.channelId || '',
      publishedAt: item.snippet?.publishedAt || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Search within a specific YouTube channel for mentions of a politician.
 */
async function searchYouTubeOnChannel(
  channelId: string,
  query: string,
  maxResults: number,
  publishedAfter: Date,
): Promise<YouTubeVideoBasic[]> {
  if (!YOUTUBE_API_KEY) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    channelId,
    maxResults: String(maxResults),
    order: 'relevance',
    publishedAfter: publishedAfter.toISOString(),
    key: YOUTUBE_API_KEY,
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { signal: AbortSignal.timeout(15_000) },
    );

    if (!res.ok) return [];
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items || []).map((item: any) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      channelTitle: item.snippet?.channelTitle || '',
      channelId: item.snippet?.channelId || '',
      publishedAt: item.snippet?.publishedAt || '',
    }));
  } catch {
    return [];
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getTwoYearsAgo(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d;
}

function safeISODate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
