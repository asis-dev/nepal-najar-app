#!/usr/bin/env node
/**
 * Render Services Marketing Reel — 45s vertical Facebook ad
 * English female voiceover (en-US-AriaNeural) + motion graphics
 *
 * Usage: node scripts/render-services-marketing.js [--post]
 */

const { execSync } = require('child_process');
const { readFileSync, mkdirSync, writeFileSync, existsSync } = require('fs');
const { resolve, join } = require('path');

// ── Load env ─────────────────────────────────────────────────────────────
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch { console.error('Could not load .env.local'); process.exit(1); }

const FFMPEG = `${process.env.HOME}/bin/ffmpeg`;
const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const OUTPUT_DIR = resolve(process.env.HOME, 'Desktop/nepal-republic-videos');
const ENTRY = join(ROOT, 'remotion/index.ts');

const shouldPost = process.argv.includes('--post');

// ── Voiceover script — designed for 45s, paced for clarity ──────────────
// Each line ~3-5 seconds. Total ~42s with natural pauses.
const VOICEOVER_EN = `Renewing your Nepali passport?
We know the struggle. Long lines, wrong documents, confusing steps.
What if you could skip all that?
Meet Nepal Republic — your AI-powered government service assistant.
Just type what you need. The AI advisor tells you exactly what documents to bring, what fees to pay, and where to go.
Then track your application, step by step, right from your phone.
And it's not just passports. Citizenship certificates, driving licenses, hospital appointments, electricity bills, tax registration — over 70 government services, all in one place.
Nepal Republic. Free. No signup needed.
Visit nepal republic dot org today.`;

async function generateVoiceover(script, outputPath) {
  console.log('  Generating English female voiceover (AriaNeural)...');
  const { MsEdgeTTS } = require('msedge-tts');
  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-AriaNeural', 'audio-24khz-96kbitrate-mono-mp3');
  const { audioStream } = tts.toStream(script);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on('data', c => chunks.push(c));
    audioStream.on('end', resolve);
    audioStream.on('error', reject);
  });
  const buf = Buffer.concat(chunks);
  if (buf.length < 1000) throw new Error(`TTS too small (${buf.length}B)`);
  writeFileSync(outputPath, buf);
  console.log(`  Voiceover: ${(buf.length / 1024).toFixed(0)} KB`);
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

async function main() {
  const outDir = join(OUTPUT_DIR, 'services-marketing');
  mkdirSync(outDir, { recursive: true });

  const silentVideo = join(outDir, 'services-marketing-silent.mp4');
  const voiceoverPath = join(outDir, 'services-marketing-voice.mp3');
  const finalVideo = join(outDir, 'services-marketing-final.mp4');

  // ── 1. Render with Remotion ──
  console.log('[services-marketing] Rendering video with Remotion...');
  const propsJson = JSON.stringify({ data: {} });
  const propsFile = join(outDir, 'props.json');
  writeFileSync(propsFile, propsJson);

  execSync(
    `npx remotion render "${ENTRY}" ServicesMarketing "${silentVideo}" --props="${propsFile}" --concurrency=4`,
    { cwd: ROOT, stdio: 'inherit', timeout: 300_000 }
  );
  console.log('[services-marketing] ✅ Silent video rendered');

  // ── 2. Generate voiceover ──
  console.log('[services-marketing] Generating voiceover...');
  await generateVoiceover(VOICEOVER_EN, voiceoverPath);

  // ── 3. Merge audio + video ──
  console.log('[services-marketing] Merging audio + video...');

  // Check if ffmpeg exists
  const ffmpegPath = existsSync(FFMPEG) ? FFMPEG : 'ffmpeg';

  execSync(
    `"${ffmpegPath}" -y -i "${silentVideo}" -i "${voiceoverPath}" -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -preset fast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest -movflags +faststart "${finalVideo}"`,
    { stdio: 'inherit', timeout: 120_000 }
  );
  console.log('[services-marketing] ✅ Final video ready:', finalVideo);

  // ── 4. Post to Facebook (if --post) ──
  if (shouldPost) {
    if (!PAGE_ID || !PAGE_TOKEN) {
      console.error('[services-marketing] Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN');
      process.exit(1);
    }

    const caption = `🛂 Renewing your Nepali passport? There's a better way.

Nepal Republic is your free AI-powered government service assistant.

✅ Know exactly what documents you need
✅ See fees and processing times upfront
✅ Track your application step by step
✅ Works for 70+ government services

Passport • Citizenship • License • Hospital • Bills • Tax — all in one place.

👉 Try it free: nepalrepublic.org

No signup needed. No download required.

#NepalRepublic #Nepal #Passport #GovTech #CivicTech #DigitalNepal #नेपाल #पासपोर्ट #सरकारीसेवा`;

    console.log('[services-marketing] Uploading to Facebook...');
    const videoBuffer = readFileSync(finalVideo);
    const sizeMB = (videoBuffer.length / 1024 / 1024).toFixed(1);
    console.log(`[services-marketing] Video size: ${sizeMB} MB`);

    const { body, boundary } = buildMultipart(
      { access_token: PAGE_TOKEN, description: caption, published: 'true' },
      { name: 'source', filename: 'services-marketing.mp4', contentType: 'video/mp4', data: videoBuffer }
    );

    const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    const result = await res.json();

    if (!res.ok) {
      console.error('[services-marketing] ❌ Facebook upload failed:', JSON.stringify(result));
      process.exit(1);
    }
    console.log(`[services-marketing] ✅ Posted to Facebook! Video ID: ${result.id}`);
  } else {
    console.log('[services-marketing] Video saved. Run with --post to upload to Facebook.');
  }
}

main().catch(err => {
  console.error('[services-marketing] ❌', err.message);
  process.exit(1);
});
