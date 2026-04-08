/**
 * Brief Narrator — generates Nepali TTS audio from the daily brief
 *
 * Flow: DailyBrief → Nepali script → TTS API → MP3 → Supabase Storage
 *
 * TTS providers (priority order):
 * 1. ElevenLabs (best Nepali quality, needs ELEVENLABS_API_KEY)
 * 2. OpenAI TTS (decent Nepali, uses existing OPENAI_API_KEY)
 * 3. Skip (no audio generated)
 */

import { getSupabase } from '@/lib/supabase/server';
import type { DailyBrief } from './daily-brief';
import { looksLikeNepali, normalizeNepaliRegister } from './nepali-text';
import { dayInOffice } from './government-era';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BriefAudioResult {
  audioUrl: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  provider: string;
  error?: string;
}

function getBriefMaxSeconds(): number {
  const raw = Number(process.env.BRIEF_MAX_SECONDS || '30');
  if (!Number.isFinite(raw)) return 30;
  return Math.min(90, Math.max(15, Math.round(raw)));
}

function getFullBriefMaxSeconds(): number {
  const raw = Number(process.env.BRIEF_FULL_MAX_SECONDS || '120');
  if (!Number.isFinite(raw)) return 120;
  return Math.min(180, Math.max(60, Math.round(raw)));
}

function getVideoMaxSeconds(): number {
  const raw = Number(process.env.BRIEF_VIDEO_MAX_SECONDS || '30');
  if (!Number.isFinite(raw)) return 30;
  return Math.min(60, Math.max(15, Math.round(raw)));
}

function shouldReuseExistingVideo(): boolean {
  return process.env.BRIEF_VIDEO_REUSE_EXISTING !== 'false';
}

function shouldRequireSagarForVideo(): boolean {
  return process.env.BRIEF_VIDEO_REQUIRE_SAGAR !== 'false';
}

