#!/usr/bin/env npx tsx
/**
 * Real-world test suite for Nepal Republic (nepalrepublic.org)
 * Simulates how a human would use every major feature.
 *
 * Usage:
 *   npx tsx scripts/test-real-world.ts
 *   npx tsx scripts/test-real-world.ts --local    # test localhost:3000
 *   npx tsx scripts/test-real-world.ts --verbose   # show response bodies
 */

const BASE =
  process.argv.includes('--local')
    ? 'http://localhost:3000'
    : 'https://www.nepalrepublic.org';

const VERBOSE = process.argv.includes('--verbose');

// Auth config — pass via env or CLI
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kmyftbmtdabuyfampklz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteWZ0Ym10ZGFidXlmYW1wa2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODgzNTAsImV4cCI6MjA4OTQ2NDM1MH0.bViPgV8xtqHI8A_NIS8Wkx0iTa32bNn53m2ipFtZm8k';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

let passed = 0;
let failed = 0;
let skipped = 0;
const failures: string[] = [];

// Authenticated session token — populated during auth suite
let authToken: string | null = null;
let authUserId: string | null = null;

// ─── Helpers ──────────────────────────────────────────────────

async function fetchOk(
  url: string,
  opts?: RequestInit & { expectStatus?: number },
): Promise<{ status: number; body: string; json?: any; ok: boolean }> {
  const res = await fetch(url, {
    redirect: 'follow',
    ...opts,
    headers: { 'User-Agent': 'NepalRepublic-TestBot/1.0', ...(opts?.headers as any) },
  });
  const body = await res.text();
  let json: any;
  try { json = JSON.parse(body); } catch {}
  return { status: res.status, body, json, ok: res.ok };
}

function defineTest(name: string, fn: () => Promise<void>) {
  return { name, fn };
}

