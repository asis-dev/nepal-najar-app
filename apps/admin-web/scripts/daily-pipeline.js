#!/usr/bin/env node
/**
 * Daily Pipeline Orchestrator — fully automated content machine
 *
 * Chains: verify brief → render videos → post to all platforms → notify
 *
 * Usage:
 *   node scripts/daily-pipeline.js --slot=morning   (posts Nepali reel)
 *   node scripts/daily-pipeline.js --slot=evening    (posts English reel)
 *   node scripts/daily-pipeline.js --render-only     (render without posting)
 *   node scripts/daily-pipeline.js --post-only       (post existing videos)
 *
 * Runs via LaunchD at 10:00 AM NPT (morning) and 10:00 PM NPT (evening)
 */

const { execSync } = require('child_process');
const { existsSync, mkdirSync, appendFileSync } = require('fs');
const { resolve, join } = require('path');

// ── Load env ─────────────────────────────────────────────────────────────
const ROOT = resolve(__dirname, '..');
const envPath = join(ROOT, '.env.local');
try {
  const { readFileSync } = require('fs');
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
} catch { console.error('Could not load .env.local'); process.exit(1); }

const NODE_PATH = process.execPath;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OUTPUT_BASE = resolve(process.env.HOME, 'Desktop/nepal-republic-videos');
const LOG_FILE = '/tmp/nepalrepublic-pipeline.log';
const GOV_START = new Date('2026-03-26T00:00:00+05:45');

// ── Args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const slot = args.find(a => a.startsWith('--slot='))?.split('=')[1] || 'morning';
const renderOnly = args.includes('--render-only');
const postOnly = args.includes('--post-only');

function todayDate() {
  const now = new Date();
  const nepal = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
  return nepal.toISOString().slice(0, 10);
}
function dayForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00+05:45');
  return Math.max(1, Math.floor((d.getTime() - GOV_START.getTime()) / 86400000) + 1);
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ── Stage 1: Verify brief exists ────────────────────────────────────────
async function verifyBrief(date) {
  log('📋 Stage 1: Verifying daily brief...');
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_briefs?date=eq.${date}&select=id`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const data = await res.json();
      if (data.length > 0) {
        log(`  ✅ Brief found for ${date}`);
        return true;
      }
    } catch {}

    // Also check yesterday
    const yesterday = new Date(new Date(date + 'T12:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_briefs?date=eq.${yesterday}&select=id`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const data = await res.json();
      if (data.length > 0) {
        log(`  ✅ Brief found for ${yesterday} (yesterday)`);
        return true;
      }
    } catch {}

    if (attempt < 3) {
      log(`  ⏳ No brief yet, waiting 2 minutes (attempt ${attempt + 1}/4)...`);
      await new Promise(r => setTimeout(r, 120000));
    }
  }
  log('  ❌ No brief found after 8 minutes');
  return false;
}

// ── Stage 2: Render videos ──────────────────────────────────────────────
function renderVideos(date) {
  log('🎬 Stage 2: Rendering videos...');
  const outDir = join(OUTPUT_BASE, date);

  // Check if already rendered today
  const neFile = join(outDir, '1-daily-reel.mp4');
  const enFile = join(outDir, '2-daily-reel-en.mp4');
  if (existsSync(neFile) && existsSync(enFile)) {
    log('  ✅ Videos already rendered for today, skipping');
    return true;
  }

  try {
    execSync(`"${NODE_PATH}" "${join(ROOT, 'scripts/render-all-videos.js')}" ${date}`, {
      cwd: ROOT,
      stdio: 'inherit',
      timeout: 600_000, // 10 min max
      env: { ...process.env, PATH: process.env.PATH },
    });

    if (existsSync(neFile) && existsSync(enFile)) {
      log('  ✅ Videos rendered successfully');
      return true;
    }
    log('  ❌ Render completed but output files missing');
    return false;
  } catch (err) {
    log(`  ❌ Render failed: ${err.message?.slice(0, 200)}`);
    return false;
  }
}

// ── Stage 3: Post to platforms ──────────────────────────────────────────
async function postToPlatforms(date, slot) {
  log(`📱 Stage 3: Posting to all platforms (${slot})...`);
  const { postToAllPlatforms } = require('./lib/platforms');

  const outDir = join(OUTPUT_BASE, date);
  const lang = slot === 'morning' ? 'ne' : 'en';
  const videoFile = lang === 'ne' ? '1-daily-reel.mp4' : '2-daily-reel-en.mp4';
  const videoPath = join(outDir, videoFile);

  if (!existsSync(videoPath)) {
    log(`  ❌ Video not found: ${videoPath}`);
    return {};
  }

  const results = await postToAllPlatforms({ videoPath, lang, date });
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const date = todayDate();
  const day = dayForDate(date);
  const startTime = Date.now();

  log(`\n${'═'.repeat(60)}`);
  log(`🚀 NEPAL REPUBLIC DAILY PIPELINE — ${slot.toUpperCase()}`);
  log(`📅 Date: ${date} | Day: ${day}`);
  log(`${'═'.repeat(60)}\n`);

  const pipelineResult = { date, day, renderSuccess: false, platforms: {} };

  try {
    // Stage 1: Verify brief
    if (!postOnly) {
      const briefOk = await verifyBrief(date);
      if (!briefOk) {
        log('⚠️  No brief available — will try to render with yesterday\'s data');
      }
    }

    // Stage 2: Render
    if (!postOnly) {
      pipelineResult.renderSuccess = renderVideos(date);
      if (!pipelineResult.renderSuccess) {
        log('⚠️  Render failed — checking if previous videos exist...');
        const outDir = join(OUTPUT_BASE, date);
        const videoFile = slot === 'morning' ? '1-daily-reel.mp4' : '2-daily-reel-en.mp4';
        if (!existsSync(join(outDir, videoFile))) {
          throw new Error('No video available to post');
        }
        log('  Using existing video from earlier render');
        pipelineResult.renderSuccess = true;
      }
    } else {
      pipelineResult.renderSuccess = true;
    }

    // Stage 3: Post
    if (!renderOnly) {
      pipelineResult.platforms = await postToPlatforms(date, slot);
    }

  } catch (err) {
    log(`\n❌ PIPELINE ERROR: ${err.message}`);
    pipelineResult.renderError = err.message;
  }

  // Stage 4: Notify
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  log(`\n⏱️  Pipeline completed in ${elapsed}s`);

  try {
    const { notifyPipelineResult } = require('./lib/notify');
    await notifyPipelineResult(pipelineResult);
  } catch (err) {
    log(`  ⚠️  Notification failed: ${err.message}`);
  }

  // Summary
  const platformResults = Object.values(pipelineResult.platforms);
  const successCount = platformResults.filter(r => r.success).length;
  const totalCount = platformResults.length;

  log(`\n${'═'.repeat(60)}`);
  log(`📊 SUMMARY: ${pipelineResult.renderSuccess ? '✅ Render' : '❌ Render'} | ${successCount}/${totalCount} platforms`);
  log(`${'═'.repeat(60)}\n`);

  if (!pipelineResult.renderSuccess && !postOnly) process.exit(1);
}

main().catch(err => {
  const msg = `❌ FATAL: ${err.message}`;
  console.error(msg);
  try { appendFileSync(LOG_FILE, `[${new Date().toISOString().slice(11, 19)}] ${msg}\n`); } catch {}
  process.exit(1);
});
