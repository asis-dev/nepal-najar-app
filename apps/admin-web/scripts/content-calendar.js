#!/usr/bin/env node
/**
 * Content Calendar — daily content type selector + bilingual caption generator
 *
 * Picks a content type based on the day of the week and generates
 * platform-optimized captions (Facebook, Twitter/X, WhatsApp) in
 * both Nepali and English.
 *
 * Output: output/content-calendar/YYYY-MM-DD.json
 *
 * Usage:
 *   node scripts/content-calendar.js                  # auto-detect today
 *   node scripts/content-calendar.js --day monday      # force a day type
 *   node scripts/content-calendar.js --date 2026-04-20 # specific date
 *   node scripts/content-calendar.js --dry-run          # print, don't write
 */

const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { resolve, join } = require('path');

// ── Load .env.local ─────────────────────────────────────────────────────
const ROOT = resolve(__dirname, '..');
const envPath = join(ROOT, '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  console.error('Could not load .env.local');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOV_START = new Date('2026-03-26T00:00:00+05:45');
const FIRST_100_DAYS_END = new Date(GOV_START.getTime() + 100 * 86400000);
const HASHTAGS_NE = '#नेपालरिपब्लिक #नेपाल #बालेनशाह #सरकार #जवाफदेही';
const HASHTAGS_EN = '#NepalRepublic #Nepal #BalenShah #RSP #GovAccountability';
const SITE = 'nepalrepublic.org';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const forcedDay = args.find(a => a.startsWith('--day='))?.split('=')[1]
  || (args.includes('--day') ? args[args.indexOf('--day') + 1] : null);
const forcedDate = args.find(a => a.startsWith('--date='))?.split('=')[1]
  || (args.includes('--date') ? args[args.indexOf('--date') + 1] : null);
const dryRun = args.includes('--dry-run');

// ── Date helpers ────────────────────────────────────────────────────────
function nepalNow() {
  return new Date(Date.now() + (5 * 60 + 45) * 60 * 1000);
}

function todayDate() {
  return forcedDate || nepalNow().toISOString().slice(0, 10);
}

function dayInOffice(dateStr) {
  const d = new Date(dateStr + 'T12:00:00+05:45');
  return Math.max(1, Math.floor((d.getTime() - GOV_START.getTime()) / 86400000) + 1);
}

function daysUntil100(dateStr) {
  const d = new Date(dateStr + 'T12:00:00+05:45');
  return Math.max(0, Math.ceil((FIRST_100_DAYS_END.getTime() - d.getTime()) / 86400000));
}

function getDayOfWeek(dateStr) {
  if (forcedDay) return forcedDay.toLowerCase();
  const d = new Date(dateStr + 'T12:00:00+05:45');
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getUTCDay()];
}

function scoreToGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

// ── Supabase queries ────────────────────────────────────────────────────
async function fetchAllPromises() {
  const { data, error } = await supabase
    .from('promises')
    .select('id, title, title_ne, status, progress, category, category_ne, description, description_ne, last_update, last_signal_at, deadline, actors')
    .order('id');
  if (error) throw new Error(`Supabase promises: ${error.message}`);
  return data || [];
}