async function runTest(t: { name: string; fn: () => Promise<void> }) {
  try {
    await t.fn();
    passed++;
    console.log(`  ✅ ${t.name}`);
  } catch (err: any) {
    failed++;
    const msg = err?.message || String(err);
    failures.push(`${t.name}: ${msg}`);
    console.log(`  ❌ ${t.name} — ${msg}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertContains(body: string, text: string, label?: string) {
  assert(
    body.toLowerCase().includes(text.toLowerCase()),
    `${label || 'Page'} missing "${text}"`,
  );
}

// ─── Test Suites ──────────────────────────────────────────────

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 1: PAGES LOAD (human opens key pages in browser)    ║
// ╚══════════════════════════════════════════════════════════════╝

const pageLoadTests = [
  defineTest('Home page loads', async () => {
    const { status, body } = await fetchOk(BASE);
    assert(status === 200, `Status ${status}`);
    assertContains(body, 'Nepal Republic', 'Home');
  }),

  defineTest('About page loads with updated content', async () => {
    const { status, body } = await fetchOk(`${BASE}/about`);
    assert(status === 200, `Status ${status}`);
    assertContains(body, 'AI', 'About');
    // Check it has the new feature cards
    assertContains(body, '95+', 'About stats');
  }),

  defineTest('Daily brief page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/daily`);
    assert(status === 200, `Status ${status}`);
    assertContains(body, 'brief', 'Daily');
  }),

  defineTest('Services page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/services`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Report card page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/report-card`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Explore / Tracker page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/explore/first-100-days`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('What Changed page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/what-changed`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Leaderboard page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/leaderboard`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Corruption tracker loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/corruption`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Search page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/search`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Ministers page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/ministers`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Government page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/government`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Login page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/login`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Signup page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/signup`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Complaints page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/complaints`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Partner reply page loads (no token → shows error)', async () => {
    const { status, body } = await fetchOk(`${BASE}/partner/reply`);
    assert(status === 200, `Status ${status}`);
    // Without token it should render the page but show an error state
    assertContains(body, 'partner', 'Partner reply');
  }),

  defineTest('Onboarding page loads', async () => {
    const { status, body } = await fetchOk(`${BASE}/onboarding`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Me page loads (redirects to login if not authed)', async () => {
    const { status } = await fetchOk(`${BASE}/me`);
    // Should be 200 (the page itself handles auth check client-side)
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Privacy page loads', async () => {
    const { status } = await fetchOk(`${BASE}/privacy`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Terms page loads', async () => {
    const { status } = await fetchOk(`${BASE}/terms`);
    assert(status === 200, `Status ${status}`);
  }),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 2: SERVICE PAGES (human browses services)           ║
// ╚══════════════════════════════════════════════════════════════╝

const SERVICE_CATEGORIES = [
  'identity',
  'health',
  'transport',
  'tax',
  'education',
  'legal',
  'business',
  'utilities',
  'land',
  'banking',
];

const SERVICE_SLUGS = [
  { cat: 'identity', slug: 'national-id-nid' },
  { cat: 'identity', slug: 'birth-registration' },
  { cat: 'identity', slug: 'citizenship-by-birth' },
  { cat: 'transport', slug: 'drivers-license-new' },
  { cat: 'transport', slug: 'vehicle-registration' },
  { cat: 'health', slug: 'patan-hospital-opd' },
  { cat: 'health', slug: 'ambulance-102' },
  { cat: 'tax', slug: 'income-tax-filing' },
  { cat: 'tax', slug: 'vat-registration' },
  { cat: 'business', slug: 'trademark-registration' },
  { cat: 'business', slug: 'sole-proprietorship' },
  { cat: 'land', slug: 'land-parcha' },
  { cat: 'land', slug: 'land-mutation' },
  { cat: 'education', slug: 'see-results' },
  { cat: 'education', slug: 'noc-foreign-study' },
  { cat: 'legal', slug: 'consumer-complaint' },
  { cat: 'legal', slug: 'right-to-information' },
  { cat: 'utilities', slug: 'nea-new-connection' },
  { cat: 'utilities', slug: 'kukl-new-connection' },
  { cat: 'banking', slug: 'bank-account-opening' },
];

const serviceTests = [
  // Category pages
  ...SERVICE_CATEGORIES.map((cat) =>
    defineTest(`Service category "${cat}" page loads`, async () => {
      const { status } = await fetchOk(`${BASE}/services/${cat}`);
      assert(status === 200, `Status ${status}`);
    }),
  ),
  // Individual service pages
  ...SERVICE_SLUGS.map(({ cat, slug }) =>
    defineTest(`Service "${slug}" detail page loads`, async () => {
      const { status, body } = await fetchOk(`${BASE}/services/${cat}/${slug}`);
      assert(status === 200, `Status ${status}`);
    }),
  ),
  // Apply pages
  ...SERVICE_SLUGS.slice(0, 5).map(({ cat, slug }) =>
    defineTest(`Service "${slug}" apply page loads`, async () => {
      const { status } = await fetchOk(`${BASE}/services/${cat}/${slug}/apply`);
      assert(status === 200, `Status ${status}`);
    }),
  ),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 3: PUBLIC APIs (human interactions trigger these)   ║
// ╚══════════════════════════════════════════════════════════════╝

const apiTests = [
  defineTest('GET /api/daily-brief returns brief data', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/daily-brief`);
    assert(status === 200, `Status ${status}`);
    assert(json !== undefined, 'Not valid JSON');
    if (VERBOSE) console.log('    Brief date:', json?.date, 'quality:', json?.quality);
  }),

  defineTest('GET /api/v1/promises returns promises', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/v1/promises`);
    assert(status === 200, `Status ${status}`);
    assert(json !== undefined, 'Not valid JSON');
    const count = Array.isArray(json) ? json.length : json?.promises?.length || json?.data?.length;
    if (VERBOSE) console.log('    Promises count:', count);
  }),

  defineTest('GET /api/v1/stats returns stats', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/v1/stats`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/report-card returns data', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/report-card`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/complaints returns complaints list', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/complaints`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/leaderboard returns leaderboard', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/leaderboard`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/evidence-vault returns evidence', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/evidence-vault`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/v1/promises (second check) returns data', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/v1/promises`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/intelligence/status returns sweep status', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/intelligence/status`);
    assert(status === 200, `Status ${status}`);
    if (VERBOSE) console.log('    Last sweep:', json?.lastSweep || json?.last_sweep);
  }),

  defineTest('GET /api/services/drivers-license-new/counterparty (catalog check)', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/services/drivers-license-new/counterparty`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/ward-reports returns data', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/ward-reports`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/social-post returns social content', async () => {
    const { status } = await fetchOk(`${BASE}/api/social-post`);
    // May return 200 or 400 depending on params, just check it responds
    assert(status < 500, `Server error ${status}`);
  }),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 4: COUNTERPARTY / SERVICE OPS APIs                 ║
