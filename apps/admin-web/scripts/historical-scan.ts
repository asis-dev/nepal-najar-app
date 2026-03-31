#!/usr/bin/env npx tsx
/**
 * Historical Bulk Scan — Oct 2025 → Mar 2026
 *
 * Searches Google News RSS for each commitment's keywords,
 * fetches article metadata, and ingests into intelligence_signals
 * via the existing pipeline.
 *
 * Usage:
 *   npx tsx scripts/historical-scan.ts                   # full scan
 *   npx tsx scripts/historical-scan.ts --dry-run         # show what would be fetched
 *   npx tsx scripts/historical-scan.ts --commitments 1,2,3  # specific commitments
 *   npx tsx scripts/historical-scan.ts --months 3        # last N months only
 *
 * Estimated: ~500-2000 articles, ~$2-5 in AI costs for classification
 *
 * NOTE:
 * Historical scan is disabled by default.
 * Set INTELLIGENCE_ENABLE_HISTORICAL_SCAN=true to run intentionally.
 */

import { createClient } from '@supabase/supabase-js';
import { PROMISES_KNOWLEDGE } from '../lib/intelligence/knowledge-base';

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCRAPE_SECRET = process.env.SCRAPE_SECRET || 'nepalrepublic-scrape-2024';
const HISTORICAL_SCAN_ENABLED =
  process.env.INTELLIGENCE_ENABLE_HISTORICAL_SCAN === 'true';

const DRY_RUN = process.argv.includes('--dry-run');
const COMMITMENT_FILTER = (() => {
  const idx = process.argv.indexOf('--commitments');
  if (idx === -1) return null;
  return process.argv[idx + 1]?.split(',').map(Number) || null;
})();
const MONTHS_BACK = (() => {
  const idx = process.argv.indexOf('--months');
  if (idx === -1) return 6;
  return Number(process.argv[idx + 1]) || 6;
})();

const START_DATE = new Date();
START_DATE.setMonth(START_DATE.getMonth() - MONTHS_BACK);
const END_DATE = new Date();

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for historical scan.',
      );
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabaseClient;
}

// ── Search queries per commitment ───────────────────────────────────────────

interface SearchTask {
  commitmentId: number;
  title: string;
  queries: string[];
}

function buildSearchTasks(): SearchTask[] {
  const tasks: SearchTask[] = [];

  for (const kb of PROMISES_KNOWLEDGE) {
    if (COMMITMENT_FILTER && !COMMITMENT_FILTER.includes(kb.id)) continue;

    // Build search queries from knowledge base
    const queries: string[] = [];

    // English queries from title + key aspects
    const titleWords = kb.title.split(' ').slice(0, 5).join(' ');
    queries.push(`Nepal ${titleWords} ${START_DATE.getFullYear()}`);

    // Add category-specific query
    queries.push(`Nepal ${kb.category.toLowerCase()} ${titleWords}`);

    // Nepali title query
    if (kb.titleNe) {
      queries.push(kb.titleNe);
    }

    // Key aspects as search terms
    const aspects = kb.keyAspects.split(',').slice(0, 2).map(a => a.trim());
    for (const aspect of aspects) {
      if (aspect.length > 5) {
        queries.push(`Nepal ${aspect}`);
      }
    }

    tasks.push({
      commitmentId: kb.id,
      title: kb.title,
      queries: queries.slice(0, 4), // Max 4 queries per commitment
    });
  }

  return tasks;
}

// ── Google News RSS search ──────────────────────────────────────────────────

interface NewsResult {
  title: string;
  url: string;
  source: string;
  published: string;
  snippet: string;
}

