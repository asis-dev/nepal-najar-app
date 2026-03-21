/**
 * YouTube Evidence Extractor
 *
 * Extracts quotes and statements from YouTube video captions
 * that mention any of the 35 government promises.
 * Maps them to officials and stores as evidence vault entries.
 */

import { PROMISES_KNOWLEDGE } from '../knowledge-base';

// ----- Types -----

export interface CaptionSegment {
  text: string;
  startSeconds: number;
  durationSeconds: number;
}

export interface EvidenceEntry {
  official_name: string;
  official_title: string | null;
  quote_text: string;
  quote_summary: string | null;
  quote_context: string | null;
  language: 'en' | 'ne';
  source_type: 'youtube';
  source_url: string;
  source_title: string | null;
  timestamp_seconds: number | null;
  timestamp_url: string | null;
  spoken_date: string | null;
  promise_ids: number[];
  statement_type:
    | 'commitment'
    | 'claim'
    | 'excuse'
    | 'update'
    | 'contradiction'
    | 'denial'
    | 'deflection'
    | 'acknowledgment'
    | null;
  verification_status: 'unverified';
  sentiment: number | null;
  importance_score: number;
  tags: string[];
  signal_id: string | null;
}

// ----- Key Officials -----

interface TrackedOfficial {
  name: string;
  nameNe: string;
  title: string;
  aliases: string[];
}

const TRACKED_OFFICIALS: TrackedOfficial[] = [
  {
    name: 'Rabi Lamichhane',
    nameNe: 'रवि लामिछाने',
    title: 'RSP Chairman / Home Minister',
    aliases: ['rabi lamichhane', 'lamichhane', 'rabi', 'रवि लामिछाने', 'लामिछाने'],
  },
  {
    name: 'Swarnim Wagle',
    nameNe: 'स्वर्णिम वाग्ले',
    title: 'NPC Vice Chair',
    aliases: ['swarnim wagle', 'wagle', 'swarnim', 'स्वर्णिम वाग्ले', 'वाग्ले'],
  },
  {
    name: 'Balen Shah',
    nameNe: 'बालेन शाह',
    title: 'Mayor, Kathmandu Metropolitan City',
    aliases: ['balen shah', 'balen', 'mayor balen', 'बालेन शाह', 'बालेन'],
  },
  {
    name: 'KP Sharma Oli',
    nameNe: 'केपी शर्मा ओली',
    title: 'Prime Minister',
    aliases: ['kp oli', 'oli', 'pm oli', 'prime minister oli', 'केपी ओली', 'ओली', 'प्रधानमन्त्री ओली'],
  },
  {
    name: 'Bishnu Poudel',
    nameNe: 'विष्णु पौडेल',
    title: 'Finance Minister',
    aliases: ['bishnu poudel', 'poudel', 'finance minister', 'विष्णु पौडेल', 'पौडेल'],
  },
  {
    name: 'Damodar Bhandari',
    nameNe: 'दामोदर भण्डारी',
    title: 'Energy Minister',
    aliases: ['damodar bhandari', 'bhandari', 'energy minister', 'दामोदर भण्डारी'],
  },
];

// ----- Promise Keywords -----

interface PromiseKeywords {
  id: number;
  title: string;
  keywords: string[];
}

function buildPromiseKeywords(): PromiseKeywords[] {
  return PROMISES_KNOWLEDGE.map((p) => {
    const keywords: string[] = [];

    // Extract key terms from title, description, keyAspects
    const sources = [p.title, p.description, p.keyAspects];
    for (const src of sources) {
      const words = src
        .toLowerCase()
        .split(/[,;/\s]+/)
        .filter((w) => w.length > 3)
        .filter(
          (w) =>
            !['the', 'and', 'for', 'with', 'from', 'through', 'that', 'this', 'into'].includes(w),
        );
      keywords.push(...words);
    }

    // Also add Nepali title
    keywords.push(p.titleNe);

    return {
      id: p.id,
      title: p.title,
      keywords: [...new Set(keywords)],
    };
  });
}

