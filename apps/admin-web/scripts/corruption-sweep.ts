#!/usr/bin/env npx tsx
/**
 * Historical Corruption Sweep — 1 Year Deep Scan
 *
 * Searches Google News RSS + Nepali news archives for corruption-related
 * articles over the past 12 months. Uses targeted corruption keywords
 * in both English and Nepali to find cases, investigations, arrests,
 * court verdicts, and asset recovery actions.
 *
 * Usage:
 *   npx tsx scripts/corruption-sweep.ts                    # full 12-month scan
 *   npx tsx scripts/corruption-sweep.ts --dry-run          # show what would be fetched
 *   npx tsx scripts/corruption-sweep.ts --months 6         # last 6 months only
 *   npx tsx scripts/corruption-sweep.ts --classify         # also run AI classification after ingestion
 *
 * Cost estimate: ~$0 (uses Google News RSS, no paid APIs for fetching)
 * AI classification (if --classify): ~$1-3 depending on signal count
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const DRY_RUN = process.argv.includes('--dry-run');
const CLASSIFY_AFTER = process.argv.includes('--classify');
const MONTHS_BACK = (() => {
  const idx = process.argv.indexOf('--months');
  if (idx === -1) return 12; // default: 1 year
  return Number(process.argv[idx + 1]) || 12;
})();

const START_DATE = new Date();
START_DATE.setMonth(START_DATE.getMonth() - MONTHS_BACK);
const END_DATE = new Date();

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabaseClient;
}

// ── Corruption Search Queries ───────────────────────────────────────────────
// Organized by category for comprehensive coverage

interface SearchCategory {
  name: string;
  queries: string[];
  matchedCommitmentIds: number[]; // which commitments this relates to
}

const CORRUPTION_SEARCHES: SearchCategory[] = [
  {
    name: 'CIAA / Abuse of Authority',
    matchedCommitmentIds: [4, 47],
    queries: [
      'Nepal CIAA investigation',
      'अख्तियार अनुसन्धान',
      'Nepal abuse of authority case',
      'अधिकार दुरुपयोग नेपाल',
      'CIAA Nepal action arrested',
      'अख्तियार कारबाही',
    ],
  },
  {
    name: 'Asset Investigation / Disproportionate Wealth',
    matchedCommitmentIds: [4, 5, 99],
    queries: [
      'Nepal asset investigation politician',
      'सम्पत्ति अनुसन्धान नेपाल',
      'disproportionate assets Nepal',
      'Nepal politician wealth probe',
      'सम्पत्ति जाँच नेता',
      'Nepal asset disclosure official',
      'सम्पत्ति विवरण सार्वजनिक',
    ],
  },
  {
    name: 'Procurement Fraud / Government Contracts',
    matchedCommitmentIds: [7, 43],
    queries: [
      'Nepal procurement fraud',
      'Nepal government contract irregularity',
      'खरिद ठगी नेपाल',
      'सरकारी ठेक्का अनियमितता',
      'Nepal tender corruption',
      'Nepal fake billing government',
      'फर्जी बिल सरकारी',
    ],
  },
  {
    name: 'Land Grab / Property Fraud',
    matchedCommitmentIds: [4, 47],
    queries: [
      'Nepal land grab case',
      'Lalita Niwas land scandal',
      'जग्गा कब्जा नेपाल',
      'ललिता निवास जग्गा',
      'Nepal land registration fraud',
      'नेपाल भूमि दर्ता ठगी',
    ],
  },
  {
    name: 'Embezzlement / Misuse of Funds',
    matchedCommitmentIds: [4, 6],
    queries: [
      'Nepal embezzlement public funds',
      'हिनामिना सरकारी कोष',
      'Nepal misappropriation government',
      'अपचलन नेपाल सरकारी',
      'Nepal fund misuse ministry',
      'सरकारी रकम दुरुपयोग',
    ],
  },
  {
    name: 'Money Laundering',
    matchedCommitmentIds: [4, 47],
    queries: [
      'Nepal money laundering case',
      'धनशोधन नेपाल',
      'Nepal DRI investigation',
      'राजस्व अनुसन्धान विभाग',
      'Nepal hawala banking fraud',
      'नेपाल हुण्डी कारोबार',
    ],
  },
  {
    name: 'Bribery / Kickbacks',
    matchedCommitmentIds: [4, 47, 48],
    queries: [
      'Nepal bribery arrested',
      'घुस नेपाल पक्राउ',
      'Nepal kickback government project',
      'कमिसन काटेर नेपाल',
      'Nepal official bribe caught',
    ],
  },
  {
    name: 'Court Cases / Verdicts',
    matchedCommitmentIds: [4, 47, 50],
    queries: [
      'Nepal corruption court verdict',
      'भ्रष्टाचार मुद्दा फैसला नेपाल',
      'Nepal Supreme Court corruption case',
      'सर्वोच्च अदालत भ्रष्टाचार',
      'Nepal corruption conviction acquittal',
      'Nepal judicial corruption',
    ],
  },
  {
    name: 'Infrastructure / Ghost Projects',
    matchedCommitmentIds: [55, 6],
    queries: [
      'Nepal ghost project scandal',
      'Nepal stalled project corruption',
      'Nepal infrastructure fraud',
      'भूत योजना नेपाल',
      'अलपत्र परियोजना भ्रष्टाचार',
    ],
  },
  {
    name: 'Tax Evasion / Revenue Fraud',
    matchedCommitmentIds: [4, 47],
    queries: [
      'Nepal tax evasion case',
      'कर छली नेपाल',
      'Nepal customs fraud',
      'भन्सार ठगी नेपाल',
      'Nepal revenue leakage',
    ],
  },
  {
    name: 'Political Party Corruption',
    matchedCommitmentIds: [4, 48],
    queries: [
      'Nepal party corruption scandal',
      'Nepal political party fund misuse',
      'नेपाल दल भ्रष्टाचार',
      'Nepal commission agent politics',
      'नातावाद नेपाल राजनीति',
    ],
  },
  {
    name: 'CIB / Police Investigation',
    matchedCommitmentIds: [4, 47],
    queries: [
      'CIB Nepal investigation corruption',
      'Nepal police corruption arrest',
      'प्रहरी भ्रष्टाचार पक्राउ',
      'CIB नेपाल अनुसन्धान',
    ],
  },
  {
    name: 'Former PM / High-level Corruption',
    matchedCommitmentIds: [4, 5, 47],
    queries: [
      'Nepal former PM corruption investigation',
      'Deuba Oli Dahal corruption case',
      'पूर्व प्रधानमन्त्री भ्रष्टाचार',
      'Nepal minister corruption arrested',
      'मन्त्री भ्रष्टाचार पक्राउ',
    ],
  },
  {
    name: 'Transitional Justice / War-era Cases',
    matchedCommitmentIds: [50, 51],
    queries: [
      'Nepal transitional justice case',
      'Nepal conflict era prosecution',
      'नेपाल संक्रमणकालीन न्याय',
      'Nepal truth reconciliation commission',
    ],
  },
  {
    name: 'Anti-corruption Reform / Whistleblower',
    matchedCommitmentIds: [4, 6, 47],
    queries: [
      'Nepal anti-corruption reform',
      'Nepal whistleblower protection',
      'भ्रष्टाचार विरुद्ध सुधार नेपाल',
      'Nepal zero tolerance corruption',
    ],
  },
];

// ── Google News RSS ─────────────────────────────────────────────────────────

interface NewsResult {
  title: string;
  url: string;
  source: string;
  published: string;
  snippet: string;
}

async function searchGoogleNewsRSS(query: string, lang: 'en' | 'ne' = 'en'): Promise<NewsResult[]> {
  const startStr = START_DATE.toISOString().slice(0, 10);
  const endStr = END_DATE.toISOString().slice(0, 10);

  const encodedQuery = encodeURIComponent(`${query} after:${startStr} before:${endStr}`);
  const hl = lang === 'ne' ? 'ne-NP' : 'en-NP';
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${hl}&gl=NP&ceid=NP:${lang}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NepalRepublic/1.0 (civic accountability platform)' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`  [WARN] Google News ${res.status} for: ${query.slice(0, 40)}`);
      return [];
    }

    const xml = await res.text();
    return parseRSSItems(xml);
  } catch (err) {
    console.warn(`  [WARN] Failed: ${query.slice(0, 40)} — ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

function parseRSSItems(xml: string): NewsResult[] {
  const items: NewsResult[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const source = extractTag(itemXml, 'source');
    const description = extractTag(itemXml, 'description');

    if (title && link) {
      items.push({
        title: decodeHTMLEntities(title),
        url: link,
        source: source || 'Unknown',
        published: pubDate || new Date().toISOString(),
        snippet: decodeHTMLEntities(description || '').slice(0, 500),
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (match) return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
  return null;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '');
}

// ── Deduplication ───────────────────────────────────────────────────────────

async function getExistingUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  const supabase = getSupabase();

  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('url')
    .not('url', 'is', null);

  for (const s of (signals || []) as { url: string | null }[]) {
    if (s.url) urls.add(s.url);
  }

  return urls;
}

// ── Ingest ──────────────────────────────────────────────────────────────────

async function ingestCorruptionSignal(
  result: NewsResult,
  category: SearchCategory,
): Promise<boolean> {
  const supabase = getSupabase();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('intelligence_signals') as any).insert({
      title: result.title,
      url: result.url,
      source_id: 'corruption-sweep',
      signal_type: 'article',
      published_at: new Date(result.published).toISOString(),
      discovered_at: new Date().toISOString(),
      matched_promise_ids: category.matchedCommitmentIds,
      content_summary: result.snippet,
      relevance_score: 0.7, // higher relevance since targeted corruption search
      classification: null,
      tier1_processed: false,
      metadata: {
        corruption_sweep: true,
        sweep_category: category.name,
        scan_date: new Date().toISOString(),
        original_source: result.source,
        potential_corruption_case: true,
      },
    });

    if (error) {
      if (error.code === '23505') return false; // duplicate
      console.warn(`  [WARN] Insert failed: ${error.message}`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ── AI Classification (optional) ────────────────────────────────────────────

async function classifyCorruptionSignals(): Promise<void> {
  console.log('\n🧠 Running AI corruption classification on new signals...');

  // Dynamic import to avoid loading AI stack unless needed
  const { analyzeCorruptionSignal, hasCorruptionLanguage } = await import(
    '../lib/intelligence/corruption-discovery'
  );

  const supabase = getSupabase();

  // Get unclassified corruption-sweep signals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: signals } = await (supabase as any)
    .from('intelligence_signals')
    .select('*')
    .eq('source_id', 'corruption-sweep')
    .eq('tier1_processed', false)
    .order('published_at', { ascending: false })
    .limit(100) as { data: any[] | null };

  if (!signals || signals.length === 0) {
    console.log('  No unclassified corruption signals to process.');
    return;
  }

  console.log(`  ${signals.length} signals to classify...`);
  let classified = 0;
  let corruptionCases = 0;

  for (const signal of signals) {
    const signalForAnalysis = {
      id: signal.id,
      source_id: signal.source_id,
      signal_type: signal.signal_type,
      title: signal.title,
      content: signal.content_summary || signal.content || null,
      url: signal.url,
      published_at: signal.published_at,
      author: signal.author || null,
      media_type: signal.media_type || null,
      metadata: signal.metadata || {},
    };

    // Quick keyword check first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signalTable = supabase.from('intelligence_signals') as any;
    if (!hasCorruptionLanguage(signalForAnalysis)) {
      // Mark as processed but not corruption
      await signalTable
        .update({
          tier1_processed: true,
          classification: 'related',
          relevance_score: 0.3,
        })
        .eq('id', signal.id);
      classified++;
      continue;
    }

    // AI deep analysis
    try {
      const result = await analyzeCorruptionSignal(signalForAnalysis);
      if (result && result.isCorruptionCase) {
        corruptionCases++;
        await signalTable
          .update({
            tier1_processed: true,
            classification: 'confirms',
            relevance_score: result.confidence,
            metadata: {
              ...signal.metadata,
              corruption_analysis: result,
            },
          })
          .eq('id', signal.id);
        console.log(`  [CASE] ${result.corruption?.title || signal.title.slice(0, 60)}`);
      } else {
        await signalTable
          .update({
            tier1_processed: true,
            classification: 'related',
            relevance_score: 0.3,
          })
          .eq('id', signal.id);
      }
      classified++;

      // Rate limit for free tier
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.warn(`  [WARN] AI failed for ${signal.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`  Classified: ${classified}, Corruption cases found: ${corruptionCases}`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('  Nepal Republic — Historical Corruption Sweep');
  console.log('  =============================================');
  console.log(`  Period: ${START_DATE.toISOString().slice(0, 10)} -> ${END_DATE.toISOString().slice(0, 10)} (${MONTHS_BACK} months)`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Categories: ${CORRUPTION_SEARCHES.length}`);
  console.log(`  Total queries: ${CORRUPTION_SEARCHES.reduce((s, c) => s + c.queries.length, 0)}`);
  console.log(`  Classify after: ${CLASSIFY_AFTER ? 'YES' : 'NO'}`);
  console.log('');

  // Load existing URLs for dedup
  console.log('  Loading existing URLs for deduplication...');
  const existingUrls = await getExistingUrls();
  console.log(`  ${existingUrls.size} existing URLs in database`);
  console.log('');

  let totalFound = 0;
  let totalNew = 0;
  let totalIngested = 0;
  let totalDupes = 0;
  const categoryStats: { name: string; found: number; ingested: number }[] = [];

  for (const category of CORRUPTION_SEARCHES) {
    console.log(`\n  -- ${category.name} (commitments: ${category.matchedCommitmentIds.join(',')}) --`);

    let categoryResults: NewsResult[] = [];

    for (const query of category.queries) {
      // Detect language from query (Devanagari = Nepali)
      const isNepali = /[\u0900-\u097F]/.test(query);
      const results = await searchGoogleNewsRSS(query, isNepali ? 'ne' : 'en');
      categoryResults.push(...results);
      process.stdout.write(`  . ${results.length} `);

      // Be gentle with Google — 2 second delay between requests
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log('');

    // Deduplicate within category
    const seen = new Set<string>();
    const unique = categoryResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    totalFound += unique.length;
    console.log(`  Found: ${unique.length} unique articles`);

    let catIngested = 0;
    for (const result of unique) {
      if (existingUrls.has(result.url)) {
        totalDupes++;
        continue;
      }

      totalNew++;

      if (DRY_RUN) {
        console.log(`  [DRY] ${result.source}: ${result.title.slice(0, 70)}`);
        continue;
      }

      const ingested = await ingestCorruptionSignal(result, category);
      if (ingested) {
        totalIngested++;
        catIngested++;
        existingUrls.add(result.url);
      }
    }

    categoryStats.push({ name: category.name, found: unique.length, ingested: catIngested });
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n  =============================================');
  console.log('  CORRUPTION SWEEP RESULTS');
  console.log('  =============================================');
  console.log(`  Total articles found: ${totalFound}`);
  console.log(`  Already in DB: ${totalDupes} (skipped)`);
  console.log(`  New articles: ${totalNew}`);
  if (!DRY_RUN) {
    console.log(`  Ingested: ${totalIngested} signals`);
  }
  console.log('');
  console.log('  By category:');
  for (const cat of categoryStats) {
    const bar = '#'.repeat(Math.min(30, cat.found));
    console.log(`    ${cat.name.padEnd(40)} ${String(cat.found).padStart(4)} found  ${String(cat.ingested).padStart(4)} new  ${bar}`);
  }

  // Optional: run AI classification
  if (CLASSIFY_AFTER && !DRY_RUN && totalIngested > 0) {
    await classifyCorruptionSignals();
  }

  if (!DRY_RUN && totalIngested > 0 && !CLASSIFY_AFTER) {
    console.log('');
    console.log('  Next steps:');
    console.log('  1. Classify with AI: npx tsx scripts/corruption-sweep.ts --classify');
    console.log('  2. Or run the regular worker to classify all pending signals');
  }

  console.log('\n  =============================================');
  console.log(`  Cost: $0 (Google News RSS is free)`);
  console.log('  =============================================');
}

main().catch(console.error);
