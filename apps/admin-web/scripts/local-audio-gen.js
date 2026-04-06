#!/usr/bin/env node
/**
 * Local Audio Generator — runs on your Mac via launchd cron
 *
 * Uses Edge TTS (Sagar voice for Nepali, Aria for English) locally,
 * where Microsoft doesn't block the WebSocket connection.
 * Uploads to Supabase Storage and updates the daily_briefs record.
 *
 * Usage:  node scripts/local-audio-gen.js
 * Env:    reads from .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');

// ── Load .env.local ─────────────────────────────────────────────────────────
const envPath = resolve(__dirname, '..', '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error('Could not load .env.local');
  process.exit(1);
}

// ── Constants ───────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOV_START = new Date('2026-03-26T00:00:00+05:45');
const EDGE_TTS_TIMEOUT = 60_000; // 60s locally (more generous than Vercel)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

function todayDate() {
  // Nepal is UTC+5:45
  const now = new Date();
  const nepal = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
  return nepal.toISOString().slice(0, 10);
}

function dayInOffice() {
  return Math.max(1, Math.floor((Date.now() - GOV_START.getTime()) / 86400000) + 1);
}

// ── Supabase helpers ────────────────────────────────────────────────────────
async function supabaseGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabaseUpdate(table, match, data) {
  const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join('&');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Supabase UPDATE ${table}: ${res.status} ${await res.text()}`);
}

async function supabaseUpload(bucket, path, buffer) {
  // Try upsert via POST with x-upsert header
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload ${path}: ${res.status} ${text}`);
  }
  // Return public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ── Script generation (matches brief-narrator.ts) ───────────────────────────
function looksLikeNepali(text) {
  if (!text) return false;
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  return devanagari / Math.max(1, text.length) > 0.15;
}

function pickNepaliText(...candidates) {
  for (const v of candidates) {
    const s = String(v || '').trim();
    if (s && looksLikeNepali(s)) return s;
  }
  return '';
}

function compactSummary(summary, maxWords) {
  const cleaned = summary.replace(/^[-•]\s*/gm, '').replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!cleaned) return '';
  const sentences = cleaned.split(/(?<=[।.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const picked = [];
  let used = 0;
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean).length;
    if (!words) continue;
    if (used + words <= maxWords) { picked.push(sentence); used += words; continue; }
    if (picked.length === 0) { picked.push(sentence.split(/\s+/).slice(0, Math.max(8, maxWords)).join(' ') + '...'); }
    break;
  }
  return picked.join(' ');
}

function generateNeScript(brief) {
  const day = dayInOffice();
  const targetWords = 240;
  const lines = [];

  lines.push('नमस्कार, नेपाल रिपब्लिकको दैनिक ब्रिफमा स्वागत छ।');
  lines.push(`आज सरकारको ${day} औं दिन हो।`);
  const signals = brief.stats?.newSignals || 0;
  const stories = brief.top_stories || [];
  lines.push(`पछिल्लो २४ घण्टामा ${signals} नयाँ संकेत र ${stories.length} मुख्य कथा भेटिएको छ।`);
  lines.push('');

  const storyBudget = Math.max(25, Math.floor((targetWords - 80) / Math.max(1, stories.length)));
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const headline = pickNepaliText(story.titleNe, story.title);
    if (!headline) continue;
    lines.push(`कथा ${i + 1}: ${headline}।`);
    const detail = pickNepaliText(story.summaryNe, story.summary);
    if (detail) {
      const compacted = compactSummary(detail, storyBudget);
      if (compacted) lines.push(compacted);
    }
    if (story.signalCount > 1) {
      lines.push(`यो कथा ${story.signalCount} स्रोतबाट पुष्टि भएको छ।`);
    }
    lines.push('');
  }

  // Commitments moved
  const moved = brief.commitments_moved || [];
  if (moved.length > 0) {
    const confirms = moved.filter(c => c.direction === 'confirms').length;
    const contradicts = moved.filter(c => c.direction === 'contradicts').length;
    if (confirms > 0) lines.push(`${confirms} प्रतिबद्धतामा प्रगति देखिएको छ।`);
    if (contradicts > 0) lines.push(`${contradicts} प्रतिबद्धतामा चिन्ता देखिएको छ।`);
    lines.push('');
  }

  lines.push('थप प्रमाणसहितको विवरण नेपाल रिपब्लिक डट ओआरजीमा हेर्नुहोस्।');
  lines.push('भोलि फेरि भेटौंला। नेपाल रिपब्लिक सुन्नुभएकोमा धन्यवाद।');
  return lines.join('\n');
}