const PROMISE_KEYWORDS = buildPromiseKeywords();

// ----- Caption Fetching -----

/**
 * Fetch auto-generated captions from YouTube for a video.
 * Tries Nepali first, then English, including auto-generated variants.
 * Returns parsed segments with timestamps.
 */
export async function fetchCaptionSegments(
  videoId: string,
): Promise<{ segments: CaptionSegment[]; language: 'en' | 'ne' }> {
  const attempts: { url: string; lang: 'en' | 'ne' }[] = [
    {
      url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=ne&fmt=srv3`,
      lang: 'ne',
    },
    {
      url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      lang: 'en',
    },
    {
      url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=ne&kind=asr&fmt=srv3`,
      lang: 'ne',
    },
    {
      url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3`,
      lang: 'en',
    },
  ];

  for (const { url, lang } of attempts) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;

      const xml = await res.text();
      if (!xml || xml.length < 50) continue;

      const segments = parseCaptionXml(xml);
      if (segments.length > 0) {
        return { segments, language: lang };
      }
    } catch {
      continue;
    }
  }

  return { segments: [], language: 'en' };
}

/**
 * Parse YouTube caption XML (srv3 format) into timed segments.
 */
function parseCaptionXml(xml: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];

  // Match <p t="ms" d="ms">text</p> or <text start="s" dur="s">text</text>
  // srv3 format uses <p t="..." d="...">
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(match[1], 10);
    const durMs = parseInt(match[2], 10);
    let text = match[3]
      .replace(/<[^>]+>/g, '') // strip inner tags like <s>
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n/g, ' ')
      .trim();

    if (text) {
      segments.push({
        text,
        startSeconds: Math.floor(startMs / 1000),
        durationSeconds: Math.ceil(durMs / 1000),
      });
    }
  }

  // Fallback: try <text start="" dur=""> format
  if (segments.length === 0) {
    const textRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/gi;
    while ((match = textRegex.exec(xml)) !== null) {
      const startSec = parseFloat(match[1]);
      const durSec = parseFloat(match[2]);
      let text = match[3]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\n/g, ' ')
        .trim();

      if (text) {
        segments.push({
          text,
          startSeconds: Math.floor(startSec),
          durationSeconds: Math.ceil(durSec),
        });
      }
    }
  }

  return segments;
}

// ----- Quote Extraction -----

/**
 * Group caption segments into chunks of ~30 seconds for analysis.
 */
function groupSegments(
  segments: CaptionSegment[],
  windowSeconds = 30,
): { text: string; startSeconds: number; endSeconds: number }[] {
  if (segments.length === 0) return [];

  const groups: { text: string; startSeconds: number; endSeconds: number }[] = [];
  let currentTexts: string[] = [];
  let groupStart = segments[0].startSeconds;
  let groupEnd = groupStart;

  for (const seg of segments) {
    if (seg.startSeconds - groupStart >= windowSeconds && currentTexts.length > 0) {
      groups.push({
        text: currentTexts.join(' '),
        startSeconds: groupStart,
        endSeconds: groupEnd,
      });
      currentTexts = [];
      groupStart = seg.startSeconds;
    }

    currentTexts.push(seg.text);
    groupEnd = seg.startSeconds + seg.durationSeconds;
  }

  // Push remaining
  if (currentTexts.length > 0) {
    groups.push({
      text: currentTexts.join(' '),
      startSeconds: groupStart,
      endSeconds: groupEnd,
    });
  }

  return groups;
}

/**
 * Check if a text chunk mentions any tracked official.
 */
function findMentionedOfficials(text: string): TrackedOfficial[] {
  const lower = text.toLowerCase();
  return TRACKED_OFFICIALS.filter((o) =>
    o.aliases.some((alias) => lower.includes(alias.toLowerCase())),
  );
}

/**
 * Check which promises a text chunk is relevant to.
 * Returns promise IDs with a relevance count.
 */
function findRelatedPromises(text: string): number[] {
  const lower = text.toLowerCase();
  const matched: { id: number; score: number }[] = [];

  for (const pk of PROMISE_KEYWORDS) {
    let score = 0;
    for (const kw of pk.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score++;
      }
    }
    // Need at least 2 keyword matches to consider relevant
    if (score >= 2) {
      matched.push({ id: pk.id, score });
    }
  }

  // Sort by relevance, return top matches
  matched.sort((a, b) => b.score - a.score);
  return matched.slice(0, 5).map((m) => m.id);
}

/**
 * Classify the type of statement based on text content.
 */
function classifyStatement(
  text: string,
): EvidenceEntry['statement_type'] {
  const lower = text.toLowerCase();

  const commitmentWords = ['will', 'shall', 'promise', 'commit', 'pledge', 'guarantee', 'ensure', 'गर्नेछौं', 'गर्छौं'];
  const claimWords = ['achieved', 'completed', 'delivered', 'done', 'succeeded', 'accomplished', 'सम्पन्न', 'पूरा'];
  const excuseWords = ['delay', 'challenge', 'difficult', 'obstacle', 'budget constraint', 'कठिन', 'चुनौती'];
  const updateWords = ['progress', 'underway', 'ongoing', 'phase', 'percent', 'प्रगति', 'जारी'];
  const contradictionWords = ['however', 'but actually', 'not true', 'false claim', 'तर'];
  const denialWords = ['deny', 'never said', 'not responsible', 'reject', 'अस्वीकार'];

  if (commitmentWords.some((w) => lower.includes(w))) return 'commitment';
  if (claimWords.some((w) => lower.includes(w))) return 'claim';
  if (contradictionWords.some((w) => lower.includes(w))) return 'contradiction';
  if (denialWords.some((w) => lower.includes(w))) return 'denial';
  if (excuseWords.some((w) => lower.includes(w))) return 'excuse';
  if (updateWords.some((w) => lower.includes(w))) return 'update';

  return 'acknowledgment';
}

/**
 * Estimate sentiment from text content. Returns -1.0 to 1.0.
 */
function estimateSentiment(text: string): number {
  const lower = text.toLowerCase();

  const positiveWords = ['progress', 'success', 'achieved', 'completed', 'growth', 'improved', 'प्रगति', 'सफलता'];
  const negativeWords = ['failed', 'delay', 'corruption', 'problem', 'crisis', 'worse', 'असफल', 'भ्रष्टाचार'];

  let score = 0;
  for (const w of positiveWords) {
    if (lower.includes(w)) score += 0.2;
  }
  for (const w of negativeWords) {
    if (lower.includes(w)) score -= 0.2;
  }

  return Math.max(-1, Math.min(1, score));
}

// ----- Main Extractor -----

export interface ExtractorOptions {
  videoId: string;
  videoTitle?: string;
  publishedAt?: string;
  signalId?: string;
}

/**
 * Extract evidence entries from a YouTube video's captions.
 *
 * 1. Fetches auto-generated captions (Nepali or English)
 * 2. Groups segments into ~30s windows
 * 3. Scans each window for official mentions + promise keywords
 * 4. Creates evidence entries for relevant windows
 */
export async function extractYouTubeEvidence(
  options: ExtractorOptions,
): Promise<EvidenceEntry[]> {
  const { videoId, videoTitle, publishedAt, signalId } = options;

  // 1. Fetch captions
  const { segments, language } = await fetchCaptionSegments(videoId);
  if (segments.length === 0) return [];

  // 2. Group into windows
  const windows = groupSegments(segments, 30);

  // 3. Analyze each window
  const entries: EvidenceEntry[] = [];

  for (const window of windows) {
    // Check for official mentions
    const officials = findMentionedOfficials(window.text);

    // Check for promise relevance
    const promiseIds = findRelatedPromises(window.text);

    // Only create evidence if we found both an official and a promise reference
    if (officials.length > 0 && promiseIds.length > 0) {
      for (const official of officials) {
        const timestampUrl = `https://www.youtube.com/watch?v=${videoId}&t=${window.startSeconds}`;

        entries.push({
          official_name: official.name,
          official_title: official.title,
          quote_text: window.text,
          quote_summary: null,
          quote_context: videoTitle || null,
          language: language as 'en' | 'ne',
          source_type: 'youtube',
          source_url: `https://www.youtube.com/watch?v=${videoId}`,
          source_title: videoTitle || null,
          timestamp_seconds: window.startSeconds,
          timestamp_url: timestampUrl,
          spoken_date: publishedAt || null,
          promise_ids: promiseIds,
          statement_type: classifyStatement(window.text),
          verification_status: 'unverified',
          sentiment: estimateSentiment(window.text),
          importance_score: Math.min(
            1,
            0.3 + promiseIds.length * 0.1 + (officials.length > 1 ? 0.2 : 0),
          ),
          tags: [
            'auto-extracted',
            'youtube',
            ...promiseIds.map((id) => `promise-${id}`),
          ],
          signal_id: signalId || null,
        });
      }
    } else if (promiseIds.length >= 2) {
      // Even without an official mention, if multiple promises are referenced,
      // create an entry with "Unknown Speaker"
      entries.push({
        official_name: 'Unknown Speaker',
        official_title: null,
        quote_text: window.text,
        quote_summary: null,
        quote_context: videoTitle || null,
        language: language as 'en' | 'ne',
        source_type: 'youtube',
        source_url: `https://www.youtube.com/watch?v=${videoId}`,
        source_title: videoTitle || null,
        timestamp_seconds: window.startSeconds,
        timestamp_url: `https://www.youtube.com/watch?v=${videoId}&t=${window.startSeconds}`,
        spoken_date: publishedAt || null,
        promise_ids: promiseIds,
        statement_type: classifyStatement(window.text),
        verification_status: 'unverified',
        sentiment: estimateSentiment(window.text),
        importance_score: Math.min(1, 0.2 + promiseIds.length * 0.1),
        tags: ['auto-extracted', 'youtube', 'no-official-match'],
        signal_id: signalId || null,
      });
    }
  }

  return entries;
}