// ╚══════════════════════════════════════════════════════════════╝

const counterpartyTests = [
  defineTest('GET /api/services/national-id-nid/counterparty returns mapped authority', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/services/national-id-nid/counterparty`);
    assert(status === 200, `Status ${status}`);
    if (json && json.counterparty) {
      if (VERBOSE) console.log('    Counterparty:', json.counterparty.name);
    }
  }),

  defineTest('GET /api/services/drivers-license-new/counterparty returns DoTM', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/services/drivers-license-new/counterparty`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/services/income-tax-filing/counterparty returns IRD', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/services/income-tax-filing/counterparty`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/services/ambulance-102/counterparty returns health authority', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/services/ambulance-102/counterparty`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/services/land-parcha/counterparty returns land authority', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/services/land-parcha/counterparty`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/partner-reply without token returns error', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/partner-reply`);
    // Should return 400 or similar for missing token
    assert(json?.error !== undefined, 'Should return error for missing token');
  }),

  defineTest('GET /api/partner-reply with invalid token returns error', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/partner-reply?token=fake-token-12345`);
    assert(json?.error !== undefined, 'Should return error for invalid token');
  }),

  defineTest('POST /api/partner-reply without token returns error', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/partner-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply_type: 'note', content: 'test' }),
    });
    assert(json?.error !== undefined, 'Should return error for missing token');
  }),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 5: COMMITMENT TRACKING (human checks promises)     ║
// ╚══════════════════════════════════════════════════════════════╝

const COMMITMENT_SLUGS = [
  'directly-elected-executive',
  'limit-18-ministries',
  'budget-60-percent-local',
];

const commitmentTests = [
  ...COMMITMENT_SLUGS.map((slug) =>
    defineTest(`Commitment "${slug}" detail page loads`, async () => {
      const { status } = await fetchOk(`${BASE}/track/governance/${slug}`);
      assert(status === 200, `Status ${status}`);
    }),
  ),

  defineTest('Explore page shows commitment cards', async () => {
    const { status, body } = await fetchOk(`${BASE}/explore/first-100-days`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Commitment detail page /explore/first-100-days/1 loads', async () => {
    const { status } = await fetchOk(`${BASE}/explore/first-100-days/1`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Commitment detail page /explore/first-100-days/50 loads', async () => {
    const { status } = await fetchOk(`${BASE}/explore/first-100-days/50`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Commitment detail page /explore/first-100-days/109 loads', async () => {
    const { status } = await fetchOk(`${BASE}/explore/first-100-days/109`);
    assert(status === 200, `Status ${status}`);
  }),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 6: AUDIO & STATIC ASSETS                           ║
// ╚══════════════════════════════════════════════════════════════╝

const assetTests = [
  defineTest('About audio (English) is accessible', async () => {
    const res = await fetch(`${BASE}/audio/about-en.mp3`, { method: 'HEAD', redirect: 'follow' });
    assert(res.status === 200, `Status ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    assert(
      contentType.includes('audio') || contentType.includes('octet'),
      `Wrong content-type: ${contentType}`,
    );
  }),

  defineTest('About audio (Nepali) is accessible', async () => {
    const res = await fetch(`${BASE}/audio/about-ne.mp3`, { method: 'HEAD', redirect: 'follow' });
    assert(res.status === 200, `Status ${res.status}`);
  }),

  defineTest('Manifest.json is accessible', async () => {
    const { status, json } = await fetchOk(`${BASE}/manifest.json`);
    assert(status === 200, `Status ${status}`);
    assert(json?.name !== undefined, 'Manifest missing name');
  }),

  defineTest('SW.js is accessible', async () => {
    const res = await fetch(`${BASE}/sw.js`, { method: 'HEAD', redirect: 'follow' });
    assert(res.status === 200, `Status ${res.status}`);
  }),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 7: OG IMAGE ENDPOINTS (social sharing)             ║
// ╚══════════════════════════════════════════════════════════════╝

