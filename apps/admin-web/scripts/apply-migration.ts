/**
 * Apply a single .sql file to DATABASE_URL.
 * Usage: npx tsx scripts/apply-migration.ts supabase/046-services-feedback.sql
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { readFileSync } from 'fs';
import postgres from 'postgres';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: tsx scripts/apply-migration.ts <file.sql>');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }
  const sql = readFileSync(file, 'utf8');
  const client = postgres(url, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });
  try {
    await client.unsafe(sql);
    console.log('✓ applied', file);
  } catch (e: any) {
    console.error('✗ failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}
main();
