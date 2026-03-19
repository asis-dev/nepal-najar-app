/**
 * Seed script — populates Supabase with promise data + data source registry.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-supabase.ts
 *
 * Run once to initialize the database. Safe to re-run (uses upsert).
 */
import { createClient } from '@supabase/supabase-js';

// Inline the static data to avoid path alias issues in scripts
// In production, this would import from lib/data/promises
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Data sources to register */
const DATA_SOURCES = [
  { name: 'Kathmandu Post', slug: 'kathmandu-post', url: 'https://kathmandupost.com/national', source_type: 'news', language: 'en' },
  { name: 'Online Khabar', slug: 'online-khabar', url: 'https://english.onlinekhabar.com', source_type: 'news', language: 'en' },
  { name: 'MyRepublica', slug: 'republica', url: 'https://myrepublica.nagariknetwork.com', source_type: 'news', language: 'en' },
  { name: 'Himalayan Times', slug: 'himalayan-times', url: 'https://thehimalayantimes.com/nepal', source_type: 'news', language: 'en' },
  { name: 'Nepali Times', slug: 'nepali-times', url: 'https://www.nepalitimes.com', source_type: 'news', language: 'en' },
  { name: 'Ministry of Finance', slug: 'mof-gov', url: 'https://mof.gov.np', source_type: 'government', language: 'ne' },
  { name: 'Ministry of Infrastructure & Transport', slug: 'mopit-gov', url: 'https://mopit.gov.np', source_type: 'government', language: 'ne' },
  { name: 'Ministry of Urban Development', slug: 'moud-gov', url: 'https://moud.gov.np', source_type: 'government', language: 'ne' },
  { name: 'Ministry of Energy & Water', slug: 'moewri-gov', url: 'https://moewri.gov.np', source_type: 'government', language: 'ne' },
  { name: 'Ministry of Home Affairs', slug: 'moha-gov', url: 'https://moha.gov.np', source_type: 'government', language: 'ne' },
];

async function seed() {
  console.log('🌱 Seeding Supabase...\n');

  // 1. Seed data sources
  console.log('📡 Seeding data sources...');
  const { error: sourcesError } = await supabase
    .from('data_sources')
    .upsert(
      DATA_SOURCES.map(s => ({
        ...s,
        scrape_config: {},
        is_active: true,
        consecutive_failures: 0,
      })),
      { onConflict: 'slug' }
    );

  if (sourcesError) {
    console.error('❌ Data sources error:', sourcesError.message);
  } else {
    console.log(`✅ ${DATA_SOURCES.length} data sources seeded`);
  }

  // 2. Verify
  const { count: sourceCount } = await supabase
    .from('data_sources')
    .select('*', { count: 'exact', head: true });

  const { count: promiseCount } = await supabase
    .from('promises')
    .select('*', { count: 'exact', head: true });

  const { count: articleCount } = await supabase
    .from('scraped_articles')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Database status:');
  console.log(`   Promises:    ${promiseCount || 0}`);
  console.log(`   Sources:     ${sourceCount || 0}`);
  console.log(`   Articles:    ${articleCount || 0}`);
  console.log('\n✅ Seed complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Seed promises by importing from lib/data/promises.ts');
  console.log('   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env vars');
  console.log('   3. Set SCRAPE_SECRET in Vercel + GitHub repo secrets');
  console.log('   4. Test: curl -X POST /api/scrape/source -d \'{"source":"kathmandu-post"}\'');
}

seed().catch(console.error);