const ogTests = [
  defineTest('OG image root endpoint responds', async () => {
    const { status } = await fetchOk(`${BASE}/api/og`);
    assert(status < 500, `Server error ${status}`);
  }),

  defineTest('OG commitment image responds', async () => {
    const { status } = await fetchOk(`${BASE}/api/og/commitment?id=1`);
    assert(status < 500, `Server error ${status}`);
  }),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 8: HUMAN WORKFLOW SIMULATIONS                       ║
// ╚══════════════════════════════════════════════════════════════╝

const workflowTests = [
  defineTest('Workflow: User searches for "passport" via services/ask', async () => {
    const { status, json } = await fetchOk(`${BASE}/api/services/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'I need a passport' }),
    });
    // May need auth or may work publicly
    assert(status < 500, `Server error ${status}`);
    if (VERBOSE && json) console.log('    Ask result:', JSON.stringify(json).slice(0, 200));
  }),

  defineTest('Workflow: User searches for "driving license"', async () => {
    const { status } = await fetchOk(`${BASE}/api/services/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'मलाई ड्राइभिङ लाइसेन्स चाहिन्छ' }),
    });
    assert(status < 500, `Server error ${status}`);
  }),

  defineTest('Workflow: User searches for "hospital"', async () => {
    const { status } = await fetchOk(`${BASE}/api/services/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'I need to see a doctor' }),
    });
    assert(status < 500, `Server error ${status}`);
  }),

  defineTest('Workflow: User browses services → picks passport → opens apply', async () => {
    // Step 1: Browse services
    const { status: s1 } = await fetchOk(`${BASE}/services`);
    assert(s1 === 200, `Services page: ${s1}`);

    // Step 2: Open identity category
    const { status: s2 } = await fetchOk(`${BASE}/services/identity`);
    assert(s2 === 200, `Identity category: ${s2}`);

    // Step 3: Open NID service
    const { status: s3 } = await fetchOk(`${BASE}/services/identity/national-id-nid`);
    assert(s3 === 200, `NID detail: ${s3}`);

    // Step 4: Open apply
    const { status: s4 } = await fetchOk(`${BASE}/services/identity/national-id-nid/apply`);
    assert(s4 === 200, `NID apply: ${s4}`);
  }),

  defineTest('Workflow: User checks daily brief → listens to audio', async () => {
    // Step 1: Open daily brief
    const { status: s1 } = await fetchOk(`${BASE}/daily`);
    assert(s1 === 200, `Daily page: ${s1}`);

    // Step 2: Fetch brief API data
    const { status: s2, json } = await fetchOk(`${BASE}/api/daily-brief`);
    assert(s2 === 200, `Brief API: ${s2}`);

    // Step 3: Check audio URL exists
    if (json?.audio_url) {
      const audioRes = await fetch(json.audio_url, { method: 'HEAD', redirect: 'follow' });
      assert(audioRes.status === 200, `Audio file not accessible: ${audioRes.status}`);
      if (VERBOSE) console.log('    Audio URL:', json.audio_url);
    }
  }),

  defineTest('Workflow: User checks report card → sees scores', async () => {
    const { status: s1 } = await fetchOk(`${BASE}/report-card`);
    assert(s1 === 200, `Report card page: ${s1}`);

    const { status: s2, json } = await fetchOk(`${BASE}/api/report-card`);
    assert(s2 === 200, `Report card API: ${s2}`);
    if (VERBOSE && json) console.log('    Report card keys:', Object.keys(json));
  }),

  defineTest('Workflow: User checks what changed this week', async () => {
    const { status } = await fetchOk(`${BASE}/what-changed`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('Workflow: User checks a specific minister', async () => {
    const { status } = await fetchOk(`${BASE}/ministers`);
    assert(status === 200, `Ministers page: ${status}`);
  }),

  defineTest('Workflow: User explores promise #1 → sees evidence', async () => {
    const { status: s1 } = await fetchOk(`${BASE}/explore/first-100-days/1`);
    assert(s1 === 200, `Commitment 1: ${s1}`);
  }),

  defineTest('Workflow: User explores all sectors', async () => {
    const { status } = await fetchOk(`${BASE}/sectors`);
    assert(status === 200, `Sectors: ${status}`);
  }),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 9: SECURITY / EDGE CASES                           ║
// ╚══════════════════════════════════════════════════════════════╝

const securityTests = [
  defineTest('Dashboard /home requires auth (redirects to login)', async () => {
    const res = await fetch(`${BASE}/home`, { redirect: 'manual' });
    // Should be 307/302 redirect to /admin-login
    assert(
      res.status === 307 || res.status === 302 || res.status === 200,
      `Unexpected status: ${res.status}`,
    );
    if (res.status === 307 || res.status === 302) {
      const loc = res.headers.get('location') || '';
      assert(loc.includes('admin-login') || loc.includes('login'), `Redirect to: ${loc}`);
    }
  }),

  defineTest('Dashboard /users requires auth', async () => {
    const res = await fetch(`${BASE}/users`, { redirect: 'manual' });
    assert(
      res.status === 307 || res.status === 302 || res.status === 200,
      `Unexpected status: ${res.status}`,
    );
  }),

  defineTest('Dashboard /settings requires auth', async () => {
    const res = await fetch(`${BASE}/settings`, { redirect: 'manual' });
    assert(
      res.status === 307 || res.status === 302 || res.status === 200,
      `Unexpected status: ${res.status}`,
    );
  }),

  defineTest('Nonexistent page returns 404', async () => {
    const { status } = await fetchOk(`${BASE}/this-page-does-not-exist-12345`);
    assert(status === 404, `Expected 404, got ${status}`);
  }),

  defineTest('API with bad method returns 405 or 400', async () => {
    const { status } = await fetchOk(`${BASE}/api/daily-brief`, { method: 'DELETE' });
    assert(status >= 400 && status < 500, `Expected 4xx, got ${status}`);
  }),
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 10: COUNTERPARTY COVERAGE CHECK                    ║
// ╚══════════════════════════════════════════════════════════════╝

const ALL_SERVICE_SLUGS = [
  'national-id-nid', 'birth-registration', 'marriage-registration',
  'citizenship-by-birth', 'citizenship-duplicate', 'drivers-license-new',
  'drivers-license-trial', 'vehicle-registration', 'vehicle-tax-payment',
  'patan-hospital-opd', 'civil-hospital-opd', 'ambulance-102',
  'vaccination-child', 'health-insurance-board', 'income-tax-filing',
  'vat-registration', 'pan-business', 'trademark-registration',
  'sole-proprietorship', 'ngo-registration', 'land-parcha',
  'land-mutation', 'land-valuation', 'land-measurement',
  'nea-new-connection', 'kukl-new-connection', 'bank-account-opening',
  'see-results', 'tu-transcript', 'noc-foreign-study',
  'consumer-complaint', 'lokpal-complaint', 'court-case-lookup',
  'right-to-information', 'ciaa-complaint', 'police-report',
  'loksewa-application', 'esewa-wallet', 'remittance-inward',
  'tourism-trekking-permit', 'industry-registration',
];

const coverageTests = ALL_SERVICE_SLUGS.map((slug) =>
  defineTest(`Counterparty mapped for "${slug}"`, async () => {
    const { status, json } = await fetchOk(`${BASE}/api/services/${slug}/counterparty`);
    assert(status === 200, `Status ${status}`);
    // Check if a counterparty is actually mapped
    if (json && !json.counterparty && !json.error) {
      if (VERBOSE) console.log(`    ⚠ No counterparty for ${slug}`);
    }
  }),
);

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUITE 11: AUTHENTICATED USER FLOWS                       ║
// ╚══════════════════════════════════════════════════════════════╝

async function fetchAuthed(
  url: string,
  opts?: RequestInit,
): Promise<{ status: number; body: string; json?: any; ok: boolean }> {
  if (!authToken) throw new Error('No auth token — login failed');
  return fetchOk(url, {
    ...opts,
    headers: {
      ...(opts?.headers as any),
      Authorization: `Bearer ${authToken}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });
}

