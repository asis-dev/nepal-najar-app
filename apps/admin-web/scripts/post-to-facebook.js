#!/usr/bin/env node
/**
 * Facebook Auto-Poster — uploads daily video reel to Nepal Republic FB Page
 * Uses Facebook Graph API with a never-expiring Page Access Token.
 *
 * Usage: node scripts/post-to-facebook.js [video-number]
 *   video-number: 1-5 (default: 1 = daily-scorecard)
 *     1 = daily-scorecard
 *     2 = top-story
 *     3 = commitment-tracker
 *     4 = minister-callout
 *     5 = week-in-review
 */

const { readFileSync, existsSync } = require('fs');
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

const { execSync } = require('child_process');
const FFMPEG = `${process.env.HOME}/bin/ffmpeg`;

const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOV_START = new Date('2026-03-26T00:00:00+05:45');
const OUTPUT_DIR = resolve(process.env.HOME, 'Desktop/nepal-republic-videos');

if (!PAGE_ID || !PAGE_TOKEN) {
  console.error('[fb-post] Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

function todayDate() {
  const now = new Date();
  const nepal = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
  return nepal.toISOString().slice(0, 10);
}

function dayInOffice() {
  return Math.max(1, Math.floor((Date.now() - GOV_START.getTime()) / 86400000) + 1);
}

const VIDEO_TYPES = {
  1: { file: '1-daily-reel.mp4', name: 'Daily Reel (Nepali)' },
  2: { file: '2-daily-reel-en.mp4', name: 'Daily Reel (English)' },
  // 🔥 NEW: Hype Reel — 15s viral short (preferred for social)
  7: { file: 'hype-reel.mp4', name: 'Hype Reel (15s viral)' },
  8: { file: 'hype-reel-silent.mp4', name: 'Hype Reel Silent (15s text-only)' },
  // Legacy fallbacks
  3: { file: '1-daily-scorecard.mp4', name: 'Daily Scorecard (legacy)' },
  4: { file: '2-top-story.mp4', name: 'Top Story (legacy)' },
  5: { file: '3-commitment-tracker.mp4', name: 'Commitment Tracker (legacy)' },
  6: { file: '6-daily-scorecard-en.mp4', name: 'Daily Scorecard EN (legacy)' },
};

function generateCaption(videoNum, date) {
  const day = dayInOffice();

  // For hype reels, try to read the generated props for dynamic caption
  if (videoNum === 7 || videoNum === 8) {
    return generateHypeCaption(date, day);
  }

  const captions = {
    1: `📊 दिन ${day} — सरकारले आज के गर्यो?\n\n🔴 आजका मुख्य समाचार + १०९ वचनबद्धता ट्र्याकर + PM स्कोरकार्ड — सबै एकै ठाउँमा!\n\nAI ले हरेक दिन ट्र्याक गर्दैछ। ${day} दिनमा कति प्रगति?\n\n👉 nepalrepublic.org\n\nसरकारलाई कति अंक दिनुहुन्छ? कमेन्टमा भन्नुहोस् 👇\n\n#NepalRepublic #नेपालरिपब्लिक #Nepal #BalenShah #बालेनशाह #RSP #सरकार #जवाफदेही #GovAccountability #Day${day} #नेपाल #प्रधानमन्त्री`,
    2: `📊 Day ${day} — What has Nepal's government done today?\n\n🔴 Top headlines + 109 promise tracker + PM scorecard — all in 60 seconds!\n\nAI-powered daily accountability tracker for Nepal's RSP government.\n\n👉 nepalrepublic.org\n\nHow would you grade this government? Drop your score 👇\n\n#NepalRepublic #Nepal #BalenShah #GovernmentTracker #Accountability #AI #Day${day} #RSP #NepalPolitics #PMNepal`,
    3: `📊 दिन ${day} — सरकारले आज के गर्यो?\n\n👉 nepalrepublic.org\n\n#NepalRepublic #नेपालरिपब्लिक #Nepal #BalenShah #Day${day}`,
    4: `📊 दिन ${day}\n\n👉 nepalrepublic.org\n\n#NepalRepublic #Nepal`,
    5: `📊 दिन ${day}\n\n👉 nepalrepublic.org\n\n#NepalRepublic #Nepal`,
    6: `📊 Day ${day}\n\n👉 nepalrepublic.org\n\n#NepalRepublic #Nepal`,
  };
  return captions[videoNum] || captions[1];
}

function generateHypeCaption(date, day) {
  // Dynamic caption from the top story — optimized for Facebook engagement
  return `🔴 दिन ${day}\n\nसरकारको ${day} दिनमा के भयो? 15 सेकेन्डमा हेर्नुहोस्!\n\n💬 तपाईंको विचार कमेन्टमा भन्नुहोस् 👇\n\n👉 nepalrepublic.org — AI-powered government tracker\n\n#NepalRepublic #नेपाल #बालेनशाह #सरकार #Day${day} #Nepal #BalenShah #RSP`;
}

function buildMultipart(fields, fileField) {
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const parts = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`);
  }
  if (fileField) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.contentType}\r\n\r\n`
    );
    const preamble = Buffer.from(parts.join('\r\n'));
    const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);
    return { body: Buffer.concat([preamble, fileField.data, epilogue]), boundary };
  }
  parts.push(`--${boundary}--`);
  return { body: Buffer.from(parts.join('\r\n')), boundary };
}

