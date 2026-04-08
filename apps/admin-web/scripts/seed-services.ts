/**
 * Seed the services table from lib/services/seed-data.ts.
 * Run from apps/admin-web:
 *   npx tsx scripts/seed-services.ts
 *
 * Before running, apply the migration:
 *   psql "$DATABASE_URL" -f supabase/043-services-directory.sql
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SEED_SERVICES as CORE } from '../lib/services/seed-data';
import { EXTRA_SERVICES } from '../lib/services/seed-data-extra';
import { EXTRA_SERVICES_2 } from '../lib/services/seed-data-extra-2';
const SEED_SERVICES = [...CORE, ...EXTRA_SERVICES, ...EXTRA_SERVICES_2];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log(`Seeding ${SEED_SERVICES.length} services…`);
  let ok = 0, fail = 0;

  for (const s of SEED_SERVICES) {
    const row = {
      slug: s.slug,
      category: s.category,
      provider_type: s.providerType,
      provider_name: s.providerName,
      title_en: s.title.en,
      title_ne: s.title.ne,
      summary_en: s.summary.en,
      summary_ne: s.summary.ne,
      estimated_time: s.estimatedTime ? JSON.stringify(s.estimatedTime) : null,
      fee_range: s.feeRange ? JSON.stringify(s.feeRange) : null,
      official_url: s.officialUrl || null,
      documents: s.documents,
      steps: s.steps,
      offices: s.offices,
      common_problems: s.commonProblems,
      faqs: s.faqs,
      tags: s.tags,
      verified_at: s.verifiedAt,
      is_active: true,
    };

    const { error } = await supabase.from('services').upsert(row, { onConflict: 'slug' });
    if (error) {
      console.error(`  ✗ ${s.slug}:`, error.message);
      fail++;
    } else {
      console.log(`  ✓ ${s.slug}`);
      ok++;
    }
  }

  console.log(`\nDone. ${ok} ok, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