async function fetchRecentSignals(sinceDays = 7) {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const { data, error } = await supabase
    .from('intelligence_signals')
    .select('id, title, source_name, published_at, promise_ids')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Supabase signals: ${error.message}`);
  return data || [];
}

async function fetchRecentEvidence(sinceDays = 7) {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const { data, error } = await supabase
    .from('evidence_vault')
    .select('id, promise_id, quote, source_name, verification_status, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.warn(`Evidence query failed: ${error.message}`);
  return data || [];
}

// ── Content type definitions ────────────────────────────────────────────

const CONTENT_TYPES = {
  monday: {
    slug: 'promise-spotlight',
    titleEn: 'Promise Spotlight',
    titleNe: 'वाचा स्पटलाइट',
    emoji: '🔍',
    videoType: 'hype-reel',
    videoFlags: '--promise',
  },
  tuesday: {
    slug: 'progress-update',
    titleEn: 'Progress Update',
    titleNe: 'प्रगति अपडेट',
    emoji: '📈',
    videoType: 'daily-reel',
    videoFlags: '',
  },
  wednesday: {
    slug: 'shame-board',
    titleEn: 'Shame Board',
    titleNe: 'लज्जा बोर्ड',
    emoji: '🚨',
    videoType: 'hype-reel',
    videoFlags: '--promise',
  },
  thursday: {
    slug: 'good-news',
    titleEn: 'Good News',
    titleNe: 'सुखबर',
    emoji: '✅',
    videoType: 'daily-reel',
    videoFlags: '',
  },
  friday: {
    slug: 'week-in-review',
    titleEn: 'Week in Review',
    titleNe: 'हप्ताको समीक्षा',
    emoji: '📊',
    videoType: 'daily-reel',
    videoFlags: '',
  },
  saturday: {
    slug: 'promise-vs-reality',
    titleEn: 'Promise vs Reality',
    titleNe: 'वाचा बनाम वास्तविकता',
    emoji: '⚡',
    videoType: 'hype-reel',
    videoFlags: '--promise',
  },
  sunday: {
    slug: '100-day-countdown',
    titleEn: '100-Day Countdown',
    titleNe: '१०० दिन काउन्टडाउन',
    emoji: '⏳',
    videoType: 'daily-reel',
    videoFlags: '',
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CONTENT GENERATORS — one per day
// ═══════════════════════════════════════════════════════════════════════

/**
 * MONDAY — Promise Spotlight
 * Deep dive on the most controversial promise (stalled, 0%, or recently changed).
 */
async function generateMonday(promises, date, day) {
  // Score each promise for controversy
  const scored = promises.map(p => {
    let controversy = 0;
    if (p.status === 'stalled') controversy += 50;
    if (p.progress === 0 && p.status !== 'delivered') controversy += 40;
    if (p.status === 'not_started') controversy += 30;
    // Recently changed = interesting
    if (p.last_update) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(p.last_update).getTime()) / 86400000);
      if (daysSinceUpdate <= 7) controversy += 25; // changed this week
    }
    // Daily-life topics are more engaging
    const cat = (p.category || '').toLowerCase();
    if (['economy', 'transport', 'health', 'education', 'infrastructure'].includes(cat)) controversy += 15;
    return { ...p, controversy };
  }).sort((a, b) => b.controversy - a.controversy);

  const pick = scored[0];
  const grade = scoreToGrade(pick.progress);

  const data = {
    spotlightPromise: {
      id: pick.id,
      title: pick.title,
      titleNe: pick.title_ne,
      status: pick.status,
      progress: pick.progress,
      category: pick.category,
      grade,
      lastUpdate: pick.last_update,
    },
    captions: {
      facebook: {
        ne: `${CONTENT_TYPES.monday.emoji} वाचा स्पटलाइट — दिन ${day}\n\n"${pick.title_ne}"\n\nस्थिति: ${statusNe(pick.status)} | प्रगति: ${pick.progress}% | ग्रेड: ${grade}\n\n${day} दिन बित्यो — यो वाचा ${pick.progress === 0 ? 'सुरु पनि भएन!' : pick.status === 'stalled' ? 'रोकिएको छ!' : `${pick.progress}% मा छ।`}\n\n${pick.progress === 0 ? 'किन सुरु भएन?' : 'यो गति पर्याप्त छ?'} कमेन्टमा भन्नुहोस् 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day} #वाचास्पटलाइट`,
        en: `${CONTENT_TYPES.monday.emoji} Promise Spotlight — Day ${day}\n\n"${pick.title}"\n\nStatus: ${pick.status.replace('_', ' ')} | Progress: ${pick.progress}% | Grade: ${grade}\n\n${day} days in — ${pick.progress === 0 ? 'NOT EVEN STARTED.' : pick.status === 'stalled' ? 'STALLED.' : `only ${pick.progress}% done.`}\n\nIs this acceptable? Tell us 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day} #PromiseSpotlight`,
      },
      twitter: {
        ne: `${CONTENT_TYPES.monday.emoji} वाचा स्पटलाइट | दिन ${day}\n\n"${pick.title_ne}"\n${statusNe(pick.status)} — ${pick.progress}% प्रगति\n\n${pick.progress === 0 ? 'सुरु पनि भएन!' : 'यो गति पर्याप्त?'}\n\n${SITE}\n${HASHTAGS_NE}`,
        en: `${CONTENT_TYPES.monday.emoji} Promise Spotlight | Day ${day}\n\n"${pick.title}"\n${pick.status.replace('_', ' ')} — ${pick.progress}%\n\n${pick.progress === 0 ? 'Not even started!' : 'Is this pace enough?'}\n\n${SITE}\n${HASHTAGS_EN}`,
      },
      whatsapp: {
        ne: `${CONTENT_TYPES.monday.emoji} *वाचा स्पटलाइट — दिन ${day}*\n\n*"${pick.title_ne}"*\nस्थिति: ${statusNe(pick.status)}\nप्रगति: ${pick.progress}%\nग्रेड: ${grade}\n\n${pick.progress === 0 ? 'सुरु पनि भएन!' : `${pick.progress}% मा छ।`}\n\n👉 ${SITE}`,
        en: `${CONTENT_TYPES.monday.emoji} *Promise Spotlight — Day ${day}*\n\n*"${pick.title}"*\nStatus: ${pick.status.replace('_', ' ')}\nProgress: ${pick.progress}%\nGrade: ${grade}\n\n${pick.progress === 0 ? 'Not even started!' : `Only ${pick.progress}% done.`}\n\n👉 ${SITE}`,
      },
    },
    renderCommand: `node scripts/render-hype-reel.js --promise ${pick.id}`,
  };

  return data;
}

/**
 * TUESDAY — Progress Update
 * What moved this week? Show promises that changed status or progress.
 */