async function searchGoogleNewsRSS(query: string): Promise<NewsResult[]> {
  const startStr = START_DATE.toISOString().slice(0, 10);
  const endStr = END_DATE.toISOString().slice(0, 10);

  // Google News RSS with date filter
  const encodedQuery = encodeURIComponent(`${query} after:${startStr} before:${endStr}`);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-NP&gl=NP&ceid=NP:en`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NepalRepublic/1.0 (civic accountability platform)' },
    });

    if (!res.ok) {
      console.warn(`  [WARN] Google News returned ${res.status} for: ${query.slice(0, 40)}`);
      return [];
    }

    const xml = await res.text();
    return parseRSSItems(xml);
  } catch (err) {
    console.warn(`  [WARN] Search failed for: ${query.slice(0, 40)} — ${err instanceof Error ? err.message : err}`);
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
        snippet: decodeHTMLEntities(description || '').slice(0, 300),
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
  const supabase = getSupabaseClient();

  // Check intelligence_signals
  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('url')
    .not('url', 'is', null);

  for (const s of (signals || []) as { url: string | null }[]) {
    if (s.url) urls.add(s.url);
  }

  // Check scraped_articles
  const { data: articles } = await supabase
    .from('scraped_articles')
    .select('source_url');

  for (const a of (articles || []) as { source_url: string | null }[]) {
    if (a.source_url) urls.add(a.source_url);
  }

  return urls;
}

// ── Ingest signal ───────────────────────────────────────────────────────────

async function ingestSignal(
  result: NewsResult,
  commitmentId: number,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('intelligence_signals') as any).insert({
      title: result.title,
      url: result.url,
      source_id: 'historical-scan',
      signal_type: 'article',
      published_at: new Date(result.published).toISOString(),
      discovered_at: new Date().toISOString(),
      matched_promise_ids: [commitmentId],
      content_summary: result.snippet,
      relevance_score: 0.5,
      classification: null,
      tier1_processed: false,
      metadata: {
        historical_scan: true,
        scan_date: new Date().toISOString(),
        original_source: result.source,
      },
    });

    if (error) {
      // Duplicate URL constraint
      if (error.code === '23505') return false;
      console.warn(`  [WARN] Insert failed: ${error.message}`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!HISTORICAL_SCAN_ENABLED) {
    console.log('⏸️  Historical scan is disabled.');
    console.log(
      'Set INTELLIGENCE_ENABLE_HISTORICAL_SCAN=true only when you explicitly want historical backfill.',
    );
    return;
  }

  console.log('🏔️  Nepal Republic — Historical Bulk Scan');
  console.log('============================================');
  console.log(`Period: ${START_DATE.toISOString().slice(0, 10)} → ${END_DATE.toISOString().slice(0, 10)}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log('');

  const tasks = buildSearchTasks();
  console.log(`📋 ${tasks.length} commitments to scan`);
  console.log(`🔍 ${tasks.reduce((s, t) => s + t.queries.length, 0)} total search queries`);
  console.log('');

  // Load existing URLs for dedup
  console.log('📦 Loading existing articles for deduplication...');
  const existingUrls = await getExistingUrls();
  console.log(`  ${existingUrls.size} existing URLs in database`);
  console.log('');

  let totalFound = 0;
  let totalNew = 0;
  let totalIngested = 0;
  let totalSkippedDupe = 0;

  for (const task of tasks) {
    console.log(`\n── Commitment #${task.commitmentId}: ${task.title.slice(0, 50)} ──`);

    let taskResults: NewsResult[] = [];

    for (const query of task.queries) {
      const results = await searchGoogleNewsRSS(query);
      taskResults.push(...results);

      // Rate limit — be gentle with Google
      await new Promise(r => setTimeout(r, 1500));
    }

    // Deduplicate within this task
    const seen = new Set<string>();
    const unique = taskResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    totalFound += unique.length;
    console.log(`  Found: ${unique.length} unique articles (from ${taskResults.length} total results)`);

    for (const result of unique) {
      if (existingUrls.has(result.url)) {
        totalSkippedDupe++;
        continue;
      }

      totalNew++;

      if (DRY_RUN) {
        console.log(`  [DRY] ${result.source}: ${result.title.slice(0, 60)}...`);
        continue;
      }

      const ingested = await ingestSignal(result, task.commitmentId);
      if (ingested) {
        totalIngested++;
        existingUrls.add(result.url); // Prevent re-ingesting
      }
    }

    if (!DRY_RUN && totalNew > 0) {
      console.log(`  Ingested: ${totalIngested} new signals`);
    }
  }

  console.log('\n============================================');
  console.log('📊 Summary:');
  console.log(`  Total found: ${totalFound} articles`);
  console.log(`  Already in DB: ${totalSkippedDupe} (skipped)`);
  console.log(`  New articles: ${totalNew}`);
  if (!DRY_RUN) {
    console.log(`  Ingested: ${totalIngested} signals`);
  }
  console.log('');

  if (!DRY_RUN && totalIngested > 0) {
    console.log('🧠 Next step: Run the worker to classify new signals:');
    console.log(`  curl -X POST "${BASE_URL}/api/intelligence/worker?secret=${SCRAPE_SECRET}"`);
    console.log('');
    console.log('  Or run multiple worker batches:');
    console.log('  for i in $(seq 1 20); do');
    console.log(`    curl -s -X POST "${BASE_URL}/api/intelligence/worker?secret=${SCRAPE_SECRET}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Batch {${'{'}i}: {d.get(\\\"processed\\\",0)} processed, {d.get(\\\"remaining\\\",0)} remaining')"`)
    console.log('    sleep 2');
    console.log('  done');
  }

  console.log('============================================');
}

main().catch(console.error);
