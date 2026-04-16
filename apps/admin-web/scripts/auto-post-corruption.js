#!/usr/bin/env node
/**
 * Auto-Post Viral Corruption Cases to Facebook
 *
 * When a corruption case reaches 20+ reactions and hasn't been posted
 * to Facebook yet, this script:
 *   1. Finds qualifying cases
 *   2. Downloads the case card image from /api/og/case-card
 *   3. Posts to Facebook page with Nepali caption
 *   4. Marks case as fb_posted in Supabase metadata
 *
 * Usage: node scripts/auto-post-corruption.js
 *   --dry-run    Preview without posting
 *   --threshold  Min reactions to qualify (default: 20)
 */

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
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

const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[auto-post] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const thresholdIdx = process.argv.indexOf('--threshold');
const REACTION_THRESHOLD = thresholdIdx !== -1 ? parseInt(process.argv[thresholdIdx + 1]) : 20;

// ── Supabase REST helpers ───────────────────────────────────────────────────
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function supabaseGet(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase GET ${table} failed: ${res.statusText}`);
  return res.json();
}

async function supabasePatch(table, query, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH ${table} failed: ${text}`);
  }
}

// ── Facebook posting ────────────────────────────────────────────────────────
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

async function postImageToFacebook(imageBuffer, caption) {
  if (!PAGE_ID || !PAGE_TOKEN) {
    console.warn('[auto-post] Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN — skipping FB post');
    return null;
  }

  const { body, boundary } = buildMultipart(
    { access_token: PAGE_TOKEN, message: caption, published: 'true' },
    { name: 'source', filename: 'case-card.png', contentType: 'image/png', data: imageBuffer }
  );

  const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Facebook post failed: ${data.error?.message || JSON.stringify(data)}`);
  }

  return data;
}

// ── Amount formatting ───────────────────────────────────────────────────────
function formatAmountNepali(amount) {
  if (!amount) return '';
  if (amount >= 1_00_00_00_000) return `${(amount / 1_00_00_00_000).toFixed(1)} अरब`;
  if (amount >= 1_00_00_000) return `${(amount / 1_00_00_000).toFixed(1)} करोड`;
  if (amount >= 1_00_000) return `${(amount / 1_00_000).toFixed(1)} लाख`;
  return amount.toLocaleString();
}

const TYPE_NE = {
  bribery: 'घुस', embezzlement: 'अपचलन', nepotism: 'नातावाद',
  money_laundering: 'मनी लाउन्डरिङ', land_grab: 'जग्गा कब्जा',
  procurement_fraud: 'खरिद भ्रष्टाचार', tax_evasion: 'कर छल्ने',
  abuse_of_authority: 'अधिकार दुरुपयोग', kickback: 'कमिसन', other: 'अन्य',
};

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[auto-post] Looking for cases with ${REACTION_THRESHOLD}+ reactions...`);
  if (isDryRun) console.log('[auto-post] DRY RUN mode — will not post or update DB');

  // 1. Get all case slugs with their reaction counts
  const reactions = await supabaseGet('corruption_reactions', '?select=case_slug');
  const countBySlug = {};
  for (const r of reactions) {
    countBySlug[r.case_slug] = (countBySlug[r.case_slug] || 0) + 1;
  }

  // Filter slugs that meet the threshold
  const qualifiedSlugs = Object.entries(countBySlug)
    .filter(([, count]) => count >= REACTION_THRESHOLD)
    .map(([slug]) => slug);

  if (qualifiedSlugs.length === 0) {
    console.log('[auto-post] No cases meet the reaction threshold. Done.');
    return;
  }

  console.log(`[auto-post] ${qualifiedSlugs.length} case(s) meet threshold`);

  // 2. Fetch those cases, check if already posted
  const slugFilter = qualifiedSlugs.map(s => `"${s}"`).join(',');
  const cases = await supabaseGet('corruption_cases', `?slug=in.(${slugFilter})&select=id,slug,title,title_ne,corruption_type,status,estimated_amount_npr,summary,tags`);

  let posted = 0;
  for (const c of cases) {
    // Check if already posted — stored in tags array as "fb_posted"
    if (c.tags && c.tags.includes('fb_posted')) {
      console.log(`  [skip] ${c.slug} — already posted to Facebook`);
      continue;
    }

    const reactionCount = countBySlug[c.slug];
    const title = c.title_ne || c.title;
    const amountStr = c.estimated_amount_npr ? `\u0930\u0942 ${formatAmountNepali(c.estimated_amount_npr)}` : '';
    const typeNe = TYPE_NE[c.corruption_type] || '\u092D\u094D\u0930\u0937\u094D\u091F\u093E\u091A\u093E\u0930';

    // Generate caption
    const caption = [
      `\uD83D\uDEA8 ${title}`,
      amountStr ? `\uD83D\uDCB0 ${amountStr} \u0915\u094B ${typeNe} \u0906\u0930\u094B\u092A\u0964` : `${typeNe} \u0906\u0930\u094B\u092A\u0964`,
      `\uD83D\uDE21 ${reactionCount} \u091C\u0928\u093E\u0932\u0947 \u092A\u094D\u0930\u0924\u093F\u0915\u094D\u0930\u093F\u092F\u093E \u0926\u093F\u0907\u0938\u0915\u0947\u0964`,
      '',
      `\u0924\u092A\u093E\u0908\u0902\u0915\u094B \u0935\u093F\u091A\u093E\u0930? \uD83D\uDC47`,
      `\uD83D\uDC49 ${SITE_URL}/corruption/${c.slug}`,
      '',
      '\u2014 Nepal Republic (\u0928\u0947\u092A\u093E\u0932 \u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915)',
      '#NepalRepublic #\u0928\u0947\u092A\u093E\u0932\u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915 #\u092D\u094D\u0930\u0937\u094D\u091F\u093E\u091A\u093E\u0930 #Corruption #Nepal',
    ].join('\n');

    console.log(`\n  [post] ${c.slug} (${reactionCount} reactions)`);
    console.log(`  Caption:\n${caption}\n`);

    if (isDryRun) {
      console.log('  [dry-run] Would download case card image and post to Facebook');
      continue;
    }

    // 3. Download the case card image
    try {
      const ogUrl = `${SITE_URL}/api/og/case-card?slug=${encodeURIComponent(c.slug)}`;
      console.log(`  [download] ${ogUrl}`);
      const imgRes = await fetch(ogUrl);
      if (!imgRes.ok) {
        console.error(`  [error] Failed to download case card: ${imgRes.statusText}`);
        continue;
      }
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      console.log(`  [download] Got ${(imageBuffer.length / 1024).toFixed(0)}KB image`);

      // 4. Post to Facebook
      const result = await postImageToFacebook(imageBuffer, caption);
      if (result) {
        console.log(`  [success] Posted! Photo ID: ${result.id}`);
      }

      // 5. Mark as posted in Supabase — add "fb_posted" to tags array
      const updatedTags = [...(c.tags || []), 'fb_posted'];
      await supabasePatch('corruption_cases', `?slug=eq.${c.slug}`, { tags: updatedTags });
      console.log(`  [db] Marked as fb_posted`);
      posted++;
    } catch (err) {
      console.error(`  [error] ${err.message}`);
    }
  }

  console.log(`\n[auto-post] Done. Posted ${posted} case(s) to Facebook.`);
}

main().catch(err => {
  console.error('[auto-post] Fatal error:', err.message);
  process.exit(1);
});