async function generateTuesday(promises, date, day) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  // Find promises updated in last 7 days
  const movers = promises
    .filter(p => p.last_update && p.last_update >= sevenDaysAgo)
    .sort((a, b) => (b.progress || 0) - (a.progress || 0));

  const moverCount = movers.length;
  const topMovers = movers.slice(0, 5);

  // Stats
  const inProgress = promises.filter(p => p.status === 'in_progress').length;
  const stalled = promises.filter(p => p.status === 'stalled').length;
  const delivered = promises.filter(p => p.status === 'delivered').length;
  const notStarted = promises.filter(p => p.status === 'not_started').length;

  const moverListNe = topMovers.map((m, i) => `${i + 1}. ${m.title_ne} — ${m.progress}%`).join('\n');
  const moverListEn = topMovers.map((m, i) => `${i + 1}. ${m.title} — ${m.progress}%`).join('\n');
  const noMovement = moverCount === 0;

  const data = {
    movers: topMovers.map(m => ({ id: m.id, title: m.title, titleNe: m.title_ne, status: m.status, progress: m.progress })),
    moverCount,
    stats: { inProgress, stalled, delivered, notStarted, total: promises.length },
    captions: {
      facebook: {
        ne: `📈 प्रगति अपडेट — दिन ${day}\n\n${noMovement ? 'यो हप्ता कुनै वाचामा प्रगति भएन! 😤' : `यो हप्ता ${moverCount} वाचामा प्रगति भयो:`}\n\n${noMovement ? '' : moverListNe + '\n\n'}📊 समग्र:\n✅ पूरा: ${delivered}\n🔄 प्रगतिमा: ${inProgress}\n⏸️ रोकिएको: ${stalled}\n❌ सुरु नभएको: ${notStarted}\n\nयो गति पर्याप्त छ? कमेन्टमा भन्नुहोस् 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day}`,
        en: `📈 Progress Update — Day ${day}\n\n${noMovement ? 'No promises moved this week! 😤' : `${moverCount} promises showed movement this week:`}\n\n${noMovement ? '' : moverListEn + '\n\n'}📊 Overall:\n✅ Delivered: ${delivered}\n🔄 In Progress: ${inProgress}\n⏸️ Stalled: ${stalled}\n❌ Not Started: ${notStarted}\n\nIs this pace acceptable? Drop your take 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day}`,
      },
      twitter: {
        ne: `📈 प्रगति अपडेट | दिन ${day}\n\n${noMovement ? 'यो हप्ता शून्य प्रगति! 😤' : `${moverCount} वाचामा प्रगति`}\n\n✅ ${delivered} पूरा | 🔄 ${inProgress} प्रगतिमा\n⏸️ ${stalled} रोकिएको | ❌ ${notStarted} सुरु नभएको\n\n${SITE}\n${HASHTAGS_NE}`,
        en: `📈 Progress Update | Day ${day}\n\n${noMovement ? 'ZERO movement this week! 😤' : `${moverCount} promises moved`}\n\n✅ ${delivered} delivered | 🔄 ${inProgress} in progress\n⏸️ ${stalled} stalled | ❌ ${notStarted} not started\n\n${SITE}\n${HASHTAGS_EN}`,
      },
      whatsapp: {
        ne: `📈 *प्रगति अपडेट — दिन ${day}*\n\n${noMovement ? 'यो हप्ता कुनै प्रगति भएन!' : `${moverCount} वाचामा प्रगति:`}\n${noMovement ? '' : '\n' + moverListNe}\n\n*समग्र:*\n✅ पूरा: ${delivered}\n🔄 प्रगतिमा: ${inProgress}\n⏸️ रोकिएको: ${stalled}\n❌ सुरु नभएको: ${notStarted}\n\n👉 ${SITE}`,
        en: `📈 *Progress Update — Day ${day}*\n\n${noMovement ? 'No movement this week!' : `${moverCount} promises moved:`}\n${noMovement ? '' : '\n' + moverListEn}\n\n*Overall:*\n✅ Delivered: ${delivered}\n🔄 In Progress: ${inProgress}\n⏸️ Stalled: ${stalled}\n❌ Not Started: ${notStarted}\n\n👉 ${SITE}`,
      },
    },
    renderCommand: 'node scripts/render-all-videos.js',
  };

  return data;
}

/**
 * WEDNESDAY — Shame Board
 * Top 5 worst-performing promises ranked by staleness.
 */
async function generateWednesday(promises, date, day) {
  const now = Date.now();

  // Score by staleness: days since last update with no/low progress
  const shamed = promises
    .filter(p => p.status !== 'delivered')
    .map(p => {
      const lastUpdate = p.last_update ? new Date(p.last_update).getTime() : GOV_START.getTime();
      const daysSinceUpdate = Math.floor((now - lastUpdate) / 86400000);
      let shameScore = daysSinceUpdate; // base: days stale
      if (p.progress === 0) shameScore += 50; // zero progress bonus
      if (p.status === 'stalled') shameScore += 30;
      if (p.status === 'not_started') shameScore += 20;
      return { ...p, shameScore, daysSinceUpdate };
    })
    .sort((a, b) => b.shameScore - a.shameScore)
    .slice(0, 5);

  const listNe = shamed.map((s, i) =>
    `${i + 1}. ${s.title_ne} — ${s.progress}% | ${s.daysSinceUpdate} दिनदेखि अपडेट छैन`
  ).join('\n');
  const listEn = shamed.map((s, i) =>
    `${i + 1}. ${s.title} — ${s.progress}% | ${s.daysSinceUpdate} days without update`
  ).join('\n');

  // Pick the worst one for the hype reel
  const worstId = shamed[0]?.id;

  const data = {
    shamedPromises: shamed.map(s => ({
      id: s.id, title: s.title, titleNe: s.title_ne,
      status: s.status, progress: s.progress,
      daysSinceUpdate: s.daysSinceUpdate, shameScore: s.shameScore,
    })),
    captions: {
      facebook: {
        ne: `🚨 लज्जा बोर्ड — दिन ${day}\n\n${day} दिन बित्यो — यी ५ वाचा सबैभन्दा खराब:\n\n${listNe}\n\n😤 कसको गल्ती हो? सरकार कि मन्त्री?\nकमेन्टमा भन्नुहोस् 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day} #लज्जाबोर्ड #ShameBoard`,
        en: `🚨 Shame Board — Day ${day}\n\n${day} days in — these 5 promises are performing WORST:\n\n${listEn}\n\n😤 Who's responsible? Government or ministers?\nTell us below 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day} #ShameBoard`,
      },
      twitter: {
        ne: `🚨 लज्जा बोर्ड | दिन ${day}\n\n सबैभन्दा खराब ५ वाचा:\n\n${shamed.map((s, i) => `${i+1}. ${s.title_ne} — ${s.progress}%`).join('\n')}\n\nकसको गल्ती? 👇\n\n${SITE}\n${HASHTAGS_NE}`,
        en: `🚨 Shame Board | Day ${day}\n\n5 WORST promises:\n\n${shamed.map((s, i) => `${i+1}. ${s.title} — ${s.progress}%`).join('\n')}\n\nWho's responsible? 👇\n\n${SITE}\n${HASHTAGS_EN}`,
      },
      whatsapp: {
        ne: `🚨 *लज्जा बोर्ड — दिन ${day}*\n\n*सबैभन्दा खराब ५ वाचा:*\n\n${listNe}\n\n😤 कसको गल्ती?\n\n👉 ${SITE}`,
        en: `🚨 *Shame Board — Day ${day}*\n\n*5 WORST performing promises:*\n\n${listEn}\n\n😤 Who's responsible?\n\n👉 ${SITE}`,
      },
    },
    renderCommand: worstId ? `node scripts/render-hype-reel.js --promise ${worstId}` : 'node scripts/render-all-videos.js',
  };

  return data;
}

