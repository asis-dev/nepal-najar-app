/**
 * Run SQL migration against Supabase
 * Usage: npx tsx scripts/run-migration.ts <path-to-sql-file>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npx tsx scripts/run-migration.ts <path-to-sql>');
  process.exit(1);
}

const sql = readFileSync(resolve(filePath), 'utf-8');

// Split SQL into individual statements (naive but works for our migrations)
const statements = sql
  .split(/;\s*$/m)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log(`Running migration: ${filePath}`);
  console.log(`${statements.length} statements to execute\n`);

  let success = 0;
  let failed = 0;

  for (const stmt of statements) {
    const preview = stmt.slice(0, 80).replace(/\n/g, ' ');
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_text: stmt + ';' });
      if (error) {
        // Try direct fetch via the Supabase SQL API
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: stmt }),
        });
        if (!res.ok) {
          console.log(`⚠ ${preview}... — ${error.message}`);
          failed++;
          continue;
        }
      }
      console.log(`✓ ${preview}...`);
      success++;
    } catch (err) {
      console.log(`✗ ${preview}... — ${err instanceof Error ? err.message : 'error'}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
}

run().catch(console.error);