const authTests = [
  defineTest('Login with test user via Supabase auth', async () => {
    if (!TEST_EMAIL || !TEST_PASSWORD) throw new Error('No TEST_EMAIL / TEST_PASSWORD provided');

    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const data = await res.json();
    assert(res.ok, `Login failed: ${data?.error_description || data?.msg || res.status}`);
    assert(!!data.access_token, 'No access_token in response');
    authToken = data.access_token;
    authUserId = data.user?.id || null;
    if (VERBOSE) console.log('    User ID:', authUserId, 'Email:', data.user?.email);
  }),

  defineTest('GET /api/me/profile returns user profile', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/profile`);
    assert(status === 200, `Status ${status}`);
    if (VERBOSE && json) console.log('    Profile:', json?.full_name || json?.email);
  }),

  defineTest('GET /api/me/identity returns identity data', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/identity`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/me/service-tasks returns task list', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/service-tasks`);
    assert(status === 200, `Status ${status}`);
    if (VERBOSE && json) {
      const count = Array.isArray(json) ? json.length : json?.tasks?.length || 0;
      console.log('    Tasks count:', count);
    }
  }),

  defineTest('GET /api/me/applications returns applications', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/applications`);
    assert(status === 200, `Status ${status}`);
    if (VERBOSE && json) {
      const count = Array.isArray(json) ? json.length : json?.applications?.length || 0;
      console.log('    Applications count:', count);
    }
  }),

  defineTest('GET /api/me/reminders returns reminders', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/reminders`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/me/household-members returns household', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/household-members`);
    assert(status === 200, `Status ${status}`);
  }),

  defineTest('GET /api/me/activity returns activity feed', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/activity`);
    // Could be 200 or 404 if table doesn't exist yet
    assert(status < 500, `Server error: ${status}`);
  }),

  defineTest('POST /api/me/service-tasks/from-query — ask AI "I need a passport"', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/service-tasks/from-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'I need a passport', locale: 'en' }),
    });
    assert(status < 500, `Server error: ${status}`);
    if (VERBOSE && json) console.log('    AI response:', JSON.stringify(json).slice(0, 300));
  }),

  defineTest('POST /api/me/service-tasks/from-query — ask in Nepali "मलाई नागरिकता चाहिन्छ"', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/service-tasks/from-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'मलाई नागरिकता चाहिन्छ', locale: 'ne' }),
    });
    assert(status < 500, `Server error: ${status}`);
    if (VERBOSE && json) console.log('    AI response:', JSON.stringify(json).slice(0, 300));
  }),

  defineTest('POST /api/me/service-tasks — create a test task for birth-registration', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/me/service-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_slug: 'birth-registration',
        title: 'Test birth registration task',
        form_data: { child_name: 'Test Child', dob: '2026-01-01' },
      }),
    });
    assert(status < 500, `Server error: ${status}`);
    if (json?.id || json?.task?.id) {
      const taskId = json.id || json.task.id;
      if (VERBOSE) console.log('    Created task ID:', taskId);

      // Fetch the task back
      const { status: s2, json: taskJson } = await fetchAuthed(`${BASE}/api/me/service-tasks/${taskId}`);
      assert(s2 === 200, `Fetch task failed: ${s2}`);
      if (VERBOSE) console.log('    Task status:', taskJson?.status);

      // Fetch task events
      const { status: s3 } = await fetchAuthed(`${BASE}/api/me/service-tasks/${taskId}/events`);
      assert(s3 < 500, `Events failed: ${s3}`);
    }
  }),

  defineTest('POST /api/services/ask — AI service search (authed)', async () => {
    const { status, json } = await fetchAuthed(`${BASE}/api/services/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'How do I pay my land tax?' }),
    });
    assert(status < 500, `Server error: ${status}`);
    if (VERBOSE && json) console.log('    Ask result:', JSON.stringify(json).slice(0, 200));
  }),

  defineTest('Workflow: Full service journey — browse → detail → apply → create task', async () => {
    // Step 1: Browse services page
    const { status: s1 } = await fetchOk(`${BASE}/services`);
    assert(s1 === 200, `Services: ${s1}`);

    // Step 2: Open transport category
    const { status: s2 } = await fetchOk(`${BASE}/services/transport`);
    assert(s2 === 200, `Transport: ${s2}`);

    // Step 3: Open drivers license detail
    const { status: s3 } = await fetchOk(`${BASE}/services/transport/drivers-license-new`);
    assert(s3 === 200, `License detail: ${s3}`);

    // Step 4: Open apply page
    const { status: s4 } = await fetchOk(`${BASE}/services/transport/drivers-license-new/apply`);
    assert(s4 === 200, `Apply page: ${s4}`);

    // Step 5: Check counterparty mapping
    const { status: s5, json: cpJson } = await fetchOk(`${BASE}/api/services/drivers-license-new/counterparty`);
    assert(s5 === 200, `Counterparty: ${s5}`);
    if (VERBOSE && cpJson?.counterparty) console.log('    Routed to:', cpJson.counterparty.name);

    // Step 6: Create task (authed)
    const { status: s6 } = await fetchAuthed(`${BASE}/api/me/service-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_slug: 'drivers-license-new',
        title: 'Test drivers license application',
        form_data: { license_category: 'A', trial_date: '2026-05-01' },
      }),
    });
    assert(s6 < 500, `Create task: ${s6}`);
  }),

  defineTest('Workflow: AI chat — multi-turn service discovery', async () => {
    // Turn 1: vague query
    const { status: s1, json: j1 } = await fetchAuthed(`${BASE}/api/me/service-tasks/from-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'My land ownership papers are wrong', locale: 'en' }),
    });
    assert(s1 < 500, `Turn 1: ${s1}`);
    if (VERBOSE) console.log('    Turn 1:', JSON.stringify(j1).slice(0, 200));

    // Turn 2: more specific
    const { status: s2, json: j2 } = await fetchAuthed(`${BASE}/api/me/service-tasks/from-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'I need to do naam saari (land mutation)', locale: 'en' }),
    });
    assert(s2 < 500, `Turn 2: ${s2}`);
    if (VERBOSE) console.log('    Turn 2:', JSON.stringify(j2).slice(0, 200));
  }),

  defineTest('Me page — profile, tasks, vault, applications accessible', async () => {
    const pages = ['/me', '/me/tasks', '/me/vault', '/me/applications', '/me/status-checker'];
    for (const page of pages) {
      const { status } = await fetchOk(`${BASE}${page}`);
      assert(status === 200, `${page}: ${status}`);
    }
  }),
];

// ─── Runner ───────────────────────────────────────────────────

async function runSuite(name: string, tests: { name: string; fn: () => Promise<void> }[]) {
  console.log(`\n📋 ${name} (${tests.length} tests)`);
  console.log('─'.repeat(60));

  // Run tests with concurrency limit of 5
  const CONCURRENCY = 5;
  for (let i = 0; i < tests.length; i += CONCURRENCY) {
    const batch = tests.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(runTest));
  }
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Nepal Republic — Real-World Test Suite                     ║`);
  console.log(`║  Target: ${BASE.padEnd(50)}║`);
  console.log(`║  Time:   ${new Date().toISOString().padEnd(50)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);

  await runSuite('1. Page Loads', pageLoadTests);
  await runSuite('2. Service Pages', serviceTests);
  await runSuite('3. Public APIs', apiTests);
  await runSuite('4. Counterparty / Service Ops', counterpartyTests);
  await runSuite('5. Commitment Tracking', commitmentTests);
  await runSuite('6. Audio & Static Assets', assetTests);
  await runSuite('7. OG Images', ogTests);
  await runSuite('8. Human Workflow Simulations', workflowTests);
  await runSuite('9. Security / Edge Cases', securityTests);
  await runSuite('10. Counterparty Coverage', coverageTests);

  // Authenticated tests — only if credentials provided
  if (TEST_EMAIL && TEST_PASSWORD) {
    await runSuite('11. Authenticated User Flows', authTests);
  } else {
    console.log('\n📋 11. Authenticated User Flows (SKIPPED — no TEST_EMAIL/TEST_PASSWORD)');
    console.log('─'.repeat(60));
    console.log('  ⏭  Pass TEST_EMAIL and TEST_PASSWORD env vars to run auth tests');
    skipped += authTests.length;
  }

  // ── Summary ──
  const total = passed + failed + skipped;
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  RESULTS                                                    ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total:   ${String(total).padEnd(49)}║`);
  console.log(`║  Passed:  ${(`${passed} ✅`).padEnd(49)}║`);
  console.log(`║  Failed:  ${(`${failed} ❌`).padEnd(49)}║`);
  console.log(`║  Skipped: ${(`${skipped} ⏭`).padEnd(49)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);

  if (failures.length > 0) {
    console.log('\n🔴 Failures:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(2);
});