/**
 * THURSDAY — Good News
 * Highlight delivered or significantly progressed promises. If none, "Still waiting..."
 */
async function generateThursday(promises, date, day) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const delivered = promises.filter(p => p.status === 'delivered');
  const highProgress = promises
    .filter(p => p.progress >= 50 && p.status === 'in_progress')
    .sort((a, b) => b.progress - a.progress);
  const recentlyMoved = promises
    .filter(p => p.last_update && p.last_update >= sevenDaysAgo && p.progress > 0 && p.status === 'in_progress')
    .sort((a, b) => b.progress - a.progress);

  const hasGoodNews = delivered.length > 0 || highProgress.length > 0;

  // Build highlights
  const highlights = [];
  for (const d of delivered.slice(0, 3)) {
    highlights.push({ ...d, reason: 'delivered' });
  }
  for (const h of highProgress.slice(0, 3 - highlights.length)) {
    if (!highlights.find(x => x.id === h.id))
      highlights.push({ ...h, reason: 'high_progress' });
  }
  for (const r of recentlyMoved.slice(0, 5 - highlights.length)) {
    if (!highlights.find(x => x.id === r.id))
      highlights.push({ ...r, reason: 'recently_moved' });
  }

  let listNe, listEn;
  if (hasGoodNews) {
    listNe = highlights.map((h, i) => {
      const tag = h.reason === 'delivered' ? '✅ पूरा' : `${h.progress}%`;
      return `${i + 1}. ${h.title_ne} — ${tag}`;
    }).join('\n');
    listEn = highlights.map((h, i) => {
      const tag = h.reason === 'delivered' ? '✅ Delivered' : `${h.progress}%`;
      return `${i + 1}. ${h.title} — ${tag}`;
    }).join('\n');
  }

  const data = {
    hasGoodNews,
    highlights: highlights.map(h => ({
      id: h.id, title: h.title, titleNe: h.title_ne,
      status: h.status, progress: h.progress, reason: h.reason,
    })),
    deliveredCount: delivered.length,
    captions: {
      facebook: {
        ne: hasGoodNews
          ? `✅ सुखबर — दिन ${day}\n\n${day} दिनमा केही त राम्रो भयो!\n\n${listNe}\n\n${delivered.length > 0 ? `🎉 ${delivered.length} वाचा पूरा भइसक्यो!\n\n` : ''}यो पर्याप्त छ? अझ धेरै चाहिन्छ? कमेन्टमा भन्नुहोस् 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day} #सुखबर`
          : `⏳ अझै पर्खिरहेका छौं... — दिन ${day}\n\nआज कुनै सुखबर छैन। ✅ पूरा भएको: ${delivered.length} / ${promises.length}\n\n${day} दिन बित्यो, अझ कुर्नुपर्ने?\nकमेन्टमा भन्नुहोस् 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day}`,
        en: hasGoodNews
          ? `✅ Good News — Day ${day}\n\nSome things ARE working:\n\n${listEn}\n\n${delivered.length > 0 ? `🎉 ${delivered.length} promise(s) delivered!\n\n` : ''}Is this enough? Or do we need more? 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day} #GoodNews`
          : `⏳ Still waiting... — Day ${day}\n\nNo good news today. ✅ Delivered: ${delivered.length}/${promises.length}\n\n${day} days in. How much longer?\nTell us 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day}`,
      },
      twitter: {
        ne: hasGoodNews
          ? `✅ सुखबर | दिन ${day}\n\n${highlights.slice(0, 3).map((h, i) => `${i+1}. ${h.title_ne} — ${h.reason === 'delivered' ? 'पूरा' : h.progress + '%'}`).join('\n')}\n\nपर्याप्त? 👇\n\n${SITE}\n${HASHTAGS_NE}`
          : `⏳ दिन ${day} — अझ कुनै सुखबर छैन\n\nपूरा: ${delivered.length}/${promises.length}\n\nकहिलेसम्म कुर्ने? 👇\n\n${SITE}\n${HASHTAGS_NE}`,
        en: hasGoodNews
          ? `✅ Good News | Day ${day}\n\n${highlights.slice(0, 3).map((h, i) => `${i+1}. ${h.title} — ${h.reason === 'delivered' ? 'Delivered' : h.progress + '%'}`).join('\n')}\n\nEnough? 👇\n\n${SITE}\n${HASHTAGS_EN}`
          : `⏳ Day ${day} — Still no good news\n\nDelivered: ${delivered.length}/${promises.length}\n\nHow much longer? 👇\n\n${SITE}\n${HASHTAGS_EN}`,
      },
      whatsapp: {
        ne: hasGoodNews
          ? `✅ *सुखबर — दिन ${day}*\n\n${listNe}\n\n${delivered.length > 0 ? `🎉 ${delivered.length} वाचा पूरा!` : ''}\n\n👉 ${SITE}`
          : `⏳ *अझै पर्खिरहेका छौं — दिन ${day}*\n\nआज कुनै सुखबर छैन।\nपूरा: ${delivered.length}/${promises.length}\n\n👉 ${SITE}`,
        en: hasGoodNews
          ? `✅ *Good News — Day ${day}*\n\n${listEn}\n\n${delivered.length > 0 ? `🎉 ${delivered.length} delivered!` : ''}\n\n👉 ${SITE}`
          : `⏳ *Still waiting... — Day ${day}*\n\nNo good news today.\nDelivered: ${delivered.length}/${promises.length}\n\n👉 ${SITE}`,
      },
    },
    renderCommand: 'node scripts/render-all-videos.js',
  };

  return data;
}