function shouldGenerateEnglishAudio(): boolean {
  return process.env.BRIEF_GENERATE_EN_AUDIO !== 'false';
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function compactSummaryForWordBudget(summary: string, maxWords: number): string {
  const cleaned = summary
    .replace(/^[-•]\s*/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) return '';

  const sentences = cleaned
    .split(/(?<=[।.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const picked: string[] = [];
  let used = 0;

  for (const sentence of sentences) {
    const words = wordCount(sentence);
    if (words === 0) continue;

    if (used + words <= maxWords) {
      picked.push(sentence);
      used += words;
      continue;
    }

    if (picked.length === 0) {
      const clipped = sentence
        .split(/\s+/)
        .slice(0, Math.max(8, maxWords))
        .join(' ');
      picked.push(`${clipped}...`);
    }
    break;
  }

  if (picked.length === 0) return '';
  return picked.join(' ');
}

function clipWords(text: string, maxWords: number): string {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) return cleaned;
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function pickNepaliText(...candidates: Array<string | undefined | null>): string {
  for (const value of candidates) {
    const normalized = normalizeNepaliRegister(String(value || '').trim());
    if (!normalized) continue;
    if (looksLikeNepali(normalized)) return normalized;
  }
  return '';
}

function nepaliCharRatio(text: string): number {
  const value = (text || '').trim();
  if (!value) return 0;
  const devanagari = value.match(/[\u0900-\u097F]/g)?.length || 0;
  return devanagari / Math.max(1, value.length);
}

function ensureNepaliScriptOrThrow(script: string, context: string): string {
  const normalized = normalizeNepaliRegister(script || '');
  const ratio = nepaliCharRatio(normalized);
  if (!normalized || ratio < 0.2) {
    throw new Error(`${context} is not Nepali enough (ratio=${ratio.toFixed(2)})`);
  }
  return normalized;
}

/**
 * Punchy short script specifically for animated video.
 * Designed to stay <= BRIEF_VIDEO_MAX_SECONDS (default: 30s).
 */
export async function generatePunchyVideoScript(brief: DailyBrief): Promise<string> {
  const maxSeconds = getVideoMaxSeconds();
  // Slightly conservative pace to keep real playback under target.
  const maxWords = Math.max(35, Math.round((maxSeconds / 60) * 105));

  const topOne = brief.topStories[0];
  const topTwo = brief.topStories[1];

  const leadOne = topOne
    ? clipWords(pickNepaliText(topOne.titleNe, topOne.title), 12)
    : '';
  const leadTwo = topTwo
    ? clipWords(pickNepaliText(topTwo.titleNe, topTwo.title), 10)
    : '';

  const quickSummary = compactSummaryForWordBudget(pickNepaliText(brief.summaryNe), 22);

  const lines: string[] = [];
  lines.push('आजको ३० सेकेन्ड नेपाल रिपब्लिक अपडेट।');
  lines.push(
    `आज ${brief.stats.newSignals} नयाँ संकेत र ${brief.topStories.length} मुख्य कथा भेटिए।`,
  );

  if (leadOne) {
    lines.push(`मुख्य कुरा: ${leadOne}${leadTwo ? `, र ${leadTwo}` : ''}।`);
  } else if (quickSummary) {
    lines.push(quickSummary);
  }

  if (quickSummary && leadOne) {
    lines.push(quickSummary);
  }

  if (!leadOne && !quickSummary) {
    lines.push('आजका मुख्य सार्वजनिक अद्यावधिकहरू संकलन भइरहेको छ।');
  }

  lines.push('पूरा प्रमाणसहितको विवरण हेर्न नेपाल रिपब्लिक डट ओआरजी खोल्नुहोस्।');

  const normalized = normalizeNepaliRegister(lines.join(' '));
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length > maxWords) {
    return normalizeNepaliRegister(`${words.slice(0, maxWords).join(' ')}।`);
  }

  return normalized;
}

// ── Script Generation ────────────────────────────────────────────────────────

/**
 * Convert a DailyBrief into a Nepali narration script.
 *
 * IMPORTANT: This does NOT make a separate AI call. It reads the SAME content
 * that's already in the brief (summaryNe + topStories). This ensures the audio
 * and the on-screen text always match — no more "two different summaries".
 *
 * Structure: greeting → summary bullets → sign-off. ~180-220 words.
 */
export async function generateBriefScript(brief: DailyBrief): Promise<string> {
  const day = dayInOffice();
  const targetSeconds = getBriefMaxSeconds();
  const targetWords = Math.max(45, Math.round((targetSeconds / 60) * 120));
  const reservedWords = 20; // greeting + sign-off
  const summaryBudget = Math.max(20, targetWords - reservedWords);
  const lines: string[] = [];

  // Greeting
  lines.push(`नमस्कार, नेपाल रिपब्लिकको दैनिक ब्रिफमा स्वागत छ। आज सरकारको ${day} औं दिन हो।`);
  lines.push('');

  // Main content: use the SAME summaryNe that's shown on screen
  const nepaliSummary = pickNepaliText(brief.summaryNe);
  if (nepaliSummary && nepaliSummary.trim().length > 20) {
    const spokenSummary = compactSummaryForWordBudget(nepaliSummary, summaryBudget);
    if (spokenSummary) {
      lines.push(spokenSummary);
      lines.push('');
    }
  }

  if (!nepaliSummary) {
    lines.push('आजका मुख्य सार्वजनिक अद्यावधिकहरू संक्षेपमा तयारी भइरहेको छ।');
    lines.push('');
  }

  // Sign-off
  lines.push('भोलि फेरि भेटौंला। नेपाल रिपब्लिक सुन्नुभएकोमा धन्यवाद।');

  // Final hard cap to keep output <= target duration envelope
  const full = normalizeNepaliRegister(lines.join('\n'));
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length > targetWords + 5) {
    const trimmed = words.slice(0, targetWords).join(' ');
    return normalizeNepaliRegister(`${trimmed}।`);
  }

  return full;
}

// generateFallbackScript removed — no longer needed since scripts read from the brief directly

/**
 * Generate an English version of the daily brief for audio narration.
 *
 * Like the Nepali version, this reads the SAME summaryEn content — no separate AI call.
 */
export async function generateEnglishBriefScript(brief: DailyBrief): Promise<string> {
  const day = dayInOffice();
  const targetSeconds = getBriefMaxSeconds();
  const targetWords = Math.max(55, Math.round((targetSeconds / 60) * 150));
  const reservedWords = 18; // greeting + sign-off
  const summaryBudget = Math.max(28, targetWords - reservedWords);
  const lines: string[] = [];

  lines.push(`Hello, welcome to the Nepal Republic daily brief. Day ${day} of the new government.`);

  if (brief.summaryEn && brief.summaryEn.trim().length > 20) {
    const spokenSummary = compactSummaryForWordBudget(brief.summaryEn, summaryBudget);
    if (spokenSummary) {
      lines.push(spokenSummary);
    }
  } else if (brief.summaryNe && brief.summaryNe.trim().length > 20) {
    const fallbackSummary = compactSummaryForWordBudget(brief.summaryNe, summaryBudget);
    if (fallbackSummary) {
      lines.push(fallbackSummary);
    }
  }

  lines.push("That's all for today. Thank you for listening to Nepal Republic.");

  const full = lines.join('\n\n');
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length > targetWords + 5) {
    return `${words.slice(0, targetWords).join(' ')}.`;
  }

  return full;
}

// ── Full 2-Minute Audio Scripts ──────────────────────────────────────────────

/**
 * Generate a full ~2 minute Nepali audio brief script.
 * This is a proper podcast-style narration covering each story in detail.
 *
 * Structure:
 *  - Greeting + day number + stats overview (~30 words)
 *  - Each top story: headline + 2-3 detail sentences (~40-50 words each)
 *  - Overall summary (~30 words)
 *  - Sign-off (~15 words)
 *
 * Target: ~240 words → ~2 min at 120 wpm Nepali pace
 */
export async function generateFullNeBriefScript(brief: DailyBrief): Promise<string> {
  const day = dayInOffice();
  const maxSeconds = getFullBriefMaxSeconds();
  const targetWords = Math.max(120, Math.round((maxSeconds / 60) * 120));
  const lines: string[] = [];

  // ── Opening ──
  lines.push(
    `नमस्कार, नेपाल रिपब्लिकको दैनिक ब्रिफमा स्वागत छ।`
  );
  lines.push(
    `आज सरकारको ${day} औं दिन हो।`
  );
  lines.push(
    `पछिल्लो २४ घण्टामा ${brief.stats.newSignals} नयाँ संकेत र ${brief.topStories.length} मुख्य कथा भेटिएको छ।`
  );
  lines.push('');

  // ── Each top story in detail ──
  const storyBudget = Math.max(25, Math.floor((targetWords - 80) / Math.max(1, brief.topStories.length)));

  for (let i = 0; i < brief.topStories.length; i++) {
    const story = brief.topStories[i];
    const storyNum = i + 1;

    // Story headline
    const headline = pickNepaliText(story.titleNe, story.title);
    if (!headline) continue;

    lines.push(`कथा ${storyNum}: ${headline}।`);

    // Story detail — use Nepali summary if available, otherwise English
    const detail = pickNepaliText(story.summaryNe, story.summary);
    if (detail) {
      const compacted = compactSummaryForWordBudget(detail, storyBudget);
      if (compacted) {
        lines.push(compacted);
      }
    } else {
      lines.push('यस विषयमा थप प्रमाण र स्पष्टता संकलन भइरहेको छ।');
    }

    // Source attribution
    if (story.sources.length > 0) {
      const sourceCount = story.sources.length;
      const signalCount = story.signalCount;
      if (signalCount > 1) {
        lines.push(`यो कथा ${signalCount} स्रोतबाट पुष्टि भएको छ।`);
      }
    }

    lines.push('');
  }

  // ── Overall summary bridge ──
  const nepaliSummary = pickNepaliText(brief.summaryNe);
  if (nepaliSummary && nepaliSummary.trim().length > 30) {
    // Add any summary points not already covered by individual stories
    const remainingBudget = targetWords - wordCount(lines.join('\n')) - 20;
    if (remainingBudget > 20) {
      const extra = compactSummaryForWordBudget(nepaliSummary, remainingBudget);
      if (extra && extra.length > 30) {
        lines.push('संक्षेपमा भन्दा:');
        lines.push(extra);
        lines.push('');
      }
    }
  }

  // ── Commitments moved ──
  if (brief.commitmentsMoved.length > 0) {
    const movedConfirm = brief.commitmentsMoved.filter(c => c.direction === 'confirms');
    const movedContradict = brief.commitmentsMoved.filter(c => c.direction === 'contradicts');

    if (movedConfirm.length > 0 || movedContradict.length > 0) {
      const remainingBudget2 = targetWords - wordCount(lines.join('\n')) - 15;
      if (remainingBudget2 > 15) {
        if (movedConfirm.length > 0) {
          lines.push(`${movedConfirm.length} प्रतिबद्धतामा प्रगति देखिएको छ।`);
        }
        if (movedContradict.length > 0) {
          lines.push(`${movedContradict.length} प्रतिबद्धतामा चिन्ता देखिएको छ।`);
        }
        lines.push('');
      }
    }
  }

  // ── Sign-off ──
  lines.push('थप प्रमाणसहितको विवरण नेपाल रिपब्लिक डट ओआरजीमा हेर्नुहोस्।');
  lines.push('भोलि फेरि भेटौंला। नेपाल रिपब्लिक सुन्नुभएकोमा धन्यवाद।');

  // Final word-count enforcement
  const full = normalizeNepaliRegister(lines.join('\n'));
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length > targetWords + 10) {
    return normalizeNepaliRegister(`${words.slice(0, targetWords).join(' ')}। नेपाल रिपब्लिक सुन्नुभएकोमा धन्यवाद।`);
  }

  return full;
}

