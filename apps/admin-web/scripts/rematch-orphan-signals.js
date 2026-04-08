/**
 * Re-runs the upgraded matcher against orphan intelligence_signals
 * (matched_promise_ids = []) from the last N days. Updates rows in place.
 *
 * Usage:
 *   node scripts/rematch-orphan-signals.js [days=7] [--all]
 *     --all   reprocess every signal in the window, not just orphans
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

// Compile TS matcher on the fly via tsx? Simpler: use ts-node-less inline require by
// running this script through `npx tsx`. We dynamic-import the TS file.
async function loadMatcher() {
  // Use ts-node (available in repo root) to require the .ts matcher
  require('ts-node').register({
    transpileOnly: true,
    skipProject: true,
    compilerOptions: { module: 'commonjs', target: 'es2020', esModuleInterop: true, moduleResolution: 'node' },
  });
  const mod = require(path.join(__dirname, '..', 'lib', 'scraper', 'matcher.ts'));
  return mod.matchArticleToPromises;
}

async function main() {
  const days = parseInt(process.argv[2] || '7', 10);
  const all = process.argv.includes('--all');
  const matchFn = await loadMatcher();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(url, key);

  const since = new Date(Date.now() - days * 86400000).toISOString();
  console.log(`Rematching ${all ? 'ALL' : 'orphan'} signals since ${since}`);

  let from = 0;
  const PAGE = 500;
  let scanned = 0, updated = 0, stillOrphan = 0;

  while (true) {
    let q = sb
      .from('intelligence_signals')
      .select('id,title,title_ne,content_summary,matched_promise_ids,confidence')
      .gte('discovered_at', since)
      .order('discovered_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (!all) {
      // Postgres array length filter via rpc-style: matched_promise_ids='[]'
      q = q.eq('matched_promise_ids', '{}');
    }
    const { data, error } = await q;
    if (error) { console.error(error); break; }
    if (!data?.length) break;

    for (const row of data) {
      scanned++;
      const result = matchFn({
        headline: row.title || '',
        headline_ne: row.title_ne || '',
        content_excerpt: row.content_summary || '',
      });
      if (result.promiseIds.length > 0) {
        const ids = result.promiseIds.map((id) => parseInt(id, 10)).filter((n) => !Number.isNaN(n));
        await sb
          .from('intelligence_signals')
          .update({
            matched_promise_ids: ids,
            confidence: result.confidence,
          })
          .eq('id', row.id);
        updated++;
      } else {
        stillOrphan++;
      }
      if (scanned % 100 === 0) {
        process.stdout.write(`  scanned=${scanned} updated=${updated} stillOrphan=${stillOrphan}\r`);
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`\nDone. scanned=${scanned} updated=${updated} stillOrphan=${stillOrphan}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