/**
 * FRIDAY — Week in Review
 * Summary scorecard of the week.
 */
async function generateFriday(promises, date, day) {
  const total = promises.length;
  const delivered = promises.filter(p => p.status === 'delivered').length;
  const inProgress = promises.filter(p => p.status === 'in_progress').length;
  const stalled = promises.filter(p => p.status === 'stalled').length;
  const notStarted = promises.filter(p => p.status === 'not_started').length;

  const avgProgress = Math.round(promises.reduce((s, p) => s + (p.progress || 0), 0) / total);
  const grade = scoreToGrade(avgProgress);
  const onTrack = promises.filter(p => p.progress >= 20 || p.status === 'delivered').length;
  const onTrackPct = Math.round((onTrack / total) * 100);

  // Count updates this week
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const updatedThisWeek = promises.filter(p => p.last_update && p.last_update >= sevenDaysAgo).length;

  // Signals this week
  let signalsThisWeek = 0;
  try {
    const signals = await fetchRecentSignals(7);
    signalsThisWeek = signals.length;
  } catch {}

  const remaining100 = daysUntil100(date);

  const data = {
    weekStats: {
      total, delivered, inProgress, stalled, notStarted,
      avgProgress, grade, onTrack, onTrackPct,
      updatedThisWeek, signalsThisWeek, remaining100,
    },
    captions: {
      facebook: {
        ne: `📊 हप्ताको समीक्षा — दिन ${day}\n\n🏛️ सरकारको ${day} दिन — कस्तो रह्यो?\n\n📈 औसत प्रगति: ${avgProgress}%\n🎯 ग्रेड: ${grade}\n✅ पूरा: ${delivered}/${total}\n🔄 प्रगतिमा: ${inProgress}\n⏸️ रोकिएको: ${stalled}\n❌ सुरु नभएको: ${notStarted}\n\n📡 यो हप्ता ${signalsThisWeek} समाचार/संकेत ट्र्याक गरियो\n📝 ${updatedThisWeek} वाचामा अपडेट\n\n${remaining100 > 0 ? `⏳ १०० दिन सम्म ${remaining100} दिन बाँकी` : '⏳ १०० दिन पूरा भइसक्यो!'}\n\nतपाईं ग्रेड ${grade} सहमत? कमेन्टमा भन्नुहोस् 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day} #हप्ताकोसमीक्षा`,
        en: `📊 Week in Review — Day ${day}\n\n🏛️ ${day} days of government — how are they doing?\n\n📈 Avg Progress: ${avgProgress}%\n🎯 Grade: ${grade}\n✅ Delivered: ${delivered}/${total}\n🔄 In Progress: ${inProgress}\n⏸️ Stalled: ${stalled}\n❌ Not Started: ${notStarted}\n\n📡 ${signalsThisWeek} signals tracked this week\n📝 ${updatedThisWeek} promises updated\n\n${remaining100 > 0 ? `⏳ ${remaining100} days left in first 100 days` : '⏳ First 100 days complete!'}\n\nDo you agree with Grade ${grade}? 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day} #WeekInReview`,
      },
      twitter: {
        ne: `📊 हप्ताको समीक्षा | दिन ${day}\n\nग्रेड: ${grade} | औसत: ${avgProgress}%\n✅ ${delivered} पूरा | 🔄 ${inProgress} प्रगतिमा\n⏸️ ${stalled} रोकिएको | ❌ ${notStarted} सुरु नभएको\n\n${remaining100 > 0 ? `⏳ ${remaining100} दिन बाँकी` : '१०० दिन पूरा!'}\n\n${SITE}\n${HASHTAGS_NE}`,
        en: `📊 Week in Review | Day ${day}\n\nGrade: ${grade} | Avg: ${avgProgress}%\n✅ ${delivered} | 🔄 ${inProgress} | ⏸️ ${stalled} | ❌ ${notStarted}\n\n${remaining100 > 0 ? `⏳ ${remaining100} days to 100-day mark` : '100 days done!'}\n\n${SITE}\n${HASHTAGS_EN}`,
      },
      whatsapp: {
        ne: `📊 *हप्ताको समीक्षा — दिन ${day}*\n\n*ग्रेड: ${grade}* | औसत प्रगति: ${avgProgress}%\n\n✅ पूरा: ${delivered}/${total}\n🔄 प्रगतिमा: ${inProgress}\n⏸️ रोकिएको: ${stalled}\n❌ सुरु नभएको: ${notStarted}\n\n📡 ${signalsThisWeek} संकेत | 📝 ${updatedThisWeek} अपडेट\n${remaining100 > 0 ? `⏳ ${remaining100} दिन बाँकी` : '⏳ १०० दिन पूरा!'}\n\n👉 ${SITE}`,
        en: `📊 *Week in Review — Day ${day}*\n\n*Grade: ${grade}* | Avg Progress: ${avgProgress}%\n\n✅ Delivered: ${delivered}/${total}\n🔄 In Progress: ${inProgress}\n⏸️ Stalled: ${stalled}\n❌ Not Started: ${notStarted}\n\n📡 ${signalsThisWeek} signals | 📝 ${updatedThisWeek} updates\n${remaining100 > 0 ? `⏳ ${remaining100} days left` : '⏳ 100 days done!'}\n\n👉 ${SITE}`,
      },
    },
    renderCommand: 'node scripts/render-all-videos.js',
  };

  return data;
}

