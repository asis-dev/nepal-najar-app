/**
 * Pre-warm ALL commitment briefings so users never wait for AI generation.
 *
 * Run this after a sweep or historical scan to ensure every commitment
 * has a cached briefing ready to serve instantly.
 *
 * Usage: npx tsx scripts/prewarm-briefings.ts
 *
 * This generates briefings for all 109+ commitments. Each takes ~2-5 seconds
 * (AI call + Nepali translation). Total time: ~5-10 minutes.
 * Estimated cost: ~$0.50-1.00 (cheap model for 109 briefings + translations).
 */

import 'dotenv/config';

async function main() {
  // Dynamic import to get the server-side modules
  const { generateBriefingBatch } = await import('../lib/intelligence/commitment-briefing');

  // Generate IDs 1-109 (plus any community-discovered ones)
  const ids = Array.from({ length: 109 }, (_, i) => i + 1);

  console.log(`Pre-warming briefings for ${ids.length} commitments...`);
  console.log('This will take ~5-10 minutes and cost ~$0.50-1.00 in AI credits.\n');

  const startTime = Date.now();
  const result = await generateBriefingBatch(ids);
  const duration = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log(`\nDone in ${duration}s:`);
  console.log(`  ✅ Generated: ${result.generated}`);
  console.log(`  ❌ Failed: ${result.failed}`);
  if (result.errors.length > 0) {
    console.log(`  Errors:`);
    for (const err of result.errors.slice(0, 10)) {
      console.log(`    - ${err}`);
    }
  }
}

main().catch(console.error);
