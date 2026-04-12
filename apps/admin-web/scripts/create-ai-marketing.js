#!/usr/bin/env node
/**
 * Create AI Demo marketing images — clean text-based cards
 * Posts to Facebook as a photo post
 */

const { writeFileSync, readFileSync, existsSync, mkdirSync } = require('fs');
const { resolve, join } = require('path');
const { execSync } = require('child_process');

// ── Load env ──
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

const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const OUTPUT_DIR = resolve(process.env.HOME, 'Desktop/nepal-republic-videos/ai-marketing');
mkdirSync(OUTPUT_DIR, { recursive: true });

const demos = [
  { input: 'mero pet dukhyo', response: 'तपाईंलाई अस्पताल वा डाक्टर चाहिन्छ?', category: 'Health Triage 🏥', options: ['Bir Hospital', 'TUTH', "Kanti Children's", 'Pharmacy'] },
  { input: 'ghar ma pani aayena', response: 'पानी नआएको समस्या वडामा रिपोर्ट गरौं।', category: 'Infrastructure 🚰', options: ['वडामा रिपोर्ट', 'हटलाइन कल'] },
  { input: 'police le paisa magyo', response: 'भ्रष्टाचार उजुरी CIAA मा दिन सकिन्छ।', category: 'Anti-Corruption ⚖️', options: ['CIAA उजुरी', 'हटलाइन: 107'] },
  { input: 'bidesh jaanu cha', response: 'कस्तो सेवा चाहिन्छ?', category: 'Smart Routing ✈️', options: ['पासपोर्ट', 'श्रम अनुमति', 'भिसा', 'NOC'] },
  { input: 'namaste', response: 'नमस्ते! कसरी मद्दत गर्न सक्छु?', category: 'Greeting 🙏', options: ['सरकारी सेवा', 'समस्या रिपोर्ट', 'स्वास्थ्य'] },
];