/**
 * SATURDAY — Promise vs Reality
 * Pick the promise with the biggest gap between promise and reality.
 */
async function generateSaturday(promises, date, day) {
  // Score for "gap" — ambitious promise, zero/low delivery
  const gapped = promises
    .filter(p => p.status !== 'delivered')
    .map(p => {
      let gapScore = 0;
      // Zero progress on something that should have started = huge gap
      if (p.progress === 0) gapScore += 60;
      if (p.status === 'stalled') gapScore += 40;
      if (p.status === 'not_started') gapScore += 30;
      // Low progress late in the term = growing gap
      if (p.progress < 20) gapScore += 20;
      // Deadlines missed?
      if (p.deadline) {
        const deadlinePassed = new Date(p.deadline) < new Date(date);
        if (deadlinePassed && p.progress < 100) gapScore += 50;
      }
      // Daily-life categories resonate more
      const cat = (p.category || '').toLowerCase();
      if (['economy', 'transport', 'health', 'infrastructure', 'education'].includes(cat)) gapScore += 15;
      return { ...p, gapScore };
    })
    .sort((a, b) => b.gapScore - a.gapScore);

  const pick = gapped[0];
  const grade = scoreToGrade(pick.progress);

  // Project completion at current rate
  let projectionNe = '', projectionEn = '';
  if (pick.progress > 0) {
    const daysPerPercent = Math.round(day / pick.progress);
    const projectedDays = daysPerPercent * 100;
    const projectedYears = (projectedDays / 365).toFixed(1);
    projectionNe = `यो गतिमा पूरा हुन ${projectedYears} वर्ष लाग्छ!`;
    projectionEn = `At this rate, it'll take ${projectedYears} YEARS to complete!`;
  } else {
    projectionNe = `${day} दिन बित्यो — सुरु पनि भएन!`;
    projectionEn = `${day} days in — not even started!`;
  }

  const data = {
    chosenPromise: {
      id: pick.id, title: pick.title, titleNe: pick.title_ne,
      status: pick.status, progress: pick.progress, grade,
      category: pick.category, gapScore: pick.gapScore,
    },
    captions: {
      facebook: {
        ne: `⚡ वाचा बनाम वास्तविकता — दिन ${day}\n\n🗣️ वाचा: "${pick.title_ne}"\n📊 वास्तविकता: ${pick.progress}% | ${statusNe(pick.status)}\n\n${projectionNe}\n\nवाचा र वास्तविकतामा यति ठूलो खाडल!\nकसलाई जिम्मेवार ठान्नुहुन्छ? 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day} #वाचाबनामवास्तविकता`,
        en: `⚡ Promise vs Reality — Day ${day}\n\n🗣️ Promise: "${pick.title}"\n📊 Reality: ${pick.progress}% | ${pick.status.replace('_', ' ')}\n\n${projectionEn}\n\nThe gap between words and action is HUGE.\nWho do you hold responsible? 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day} #PromiseVsReality`,
      },
      twitter: {
        ne: `⚡ वाचा बनाम वास्तविकता | दिन ${day}\n\n"${pick.title_ne}"\nवास्तविकता: ${pick.progress}% — ${statusNe(pick.status)}\n\n${projectionNe}\n\nजिम्मेवार को? 👇\n\n${SITE}\n${HASHTAGS_NE}`,
        en: `⚡ Promise vs Reality | Day ${day}\n\n"${pick.title}"\nReality: ${pick.progress}% — ${pick.status.replace('_', ' ')}\n\n${projectionEn}\n\nWho's accountable? 👇\n\n${SITE}\n${HASHTAGS_EN}`,
      },
      whatsapp: {
        ne: `⚡ *वाचा बनाम वास्तविकता — दिन ${day}*\n\n*वाचा:* "${pick.title_ne}"\n*वास्तविकता:* ${pick.progress}% | ${statusNe(pick.status)}\n\n${projectionNe}\n\n👉 ${SITE}`,
        en: `⚡ *Promise vs Reality — Day ${day}*\n\n*Promise:* "${pick.title}"\n*Reality:* ${pick.progress}% | ${pick.status.replace('_', ' ')}\n\n${projectionEn}\n\n👉 ${SITE}`,
      },
    },
    renderCommand: `node scripts/render-hype-reel.js --promise ${pick.id}`,
  };

  return data;
}