function prepareForFacebook(videoPath) {
  // Re-encode with Facebook-compatible settings:
  // - H.264 Main profile (not High)
  // - yuv420p (not yuvj420p full range)
  // - 44100 Hz audio (not 24000)
  // - movflags +faststart (moov atom at front)
  const fixedPath = videoPath.replace('.mp4', '-fb.mp4');
  try {
    execSync(
      `"${FFMPEG}" -y -i "${videoPath}" -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -preset fast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -movflags +faststart "${fixedPath}"`,
      { stdio: 'pipe', timeout: 120_000 }
    );
    console.log('[fb-post] Re-encoded for Facebook (main profile, yuv420p, 44.1kHz audio)');
    return fixedPath;
  } catch (err) {
    console.warn('[fb-post] Re-encode failed, using original:', err.message?.slice(0, 120));
    return videoPath;
  }
}

async function uploadVideoToFacebook(videoPath, caption) {
  // Re-encode for Facebook compatibility
  const uploadPath = prepareForFacebook(videoPath);
  const videoBuffer = readFileSync(uploadPath);
  const sizeMB = (videoBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`[fb-post] Uploading ${sizeMB} MB video...`);

  // Try regular /videos endpoint (reliable, shows as video post)
  const { body, boundary } = buildMultipart(
    { access_token: PAGE_TOKEN, description: caption, published: 'true' },
    { name: 'source', filename: 'reel.mp4', contentType: 'video/mp4', data: videoBuffer }
  );

  const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Facebook video upload failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const videoNum = parseInt(process.argv[2]) || 1;
  const date = todayDate();
  const videoInfo = VIDEO_TYPES[videoNum];

  if (!videoInfo) {
    console.error(`[fb-post] Invalid video number: ${videoNum}. Use 1-5.`);
    process.exit(1);
  }

  // Check for today's video
  const videoDir = join(OUTPUT_DIR, date);
  const videoPath = join(videoDir, videoInfo.file);

  if (!existsSync(videoPath)) {
    // Fallback to flat directory structure
    const flatPath = join(OUTPUT_DIR, `${date}-final.mp4`);
    if (videoNum === 1 && existsSync(flatPath)) {
      console.log(`[fb-post] Using flat video: ${flatPath}`);
      const caption = generateCaption(videoNum, date);
      const result = await uploadVideoToFacebook(flatPath, caption);
      console.log(`[fb-post] ✅ Posted! ID: ${result.id}`);
      return;
    }
    console.error(`[fb-post] Video not found: ${videoPath}`);
    process.exit(1);
  }

  const caption = generateCaption(videoNum, date);
  console.log(`[fb-post] Posting ${videoInfo.name} for ${date} (Day ${dayInOffice()})...`);
  console.log(`[fb-post] Caption:\n${caption}\n`);

  const result = await uploadVideoToFacebook(videoPath, caption);
  console.log(`[fb-post] ✅ Posted to Facebook! Video ID: ${result.id}`);

  // Log to Supabase if available
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/daily_briefs?date=eq.${date}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          fb_video_id: result.id,
          fb_posted_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('[fb-post] Could not update Supabase:', err.message);
    }
  }
}

main().catch(err => {
  console.error('[fb-post] ❌', err.message);
  process.exit(1);
});