function createSVGCard(allDemos) {
  const W = 1080;
  const H = 1920;

  // Build demo rows
  let demoSVG = '';
  let y = 480;

  for (let i = 0; i < allDemos.length; i++) {
    const d = allDemos[i];
    const rowH = 240;

    // Demo container with subtle bg
    demoSVG += `<rect x="40" y="${y}" width="${W - 80}" height="${rowH}" rx="24" fill="#1e293b" stroke="#334155" stroke-width="2"/>`;

    // Number badge
    demoSVG += `<circle cx="90" cy="${y + 40}" r="22" fill="#DC143C"/>`;
    demoSVG += `<text x="90" y="${y + 47}" text-anchor="middle" font-size="22" font-weight="900" fill="white">${i + 1}</text>`;

    // User input
    demoSVG += `<text x="130" y="${y + 32}" font-size="20" font-weight="600" fill="#94a3b8">You typed:</text>`;
    demoSVG += `<text x="130" y="${y + 68}" font-size="30" font-weight="700" fill="white">"${escXml(d.input)}"</text>`;

    // Arrow
    demoSVG += `<text x="130" y="${y + 110}" font-size="22" font-weight="700" fill="#fbbf24">→ AI Response:</text>`;

    // AI response
    demoSVG += `<text x="130" y="${y + 148}" font-size="26" font-weight="600" fill="#e2e8f0">${escXml(d.response)}</text>`;

    // Category badge
    demoSVG += `<rect x="130" y="${y + 170}" width="auto" height="32" rx="16" fill="#DC143C" opacity="0.9"/>`;
    const catW = d.category.length * 14 + 30;
    demoSVG += `<rect x="130" y="${y + 170}" width="${catW}" height="32" rx="16" fill="#DC143C"/>`;
    demoSVG += `<text x="${130 + catW / 2}" y="${y + 192}" text-anchor="middle" font-size="18" font-weight="800" fill="white">${escXml(d.category)}</text>`;

    // Options pills
    let ox = 130 + catW + 16;
    for (const opt of d.options.slice(0, 3)) {
      const optW = opt.length * 13 + 24;
      if (ox + optW > W - 60) break;
      demoSVG += `<rect x="${ox}" y="${y + 170}" width="${optW}" height="32" rx="16" fill="white" opacity="0.15"/>`;
      demoSVG += `<text x="${ox + optW / 2}" y="${y + 192}" text-anchor="middle" font-size="16" font-weight="600" fill="white">${escXml(opt)}</text>`;
      ox += optW + 8;
    }

    y += rowH + 16;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a12"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="topbar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#DC143C"/>
      <stop offset="100%" stop-color="#003893"/>
    </linearGradient>
    <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#DC143C"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Top bar -->
  <rect width="${W}" height="56" fill="url(#topbar)"/>
  <text x="40" y="38" font-size="24" font-weight="900" fill="white" letter-spacing="2">NEPAL REPUBLIC</text>
  <text x="${W - 40}" y="38" text-anchor="end" font-size="18" font-weight="600" fill="rgba(255,255,255,0.8)">nepalrepublic.org</text>

  <!-- Hero section -->
  <text x="${W / 2}" y="130" text-anchor="middle" font-size="72" font-weight="900" fill="white">🤖</text>
  <text x="${W / 2}" y="210" text-anchor="middle" font-size="48" font-weight="900" fill="white">Nepal Republic AI</text>
  <text x="${W / 2}" y="270" text-anchor="middle" font-size="34" font-weight="700" fill="#fbbf24">तपाईंको भाषा बुझ्छ 🇳🇵</text>

  <!-- Subtitle -->
  <text x="${W / 2}" y="330" text-anchor="middle" font-size="24" font-weight="600" fill="#94a3b8">Nepali • English • Romanized — AI ले सबै बुझ्छ</text>

  <!-- "5 Real Demos" label -->
  <rect x="${W / 2 - 120}" y="370" width="240" height="44" rx="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
  <text x="${W / 2}" y="399" text-anchor="middle" font-size="22" font-weight="700" fill="white">▼ ५ वटा उदाहरण ▼</text>

  <!-- Demo cards -->
  ${demoSVG}

  <!-- CTA -->
  <rect x="${W / 2 - 200}" y="${H - 220}" width="400" height="64" rx="32" fill="url(#cta)"/>
  <text x="${W / 2}" y="${H - 180}" text-anchor="middle" font-size="30" font-weight="900" fill="white">🔔 आज नै प्रयोग गर्नुहोस्</text>
  <text x="${W / 2}" y="${H - 130}" text-anchor="middle" font-size="22" font-weight="600" fill="#94a3b8">nepalrepublic.org • Free • No signup</text>

  <!-- Bottom bar -->
  <rect y="${H - 60}" width="${W}" height="60" fill="url(#topbar)"/>
  <text x="${W / 2}" y="${H - 28}" text-anchor="middle" font-size="22" font-weight="800" fill="white">AI-POWERED CIVIC ASSISTANT</text>
</svg>`;
}

function escXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  const shouldPost = process.argv.includes('--post');

  // Generate SVG
  const svg = createSVGCard(demos);
  const svgPath = join(OUTPUT_DIR, 'ai-demo.svg');
  const pngPath = join(OUTPUT_DIR, 'ai-demo.png');
  writeFileSync(svgPath, svg);
  console.log('[ai-marketing] SVG created:', svgPath);

  // Convert to PNG using rsvg-convert or sips
  try {
    execSync(`rsvg-convert -w 1080 -h 1920 "${svgPath}" -o "${pngPath}"`, { stdio: 'pipe' });
    console.log('[ai-marketing] PNG created via rsvg-convert');
  } catch {
    try {
      // Fallback: use sips (macOS built-in) — but sips can't do SVG, use ffmpeg
      const FFMPEG = `${process.env.HOME}/bin/ffmpeg`;
      execSync(`"${FFMPEG}" -y -i "${svgPath}" -vf "scale=1080:1920" "${pngPath}"`, { stdio: 'pipe' });
      console.log('[ai-marketing] PNG created via ffmpeg');
    } catch {
      console.log('[ai-marketing] Could not convert to PNG. SVG saved at:', svgPath);
      console.log('[ai-marketing] Install rsvg-convert: brew install librsvg');
      // Post SVG as-is won't work on FB, so let's try posting just with the caption
      if (!shouldPost) return;
    }
  }

  if (!shouldPost) {
    console.log('[ai-marketing] Image saved. Run with --post to upload to Facebook.');
    return;
  }

  if (!PAGE_ID || !PAGE_TOKEN) {
    console.error('[ai-marketing] Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN');
    process.exit(1);
  }

  const caption = `🤖 Nepal Republic AI — तपाईंको भाषा बुझ्ने AI सहायक!

५ वटा उदाहरण हेर्नुहोस्:

1️⃣ "mero pet dukhyo" → अस्पताल खोज्छ 🏥
2️⃣ "ghar ma pani aayena" → वडा कार्यालयमा रिपोर्ट 🚰
3️⃣ "police le paisa magyo" → भ्रष्टाचार उजुरी ⚖️
4️⃣ "bidesh jaanu cha" → पासपोर्ट/भिसा/परमिट ✈️
5️⃣ "namaste" → सबै सेवा एकै ठाउँमा 🙏

नेपाली, English, या Romanized — AI ले सबै बुझ्छ!

👉 nepalrepublic.org मा आज नै प्रयोग गर्नुहोस्!

#NepalRepublic #नेपालरिपब्लिक #AI #Nepal #BalenShah #बालेनशाह #GovTech #CivicTech #नेपाल #ArtificialIntelligence`;

  // Upload photo to Facebook
  const imgBuffer = readFileSync(pngPath);
  console.log(`[ai-marketing] Uploading ${(imgBuffer.length / 1024).toFixed(0)} KB image...`);

  const { body, boundary } = buildMultipart(
    { access_token: PAGE_TOKEN, message: caption, published: 'true' },
    { name: 'source', filename: 'ai-demo.png', contentType: 'image/png', data: imgBuffer }
  );

  const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  const result = await res.json();

  if (!res.ok) {
    console.error('[ai-marketing] Facebook upload failed:', JSON.stringify(result));
    process.exit(1);
  }
  console.log(`[ai-marketing] ✅ Posted to Facebook! Post ID: ${result.post_id || result.id}`);
}

main().catch(err => {
  console.error('[ai-marketing] ❌', err.message);
  process.exit(1);
});