/**
 * SUNDAY — 100-Day Countdown
 * "X days left in the first 100 days. Y promises delivered. Z% on track."
 */
async function generateSunday(promises, date, day) {
  const remaining = daysUntil100(date);
  const total = promises.length;
  const delivered = promises.filter(p => p.status === 'delivered').length;
  const inProgress = promises.filter(p => p.status === 'in_progress').length;
  const stalled = promises.filter(p => p.status === 'stalled').length;
  const notStarted = promises.filter(p => p.status === 'not_started').length;

  const avgProgress = Math.round(promises.reduce((s, p) => s + (p.progress || 0), 0) / total);
  const grade = scoreToGrade(avgProgress);
  const onTrack = promises.filter(p => p.progress >= 20 || p.status === 'delivered').length;
  const onTrackPct = Math.round((onTrack / total) * 100);

  const past100 = remaining <= 0;

  const data = {
    countdown: {
      remaining, day, total, delivered, inProgress, stalled, notStarted,
      avgProgress, grade, onTrack, onTrackPct, past100,
    },
    captions: {
      facebook: {
        ne: past100
          ? `⏳ १०० दिन पूरा! — दिन ${day}\n\n🏛️ सरकारको पहिलो १०० दिन पूरा भयो!\n\n📊 नतिजा:\n✅ पूरा: ${delivered}/${total}\n📈 औसत प्रगति: ${avgProgress}%\n🎯 ग्रेड: ${grade}\n🔄 प्रगतिमा: ${inProgress}\n⏸️ रोकिएको: ${stalled}\n❌ सुरु नभएको: ${notStarted}\n\n${onTrackPct}% वाचा ट्र्याकमा — ${onTrackPct >= 50 ? 'ठीकै छ?' : 'यो पर्याप्त छैन!'}\n\nतपाईंको रेटिङ कति? 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day} #१००दिन #100Days`
          : `⏳ १०० दिन काउन्टडाउन — दिन ${day}\n\n🏛️ पहिलो १०० दिनमा ${remaining} दिन बाँकी!\n\n📊 अहिलेको स्थिति:\n✅ पूरा: ${delivered}/${total}\n📈 औसत प्रगति: ${avgProgress}%\n🎯 ग्रेड: ${grade}\n🔄 प्रगतिमा: ${inProgress}\n⏸️ रोकिएको: ${stalled}\n❌ सुरु नभएको: ${notStarted}\n\n${remaining} दिनमा ${total - delivered} वाचा बाँकी!\n${onTrackPct}% ट्र्याकमा — पुग्छ?\n\nकमेन्टमा भन्नुहोस् 👇\n\n👉 ${SITE}\n\n${HASHTAGS_NE} #Day${day} #१००दिन #100DayCountdown`,
        en: past100
          ? `⏳ 100 Days Complete! — Day ${day}\n\n🏛️ The first 100 days are OVER.\n\n📊 Results:\n✅ Delivered: ${delivered}/${total}\n📈 Avg Progress: ${avgProgress}%\n🎯 Grade: ${grade}\n🔄 In Progress: ${inProgress}\n⏸️ Stalled: ${stalled}\n❌ Not Started: ${notStarted}\n\n${onTrackPct}% on track — ${onTrackPct >= 50 ? 'Acceptable?' : 'NOT ENOUGH.'}\n\nYour rating? 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day} #100Days`
          : `⏳ 100-Day Countdown — Day ${day}\n\n🏛️ ${remaining} days left in the first 100 days!\n\n📊 Current status:\n✅ Delivered: ${delivered}/${total}\n📈 Avg Progress: ${avgProgress}%\n🎯 Grade: ${grade}\n🔄 In Progress: ${inProgress}\n⏸️ Stalled: ${stalled}\n❌ Not Started: ${notStarted}\n\n${remaining} days to deliver ${total - delivered} promises.\n${onTrackPct}% on track — will they make it?\n\nYour prediction? 👇\n\n👉 ${SITE}\n\n${HASHTAGS_EN} #Day${day} #100DayCountdown`,
      },
      twitter: {
        ne: past100
          ? `⏳ १०० दिन पूरा! | दिन ${day}\n\nग्रेड: ${grade} | ${delivered}/${total} पूरा\nऔसत: ${avgProgress}%\n\nतपाईंको रेटिङ? 👇\n\n${SITE}\n${HASHTAGS_NE} #१००दिन`
          : `⏳ दिन ${day} | ${remaining} दिन बाँकी\n\n${delivered}/${total} पूरा | ग्रेड: ${grade}\n${onTrackPct}% ट्र्याकमा\n\n${remaining} दिनमा पुग्छ?\n\n${SITE}\n${HASHTAGS_NE} #१००दिन`,
        en: past100
          ? `⏳ 100 Days Done! | Day ${day}\n\nGrade: ${grade} | ${delivered}/${total} delivered\nAvg: ${avgProgress}%\n\nYour rating? 👇\n\n${SITE}\n${HASHTAGS_EN} #100Days`
          : `⏳ Day ${day} | ${remaining} days left\n\n${delivered}/${total} delivered | Grade: ${grade}\n${onTrackPct}% on track\n\nWill they make it? 👇\n\n${SITE}\n${HASHTAGS_EN} #100DayCountdown`,
      },
      whatsapp: {
        ne: past100
          ? `⏳ *१०० दिन पूरा! — दिन ${day}*\n\n*ग्रेड: ${grade}*\n✅ पूरा: ${delivered}/${total}\n📈 औसत: ${avgProgress}%\n\n${onTrackPct}% ट्र्याकमा\n\n👉 ${SITE}`
          : `⏳ *१०० दिन काउन्टडाउन — दिन ${day}*\n\n*${remaining} दिन बाँकी!*\n✅ पूरा: ${delivered}/${total}\n📈 औसत: ${avgProgress}%\n🎯 ग्रेड: ${grade}\n\n${onTrackPct}% ट्र्याकमा\n\n👉 ${SITE}`,
        en: past100
          ? `⏳ *100 Days Done! — Day ${day}*\n\n*Grade: ${grade}*\n✅ Delivered: ${delivered}/${total}\n📈 Avg: ${avgProgress}%\n\n${onTrackPct}% on track\n\n👉 ${SITE}`
          : `⏳ *100-Day Countdown — Day ${day}*\n\n*${remaining} days left!*\n✅ Delivered: ${delivered}/${total}\n📈 Avg: ${avgProgress}%\n🎯 Grade: ${grade}\n\n${onTrackPct}% on track\n\n👉 ${SITE}`,
      },
    },
    renderCommand: 'node scripts/render-all-videos.js',
  };

  return data;
}

