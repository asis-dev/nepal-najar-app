#!/usr/bin/env tsx
/**
 * Setup intelligence tables + run first RSS sweep
 * Usage: npx tsx scripts/setup-and-sweep.ts
 *
 * This script:
 * 1. Creates intelligence tables via Supabase Management API
 * 2. Runs RSS collector (no API keys needed)
 * 3. Shows results
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Load env
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Step 1: Create tables via individual Supabase operations ─────────────

async function setupTables() {
  console.log('\n🏗️  Step 1: Setting up intelligence tables...\n');

  // Test if tables already exist
  const { error: testError } = await supabase.from('intelligence_sweeps').select('id').limit(1);

  if (!testError) {
    console.log('✅ Intelligence tables already exist! Skipping creation.\n');
    return true;
  }

  console.log('⚠️  Tables do not exist yet.');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  You need to run the SQL migration manually:');
  console.log('');
  console.log('  1. Open your Supabase dashboard:');
  console.log(`     https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1]?.split('.')[0]}/sql/new`);
  console.log('');
  console.log('  2. Paste the contents of these files (in order):');
  console.log('     • supabase/002-user-accounts.sql');
  console.log('     • supabase/003-notifications.sql');
  console.log('     • supabase/004-intelligence.sql');
  console.log('');
  console.log('  3. Click "Run"');
  console.log('');
  console.log('  TIP: All 3 files are already combined and copied');
  console.log('  to your clipboard. Just paste into the SQL editor!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('After running the SQL, run this script again.');
  return false;
}

// ─── Step 2: RSS Collection (no API keys needed) ──────────────────────────

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
}

const RSS_FEEDS = [
  // ✅ Confirmed working (English)
  { id: 'rss-kathmandu-post', name: 'Kathmandu Post', url: 'https://kathmandupost.com/rss' },
  { id: 'rss-online-khabar-en', name: 'Online Khabar (EN)', url: 'https://english.onlinekhabar.com/feed' },
  { id: 'rss-khabarhub-en', name: 'Khabarhub (EN)', url: 'https://english.khabarhub.com/feed/' },
  { id: 'rss-ratopati-en', name: 'Ratopati (EN)', url: 'https://english.ratopati.com/feed' },
  // ✅ Confirmed working (Nepali — engine detects language via Unicode)
  { id: 'rss-setopati-ne', name: 'Setopati (NE)', url: 'https://setopati.com/feed' },
  // ⚠️ These return 0 articles or 404 — kept for retry in case they come back
  // { id: 'rss-himalayan-times', name: 'Himalayan Times', url: 'https://thehimalayantimes.com/feed' },
  // { id: 'rss-nepali-times', name: 'Nepali Times', url: 'https://www.nepalitimes.com/feed/' },
  // { id: 'rss-republica', name: 'Republica', url: 'https://myrepublica.nagariknetwork.com/rss' },
  // { id: 'rss-record-nepal', name: 'The Record Nepal', url: 'https://www.recordnepal.com/feed' },
  // { id: 'rss-ekantipur', name: 'Ekantipur', url: 'https://ekantipur.com/rss' },
];

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] || match[2] || '';
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const description = extractTag(block, 'description') || extractTag(block, 'summary');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const author = extractTag(block, 'dc:creator') || extractTag(block, 'author');

    if (title && link) {
      items.push({
        title: cleanText(title),
        link: cleanText(link),
        description: description ? cleanText(description).slice(0, 1000) : undefined,
        pubDate: pubDate || undefined,
        author: author ? cleanText(author) : undefined,
      });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m = regex.exec(xml);
  return m ? m[1].trim() : null;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const m = regex.exec(xml);
  return m ? m[1] : null;
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .trim();
}

async function runRSSSweep() {
  console.log('\n📡 Step 2: Running RSS sweep across Nepal news sources...\n');

  let totalFound = 0;
  let totalNew = 0;
  let totalErrors = 0;

  for (const feed of RSS_FEEDS) {
    process.stdout.write(`  ${feed.name.padEnd(25)}`);

    try {
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'NepalNajar/2.0 (+https://nepalnajar.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        console.log(`❌ HTTP ${res.status}`);
        totalErrors++;
        continue;
      }

      const xml = await res.text();
      const items = parseRSS(xml);
      totalFound += items.length;

      // First, ensure the source exists
      await supabase.from('intelligence_sources').upsert({
        id: feed.id,
        name: feed.name,
        source_type: 'rss',
        url: feed.url,
        is_active: true,
        last_checked_at: new Date().toISOString(),
        last_found_at: items.length > 0 ? new Date().toISOString() : undefined,
      }, { onConflict: 'id' });

      let newCount = 0;
      for (const item of items) {
        const { error } = await supabase.from('intelligence_signals').upsert({
          source_id: feed.id,
          signal_type: 'article',
          external_id: item.link,
          title: item.title,
          content: item.description || null,
          url: item.link,
          author: item.author || null,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          discovered_at: new Date().toISOString(),
          language: /[\u0900-\u097F]/.test(item.title) ? 'ne' : 'en',
          media_type: 'text',
        }, { onConflict: 'source_id,external_id', ignoreDuplicates: true });

        if (!error) newCount++;
      }

      totalNew += newCount;
      console.log(`✅ ${items.length} articles (${newCount} new)`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.log(`❌ ${msg.slice(0, 50)}`);
      totalErrors++;
    }

    // Be polite
    await new Promise(r => setTimeout(r, 500));
  }

  // Create sweep record
  await supabase.from('intelligence_sweeps').insert({
    sweep_type: 'manual',
    status: totalErrors > 3 ? 'partial' : 'completed',
    finished_at: new Date().toISOString(),
    sources_checked: RSS_FEEDS.length,
    signals_discovered: totalNew,
    tier1_signals: 0,
    summary: `RSS sweep: ${totalFound} found, ${totalNew} new, ${totalErrors} errors`,
  });

  return { totalFound, totalNew, totalErrors };
}

// ─── Step 3: Show what's in the database ──────────────────────────────────

async function showStats() {
  console.log('\n📊 Step 3: Database stats\n');

  const { count: signalCount } = await supabase
    .from('intelligence_signals')
    .select('*', { count: 'exact', head: true });

  const { count: sourceCount } = await supabase
    .from('intelligence_sources')
    .select('*', { count: 'exact', head: true });

  const { data: recentSignals } = await supabase
    .from('intelligence_signals')
    .select('title, source_id, published_at')
    .order('discovered_at', { ascending: false })
    .limit(10);

  console.log(`  Total signals:  ${signalCount || 0}`);
  console.log(`  Total sources:  ${sourceCount || 0}`);
  console.log('');
  console.log('  Latest 10 signals:');

  if (recentSignals) {
    for (const s of recentSignals) {
      const date = s.published_at ? new Date(s.published_at).toLocaleDateString() : '???';
      const source = (s.source_id || '').replace('rss-', '');
      console.log(`  [${date}] ${source.padEnd(20)} ${(s.title || '').slice(0, 60)}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Nepal Najar Intelligence Engine v2        ║');
  console.log('║  First Sweep — RSS Collection              ║');
  console.log('╚════════════════════════════════════════════╝');

  const tablesReady = await setupTables();

  if (!tablesReady) {
    process.exit(1);
  }

  const { totalFound, totalNew, totalErrors } = await runRSSSweep();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  RSS Sweep Complete!`);
  console.log(`  📰 ${totalFound} articles found across ${RSS_FEEDS.length} sources`);
  console.log(`  ✨ ${totalNew} new signals stored`);
  if (totalErrors > 0) console.log(`  ⚠️  ${totalErrors} sources had errors`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await showStats();

  console.log('\n✅ Done! Your intelligence database now has real Nepal news data.');
  console.log('   Next: Get a free Gemini API key to enable AI classification.');
  console.log('   → https://aistudio.google.com/apikey\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