/**
 * Extract evidence from a YouTube video and save to Supabase.
 */
export async function extractAndSaveYouTubeEvidence(
  options: ExtractorOptions,
): Promise<{ inserted: number; errors: string[] }> {
  const { getSupabase } = await import('@/lib/supabase/server');
  const supabase = getSupabase();
  const errors: string[] = [];
  let inserted = 0;

  try {
    const entries = await extractYouTubeEvidence(options);

    for (const entry of entries) {
      const { error } = await supabase.from('evidence_vault').insert({
        official_name: entry.official_name,
        official_title: entry.official_title,
        quote_text: entry.quote_text,
        quote_summary: entry.quote_summary,
        quote_context: entry.quote_context,
        language: entry.language,
        source_type: entry.source_type,
        source_url: entry.source_url,
        source_title: entry.source_title,
        timestamp_seconds: entry.timestamp_seconds,
        timestamp_url: entry.timestamp_url,
        spoken_date: entry.spoken_date,
        promise_ids: entry.promise_ids,
        statement_type: entry.statement_type,
        verification_status: entry.verification_status,
        sentiment: entry.sentiment,
        importance_score: entry.importance_score,
        tags: entry.tags,
        signal_id: entry.signal_id,
      });

      if (error) {
        errors.push(`Insert error: ${error.message}`);
      } else {
        inserted++;
      }
    }
  } catch (err) {
    errors.push(
      `Extraction error: ${err instanceof Error ? err.message : 'unknown'}`,
    );
  }

  return { inserted, errors };
}