/**
 * Generate a full ~2 minute English audio brief script.
 * Podcast-style with story-by-story breakdown.
 *
 * Target: ~300 words → ~2 min at 150 wpm English pace
 */
export async function generateFullEnBriefScript(brief: DailyBrief): Promise<string> {
  const day = dayInOffice();
  const maxSeconds = getFullBriefMaxSeconds();
  const targetWords = Math.max(150, Math.round((maxSeconds / 60) * 150));
  const lines: string[] = [];

  // ── Opening ──
  lines.push(
    `Hello, welcome to the Nepal Republic daily brief. Today is day ${day} of the new government.`
  );
  lines.push(
    `In the last 24 hours, we tracked ${brief.stats.newSignals} new signals across ${brief.stats.sourcesActive} sources, with ${brief.topStories.length} major stories emerging.`
  );
  lines.push('');

  // ── Each top story ──
  const storyBudget = Math.max(30, Math.floor((targetWords - 90) / Math.max(1, brief.topStories.length)));

  for (let i = 0; i < brief.topStories.length; i++) {
    const story = brief.topStories[i];
    const storyNum = i + 1;

    const headline = story.title || story.titleNe || '';
    if (!headline) continue;

    // Numbered story with headline
    lines.push(`Story ${storyNum}: ${headline}.`);

    // Detail
    const detail = story.summary || story.summaryNe || '';
    if (detail) {
      const compacted = compactSummaryForWordBudget(detail, storyBudget);
      if (compacted) {
        lines.push(compacted);
      }
    }

    // Sentiment + source count
    const sentimentLabel = story.sentiment === 'positive' ? 'positive development'
      : story.sentiment === 'negative' ? 'concerning development'
      : story.sentiment === 'mixed' ? 'mixed reactions'
      : '';
    if (sentimentLabel && story.signalCount > 1) {
      lines.push(`This is seen as a ${sentimentLabel}, covered by ${story.signalCount} sources.`);
    }

    lines.push('');
  }

  // ── Commitments update ──
  if (brief.commitmentsMoved.length > 0) {
    const remainingBudget = targetWords - wordCount(lines.join('\n')) - 20;
    if (remainingBudget > 20) {
      const confirms = brief.commitmentsMoved.filter(c => c.direction === 'confirms').length;
      const contradicts = brief.commitmentsMoved.filter(c => c.direction === 'contradicts').length;
      if (confirms > 0 || contradicts > 0) {
        const parts: string[] = [];
        if (confirms > 0) parts.push(`${confirms} commitment${confirms > 1 ? 's' : ''} showing progress`);
        if (contradicts > 0) parts.push(`${contradicts} facing setbacks`);
        lines.push(`On the commitment tracker: ${parts.join(', and ')}.`);
        lines.push('');
      }
    }
  }

  // ── Overall pulse ──
  lines.push(
    `Today's activity pulse is ${brief.pulse} out of 100, rated as ${brief.pulseLabel}.`
  );

  // ── Sign-off ──
  lines.push('');
  lines.push("For full evidence-backed details, visit nepalrepublic.org.");
  lines.push("That's all for today. Thank you for listening to Nepal Republic.");

  // Word-count enforcement
  const full = lines.join('\n');
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length > targetWords + 10) {
    return `${words.slice(0, targetWords).join(' ')}. Thank you for listening to Nepal Republic.`;
  }

  return full;
}

