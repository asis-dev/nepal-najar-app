#!/usr/bin/env node
/**
 * Render AI Demo Reel — 45s vertical video showcasing smart AI routing
 * Then post to Facebook.
 *
 * Usage: node scripts/render-ai-demo.js [--post]
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

// ── Voiceover script ───────────────────────────────────────────────────
const VOICEOVER_NE = `Nepal Republic AI ले तपाईंको भाषा बुझ्छ।
पहिलो उदाहरण। मेरो पेट दुख्यो भन्दा, AI ले अस्पताल वा डाक्टर खोज्न मद्दत गर्छ।
दोस्रो। घरमा पानी आएन भन्दा, AI ले वडा कार्यालयमा रिपोर्ट गर्छ।
तेस्रो। पुलिसले पैसा माग्यो भन्दा, AI ले भ्रष्टाचार उजुरी दायर गर्छ।
चौथो। विदेश जानु छ भन्दा, AI ले पासपोर्ट, लेबर परमिट, वा भिसा सोध्छ।
पाँचौं। नमस्ते भन्दा, AI ले सबै सेवाहरू देखाउँछ।
आज नै प्रयोग गर्नुहोस्। nepal republic dot org`;

async function generateVoiceover(script, outputPath) {
  console.log('  Generating voiceover...');
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
  const outDir = join(OUTPUT_DIR, 'ai-demo');
  mkdirSync(outDir, { recursive: true });

  const silentVideo = join(outDir, 'ai-demo-silent.mp4');
  const voiceoverPath = join(outDir, 'ai-demo-voice.mp3');
  const finalVideo = join(outDir, 'ai-demo-final.mp4');

  // ── 1. Render with Remotion ──
  console.log('[ai-demo] Rendering video with Remotion...');
  const propsJson = JSON.stringify({ data: {} });
  const propsFile = join(outDir, 'props.json');
  writeFileSync(propsFile, propsJson);

  execSync(
    `npx remotion render "${ENTRY}" AIDemo "${silentVideo}" --props="${propsFile}" --concurrency=4`,
    { cwd: ROOT, stdio: 'inherit', timeout: 300_000 }
  );
  console.log('[ai-demo] ✅ Silent video rendered');

  // ── 2. Generate voiceover ──
  console.log('[ai-demo] Generating voiceover...');
  await generateVoiceover(VOICEOVER_NE, voiceoverPath);

  // ── 3. Merge audio + video ──
  console.log('[ai-demo] Merging audio + video...');
  execSync(
    `"${FFMPEG}" -y -i "${silentVideo}" -i "${voiceoverPath}" -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -preset fast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest -movflags +faststart "${finalVideo}"`,
    { stdio: 'inherit', timeout: 120_000 }
  );
  console.log('[ai-demo] ✅ Final video ready:', finalVideo);

  // ── 4. Post to Facebook (if --post) ──
  if (shouldPost) {
    if (!PAGE_ID || !PAGE_TOKEN) {
      console.error('[ai-demo] Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN');
      process.exit(1);
    }

    const caption = `🤖 Nepal Republic AI — तपाईंको भाषा बुझ्ने AI सहायक!

"मेरो पेट दुख्यो" → अस्पताल खोज्छ 🏥
"घरमा पानी आएन" → वडा कार्यालयमा रिपोर्ट 🚰
"पुलिसले पैसा माग्यो" → भ्रष्टाचार उजुरी ⚖️
"विदेश जानु छ" → पासपोर्ट/भिसा/परमिट ✈️
"नमस्ते" → सबै सेवा एकै ठाउँमा 🙏

नेपाली, English, या Romanized — AI ले सबै बुझ्छ!

👉 nepalrepublic.org मा आज नै प्रयोग गर्नुहोस्!

#NepalRepublic #नेपालरिपब्लिक #AI #Nepal #BalenShah #बालेनशाह #GovTech #CivicTech #नेपाल #सरकारीसेवा #ArtificialIntelligence`;

    console.log('[ai-demo] Uploading to Facebook...');
    const videoBuffer = readFileSync(finalVideo);
    const sizeMB = (videoBuffer.length / 1024 / 1024).toFixed(1);
    console.log(`[ai-demo] Video size: ${sizeMB} MB`);

    const { body, boundary } = buildMultipart(
      { access_token: PAGE_TOKEN, description: caption, published: 'true' },
      { name: 'source', filename: 'ai-demo.mp4', contentType: 'video/mp4', data: videoBuffer }
    );

    const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    const result = await res.json();

    if (!res.ok) {
      console.error('[ai-demo] ❌ Facebook upload failed:', JSON.stringify(result));
      process.exit(1);
    }
    console.log(`[ai-demo] ✅ Posted to Facebook! Video ID: ${result.id}`);
  } else {
    console.log('[ai-demo] Video saved. Run with --post to upload to Facebook.');
  }
}

main().catch(err => {
  console.error('[ai-demo] ❌', err.message);
  process.exit(1);
});
