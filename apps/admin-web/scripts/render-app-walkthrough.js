#!/usr/bin/env node
/**
 * Render App Walkthrough — 40s vertical Facebook demo video
 * English female voiceover (en-US-AriaNeural) + motion graphics
 *
 * Usage: node scripts/render-app-walkthrough.js [--post]
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

// ── Voiceover script — 40s paced walkthrough ──────────────
const VOICEOVER_EN = `Government services, simplified. Here's how Nepal Republic works.
Step one. Open the app and tell the AI advisor what you need. Type it in English, Nepali, or Romanized — it understands all three.
Step two. The AI instantly shows you everything. Documents required, fees, processing time, and the nearest office. No guessing, no confusion.
Step three. Track your application in real time. See exactly which step you're at, and get notified the moment anything changes.
Step four. It works for over 70 government services. Passports, citizenship, licenses, hospital appointments, utility bills, taxes, and much more.
Step five. Try it yourself. Nepal Republic dot org. Free, no signup needed, works instantly.`;

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

async function main() {
  const outDir = join(OUTPUT_DIR, 'app-walkthrough');
  mkdirSync(outDir, { recursive: true });

  const silentVideo = join(outDir, 'app-walkthrough-silent.mp4');
  const voiceoverPath = join(outDir, 'app-walkthrough-voice.mp3');
  const finalVideo = join(outDir, 'app-walkthrough-final.mp4');

  // ── 1. Render with Remotion ──
  console.log('[app-walkthrough] Rendering video with Remotion...');
  const propsJson = JSON.stringify({ data: {} });
  const propsFile = join(outDir, 'props.json');
  writeFileSync(propsFile, propsJson);

  execSync(
    `npx remotion render "${ENTRY}" AppWalkthrough "${silentVideo}" --props="${propsFile}" --concurrency=4`,
    { cwd: ROOT, stdio: 'inherit', timeout: 300_000 }
  );
  console.log('[app-walkthrough] ✅ Silent video rendered');

  // ── 2. Generate voiceover ──
  console.log('[app-walkthrough] Generating voiceover...');
  await generateVoiceover(VOICEOVER_EN, voiceoverPath);

  // ── 3. Merge audio + video ──
  console.log('[app-walkthrough] Merging audio + video...');
  const ffmpegPath = existsSync(FFMPEG) ? FFMPEG : 'ffmpeg';

  execSync(
    `"${ffmpegPath}" -y -i "${silentVideo}" -i "${voiceoverPath}" -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -preset fast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest -movflags +faststart "${finalVideo}"`,
    { stdio: 'inherit', timeout: 120_000 }
  );
  console.log('[app-walkthrough] ✅ Final video ready:', finalVideo);

  // ── 4. Post to Facebook (if --post) ──
  if (shouldPost) {
    if (!PAGE_ID || !PAGE_TOKEN) {
      console.error('[app-walkthrough] Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN');
      process.exit(1);
    }

    const caption = `📱 How to use Nepal Republic — in 40 seconds

Step 1️⃣ Ask the AI advisor what you need
Step 2️⃣ Get instant answers: documents, fees, offices
Step 3️⃣ Track your application in real time
Step 4️⃣ Works for 70+ government services

🛂 Passport • 🪪 Citizenship • 🚗 License • 🏥 Hospital • 💡 Bills • 📊 Tax

Free. No signup. Works instantly.

👉 Try it now: nepalrepublic.org

#NepalRepublic #Nepal #GovTech #CivicTech #DigitalNepal #नेपाल #सरकारीसेवा`;

    console.log('[app-walkthrough] Uploading to Facebook...');
    const videoBuffer = readFileSync(finalVideo);
    const { body, boundary } = buildMultipart(
      { access_token: PAGE_TOKEN, description: caption, published: 'true' },
      { name: 'source', filename: 'app-walkthrough.mp4', contentType: 'video/mp4', data: videoBuffer }
    );

    const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    const result = await res.json();
    if (!res.ok) {
      console.error('[app-walkthrough] ❌ Facebook upload failed:', JSON.stringify(result));
      process.exit(1);
    }
    console.log(`[app-walkthrough] ✅ Posted to Facebook! Video ID: ${result.id}`);
  } else {
    console.log('[app-walkthrough] Video saved. Run with --post to upload to Facebook.');
  }
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

main().catch(err => {
  console.error('[app-walkthrough] ❌', err.message);
  process.exit(1);
});
