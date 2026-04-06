#!/usr/bin/env node
/**
 * Daily Video Renderer — generates a 32-second vertical reel
 * from the daily brief data using Remotion + Edge TTS voiceover.
 *
 * Output: ~/Desktop/nepal-republic-videos/YYYY-MM-DD.mp4
 *
 * Usage: node scripts/render-daily-video.js
 */

const { execSync } = require('child_process');
const { readFileSync, mkdirSync, existsSync, writeFileSync } = require('fs');
const { resolve, join } = require('path');

// ── Load .env.local ─────────────────────────────────────────────────────────
const ROOT = resolve(__dirname, '..');
const envPath = join(ROOT, '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch { console.error('Could not load .env.local'); process.exit(1); }

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOV_START = new Date('2026-03-26T00:00:00+05:45');
const OUTPUT_DIR = resolve(process.env.HOME, 'Desktop/nepal-republic-videos');

function todayDate() {
  const now = new Date();
  const nepal = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
  return nepal.toISOString().slice(0, 10);
}

function dayInOffice() {
  return Math.max(1, Math.floor((Date.now() - GOV_START.getTime()) / 86400000) + 1);
}

async function supabaseGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status}`);
  return res.json();
}

async function generateVoiceover(script, outputPath) {
  const { MsEdgeTTS } = require('msedge-tts');
  const tts = new MsEdgeTTS();
  await tts.setMetadata('ne-NP-SagarNeural', 'audio-24khz-96kbitrate-mono-mp3');
  const { audioStream } = tts.toStream(script);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on('data', c => chunks.push(c));
    audioStream.on('end', resolve);
    audioStream.on('error', reject);
  });
  const { writeFileSync } = require('fs');
  writeFileSync(outputPath, Buffer.concat(chunks));
  return outputPath;
}

function generateVoiceoverScript(brief) {
  const day = dayInOffice();
  const stories = brief.top_stories || [];
  const lines = [];

  lines.push(`नमस्कार। आज सरकारको ${day} औं दिन हो।`);
  lines.push(`पछिल्लो २४ घण्टामा ${brief.stats?.newSignals || 0} नयाँ संकेत भेटियो।`);

  for (let i = 0; i < Math.min(3, stories.length); i++) {
    const title = stories[i].titleNe || stories[i].title;
    if (title) lines.push(title + '।');
  }

  const moved = brief.commitments_moved || [];
  const confirms = moved.filter(c => c.direction === 'confirms').length;
  if (confirms > 0) lines.push(`${confirms} प्रतिबद्धतामा प्रगति देखियो।`);

  lines.push('थप विवरण नेपाल रिपब्लिक डट ओआरजीमा हेर्नुहोस्।');
  return lines.join(' ');
}

async function main() {
  const date = todayDate();
  console.log(`[video] Rendering daily reel for ${date}...`);

  // 1. Fetch brief
  const briefs = await supabaseGet('daily_briefs', `date=eq.${date}&select=*`);
  if (!briefs.length) {
    console.error(`[video] No brief for ${date}`); process.exit(1);
  }
  const brief = briefs[0];

  // 2. Count signals
  const signalCountRes = await fetch(`${SUPABASE_URL}/rest/v1/intelligence_signals?select=id&discovered_at=gte.${date}T00:00:00Z`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact', Range: '0-0' },
  });
  const contentRange = signalCountRes.headers.get('content-range') || '0-0/0';
  const totalSignals = parseInt(contentRange.split('/')[1]) || 0;

  // 3. Build video data
  const moved = brief.commitments_moved || [];
  const videoData = {
    date,
    dayNumber: dayInOffice(),
    pulse: brief.pulse || 0,
    pulseLabel: brief.pulse_label || 'unknown',
    phase: dayInOffice() <= 30 ? 'early' : dayInOffice() <= 100 ? 'ramp' : 'delivery',
    topStories: (brief.top_stories || []).slice(0, 5).map(s => ({
      title: s.title || '',
      titleNe: s.titleNe || s.title_ne || '',
      sentiment: s.sentiment || 'neutral',
      signalCount: s.signalCount || s.signal_count || 0,
    })),
    stats: {
      totalSignals: 38200 + totalSignals,
      newSignals: totalSignals,
      sourcesActive: brief.stats?.sourcesActive || 80,
      commitmentsTracked: 109,
    },
    commitmentsMoved: {
      confirms: moved.filter(c => c.direction === 'confirms').length,
      contradicts: moved.filter(c => c.direction === 'contradicts').length,
    },
  };

  // 4. Generate voiceover
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const voiceoverPath = join(OUTPUT_DIR, `${date}-voiceover.mp3`);
  const voiceoverScript = generateVoiceoverScript(brief);
  console.log(`[video] Generating voiceover (${voiceoverScript.split(/\s+/).length} words)...`);
  await generateVoiceover(voiceoverScript, voiceoverPath);
  console.log(`[video] Voiceover saved: ${voiceoverPath}`);

  // 5. Write props file for Remotion
  const propsPath = join(OUTPUT_DIR, `${date}-props.json`);
  writeFileSync(propsPath, JSON.stringify({ data: videoData }, null, 2));
  console.log(`[video] Props written: ${propsPath}`);

  // 6. Render video with Remotion
  const outputPath = join(OUTPUT_DIR, `${date}.mp4`);
  const entryPoint = join(ROOT, 'remotion/index.ts');

  console.log('[video] Rendering video with Remotion...');
  try {
    execSync(
      `npx remotion render "${entryPoint}" DailyScorecard "${outputPath}" --props="${propsPath}" --codec=h264 --log=error`,
      { cwd: ROOT, stdio: 'inherit', timeout: 300_000 }
    );
  } catch (err) {
    console.error('[video] Remotion render failed:', err.message);
    process.exit(1);
  }

  // 7. Merge voiceover with video using ffmpeg
  const finalPath = join(OUTPUT_DIR, `${date}-final.mp4`);
  console.log('[video] Merging voiceover with video...');
  try {
    const ffmpegBin = process.env.FFMPEG_PATH || `${process.env.HOME}/bin/ffmpeg`;
    execSync(
      `"${ffmpegBin}" -y -i "${outputPath}" -i "${voiceoverPath}" -filter_complex "[1:a]apad=whole_dur=32[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 128k -t 32 "${finalPath}"`,
      { cwd: ROOT, stdio: 'inherit', timeout: 60_000 }
    );
    console.log(`[video] ✅ Final video: ${finalPath}`);
  } catch (err) {
    console.warn('[video] ffmpeg merge failed, video without audio:', err.message);
    console.log(`[video] ✅ Video (no audio): ${outputPath}`);
  }

  // 8. Also upload to Supabase storage for sharing
  try {
    const videoBuffer = readFileSync(finalPath);
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/brief-audio/${date}/daily-reel.mp4`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'video/mp4',
        'x-upsert': 'true',
      },
      body: videoBuffer,
    });
    if (uploadRes.ok) {
      console.log(`[video] Uploaded to Supabase: ${SUPABASE_URL}/storage/v1/object/public/brief-audio/${date}/daily-reel.mp4`);
    }
  } catch (uploadErr) {
    console.warn('[video] Upload to Supabase failed (video saved locally):', uploadErr.message);
  }

  console.log(`\n🎬 Done! Your daily reel is at:\n   ${finalPath}\n   Upload to TikTok/Reels/Shorts!\n`);
}

main().catch(err => { console.error('[video] ❌', err.message); process.exit(1); });