/**
 * Estimate audio duration from script word count.
 * Average Nepali reading speed: ~120 words per minute. English: ~150 wpm.
 */
function estimateDuration(script: string, lang: 'ne' | 'en' = 'ne'): number {
  const words = script.split(/\s+/).filter(Boolean).length;
  const wpm = lang === 'en' ? 150 : 120;
  return Math.ceil((words / wpm) * 60);
}

// ── TTS Providers ────────────────────────────────────────────────────────────

/**
 * Generate audio using Microsoft Edge TTS (free, no API key needed).
 * Uses ne-NP-SagarNeural for Nepali, en-US-AriaNeural for English.
 */
const EDGE_TTS_TIMEOUT_MS = 30_000; // 30s per attempt — fail fast so fallbacks can run
const EDGE_TTS_MAX_RETRIES = 2;    // try up to 2 times (Vercel IPs sometimes get rate-limited)

async function generateWithEdgeTTS(script: string, lang: 'ne' | 'en' = 'ne'): Promise<Buffer> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= EDGE_TTS_MAX_RETRIES; attempt++) {
    try {
      // Wrap the ENTIRE Edge TTS flow (connection + streaming) in a timeout
      // because setMetadata() opens a WebSocket that can hang silently
      const buffer = await Promise.race([
        _edgeTTSInner(script, lang),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(
            `Edge TTS timed out after ${EDGE_TTS_TIMEOUT_MS / 1000}s — WebSocket connection or streaming hung`
          )), EDGE_TTS_TIMEOUT_MS)
        ),
      ]);
      if (attempt > 1) {
        console.log(`[BriefNarrator] Edge TTS succeeded on attempt ${attempt}`);
      }
      return buffer;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[BriefNarrator] Edge TTS attempt ${attempt}/${EDGE_TTS_MAX_RETRIES} failed: ${lastError.message}`);
      if (attempt < EDGE_TTS_MAX_RETRIES) {
        // Brief pause before retry
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  throw lastError || new Error('Edge TTS failed after all retries');
}

async function _edgeTTSInner(script: string, lang: 'ne' | 'en'): Promise<Buffer> {
  const { MsEdgeTTS } = await import('msedge-tts');
  const tts = new MsEdgeTTS();

  const voice = lang === 'ne' ? 'ne-NP-SagarNeural' : 'en-US-AriaNeural';
  await tts.setMetadata(voice, 'audio-24khz-96kbitrate-mono-mp3' as any);

  const { audioStream } = tts.toStream(script);
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
  });
}

async function generateWithElevenLabs(script: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const voiceId =
    process.env.ELEVENLABS_NEPALI_VOICE_ID ||
    process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    throw new Error('ELEVENLABS_NEPALI_VOICE_ID (or ELEVENLABS_VOICE_ID) not set');
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.15,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    throw new Error(`ElevenLabs error ${res.status}: ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateWithOpenAI(script: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const voice = process.env.OPENAI_TTS_VOICE || 'nova';

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: script,
      voice,
      speed: 0.95,
      response_format: 'mp3',
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    throw new Error(`OpenAI TTS error ${res.status}: ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate MP3 audio from a script using available TTS provider.
 * For Nepali: Edge TTS (Sagar) is preferred — free, high quality.
 * For English: Edge TTS (Aria) first, then OpenAI fallback.
 */
async function generateAudio(script: string, lang: 'ne' | 'en' = 'ne'): Promise<{ buffer: Buffer; provider: string }> {
  const failures: string[] = [];

  // Priority 1: Edge TTS (free, Sagar for Nepali, Aria for English)
  try {
    const buffer = await generateWithEdgeTTS(script, lang);
    return { buffer, provider: `edge-tts-${lang === 'ne' ? 'sagar' : 'aria'}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    failures.push(`Edge TTS: ${msg}`);
    console.warn(`[BriefNarrator] [ALERT] Edge TTS failed for ${lang}: ${msg}`);
    // Log to Supabase so we can track failures
    logTTSFailure('edge-tts', lang, msg).catch(() => {});
  }

  // Priority 2: ElevenLabs (paid, good quality)
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const buffer = await generateWithElevenLabs(script);
      console.log(`[BriefNarrator] [FALLBACK] Used ElevenLabs after Edge TTS failed`);
      return { buffer, provider: 'elevenlabs' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      failures.push(`ElevenLabs: ${msg}`);
      console.warn(`[BriefNarrator] ElevenLabs failed: ${msg}`);
    }
  }

  // Priority 3: OpenAI TTS (paid)
  if (process.env.OPENAI_API_KEY) {
    try {
      const buffer = await generateWithOpenAI(script);
      console.log(`[BriefNarrator] [FALLBACK] Used OpenAI TTS after Edge TTS + ElevenLabs failed`);
      return { buffer, provider: 'openai' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      failures.push(`OpenAI: ${msg}`);
      console.warn(`[BriefNarrator] OpenAI TTS failed: ${msg}`);
    }
  }

  throw new Error(`All TTS providers failed: ${failures.join(' | ')}`);
}

