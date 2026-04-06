#!/usr/bin/env node
/**
 * Render Daily Reels — generates 2 unified 60s vertical reels from live data
 *
 * Output: ~/Desktop/nepal-republic-videos/YYYY-MM-DD/
 *   1-daily-reel.mp4       (Nepali)
 *   2-daily-reel-en.mp4    (English)
 *
 * Usage: node scripts/render-all-videos.js [YYYY-MM-DD]
 *   If date is omitted, uses today's date in Nepal time.
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

// ── Edge TTS — MUST succeed or we abort ─────────────────────────────────
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
  if (buf.length < 1000) {
    throw new Error(`TTS output too small (${buf.length} bytes) — voice likely failed`);
  }
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

// ── Audio merge — MUST succeed or we abort ──────────────────────────────
function mergeAudio(videoPath, audioPath, outputPath) {
  if (!existsSync(audioPath)) throw new Error(`Audio file missing: ${audioPath}`);
  if (!existsSync(videoPath)) throw new Error(`Video file missing: ${videoPath}`);

  console.log(`  Merging audio...`);
  execSync(
    `"${FFMPEG}" -y -i "${videoPath}" -i "${audioPath}" ` +
    `-filter_complex "[1:a]apad=whole_dur=60[aout]" ` +
    `-map 0:v -map "[aout]" -c:v copy -c:a aac -ar 44100 -ac 2 -b:a 128k ` +
    `-t 60 -movflags +faststart "${outputPath}"`,
    { cwd: ROOT, stdio: 'pipe', timeout: 120_000 }
  );

  if (!existsSync(outputPath)) throw new Error(`Merge failed: ${outputPath} not found`);

  // ── VERIFY audio is real, not silence ──
  const probe = execSync(
    `"${FFMPEG}" -i "${outputPath}" -af "volumedetect" -f null /dev/null 2>&1 || true`,
    { encoding: 'utf8', timeout: 30_000 }
  );
  const meanMatch = probe.match(/mean_volume:\s*(-[\d.]+)\s*dB/);
  const meanVol = meanMatch ? parseFloat(meanMatch[1]) : -91;

  if (meanVol < -60) {
    // Audio is effectively silent — something went wrong
    throw new Error(`Audio merge produced SILENT output (mean_volume: ${meanVol} dB). TTS audio was not properly merged.`);
  }

  console.log(`  ✅ Audio verified: mean ${meanVol.toFixed(1)} dB`);
  return outputPath;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  // Accept date argument: node render-all-videos.js 2026-04-06
  const date = process.argv[2] || todayDate();
  const day = dayForDate(date);
  const outDir = join(OUTPUT_BASE, date);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n🎬 Rendering 2 daily reels for ${date} (Day ${day})...\n`);

  // ── Fetch data ──
  const briefs = await supabaseGet('daily_briefs', `date=eq.${date}&select=*`);
  if (!briefs.length) {
    // Try yesterday
    const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10);
    const yBriefs = await supabaseGet('daily_briefs', `date=eq.${yesterday}&select=*`);
    if (yBriefs.length) {
      console.log(`  No brief for ${date}, using ${yesterday}`);
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

  const statusBreakdown = { notStarted: 0, inProgress: 0, stalled: 0, delivered: 0 };
  for (const p of promises) {
    if (p.status === 'not_started') statusBreakdown.notStarted++;
    else if (p.status === 'in_progress') statusBreakdown.inProgress++;
    else if (p.status === 'stalled') statusBreakdown.stalled++;
    else if (p.status === 'delivered') statusBreakdown.delivered++;
  }

  const topMovers = promises
    .filter(p => p.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4)
    .map(p => ({ titleNe: p.title_ne || p.title, title: p.title, progress: p.progress || 0, status: p.status }));

  const reelData = {
    date, dayNumber: day,
    pulse: brief.pulse || 0, pulseLabel: brief.pulse_label || '',
    phase: day <= 30 ? 'early' : day <= 100 ? 'ramp' : 'delivery',
    topStories: stories.slice(0, 5).map(s => ({
      title: s.title || '', titleNe: s.titleNe || '',
      summary: s.summary || '', summaryNe: s.summaryNe || '',
      sentiment: s.sentiment || 'neutral', signalCount: s.signalCount || 0,
    })),
    stats: { totalSignals: 38200 + todaySignals, newSignals: todaySignals, sourcesActive: 80, commitmentsTracked: 109 },
    commitmentsMoved: {
      confirms: moved.filter(c => c.direction === 'confirms').length,
      contradicts: moved.filter(c => c.direction === 'contradicts').length,
    },
    statusBreakdown, topMovers,
    minister: { name: 'Balen Shah', nameNe: 'बालेन शाह', role: 'Prime Minister', roleNe: 'प्रधानमन्त्री' },
  };

  const propsPath = join(outDir, 'reel-props.json');
  writeFileSync(propsPath, JSON.stringify({ data: reelData }));

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Generate ALL voiceovers FIRST (fail fast if TTS broken)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🎙️  Step 1: Generating voiceovers...\n');

  const vo1Path = join(outDir, '1-vo.mp3');
  const storyHeadlinesNe = stories.slice(0, 3).map(s => s.titleNe || s.title).filter(Boolean).join('। ');
  const vo1Script = `नमस्कार। आज सरकारको ${day} औं दिन हो। ` +
    `${todaySignals} नयाँ संकेत भेटियो। ` +
    `${storyHeadlinesNe}। ` +
    `१०९ वचनबद्धतामध्ये ${statusBreakdown.inProgress} प्रगतिमा, ${statusBreakdown.stalled} रोकिएको, ${statusBreakdown.delivered} पूरा भएको छ। ` +
    `प्रधानमन्त्री बालेन शाहले ${day} दिनमा कति प्रगति गरे? ` +
    `सरकारलाई कति अंक दिनुहुन्छ? कमेन्टमा भन्नुहोस्। ` +
    `थप विवरण नेपाल रिपब्लिक डट ओआरजीमा।`;
  await generateVoiceover(vo1Script, vo1Path, 'ne-NP-SagarNeural');

  const vo2Path = join(outDir, '2-vo.mp3');
  const storyHeadlinesEn = stories.slice(0, 3).map(s => s.title).filter(Boolean).join('. ');
  const vo2Script = `Day ${day} of the new government. ` +
    `${todaySignals} new signals tracked today. ` +
    `${storyHeadlinesEn}. ` +
    `Of 109 government promises, ${statusBreakdown.inProgress} are in progress, ${statusBreakdown.stalled} stalled, and ${statusBreakdown.delivered} delivered. ` +
    `How is Prime Minister Balen Shah performing after ${day} days? ` +
    `How would you grade this government? Drop your score in the comments. ` +
    `Track all 109 promises at nepal republic dot org.`;
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

  console.log('  ✅ Both videos rendered\n');

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Merge audio + verify (fail if silent)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔊 Step 3: Merging audio & verifying...\n');

  const v1final = join(outDir, '1-daily-reel.mp4');
  console.log('🇳🇵 Nepali:');
  mergeAudio(v1raw, vo1Path, v1final);

  const v2final = join(outDir, '2-daily-reel-en.mp4');
  console.log('🌍 English:');
  mergeAudio(v2raw, vo2Path, v2final);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Cleanup temp files
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n🧹 Cleaning up...');
  for (const f of [propsPath, v1raw, v2raw, vo1Path, vo2Path]) {
    try { unlinkSync(f); } catch {}
  }

  const v1size = (statSync(v1final).size / 1024 / 1024).toFixed(1);
  const v2size = (statSync(v2final).size / 1024 / 1024).toFixed(1);

  console.log(`\n🎬🎬 BOTH REELS READY! 🎬🎬`);
  console.log(`📁 ${outDir}/`);
  console.log(`   1-daily-reel.mp4       — 60s Nepali (${v1size} MB)`);
  console.log(`   2-daily-reel-en.mp4    — 60s English (${v2size} MB)`);
  console.log(`\n🔊 Audio VERIFIED on both videos`);
  console.log(`🚀 Ready for Facebook / TikTok / Instagram / YouTube!\n`);
}

main().catch(err => { console.error('❌ FATAL:', err.message); process.exit(1); });
