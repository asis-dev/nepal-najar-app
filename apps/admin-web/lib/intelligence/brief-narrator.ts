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
import { normalizeNepaliRegister } from './nepali-text';
import { dayInOffice } from './government-era';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BriefAudioResult {
  audioUrl: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  provider: string;
  error?: string;
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
  const lines: string[] = [];

  // Greeting
  lines.push(`नमस्कार, नेपाल रिपब्लिकको दैनिक ब्रिफमा स्वागत छ। आज सरकारको ${day} औं दिन हो।`);
  lines.push('');

  // Main content: use the SAME summaryNe that's shown on screen
  if (brief.summaryNe && brief.summaryNe.trim().length > 20) {
    // Clean up bullet formatting for spoken delivery
    const spokenSummary = brief.summaryNe
      .replace(/^[-•]\s*/gm, '')           // remove bullet markers
      .replace(/\n{3,}/g, '\n\n')          // collapse excessive newlines
      .trim();
    lines.push(spokenSummary);
    lines.push('');
  }

  // Sign-off
  lines.push('भोलि फेरि भेटौंला। नेपाल रिपब्लिक सुन्नुभएकोमा धन्यवाद।');

  return normalizeNepaliRegister(lines.join('\n'));
}

// generateFallbackScript removed — no longer needed since scripts read from the brief directly

/**
 * Generate an English version of the daily brief for audio narration.
 *
 * Like the Nepali version, this reads the SAME summaryEn content — no separate AI call.
 */
export async function generateEnglishBriefScript(brief: DailyBrief): Promise<string> {
  const day = dayInOffice();
  const lines: string[] = [];

  lines.push(`Hello, welcome to the Nepal Republic daily brief. Day ${day} of the new government.`);

  if (brief.summaryEn && brief.summaryEn.trim().length > 20) {
    // Convert bullet list to spoken prose
    const spokenSummary = brief.summaryEn
      .replace(/^[-•]\s*/gm, '')
      .split('\n')
      .filter(l => l.trim())
      .join(' ');
    lines.push(spokenSummary);
  }

  lines.push("That's all for today. Thank you for listening to Nepal Republic.");

  return lines.join('\n\n');
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
async function generateWithEdgeTTS(script: string, lang: 'ne' | 'en' = 'ne'): Promise<Buffer> {
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
  // Priority 1: Edge TTS (free, Sagar for Nepali, Aria for English)
  try {
    const buffer = await generateWithEdgeTTS(script, lang);
    return { buffer, provider: `edge-tts-${lang === 'ne' ? 'sagar' : 'aria'}` };
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

    // Step 2: Generate both MP3s in parallel (Sagar for NE, Aria for EN)
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