/** Log TTS failure to Supabase for monitoring */
async function logTTSFailure(provider: string, lang: string, error: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('tts_failures').insert({
      provider,
      lang,
      error,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Best-effort logging — don't block audio generation
  }
}

// ── Storage ──────────────────────────────────────────────────────────────────

async function uploadToStorage(date: string, buffer: Buffer, lang: 'ne' | 'en' = 'ne'): Promise<string> {
  const supabase = getSupabase();
  const path = `${date}/brief-${lang}.mp3`;

  const { error } = await supabase.storage
    .from('brief-audio')
    .upload(path, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('brief-audio')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

async function uploadNamedAudioToStorage(date: string, buffer: Buffer, filename: string): Promise<string> {
  const supabase = getSupabase();
  const path = `${date}/${filename}`;

  const { error } = await supabase.storage
    .from('brief-audio')
    .upload(path, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('brief-audio')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

async function updateBriefRecord(
  date: string,
  audioUrl: string,
  videoUrl: string | null,
  durationSeconds: number,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('daily_briefs')
    .update({
      audio_url: audioUrl,
      video_url: videoUrl,
      audio_generated_at: new Date().toISOString(),
      audio_duration_seconds: durationSeconds,
    })
    .eq('date', date);

  if (error) {
    throw new Error(`Failed to update daily_briefs media fields: ${error.message}`);
  }
}

/** Update only the audio fields (does not touch video_url) */
async function updateBriefAudioOnly(
  date: string,
  audioUrl: string,
  durationSeconds: number,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('daily_briefs')
    .update({
      audio_url: audioUrl,
      audio_generated_at: new Date().toISOString(),
      audio_duration_seconds: durationSeconds,
    })
    .eq('date', date);

  if (error) {
    throw new Error(`Failed to update daily_briefs audio: ${error.message}`);
  }
}

/** Update only the video_url field (does not touch audio) */
async function updateBriefVideoOnly(
  date: string,
  videoUrl: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('daily_briefs')
    .update({
      video_url: videoUrl,
    })
    .eq('date', date);

  if (error) {
    throw new Error(`Failed to update daily_briefs video: ${error.message}`);
  }
}

async function getExistingVideoUrl(date: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_briefs')
    .select('video_url')
    .eq('date', date)
    .maybeSingle<{ video_url: string | null }>();

  if (error) {
    console.warn(`[BriefNarrator] Could not read existing video_url for ${date}: ${error.message}`);
    return null;
  }

  return data?.video_url || null;
}

// ── D-ID Video Generation ────────────────────────────────────────────────────

/** Kayla in CoffeeShop — Premium+ presenter */
const DID_PRESENTER_ID =
  process.env.DID_PRESENTER_ID ||
  'v2_public_Kayla_NoHands_BlackShirt_CoffeeShop@u1un3hTUDJ';

/** Fallback: static image for /talks endpoint */
const DID_AVATAR_URL =
  process.env.DID_AVATAR_URL ||
  'https://clips-presenters.d-id.com/v2/Kayla_NoHands_BlackShirt_CoffeeShop/u1un3hTUDJ/Oijd6UyS_5/image.png';

/**
 * Create a video with Kayla (CoffeeShop) via D-ID Clips API.
 *
 * Uses Premium+ presenter with Sagar Nepali voice for text mode,
 * or pre-generated audio for audio mode.
 * Falls back to /talks endpoint with static image if clips fails.
 */
async function generateVideoWithDID(
  scriptOrAudioUrl: string,
  mode: 'text' | 'audio' = 'text',
): Promise<string> {
  const apiKey = process.env.DID_API_KEY;
  if (!apiKey) throw new Error('DID_API_KEY not set');

  // Try clips endpoint first (Premium+ Kayla presenter)
  try {
    return await createDIDClip(apiKey, scriptOrAudioUrl, mode);
  } catch (clipErr) {
    console.warn(
      '[BriefNarrator] Clips endpoint failed, trying talks fallback:',
      clipErr instanceof Error ? clipErr.message : 'unknown',
    );
  }

  // Fallback: /talks with static image
  return await createDIDTalk(apiKey, scriptOrAudioUrl, mode);
}

/** Create video via /clips endpoint (Premium+ presenter with background) */
async function createDIDClip(
  apiKey: string,
  scriptOrAudioUrl: string,
  mode: 'text' | 'audio',
): Promise<string> {
  const script =
    mode === 'text'
      ? {
          type: 'text' as const,
          input: scriptOrAudioUrl,
          provider: {
            type: 'microsoft' as const,
            voice_id: process.env.DID_VOICE_ID || 'ne-NP-SagarNeural',
          },
          subtitles: false,
        }
      : {
          type: 'audio' as const,
          audio_url: scriptOrAudioUrl,
          subtitles: false,
        };

  const createRes = await fetch('https://api.d-id.com/clips', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      presenter_id: DID_PRESENTER_ID,
      script,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => 'unknown');
    throw new Error(`D-ID clips error ${createRes.status}: ${text}`);
  }

  const { id: clipId } = (await createRes.json()) as { id: string };
  console.log(`[BriefNarrator] D-ID clip created: ${clipId}`);

  return await pollDIDResult(apiKey, 'clips', clipId);
}

/** Fallback: create video via /talks endpoint (static image) */
async function createDIDTalk(
  apiKey: string,
  scriptOrAudioUrl: string,
  mode: 'text' | 'audio',
): Promise<string> {
  const script =
    mode === 'text'
      ? {
          type: 'text' as const,
          input: scriptOrAudioUrl,
          provider: {
            type: 'microsoft' as const,
            voice_id: process.env.DID_VOICE_ID || 'ne-NP-SagarNeural',
          },
          subtitles: false,
        }
      : {
          type: 'audio' as const,
          audio_url: scriptOrAudioUrl,
          subtitles: false,
        };

  const createRes = await fetch('https://api.d-id.com/talks', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_url: DID_AVATAR_URL,
      script,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => 'unknown');
    throw new Error(`D-ID talks error ${createRes.status}: ${text}`);
  }

  const { id: talkId } = (await createRes.json()) as { id: string };
  console.log(`[BriefNarrator] D-ID talk created: ${talkId}`);

  return await pollDIDResult(apiKey, 'talks', talkId);
}

/** Poll D-ID for video completion (works for both clips and talks) */
async function pollDIDResult(
  apiKey: string,
  endpoint: 'clips' | 'talks',
  id: string,
): Promise<string> {
  const maxWait = 5 * 60 * 1000;
  const pollInterval = 5_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const getRes = await fetch(`https://api.d-id.com/${endpoint}/${id}`, {
      headers: { Authorization: `Basic ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!getRes.ok) continue;

    const result = (await getRes.json()) as {
      status: string;
      result_url?: string;
      error?: { description?: string };
    };

    if (result.status === 'done' && result.result_url) {
      console.log(`[BriefNarrator] D-ID ${endpoint} ready`);
      return result.result_url;
    }

    if (result.status === 'error' || result.status === 'rejected') {
      throw new Error(`D-ID ${endpoint} failed: ${result.error?.description || result.status}`);
    }

    console.log(`[BriefNarrator] D-ID ${endpoint} status: ${result.status}...`);
  }

  throw new Error(`D-ID ${endpoint} timed out (5 min)`);
}

/** Download a video from URL and upload to our Supabase Storage. */
async function uploadVideoToStorage(date: string, videoUrl: string): Promise<string> {
  const supabase = getSupabase();
  const path = `${date}/brief-ne.mp4`;

  const res = await fetch(videoUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Failed to download D-ID video: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const { error } = await supabase.storage
    .from('brief-audio')
    .upload(path, buffer, { contentType: 'video/mp4', upsert: true });

  if (error) throw new Error(`Video upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('brief-audio')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

// ── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Generate the full ~2 minute audio brief (NE + EN).
 * This is what users hear when they tap play on the daily page.
 *
 * Generates Nepali first (primary), then English if time permits.
 * Each is a podcast-style narration covering every story in detail.
 *
 * Called by cron: `/api/daily-brief?audioonly=1`
 */
export async function generateFullAudioBrief(
  brief: DailyBrief,
): Promise<BriefAudioResult> {
  const startMs = Date.now();
  console.log(`[BriefNarrator:Audio] Generating full audio for ${brief.date}...`);

  try {
    // Generate scripts (instant — no API call)
    let [fullNeScript, fullEnScript] = await Promise.all([
      generateFullNeBriefScript(brief),
      generateFullEnBriefScript(brief),
    ]);

    // Hard safety: Nepali voice must never read non-Nepali script.
    try {
      fullNeScript = ensureNepaliScriptOrThrow(fullNeScript, 'Full NE script');
    } catch (primaryErr) {
      console.warn(`[BriefNarrator:Audio] ${primaryErr instanceof Error ? primaryErr.message : 'NE script invalid'} — retrying with compact NE script`);
      const compactNeScript = await generateBriefScript(brief);
      fullNeScript = ensureNepaliScriptOrThrow(compactNeScript, 'Compact NE script');
    }

    const fullNeDuration = estimateDuration(fullNeScript, 'ne');
    const fullEnDuration = estimateDuration(fullEnScript, 'en');
    console.log(`[BriefNarrator:Audio] NE: ${fullNeScript.split(/\s+/).length} words (~${fullNeDuration}s), EN: ${fullEnScript.split(/\s+/).length} words (~${fullEnDuration}s)`);

    // Generate NE audio first (primary)
    const fullNeAudio = await generateAudio(fullNeScript, 'ne');
    console.log(`[BriefNarrator:Audio] NE via ${fullNeAudio.provider} (${(fullNeAudio.buffer.length / 1024).toFixed(0)} KB) [${((Date.now() - startMs) / 1000).toFixed(1)}s]`);
    const neUrl = await uploadToStorage(brief.date, fullNeAudio.buffer, 'ne');

    // Generate EN audio (optional)
    let enUrl: string | null = null;
    if (shouldGenerateEnglishAudio()) {
      try {
        const fullEnAudio = await generateAudio(fullEnScript, 'en');
        console.log(`[BriefNarrator:Audio] EN via ${fullEnAudio.provider} (${(fullEnAudio.buffer.length / 1024).toFixed(0)} KB) [${((Date.now() - startMs) / 1000).toFixed(1)}s]`);
        enUrl = await uploadToStorage(brief.date, fullEnAudio.buffer, 'en');
      } catch (enErr) {
        console.warn(`[BriefNarrator:Audio] EN audio failed (NE is saved): ${enErr instanceof Error ? enErr.message : 'unknown'}`);
      }
    } else {
      console.log('[BriefNarrator:Audio] EN audio disabled by BRIEF_GENERATE_EN_AUDIO=false');
    }

    // Update DB with audio URL + duration
    const audioDuration = Math.max(fullNeDuration, fullEnDuration);
    await updateBriefAudioOnly(brief.date, neUrl, audioDuration);
    console.log(`[BriefNarrator:Audio] Done in ${((Date.now() - startMs) / 1000).toFixed(1)}s`);

    return { audioUrl: neUrl, videoUrl: null, durationSeconds: audioDuration, provider: fullNeAudio.provider };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error(`[BriefNarrator:Audio] Failed: ${message}`);
    return { audioUrl: null, videoUrl: null, durationSeconds: 0, provider: 'none', error: message };
  }
}

/**
 * Generate the 30-second video brief (short narration + D-ID avatar).
 * This is the punchy video shown on the daily page.
 *
 * Called by cron: `/api/daily-brief?videoonly=1`
 */
export async function generateVideoBrief(
  brief: DailyBrief,
): Promise<BriefAudioResult> {
  const startMs = Date.now();
  console.log(`[BriefNarrator:Video] Generating video for ${brief.date}...`);

  try {
    if (!process.env.DID_API_KEY) {
      console.log('[BriefNarrator:Video] DID_API_KEY not set — skipping video');
      return { audioUrl: null, videoUrl: null, durationSeconds: 0, provider: 'none' };
    }

    // Check for existing video first
    if (shouldReuseExistingVideo()) {
      const existingVideoUrl = await getExistingVideoUrl(brief.date);
      if (existingVideoUrl) {
        console.log('[BriefNarrator:Video] Reusing existing video');
        return { audioUrl: null, videoUrl: existingVideoUrl, durationSeconds: 30, provider: 'existing' };
      }
    }

    // Generate SHORT punchy script (~30s)
    let videoScript = await generatePunchyVideoScript(brief);
    if (nepaliCharRatio(videoScript) < 0.2) {
      console.warn('[BriefNarrator:Video] Punchy script not Nepali enough — using safe Nepali fallback');
      videoScript = 'आजको मुख्य सार्वजनिक अद्यावधिकहरूको छोटो विवरण तयार भएको छ। थप प्रमाणसहितको पूर्ण विवरण नेपाल रिपब्लिक डट ओआरजीमा हेर्नुहोस्।';
    }
    const wordCount = videoScript.split(/\s+/).filter(Boolean).length;
    console.log(`[BriefNarrator:Video] Script: ${wordCount} words (target <= ${getVideoMaxSeconds()}s)`);

    // TTS for video narration
    let videoNarration: Buffer;
    let videoNarrationProvider = 'edge-tts-sagar';
    try {
      videoNarration = await generateWithEdgeTTS(videoScript, 'ne');
    } catch (edgeErr) {
      if (shouldRequireSagarForVideo()) {
        throw new Error(`Sagar voice required: ${edgeErr instanceof Error ? edgeErr.message : 'unknown'}`);
      }
      const fallbackAudio = await generateAudio(videoScript, 'ne');
      videoNarration = fallbackAudio.buffer;
      videoNarrationProvider = fallbackAudio.provider;
    }

    // Upload narration audio
    const videoNarrationUrl = await uploadNamedAudioToStorage(brief.date, videoNarration, 'brief-video-ne.mp3');
    console.log(`[BriefNarrator:Video] Narration uploaded via ${videoNarrationProvider} [${((Date.now() - startMs) / 1000).toFixed(1)}s]`);

    // Generate D-ID video
    const didResultUrl = await generateVideoWithDID(videoNarrationUrl, 'audio');
    const videoUrl = await uploadVideoToStorage(brief.date, didResultUrl);
    console.log(`[BriefNarrator:Video] Video uploaded: ${videoUrl} [${((Date.now() - startMs) / 1000).toFixed(1)}s]`);

    // Update DB with video URL
    await updateBriefVideoOnly(brief.date, videoUrl);

    return { audioUrl: null, videoUrl, durationSeconds: 30, provider: videoNarrationProvider };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error(`[BriefNarrator:Video] Failed: ${message}`);
    return { audioUrl: null, videoUrl: null, durationSeconds: 0, provider: 'none', error: message };
  }
}

/**
 * Legacy orchestrator — generates both audio + video in one call.
 * Used for local/manual runs where there's no timeout constraint.
 * On Vercel cron, use generateFullAudioBrief() and generateVideoBrief() separately.
 */
export async function generateAndStoreDailyAudio(
  brief: DailyBrief,
): Promise<BriefAudioResult> {
  // Generate audio first
  const audioResult = await generateFullAudioBrief(brief);

  // Then try video (non-fatal)
  const videoEnabled = process.env.BRIEF_VIDEO_ENABLED !== 'false';
  if (videoEnabled && process.env.DID_API_KEY) {
    try {
      const videoResult = await generateVideoBrief(brief);
      return {
        ...audioResult,
        videoUrl: videoResult.videoUrl,
      };
    } catch (videoErr) {
      console.warn('[BriefNarrator] Video generation failed:', videoErr instanceof Error ? videoErr.message : 'unknown');
    }
  }

  return audioResult;
}
