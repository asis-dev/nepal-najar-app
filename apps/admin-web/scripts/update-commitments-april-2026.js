/**
 * Update existing commitment progress/status in Supabase — April 2026
 * Usage: node scripts/update-commitments-april-2026.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const UPDATES = [
  { id: 4,  changes: { progress: 55 } },
  { id: 5,  changes: { progress: 45 } },
  { id: 15, changes: { status: 'in_progress', progress: 25 } },
  { id: 19, changes: { progress: 12 } },
  { id: 21, changes: { progress: 8 } },
  { id: 43, changes: { progress: 28 } },
  { id: 47, changes: { progress: 45 } },
  { id: 52, changes: { status: 'in_progress', progress: 5 } },
  { id: 55, changes: { progress: 22 } },
  { id: 62, changes: { progress: 25 } },
  { id: 78, changes: { status: 'in_progress', progress: 12 } },
];

async function run() {
  console.log(`Updating ${UPDATES.length} commitments in Supabase...\n`);

  let success = 0;
  let failed = 0;

  for (const { id, changes } of UPDATES) {
    const { data, error } = await supabase
      .from('promises')
      .update({ ...changes, last_update: '2026-04-16' })
      .eq('id', id)
      .select('id, title, status, progress');

    if (error) {
      console.error(`  FAIL  #${id}: ${error.message}`);
      failed++;
    } else if (!data || data.length === 0) {
      console.error(`  FAIL  #${id}: no row matched`);
      failed++;
    } else {
      const row = data[0];
      console.log(`  OK    #${id} "${row.title}" → status=${row.status}, progress=${row.progress}%`);
      success++;
    }
  }

  console.log(`\nDone: ${success} updated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