function generateEnScript(brief) {
  const day = dayInOffice();
  const lines = [];
  const stories = brief.top_stories || [];
  const signals = brief.stats?.newSignals || 0;
  const sourcesActive = brief.stats?.sourcesActive || 0;

  lines.push(`Hello, welcome to the Nepal Republic daily brief. Today is day ${day} of the new government.`);
  lines.push(`In the last 24 hours, we tracked ${signals} new signals across ${sourcesActive} sources, with ${stories.length} major stories emerging.`);
  lines.push('');

  const storyBudget = Math.max(30, Math.floor(210 / Math.max(1, stories.length)));
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const headline = story.title || story.titleNe || '';
    if (!headline) continue;
    lines.push(`Story ${i + 1}: ${headline}.`);
    const detail = story.summary || story.summaryNe || '';
    if (detail) {
      const compacted = compactSummary(detail, storyBudget);
      if (compacted) lines.push(compacted);
    }
    const sentLabel = story.sentiment === 'positive' ? 'positive development'
      : story.sentiment === 'negative' ? 'concerning development'
      : story.sentiment === 'mixed' ? 'mixed reactions' : '';
    if (sentLabel && story.signalCount > 1) {
      lines.push(`This is seen as a ${sentLabel}, covered by ${story.signalCount} sources.`);
    }
    lines.push('');
  }

  const moved = brief.commitments_moved || [];
  if (moved.length > 0) {
    const confirms = moved.filter(c => c.direction === 'confirms').length;
    const contradicts = moved.filter(c => c.direction === 'contradicts').length;
    const parts = [];
    if (confirms > 0) parts.push(`${confirms} commitment${confirms > 1 ? 's' : ''} showing progress`);
    if (contradicts > 0) parts.push(`${contradicts} facing setbacks`);
    if (parts.length) lines.push(`On the commitment tracker: ${parts.join(', and ')}.`);
    lines.push('');
  }

  lines.push(`Today's activity pulse is ${brief.pulse} out of 100, rated as ${brief.pulse_label}.`);
  lines.push('');
  lines.push('For full evidence-backed details, visit nepalrepublic.org.');
  lines.push("That's all for today. Thank you for listening to Nepal Republic.");
  return lines.join('\n');
}

// ── Edge TTS ────────────────────────────────────────────────────────────────
async function edgeTTS(script, lang) {
  const { MsEdgeTTS } = require('msedge-tts');
  const tts = new MsEdgeTTS();
  const voice = lang === 'ne' ? 'ne-NP-SagarNeural' : 'en-US-AriaNeural';

  return Promise.race([
    (async () => {
      await tts.setMetadata(voice, 'audio-24khz-96kbitrate-mono-mp3');
      const { audioStream } = tts.toStream(script);
      const chunks = [];
      return new Promise((resolve, reject) => {
        audioStream.on('data', c => chunks.push(c));
        audioStream.on('end', () => resolve(Buffer.concat(chunks)));
        audioStream.on('error', reject);
      });
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Edge TTS timeout (${EDGE_TTS_TIMEOUT / 1000}s)`)), EDGE_TTS_TIMEOUT)
    ),
  ]);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const date = todayDate();
  console.log(`[local-audio] Generating audio for ${date} (day ${dayInOffice()})...`);

  // 1. Fetch today's brief
  const briefs = await supabaseGet('daily_briefs', `date=eq.${date}&select=*`);
  if (!briefs.length) {
    console.error(`[local-audio] No brief found for ${date} — skipping`);
    process.exit(0);
  }
  const brief = briefs[0];

  // 2. Generate scripts
  const neScript = generateNeScript(brief);
  const enScript = generateEnScript(brief);
  const neWords = neScript.split(/\s+/).filter(Boolean).length;
  const enWords = enScript.split(/\s+/).filter(Boolean).length;
  console.log(`[local-audio] Scripts: NE ${neWords} words, EN ${enWords} words`);

  // 3. Generate audio with Edge TTS
  console.log('[local-audio] Generating NE audio (Sagar)...');
  const neStart = Date.now();
  const neBuffer = await edgeTTS(neScript, 'ne');
  console.log(`[local-audio] NE: ${(neBuffer.length / 1024).toFixed(0)} KB in ${((Date.now() - neStart) / 1000).toFixed(1)}s`);

  console.log('[local-audio] Generating EN audio (Aria)...');
  const enStart = Date.now();
  const enBuffer = await edgeTTS(enScript, 'en');
  console.log(`[local-audio] EN: ${(enBuffer.length / 1024).toFixed(0)} KB in ${((Date.now() - enStart) / 1000).toFixed(1)}s`);

  // 4. Upload to Supabase Storage
  console.log('[local-audio] Uploading to Supabase...');
  const neUrl = await supabaseUpload('brief-audio', `${date}/brief-ne.mp3`, neBuffer);
  const enUrl = await supabaseUpload('brief-audio', `${date}/brief-en.mp3`, enBuffer);
  console.log(`[local-audio] NE: ${neUrl}`);
  console.log(`[local-audio] EN: ${enUrl}`);

  // 5. Update daily_briefs record
  const neDuration = Math.ceil((neWords / 120) * 60);
  const enDuration = Math.ceil((enWords / 150) * 60);
  await supabaseUpdate('daily_briefs', { date }, {
    audio_url: neUrl,
    audio_generated_at: new Date().toISOString(),
    audio_duration_seconds: Math.max(neDuration, enDuration),
  });

  console.log(`[local-audio] ✅ Done! Sagar audio live for ${date} (~${neDuration}s NE, ~${enDuration}s EN)`);
}

main().catch(err => {
  console.error('[local-audio] ❌ Failed:', err.message);
  process.exit(1);
});
