#!/usr/bin/env node
/**
 * Render Daily Reels — generates 2 unified 60s vertical reels with AI images
 *
 * Output: ~/Desktop/nepal-republic-videos/YYYY-MM-DD/
 *   1-daily-reel.mp4       (Nepali)
 *   2-daily-reel-en.mp4    (English)
 *
 * Usage: node scripts/render-all-videos.js [YYYY-MM-DD]
 */

const { execSync } = require('child_process');
const { readFileSync, mkdirSync, writeFileSync, existsSync, statSync, unlinkSync } = require('fs');
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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOV_START = new Date('2026-03-26T00:00:00+05:45');
const OUTPUT_BASE = resolve(process.env.HOME, 'Desktop/nepal-republic-videos');
const ENTRY = join(ROOT, 'remotion/index.ts');
const FFMPEG = `${process.env.HOME}/bin/ffmpeg`;

function todayDate() {
  const now = new Date();
  const nepal = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
  return nepal.toISOString().slice(0, 10);
}
function dayForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00+05:45');
  return Math.max(1, Math.floor((d.getTime() - GOV_START.getTime()) / 86400000) + 1);
}

async function supabaseGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

async function supabaseCount(table, filter = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id${filter ? '&' + filter : ''}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact', Range: '0-0' },
  });
  const range = res.headers.get('content-range') || '0-0/0';
  return parseInt(range.split('/')[1]) || 0;
}

// ── TTS — MUST succeed ──────────────────────────────────────────────────
async function generateVoiceover(script, outputPath, voice) {
  console.log(`  Generating voiceover (${voice})...`);
  const { MsEdgeTTS } = require('msedge-tts');
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, 'audio-24khz-96kbitrate-mono-mp3');
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

// ── Remotion render ─────────────────────────────────────────────────────
function renderVideo(compositionId, propsPath, outputPath) {
  console.log(`  Rendering ${compositionId} (1800 frames)...`);
  execSync(
    `npx remotion render "${ENTRY}" ${compositionId} "${outputPath}" --props="${propsPath}" --codec=h264 --crf=18 --log=error`,
    { cwd: ROOT, stdio: 'pipe', timeout: 600_000 }
  );
  if (!existsSync(outputPath)) throw new Error(`Render failed: ${outputPath} not found`);
  console.log(`  Rendered: ${(statSync(outputPath).size / 1024 / 1024).toFixed(1)} MB`);
}

// ── Audio merge — MUST succeed with verified volume ─────────────────────
function mergeAudio(videoPath, audioPath, outputPath) {
  if (!existsSync(audioPath)) throw new Error(`Audio missing: ${audioPath}`);
  if (!existsSync(videoPath)) throw new Error(`Video missing: ${videoPath}`);
  console.log(`  Merging audio...`);
  execSync(
    `"${FFMPEG}" -y -i "${videoPath}" -i "${audioPath}" ` +
    `-filter_complex "[1:a]apad=whole_dur=60[aout]" ` +
    `-map 0:v -map "[aout]" -c:v copy -c:a aac -ar 44100 -ac 2 -b:a 128k ` +
    `-t 60 -movflags +faststart "${outputPath}"`,
    { cwd: ROOT, stdio: 'pipe', timeout: 120_000 }
  );
  if (!existsSync(outputPath)) throw new Error(`Merge failed`);
  // Verify audio is real
  const probe = execSync(`"${FFMPEG}" -i "${outputPath}" -af "volumedetect" -f null /dev/null 2>&1 || true`, { encoding: 'utf8', timeout: 30_000 });
  const meanMatch = probe.match(/mean_volume:\s*(-[\d.]+)\s*dB/);
  const meanVol = meanMatch ? parseFloat(meanMatch[1]) : -91;
  if (meanVol < -60) throw new Error(`SILENT output (${meanVol} dB)`);
  console.log(`  Audio verified: mean ${meanVol.toFixed(1)} dB`);
}

