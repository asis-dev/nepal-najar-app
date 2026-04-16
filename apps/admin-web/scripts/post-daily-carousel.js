#!/usr/bin/env node
/**
 * Post Daily Carousel to Facebook
 *
 * Downloads 5 carousel slides from /api/og/carousel and posts them
 * as a Facebook photo album. Designed to run at 7 PM NPT (peak engagement).
 *
 * Also generates WhatsApp/Viber share text.
 *
 * Usage:
 *   node scripts/post-daily-carousel.js           # post carousel
 *   node scripts/post-daily-carousel.js --dry-run  # preview only
 *   node scripts/post-daily-carousel.js --share    # just output share text
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { resolve, join } = require('path');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';
const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isDryRun = process.argv.includes('--dry-run');
const shareOnly = process.argv.includes('--share');

// ── Government era ────────────────────────────────────────────────────────
const GOV_START = new Date('2026-03-26T00:00:00+05:45').getTime();
function dayInOffice() { return Math.max(1, Math.floor((Date.now() - GOV_START) / 86400000) + 1); }

// ── Supabase client ───────────────────────────────────────────────────────
const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ── Nepali numerals ───────────────────────────────────────────────────────
const NP = ['\u0966','\u0967','\u0968','\u0969','\u096A','\u096B','\u096C','\u096D','\u096E','\u096F'];
function toNp(n) { return String(n).replace(/\d/g, d => NP[d]); }

// ── Fetch stats ───────────────────────────────────────────────────────────
async function fetchStats() {
  if (!supabase) return { total: 121, delivered: 2, stalled: 6, notStarted: 58, inProgress: 55, grade: 'D+' };

  const { data } = await supabase.from('promises').select('status, progress').order('id');
  if (!data?.length) return { total: 121, delivered: 2, stalled: 6, notStarted: 58, inProgress: 55, grade: 'D+' };

  const stats = {
    total: data.length,
    delivered: data.filter(p => p.status === 'delivered').length,
    stalled: data.filter(p => p.status === 'stalled').length,
    notStarted: data.filter(p => p.status === 'not_started').length,
    inProgress: data.filter(p => p.status === 'in_progress').length,
  };

  const avgProgress = Math.round(data.reduce((s, p) => s + (p.progress || 0), 0) / data.length);
  stats.grade = avgProgress >= 80 ? 'A' : avgProgress >= 60 ? 'B' : avgProgress >= 40 ? 'C' : avgProgress >= 20 ? 'D' : 'F';
  return stats;
}

// ── Generate share texts ──────────────────────────────────────────────────
function generateShareTexts(stats) {
  const day = dayInOffice();
  const daysLeft = Math.max(0, 100 - day);

  const whatsapp = [
    `\uD83D\uDD34 *\u0926\u093F\u0928 ${toNp(day)} \u2014 \u0938\u0930\u0915\u093E\u0930 \u0938\u094D\u0915\u094B\u0930\u0915\u093E\u0930\u094D\u0921*`,
    '',
    `\uD83D\uDCCA ${toNp(stats.total)} \u0935\u091A\u0928\u092E\u0927\u094D\u092F\u0947 ${toNp(stats.delivered)} \u092A\u0942\u0930\u093E`,
    `\uD83C\uDFC6 \u0917\u094D\u0930\u0947\u0921: ${stats.grade}`,
    '',
    `\uD83D\uDE21 *\u0938\u092C\u0948\u092D\u0928\u094D\u0926\u093E \u0916\u0930\u093E\u092C:*`,
    `${toNp(stats.stalled)} \u0905\u0932\u092A\u0924\u094D\u0930 \u0964 ${toNp(stats.notStarted)} \u0938\u0941\u0930\u0941 \u0928\u092D\u090F\u0915\u094B`,
    '',
    `\u23F3 \u0967\u0966\u0966 \u0926\u093F\u0928\u092E\u093E ${toNp(daysLeft)} \u0926\u093F\u0928 \u092C\u093E\u0901\u0915\u0940`,
    '',
    `\uD83D\uDC49 \u092A\u0942\u0930\u093E \u0930\u093F\u092A\u094B\u0930\u094D\u091F: ${SITE_URL}`,
    '',
    `_${toNp(5)} \u091C\u0928\u093E\u0932\u093E\u0908 \u092B\u0930\u094D\u0935\u093E\u0930\u094D\u0921 \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D \uD83D\uDE4F_`,
  ].join('\n');

  const facebook = [
    `\uD83D\uDD34 \u0926\u093F\u0928 ${toNp(day)} \u2014 \u0938\u0930\u0915\u093E\u0930\u0915\u094B \u091C\u0935\u093E\u092B\u0926\u0947\u0939\u0940\u0924\u093E \u0938\u094D\u0915\u094B\u0930\u0915\u093E\u0930\u094D\u0921`,
    '',
    `\uD83D\uDCCA ${toNp(stats.total)} \u0935\u091A\u0928\u092E\u0927\u094D\u092F\u0947 ${toNp(stats.delivered)} \u092A\u0942\u0930\u093E, ${toNp(stats.stalled)} \u0905\u0932\u092A\u0924\u094D\u0930`,
    `\uD83C\uDFC6 \u0917\u094D\u0930\u0947\u0921: ${stats.grade}`,
    '',
    `\u0924\u092A\u093E\u0908\u0902\u0915\u094B \u0935\u093F\u091A\u093E\u0930 \u0915\u0947 \u091B? \u0915\u092E\u0947\u0928\u094D\u091F \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D \uD83D\uDC47`,
    '',
    `Full tracker: ${SITE_URL}`,
    '',
    `\u2014 Nepal Republic (\u0928\u0947\u092A\u093E\u0932 \u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915)`,
    '#NepalRepublic #\u0928\u0947\u092A\u093E\u0932\u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915 #\u0938\u0930\u0915\u093E\u0930\u091C\u0935\u093E\u092B\u0926\u0947\u0939\u0940 #Day' + day,
  ].join('\n');

  const twitter = [
    `\uD83D\uDD34 Day ${day}/100 \u2014 Nepal Government Scorecard`,
    '',
    `${stats.delivered}/${stats.total} delivered | ${stats.stalled} stalled | Grade: ${stats.grade}`,
    '',
    `${daysLeft} days left. Are they on track?`,
    '',
    `${SITE_URL}`,
    '#NepalRepublic #Accountability',
  ].join('\n');

  return { whatsapp, facebook, twitter };
}

// ── Download carousel slides ──────────────────────────────────────────────
async function downloadSlides() {
  const outDir = resolve(__dirname, '..', 'output', 'carousel');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const today = new Date().toISOString().split('T')[0];
  const dayDir = join(outDir, today);
  if (!existsSync(dayDir)) mkdirSync(dayDir, { recursive: true });

  const paths = [];
  for (let i = 1; i <= 5; i++) {
    const url = `${SITE_URL}/api/og/carousel?slide=${i}`;
    console.log(`  [download] Slide ${i}: ${url}`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`  [error] Slide ${i} failed: ${res.statusText}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const path = join(dayDir, `slide-${i}.png`);
      writeFileSync(path, buffer);
      paths.push(path);
      console.log(`  [saved] ${(buffer.length / 1024).toFixed(0)}KB → ${path}`);
    } catch (err) {
      console.error(`  [error] Slide ${i}: ${err.message}`);
    }
  }

  return paths;
}

// ── Post to Facebook as photo album ───────────────────────────────────────
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

async function postCarouselToFacebook(slidePaths, caption) {
  if (!PAGE_ID || !PAGE_TOKEN) {
    console.warn('[carousel] Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN — skipping');
    return;
  }

  // Step 1: Upload each photo as unpublished
  const photoIds = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const { readFileSync } = require('fs');
    const imageBuffer = readFileSync(slidePaths[i]);
    console.log(`  [upload] Slide ${i + 1} (${(imageBuffer.length / 1024).toFixed(0)}KB)...`);

    const { body, boundary } = buildMultipart(
      { access_token: PAGE_TOKEN, published: 'false' },
      { name: 'source', filename: `slide-${i + 1}.png`, contentType: 'image/png', data: imageBuffer }
    );

    const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error(`  [error] Upload slide ${i + 1}: ${data.error?.message || JSON.stringify(data)}`);
      continue;
    }
    photoIds.push(data.id);
    console.log(`  [uploaded] Photo ID: ${data.id}`);
  }

  if (photoIds.length === 0) {
    console.error('[carousel] No photos uploaded successfully');
    return;
  }

  // Step 2: Create a feed post attaching all photos
  const attachments = {};
  photoIds.forEach((id, i) => {
    attachments[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
  });

  const postRes = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: PAGE_TOKEN,
      message: caption,
      ...attachments,
    }),
  });
  const postData = await postRes.json();

  if (!postRes.ok || postData.error) {
    console.error(`[carousel] Feed post failed: ${postData.error?.message || JSON.stringify(postData)}`);
    return;
  }

  console.log(`\n[carousel] \u2705 Posted carousel! Post ID: ${postData.id}`);
  console.log(`[carousel] URL: https://www.facebook.com/${postData.id.replace('_', '/posts/')}`);
  return postData;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const day = dayInOffice();
  console.log(`\n\u2550\u2550\u2550 Nepal Republic Daily Carousel \u2014 Day ${day} \u2550\u2550\u2550\n`);

  // 1. Fetch stats
  const stats = await fetchStats();
  console.log(`[stats] ${stats.total} promises: ${stats.delivered} delivered, ${stats.stalled} stalled, ${stats.notStarted} not started`);
  console.log(`[stats] Grade: ${stats.grade}\n`);

  // 2. Generate share texts
  const texts = generateShareTexts(stats);

  if (shareOnly) {
    console.log('=== WhatsApp Share Text ===');
    console.log(texts.whatsapp);
    console.log('\n=== Facebook Caption ===');
    console.log(texts.facebook);
    console.log('\n=== Twitter ===');
    console.log(texts.twitter);
    console.log('\n=== Share URLs ===');
    console.log(`WhatsApp: https://wa.me/?text=${encodeURIComponent(texts.whatsapp)}`);
    console.log(`Viber: viber://forward?text=${encodeURIComponent(texts.whatsapp)}`);
    return;
  }

  // 3. Download slides
  console.log('[download] Fetching 5 carousel slides...');
  const slidePaths = await downloadSlides();
  console.log(`[download] Got ${slidePaths.length} slides\n`);

  if (slidePaths.length === 0) {
    console.error('[carousel] No slides downloaded. Exiting.');
    process.exit(1);
  }

  // 4. Save share texts
  const outDir = resolve(__dirname, '..', 'output', 'daily-share');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const today = new Date().toISOString().split('T')[0];
  const shareFile = join(outDir, `${today}.json`);
  writeFileSync(shareFile, JSON.stringify({
    date: today,
    day,
    stats,
    texts,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(texts.whatsapp)}`,
    viberUrl: `viber://forward?text=${encodeURIComponent(texts.whatsapp)}`,
  }, null, 2));
  console.log(`[share] Saved to ${shareFile}`);

  // 5. Post to Facebook
  if (isDryRun) {
    console.log('\n[dry-run] Would post carousel to Facebook with caption:');
    console.log(texts.facebook);
    return;
  }

  console.log('\n[post] Posting carousel to Facebook...');
  await postCarouselToFacebook(slidePaths, texts.facebook);
}

main().catch(err => {
  console.error('[carousel] Fatal:', err.message);
  process.exit(1);
});
