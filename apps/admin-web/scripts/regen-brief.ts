/**
 * Regenerate today's daily brief locally.
 * Usage: npx tsx scripts/regen-brief.ts [--with-audio]
 *
 * This runs against the real Supabase database using env vars from .env.local.
 * Bypasses Vercel function timeouts completely.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env vars before any imports that use them
config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  const withAudio = process.argv.includes('--with-audio');

  console.log('🔄 Regenerating daily brief...');
  console.log(`   Audio: ${withAudio ? 'YES' : 'NO'}`);
  console.log(`   Date: ${new Date().toISOString().slice(0, 10)}`);
  console.log('');

  // Dynamic import after env is loaded
  const { generateDailyBrief } = await import('../lib/intelligence/daily-brief');

  const brief = await generateDailyBrief();

  console.log('\n✅ Brief generated successfully!');
  console.log(`   Date: ${brief.date}`);
  console.log(`   Pulse: ${brief.pulse} (${brief.pulseLabel})`);
  console.log(`   Top stories: ${brief.topStories.length}`);
  console.log(`   Commitments moved: ${brief.commitmentsMoved.length}`);
  console.log(`   Stats: ${brief.stats.totalSignals24h} signals from ${brief.stats.sourcesActive} sources`);
  console.log('');
  console.log('📝 English summary:');
  console.log(brief.summaryEn);
  console.log('');
  console.log('📝 Nepali summary:');
  console.log(brief.summaryNe);

  if (withAudio) {
    console.log('\n🎙️ Generating audio...');
    try {
      const { generateAndStoreDailyAudio } = await import('../lib/intelligence/brief-narrator');
      const audioResult = await generateAndStoreDailyAudio(brief);
      console.log('✅ Audio generated!');
      console.log(`   URL: ${audioResult.audioUrl}`);
      console.log(`   Duration: ${audioResult.durationSeconds}s`);
      console.log(`   Provider: ${audioResult.provider}`);
    } catch (err) {
      console.error('❌ Audio generation failed:', err instanceof Error ? err.message : err);
    }
  }

  console.log('\n🏁 Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
