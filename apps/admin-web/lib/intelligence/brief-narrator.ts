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
import {
  isHindiLeaning,
  looksLikeNepali,
  normalizeNepaliRegister,
} from './nepali-text';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BriefAudioResult {
  audioUrl: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  provider: string;
  error?: string;
}

// ── Script Generation ────────────────────────────────────────────────────────

const PULSE_LABELS_NE: Record<string, string> = {
  calm: 'शान्त',
  moderate: 'मध्यम',
  active: 'सक्रिय',
  'very active': 'धेरै सक्रिय',
};

const SENTIMENT_NE: Record<string, string> = {
  positive: 'सकारात्मक',
  negative: 'नकारात्मक',
  neutral: 'तटस्थ',
  mixed: 'मिश्रित',
};

const DIRECTION_NE: Record<string, string> = {
  confirms: 'पुष्टि',
  contradicts: 'विरोधाभास',
  new_activity: 'नयाँ गतिविधि',
};

/**
 * Convert a DailyBrief into a natural Nepali narration script using AI.
 * Written like a real Nepali news anchor — warm, conversational, easy to follow.
 * ~300-350 words, ~2 min audio at 120 wpm Nepali reading speed.
 */
export async function generateBriefScript(brief: DailyBrief): Promise<string> {
  // Build context for AI — use more data for a comprehensive 2-minute brief
  const stories = (brief.topStories || []).slice(0, 5);
  const moved = (brief.commitmentsMoved || []).slice(0, 5);
  const pulseLabelNe = PULSE_LABELS_NE[(brief.pulseLabel || '').toLowerCase()] || 'मध्यम';
  const day = Math.max(1, Math.floor((Date.now() - new Date('2026-03-26').getTime()) / 86400000));

  const storyLines = stories.map((s, i) => {
    const title = s.titleNe || s.title;
    const sentimentNe = SENTIMENT_NE[s.sentiment] || 'तटस्थ';
    const sources = s.sources?.join(', ') || '';
    const commitmentCount = s.relatedCommitments?.length || 0;
    return `${i + 1}. ${title} — ${s.summary} (${sentimentNe}, ${s.signalCount} वटा कभरेज, स्रोत: ${sources}, ${commitmentCount} प्रतिबद्धतासँग सम्बन्धित)`;
  }).join('\n');

  const movedLines = moved.map((m) => {
    const directionNe = DIRECTION_NE[m.direction] || 'नयाँ गतिविधि';
    return `- ${m.title}: ${directionNe} (${m.signalCount} संकेत, मुख्य: ${m.keySignal})`;
  }).join('\n');

  // Stats for overview section
  const stats = brief.stats || { totalSignals24h: 0, newSignals: 0, sourcesActive: 0, topSource: '' };

  const prompt = `You are a professional Nepali news anchor for Nepal Republic (नेपाल रिपब्लिक), a civic accountability platform tracking Nepal's government commitments.

Write a daily brief script in NEPALI (नेपाली) for audio narration. This should sound like a Kathmandu news bulletin: sharp, relevant, and focused on government accountability.

CONTENT RULES:
- ONLY stories about government performance, policy, corruption, civic services, infrastructure, accountability
- SKIP: commodity prices, gold rates, sports, festivals, entertainment, mushroom farming, celebrity news, forex rates
- Each story: 1-2 sentences MAX. What happened, why it matters. Move on.
- Do NOT repeat the same point in different words. No padding.
- Say "नागरिकहरूले सोध्नुपर्नेछ" at MOST once in the entire script

Structure:

1. "नमस्कार, नेपाल रिपब्लिकको दैनिक ब्रिफमा स्वागत छ। आज सरकारको ${day} औं दिन हो।"

2. TODAY'S SUMMARY (10-14 sentences total): 4-6 accountability-relevant developments. 1-2 sentences each. Name ministries, officials, amounts. No padding.

3. WATCHPOINT (1-2 sentences): One area where government must answer.

4. "भोलि फेरि भेटौंला। नेपाल रिपब्लिक सुन्नुभएकोमा धन्यवाद।"

Rules:
- ONLY Nepali (Devanagari). No English.
- STRICT WORD LIMIT: 180-220 words. Count carefully. If over 220, cut stories.
- No jargon: no "signal", "source", "pulse", "coverage count"
- Platform: "नेपाल रिपब्लिक" — always use this name
- Nepal newsroom Nepali. "तर" not "लेकिन", "र" not "और", "छ" not "है"
- Pure prose. No markdown, bullets, numbering.
- Paragraph breaks between sections.

Data:
${brief.summaryNe || brief.summaryEn}

Stories:
${storyLines || 'No major stories today'}

Movement:
${movedLines || 'No significant movement today'}

Script (180-220 words max, Nepali only):`;

  try {
    const { aiComplete: ai } = await import('./ai-router');
    const response = await ai('summarize', 'You write natural Nepali broadcast scripts.', prompt);
    const script = normalizeNepaliRegister(response.content.trim());
    // Ensure it's actually in Nepali (basic check)
    if (script.length > 80 && looksLikeNepali(script) && !isHindiLeaning(script)) {
      return script;
    }
  } catch (err) {
    console.warn('[BriefNarrator] AI script generation failed, using fallback:', err instanceof Error ? err.message : 'unknown');
  }

  // Fallback: simple but still natural-sounding
  return generateFallbackScript(brief);
}