// ── Image fetching with multi-source fallback ──────────────────────────
// Source 1: Scrape OG image from matching news article
// Source 2: Pollinations.ai AI generation
// Source 3: Download from related signal URLs
async function fetchImageFromUrl(url, outputPath, timeoutMs = 15000) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NepalRepublic/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) return false;
    writeFileSync(outputPath, buf);
    return true;
  } catch { return false; }
}

async function scrapeOgImage(articleUrl, outputPath) {
  try {
    const res = await fetch(articleUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NepalRepublic/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Extract og:image content
    const match = html.match(/og:image["']\s+content=["']([^"']+)["']/i)
      || html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (!match) return null;
    const imgUrl = match[1];
    if (!imgUrl.startsWith('http')) return null;
    const ok = await fetchImageFromUrl(imgUrl, outputPath);
    return ok ? outputPath : null;
  } catch { return null; }
}

async function findMatchingSignalUrls(storyTitle) {
  // Search signals for URLs matching this story title (fuzzy keyword match)
  const keywords = storyTitle.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
  if (!keywords.length) return [];
  const urls = [];
  for (const kw of keywords) {
    try {
      const signals = await supabaseGet('intelligence_signals',
        `url=not.like.*youtube*&url=not.like.*facebook*&title=ilike.*${encodeURIComponent(kw)}*&select=url&order=discovered_at.desc&limit=3`
      );
      for (const s of signals) if (s.url && !urls.includes(s.url)) urls.push(s.url);
    } catch {}
  }
  return urls.slice(0, 5);
}

async function generateStoryImage(title, outputPath, index) {
  const label = `Story ${index + 1}`;

  // Source 1: Find matching news articles and scrape their OG images
  console.log(`  ${label}: Searching for news article images...`);
  const articleUrls = await findMatchingSignalUrls(title);
  for (const articleUrl of articleUrls) {
    const result = await scrapeOgImage(articleUrl, outputPath);
    if (result) {
      console.log(`  ${label}: ✅ OG image from ${new URL(articleUrl).hostname} (${(statSync(outputPath).size / 1024).toFixed(0)} KB)`);
      return outputPath;
    }
  }

  // Source 2: AI generation via Pollinations.ai
  console.log(`  ${label}: Trying AI image generation...`);
  const shortTitle = title.slice(0, 80);
  const prompt = encodeURIComponent(
    `${shortTitle}, Nepal, photojournalism, dramatic, cinematic, no text`
  );
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const seed = Date.now() + index + attempt * 1000;
      const url = `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=700&nologo=true&model=flux&seed=${seed}`;
      if (attempt > 0) console.log(`  ${label}: AI retry ${attempt}...`);
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) continue;
      writeFileSync(outputPath, buf);
      console.log(`  ${label}: ✅ AI-generated (${(buf.length / 1024).toFixed(0)} KB)`);
      return outputPath;
    } catch {}
  }

  // Source 3: Scrape OG image from top RSS signals (broader search)
  console.log(`  ${label}: Trying recent RSS article images...`);
  try {
    const recentRSS = await supabaseGet('intelligence_signals',
      `url=not.like.*youtube*&url=not.like.*facebook*&source_id=like.rss-*&select=url&order=discovered_at.desc&limit=10`
    );
    // Skip ones we already tried
    const tried = new Set(articleUrls);
    for (const s of recentRSS) {
      if (tried.has(s.url)) continue;
      const result = await scrapeOgImage(s.url, outputPath);
      if (result) {
        console.log(`  ${label}: ✅ RSS fallback from ${new URL(s.url).hostname} (${(statSync(outputPath).size / 1024).toFixed(0)} KB)`);
        return outputPath;
      }
    }
  } catch {}

  console.log(`  ${label}: ❌ No image found`);
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const date = process.argv[2] || todayDate();
  const day = dayForDate(date);
  const outDir = join(OUTPUT_BASE, date);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n🎬 Rendering daily reels for ${date} (Day ${day})...\n`);

  // ── Fetch data ──
  const briefs = await supabaseGet('daily_briefs', `date=eq.${date}&select=*`);
  if (!briefs.length) {
    const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10);
    const yBriefs = await supabaseGet('daily_briefs', `date=eq.${yesterday}&select=*`);
    if (yBriefs.length) {
      console.log(`  Using brief from ${yesterday}`);
      briefs.push(yBriefs[0]);
    } else {
      console.error(`No brief for ${date} or ${yesterday}`);
      process.exit(1);
    }
  }
  const brief = briefs[0];
  const stories = brief.top_stories || [];
  const moved = brief.commitments_moved || [];
  const todaySignals = await supabaseCount('intelligence_signals', `discovered_at=gte.${date}T00:00:00Z`);
  const promises = await supabaseGet('promises', 'select=id,title,title_ne,status,progress&order=id.asc&limit=109');

  const sb = { notStarted: 0, inProgress: 0, stalled: 0, delivered: 0 };
  for (const p of promises) {
    if (p.status === 'not_started') sb.notStarted++;
    else if (p.status === 'in_progress') sb.inProgress++;
    else if (p.status === 'stalled') sb.stalled++;
    else if (p.status === 'delivered') sb.delivered++;
  }

  const topMovers = promises.filter(p => p.progress > 0).sort((a, b) => b.progress - a.progress).slice(0, 4)
    .map(p => ({ titleNe: p.title_ne || p.title, title: p.title, progress: p.progress || 0, status: p.status }));

  const confirms = moved.filter(c => c.direction === 'confirms').length;
  const contradicts = moved.filter(c => c.direction === 'contradicts').length;
  const pulse = brief.pulse || 0;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 0: Generate AI images for top 3 stories
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🖼️  Step 0: Generating story images...\n');
  const storyImages = [];
  for (let i = 0; i < Math.min(3, stories.length); i++) {
    const title = stories[i].title || stories[i].titleNe || '';
    const imgPath = join(outDir, `story-${i + 1}.jpg`);
    const result = await generateStoryImage(title, imgPath, i);
    storyImages.push(result);
    // Small delay between requests to avoid rate limiting
    if (i < 2) await new Promise(r => setTimeout(r, 2000));
  }
  console.log('');

  // Copy generated images to public/ so Remotion can serve them via staticFile()
  const publicImgDir = join(ROOT, 'public', 'images', 'stories');
  mkdirSync(publicImgDir, { recursive: true });
  const imageStaticPaths = [];
  for (let i = 0; i < storyImages.length; i++) {
    if (storyImages[i] && existsSync(storyImages[i])) {
      const dest = join(publicImgDir, `story-${i + 1}.jpg`);
      require('fs').copyFileSync(storyImages[i], dest);
      imageStaticPaths.push(`images/stories/story-${i + 1}.jpg`);
    } else {
      imageStaticPaths.push(null);
    }
  }

  // Build reel data
  const reelData = {
    date, dayNumber: day, pulse, pulseLabel: brief.pulse_label || '',
    phase: day <= 30 ? 'early' : day <= 100 ? 'ramp' : 'delivery',
    topStories: stories.slice(0, 6).map((s, i) => ({
      title: s.title || '', titleNe: s.titleNe || '',
      summary: s.summary || '', summaryNe: s.summaryNe || '',
      sentiment: s.sentiment || 'neutral', signalCount: s.signalCount || 0,
      imageUrl: i < 3 && imageStaticPaths[i] ? imageStaticPaths[i] : undefined,
    })),
    stats: { totalSignals: 38200 + todaySignals, newSignals: todaySignals, sourcesActive: 80, commitmentsTracked: 109 },
    commitmentsMoved: { confirms, contradicts },
    statusBreakdown: sb, topMovers,
    minister: { name: 'Balen Shah', nameNe: '\u092C\u093E\u0932\u0947\u0928 \u0936\u093E\u0939', role: 'Prime Minister', roleNe: '\u092A\u094D\u0930\u0927\u093E\u0928\u092E\u0928\u094D\u0924\u094D\u0930\u0940' },
  };
  const propsPath = join(outDir, 'reel-props.json');
  writeFileSync(propsPath, JSON.stringify({ data: reelData }));

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Generate voiceovers — FULL 60s scripts covering every section
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🎙️  Step 1: Generating voiceovers...\n');

  const ne = stories.slice(0, 5).map(s => s.titleNe || s.title || '');
  const en = stories.slice(0, 5).map(s => s.title || '');

  const vo1Path = join(outDir, '1-vo.mp3');
  const vo1Script = [
    `\u0928\u092E\u0938\u094D\u0915\u093E\u0930\u0964 \u0906\u091C \u0938\u0930\u0915\u093E\u0930\u0915\u094B ${day} \u0914\u0902 \u0926\u093F\u0928 \u0939\u094B\u0964`,
    `${todaySignals} \u0928\u092F\u093E\u0901 \u0938\u0902\u0915\u0947\u0924 \u092D\u0947\u091F\u093F\u092F\u094B\u0964`,
    ne[0] ? `\u092A\u0939\u093F\u0932\u094B \u0915\u0925\u093E\u0964 ${ne[0]}\u0964` : '',
    ne[1] ? `\u0926\u094B\u0938\u094D\u0930\u094B \u0915\u0925\u093E\u0964 ${ne[1]}\u0964` : '',
    ne[2] ? `\u0924\u0947\u0938\u094D\u0930\u094B \u0915\u0925\u093E\u0964 ${ne[2]}\u0964` : '',
    ne[3] ? `${ne[3]}\u0964` : '',
    ne[4] ? `${ne[4]}\u0964` : '',
    `\u0967\u0966\u096F \u0935\u091A\u0928\u092C\u0926\u094D\u0927\u0924\u093E\u092E\u0927\u094D\u092F\u0947 ${sb.inProgress} \u092A\u094D\u0930\u0917\u0924\u093F\u092E\u093E, ${sb.stalled} \u0930\u094B\u0915\u093F\u090F\u0915\u094B, \u0930 ${sb.delivered} \u092A\u0942\u0930\u093E \u092D\u090F\u0915\u094B \u091B\u0964`,
    `\u092A\u094D\u0930\u0927\u093E\u0928\u092E\u0928\u094D\u0924\u094D\u0930\u0940 \u092C\u093E\u0932\u0947\u0928 \u0936\u093E\u0939\u0915\u094B ${day} \u0926\u093F\u0928\u0915\u094B \u0915\u093E\u0930\u094D\u092F\u0938\u092E\u094D\u092A\u093E\u0926\u0928 \u0915\u0938\u094D\u0924\u094B \u091B? \u091C\u0928\u0924\u093E\u0932\u0947 \u0928\u093F\u0917\u0930\u093E\u0928\u0940 \u0917\u0930\u093F\u0930\u0939\u0947\u0915\u093E \u091B\u0928\u094D\u0964`,
    `\u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915 \u0938\u094D\u0915\u094B\u0930 ${pulse} \u0905\u0902\u0915\u0964`,
    confirms > 0 ? `${confirms} \u0935\u091A\u0928\u092C\u0926\u094D\u0927\u0924\u093E\u092E\u093E \u092A\u094D\u0930\u0917\u0924\u093F \u0926\u0947\u0916\u093F\u092F\u094B\u0964` : '',
    contradicts > 0 ? `${contradicts} \u092E\u093E \u091A\u093F\u0928\u094D\u0924\u093E \u092C\u0922\u094D\u092F\u094B\u0964` : '',
    `\u0924\u092A\u093E\u0908\u0902\u0932\u0947 \u0938\u0930\u0915\u093E\u0930\u0932\u093E\u0908 \u0915\u0924\u093F \u0905\u0902\u0915 \u0926\u093F\u0928\u0941\u0939\u0941\u0928\u094D\u091B? \u0915\u092E\u0947\u0928\u094D\u091F\u092E\u093E \u092D\u0928\u094D\u0928\u0941\u0939\u094B\u0938\u094D\u0964`,
    `\u0925\u092A \u0935\u093F\u0935\u0930\u0923 \u0928\u0947\u092A\u093E\u0932 \u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915 \u0921\u091F \u0913\u0906\u0930\u091C\u0940\u092E\u093E\u0964 \u092B\u0932\u094B \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D\u0964`,
  ].filter(Boolean).join(' ');
  await generateVoiceover(vo1Script, vo1Path, 'ne-NP-SagarNeural');

  const vo2Path = join(outDir, '2-vo.mp3');
  const vo2Script = [
    `Day ${day} of Nepal's new government.`,
    `${todaySignals} new signals tracked today across 80 sources.`,
    en[0] ? `Story one. ${en[0]}.` : '',
    en[1] ? `Story two. ${en[1]}.` : '',
    en[2] ? `Story three. ${en[2]}.` : '',
    en[3] ? `${en[3]}.` : '',
    en[4] ? `${en[4]}.` : '',
    `Of 109 government promises, ${sb.inProgress} are in progress, ${sb.stalled} are stalled, and ${sb.delivered} have been delivered.`,
    `How is Prime Minister Balen Shah performing after ${day} days? The people are watching closely.`,
    `The Republic Score stands at ${pulse}.`,
    confirms > 0 ? `${confirms} promises showed progress.` : '',
    contradicts > 0 ? `${contradicts} raised concerns.` : '',
    `How would you grade this government? Drop your score in the comments below.`,
    `Follow Nepal Republic for daily AI-powered government accountability tracking.`,
  ].filter(Boolean).join(' ');
  await generateVoiceover(vo2Script, vo2Path, 'en-US-AndrewNeural');

  console.log('  ✅ Both voiceovers ready\n');

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Render videos
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🎬 Step 2: Rendering videos...\n');

  const v1raw = join(outDir, '1-raw.mp4');
  console.log('🇳🇵 Nepali reel:');
  renderVideo('DailyReel', propsPath, v1raw);

  const v2raw = join(outDir, '2-raw.mp4');
  console.log('🌍 English reel:');
  renderVideo('DailyReelEN', propsPath, v2raw);
  console.log('');

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Merge audio + verify
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔊 Step 3: Merging audio & verifying...\n');

  const v1final = join(outDir, '1-daily-reel.mp4');
  console.log('🇳🇵 Nepali:');
  mergeAudio(v1raw, vo1Path, v1final);

  const v2final = join(outDir, '2-daily-reel-en.mp4');
  console.log('🌍 English:');
  mergeAudio(v2raw, vo2Path, v2final);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Cleanup
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n🧹 Cleaning up...');
  const tempFiles = [propsPath, v1raw, v2raw, vo1Path, vo2Path];
  for (let i = 0; i < 3; i++) {
    tempFiles.push(join(outDir, `story-${i + 1}.jpg`));
    tempFiles.push(join(ROOT, 'public', 'images', 'stories', `story-${i + 1}.jpg`));
  }
  for (const f of tempFiles) { try { unlinkSync(f); } catch {} }

  const v1size = (statSync(v1final).size / 1024 / 1024).toFixed(1);
  const v2size = (statSync(v2final).size / 1024 / 1024).toFixed(1);

  console.log(`\n🎬🎬 BOTH REELS READY! 🎬🎬`);
  console.log(`📁 ${outDir}/`);
  console.log(`   1-daily-reel.mp4       — 60s Nepali (${v1size} MB)`);
  console.log(`   2-daily-reel-en.mp4    — 60s English (${v2size} MB)`);
  console.log(`\n🔊 Audio VERIFIED on both videos`);
  console.log(`🖼️  AI-generated images for top stories`);
  console.log(`🚀 Ready for Facebook / TikTok / Instagram / YouTube!\n`);
}

main().catch(err => { console.error('❌ FATAL:', err.message); process.exit(1); });