// ── Nepali status helper ────────────────────────────────────────────────
function statusNe(status) {
  const map = {
    not_started: 'सुरु भएको छैन',
    in_progress: 'प्रगतिमा',
    stalled: 'रोकिएको',
    delivered: 'पूरा भएको',
  };
  return map[status] || status;
}

// ── Day router ──────────────────────────────────────────────────────────
const DAY_GENERATORS = {
  monday: generateMonday,
  tuesday: generateTuesday,
  wednesday: generateWednesday,
  thursday: generateThursday,
  friday: generateFriday,
  saturday: generateSaturday,
  sunday: generateSunday,
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
async function main() {
  const date = todayDate();
  const day = dayInOffice(date);
  const dayOfWeek = getDayOfWeek(date);
  const contentType = CONTENT_TYPES[dayOfWeek];

  if (!contentType) {
    console.error(`Unknown day of week: ${dayOfWeek}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  NEPAL REPUBLIC CONTENT CALENDAR`);
  console.log(`  Date: ${date} (${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}) | Day ${day} in office`);
  console.log(`  Content Type: ${contentType.emoji} ${contentType.titleEn} (${contentType.titleNe})`);
  console.log(`${'='.repeat(60)}\n`);

  // Fetch data
  console.log('Fetching promises from Supabase...');
  const promises = await fetchAllPromises();
  console.log(`  Found ${promises.length} promises\n`);

  if (promises.length === 0) {
    console.error('No promises found in Supabase!');
    process.exit(1);
  }

  // Generate content for today's type
  const generator = DAY_GENERATORS[dayOfWeek];
  console.log(`Generating ${contentType.titleEn} content...\n`);
  const content = await generator(promises, date, day);

  // Build output
  const output = {
    date,
    dayInOffice: day,
    dayOfWeek,
    contentType: {
      slug: contentType.slug,
      titleEn: contentType.titleEn,
      titleNe: contentType.titleNe,
      emoji: contentType.emoji,
    },
    videoType: contentType.videoType,
    videoFlags: contentType.videoFlags,
    renderCommand: content.renderCommand,
    generatedAt: new Date().toISOString(),
    ...content,
  };

  // Print summary
  console.log(`${'─'.repeat(60)}`);
  console.log(`${contentType.emoji} ${contentType.titleEn} — ${contentType.titleNe}`);
  console.log(`${'─'.repeat(60)}\n`);

  console.log('FACEBOOK (Nepali):');
  console.log(output.captions.facebook.ne);
  console.log(`\n${'─'.repeat(40)}\n`);

  console.log('TWITTER (English):');
  console.log(output.captions.twitter.en);
  console.log(`\n${'─'.repeat(40)}\n`);

  console.log(`VIDEO RENDER: ${content.renderCommand}\n`);

  // Write output JSON
  if (!dryRun) {
    const outDir = join(ROOT, 'output', 'content-calendar');
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, `${date}.json`);
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Output written to: ${outPath}\n`);
  } else {
    console.log('[DRY RUN] Skipping file write\n');
  }

  // Print full JSON to stdout for piping
  if (args.includes('--json')) {
    console.log(JSON.stringify(output, null, 2));
  }
}

main().catch(err => {
  console.error(`FATAL: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