/** Fallback script if AI generation fails — still targets ~300 words for 2-min audio */
function generateFallbackScript(brief: DailyBrief): string {
  const stories = (brief.topStories || []).slice(0, 5);
  const moved = (brief.commitmentsMoved || []).slice(0, 5);
  const day = Math.max(1, Math.floor((Date.now() - new Date('2026-03-26').getTime()) / 86400000));
  const stats = brief.stats || { totalSignals24h: 0, newSignals: 0, sourcesActive: 0, topSource: '' };
  const pulseLabelNe = PULSE_LABELS_NE[(brief.pulseLabel || '').toLowerCase()] || 'मध्यम';

  const lines: string[] = [];

  // Section 1: Greeting & context
  lines.push(`नमस्कार। नेपाल रिपब्लिकको दैनिक ब्रिफमा यहाँलाई स्वागत छ।`);
  lines.push(`आज नयाँ सरकारको ${day} औं दिन हो। आजको समग्र गतिविधि ${pulseLabelNe} रहेको छ।`);
  lines.push('');

  // Section 2: Activity overview
  if (stats.totalSignals24h > 0) {
    lines.push(`गत चौबीस घण्टामा ${stats.totalSignals24h} वटा समाचार र कभरेज ${stats.sourcesActive} वटा स्रोतबाट संकलन गरिएको छ।`);
    if (stats.topSource) {
      lines.push(`सबैभन्दा सक्रिय स्रोत ${stats.topSource} रहेको छ।`);
    }
    lines.push('');
  }

  // Section 3: Summary
  if (brief.summaryNe) {
    const cleaned = normalizeNepaliRegister(brief.summaryNe
      .replace(/\s*\(Commitments?\s*[\d,\s]+\)\s*/g, ' ')
      .replace(/\s*-\s*(Confirmed|Shows new|New activity|No new)[^.\n-]*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim());
    lines.push(cleaned);
    lines.push('');
  }

  // Section 4: Top stories with detail
  if (stories.length > 0) {
    lines.push('आजका मुख्य घटनाहरू यसरी देखिएका छन्।');
    lines.push('');
    for (const story of stories) {
      const title = normalizeNepaliRegister(story.titleNe || story.title);
      const sentimentNe = SENTIMENT_NE[story.sentiment] || 'तटस्थ';
      lines.push(`${title}।`);
      if (story.summary) {
        lines.push(`${normalizeNepaliRegister(story.summary)}।`);
      }
      lines.push(`यो विषयमा ${story.signalCount} वटा कभरेज आएको छ र यसको प्रभाव ${sentimentNe} देखिएको छ।`);
      lines.push('');
    }
  }

  // Section 5: Commitments that moved
  if (moved.length > 0) {
    lines.push('सरकारका प्रतिबद्धताहरूमा पनि आज केही हलचल देखिएको छ।');
    for (const m of moved) {
      const directionNe = DIRECTION_NE[m.direction] || 'नयाँ गतिविधि';
      const title = normalizeNepaliRegister(m.title);
      const keySignal = normalizeNepaliRegister(m.keySignal);
      if (m.direction === 'confirms') {
        lines.push(`${title} मा प्रगति ${directionNe} भएको छ। ${keySignal}।`);
      } else if (m.direction === 'contradicts') {
        lines.push(`${title} मा ${directionNe} देखिएको छ। ${keySignal}।`);
      } else {
        lines.push(`${title} मा ${directionNe} देखिएको छ। ${keySignal}।`);
      }
    }
    lines.push('');
  }

  // Section 6: Watchpoint
  const stalledOrContradicted = moved.filter(m => m.direction === 'contradicts');
  if (stalledOrContradicted.length > 0) {
    const watch = stalledOrContradicted[0];
    lines.push(`आज विशेष ध्यान दिनुपर्ने कुरा भनेको ${normalizeNepaliRegister(watch.title)} हो। यसमा सरकारले भनेको र भइरहेको बीचमा अन्तर देखिएको छ। नागरिकहरूले यसलाई नजिकबाट हेर्नुपर्छ।`);
    lines.push('');
  } else if (stories.length > 0) {
    const topStory = stories[0];
    lines.push(`आज विशेष ध्यान दिनुपर्ने कुरा भनेको ${normalizeNepaliRegister(topStory.titleNe || topStory.title)} हो। यसले आम नागरिकको जीवनमा कस्तो प्रभाव पार्छ भन्ने कुरा हामी नजिकबाट हेरिरहेका छौं।`);
    lines.push('');
  }

  // Section 7: Forward look & sign-off
  lines.push('भोलिको ब्रिफमा थप अपडेट ल्याउनेछौं। सरकारका प्रतिबद्धताहरू पूरा भइरहेका छन् कि छैनन्, नेपाल रिपब्लिकले निरन्तर ट्र्याक गरिरहनेछ।');
  lines.push('अहिलेलाई यत्ति। नेपाल रिपब्लिक सुन्नुभएकोमा धन्यवाद।');
  return normalizeNepaliRegister(lines.join('\n'));
}

/**
 * Generate an English version of the daily brief for audio narration.
 */
export async function generateEnglishBriefScript(brief: DailyBrief): Promise<string> {
  const stories = (brief.topStories || []).slice(0, 5);
  const moved = (brief.commitmentsMoved || []).slice(0, 5);
  const day = Math.max(1, Math.floor((Date.now() - new Date('2026-03-26').getTime()) / 86400000));

  const storyLines = stories.map((s, i) => {
    return `${i + 1}. ${s.title} — ${s.summary} (${s.signalCount} sources)`;
  }).join('\n');

  const movedLines = moved.map((m) => {
    return `- ${m.title}: ${m.direction} (${m.signalCount} signals, key: ${m.keySignal})`;
  }).join('\n');

  const prompt = `Write a short English daily brief script for Nepal Republic, a government accountability platform.

Structure:
1. "Hello, welcome to the Nepal Republic daily brief. Day ${day} of the new government."
2. Cover 4-6 key developments in 1-2 sentences each. Focus on government accountability, policy, corruption, civic issues.
3. End with: "That's all for today. Thank you for listening to Nepal Republic."

Rules:
- 150-200 words MAX. Be concise.
- Skip gold prices, forex, sports, entertainment, festivals
- Each story: what happened + why it matters. No padding.
- Plain conversational English. No jargon.
- Pure prose, no bullets or markdown.

Stories:
${storyLines || 'No major stories'}

Commitments:
${movedLines || 'No movement'}

Write the script (150-200 words):`;

  try {
    const { aiComplete: ai } = await import('./ai-router');
    const response = await ai('summarize', 'You write concise English news brief scripts.', prompt);
    return response.content.trim();
  } catch {
    // Fallback
    const lines: string[] = [];
    lines.push(`Hello, welcome to the Nepal Republic daily brief. Day ${day} of the new government.`);
    if (brief.summaryEn) {
      lines.push(brief.summaryEn.replace(/^-\s*/gm, '').split('\n').filter(l => l.trim()).join(' '));
    }
    lines.push("That's all for today. Thank you for listening to Nepal Republic.");
    return lines.join('\n\n');
  }
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
 * Uses ne-NP-HemkalaNeural for Nepali, en-US-AriaNeural for English.
 */
async function generateWithEdgeTTS(script: string, lang: 'ne' | 'en' = 'ne'): Promise<Buffer> {
  const { MsEdgeTTS } = await import('msedge-tts');
  const tts = new MsEdgeTTS();

  const voice = lang === 'ne' ? 'ne-NP-HemkalaNeural' : 'en-US-AriaNeural';
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
 * For Nepali: Edge TTS (Hemkala) is preferred — free, high quality.
 * For English: Edge TTS (Aria) first, then OpenAI fallback.
 */
async function generateAudio(script: string, lang: 'ne' | 'en' = 'ne'): Promise<{ buffer: Buffer; provider: string }> {
  // Priority 1: Edge TTS (free, Hemkala for Nepali, Aria for English)
  try {
    const buffer = await generateWithEdgeTTS(script, lang);
    return { buffer, provider: `edge-tts-${lang === 'ne' ? 'hemkala' : 'aria'}` };
  } catch (err) {
    console.warn('[BriefNarrator] Edge TTS failed:', err instanceof Error ? err.message : 'unknown');
  }

  // Priority 2: ElevenLabs (paid, good quality)
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const buffer = await generateWithElevenLabs(script);
      return { buffer, provider: 'elevenlabs' };
    } catch (err) {
      console.warn('[BriefNarrator] ElevenLabs failed:', err instanceof Error ? err.message : 'unknown');
    }
  }

  // Priority 3: OpenAI TTS (paid)
  if (process.env.OPENAI_API_KEY) {
    try {
      const buffer = await generateWithOpenAI(script);
      return { buffer, provider: 'openai' };
    } catch (err) {
      console.warn('[BriefNarrator] OpenAI TTS failed:', err instanceof Error ? err.message : 'unknown');
    }
  }

  throw new Error('No TTS provider available');
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
 * Uses Premium+ presenter with Hemkala Nepali voice for text mode,
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
            voice_id: process.env.DID_VOICE_ID || 'ne-NP-HemkalaNeural',
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
            voice_id: process.env.DID_VOICE_ID || 'ne-NP-HemkalaNeural',
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
 * Generate and store daily brief media (audio + video if D-ID configured).
 * Called from sweep after daily brief generation.
 *
 * Flow: Script → TTS audio → Upload → D-ID video (optional) → Upload → Update DB
 */
export async function generateAndStoreDailyAudio(
  brief: DailyBrief,
): Promise<BriefAudioResult> {
  console.log(`[BriefNarrator] Generating media for ${brief.date}...`);

  try {
    // Step 1: Generate both Nepali and English scripts in parallel
    const [neScript, enScript] = await Promise.all([
      generateBriefScript(brief),
      generateEnglishBriefScript(brief),
    ]);
    const neDuration = estimateDuration(neScript, 'ne');
    const enDuration = estimateDuration(enScript, 'en');
    console.log(`[BriefNarrator] NE script: ${neScript.split(/\s+/).length} words, ~${neDuration}s`);
    console.log(`[BriefNarrator] EN script: ${enScript.split(/\s+/).length} words, ~${enDuration}s`);

    // Step 2: Generate both MP3s in parallel (Hemkala for NE, Aria for EN)
    const [neAudio, enAudio] = await Promise.all([
      generateAudio(neScript, 'ne'),
      generateAudio(enScript, 'en'),
    ]);
    console.log(`[BriefNarrator] NE audio via ${neAudio.provider} (${(neAudio.buffer.length / 1024).toFixed(0)} KB)`);
    console.log(`[BriefNarrator] EN audio via ${enAudio.provider} (${(enAudio.buffer.length / 1024).toFixed(0)} KB)`);

    // Step 3: Upload both to Supabase Storage in parallel
    const [neUrl, enUrl] = await Promise.all([
      uploadToStorage(brief.date, neAudio.buffer, 'ne'),
      uploadToStorage(brief.date, enAudio.buffer, 'en'),
    ]);
    console.log(`[BriefNarrator] NE audio uploaded: ${neUrl}`);
    console.log(`[BriefNarrator] EN audio uploaded: ${enUrl}`);

    // Step 4: Skip D-ID video (credits exhausted)
    const videoUrl: string | null = null;

    // Step 5: Update daily_briefs record (audio_url stores NE, EN is derived from path)
    await updateBriefRecord(brief.date, neUrl, videoUrl, Math.max(neDuration, enDuration));

    return { audioUrl: neUrl, videoUrl, durationSeconds: Math.max(neDuration, enDuration), provider: neAudio.provider };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.warn(`[BriefNarrator] Failed: ${message}`);
    return { audioUrl: null, videoUrl: null, durationSeconds: 0, provider: 'none', error: message };
  }
}
