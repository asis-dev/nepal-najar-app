#!/usr/bin/env node
/**
 * Run SQL migrations against Supabase via PostgreSQL.
 *
 * Usage:
 *   node scripts/run-pg-migration.js
 *   node scripts/run-pg-migration.js supabase/012-intelligence-jobs-and-control.sql
 *   DATABASE_URL=... node scripts/run-pg-migration.js supabase/012-...sql supabase/013-...sql
 *
 * Env options:
 *   DATABASE_URL / SUPABASE_DB_URL
 *   or SUPABASE_DB_PASSWORD (+ optional SUPABASE_PROJECT_REF / SUPABASE_DB_REGION / SUPABASE_DB_PORT)
 */

const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'apps/admin-web/.env.local'),
  path.resolve(__dirname, '../.env.local'),
];

for (const candidate of ENV_CANDIDATES) {
  if (!fs.existsSync(candidate)) continue;
  const envText = fs.readFileSync(candidate, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const DEFAULT_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'kmyftbmtdabuyfampklz';
const DEFAULT_DB_REGION = process.env.SUPABASE_DB_REGION || 'us-east-1';
const DEFAULT_DB_PORT = process.env.SUPABASE_DB_PORT || '6543';

const DEFAULT_FILES = [
  'supabase/011-commitment-public-model.sql',
  'supabase/012-intelligence-jobs-and-control.sql',
  'supabase/013-intelligence-status-recommendations.sql',
  'supabase/014-feedback-autopilot.sql',
  'supabase/015-intelligence-job-type-expansion.sql',
  'supabase/016-pilot-analytics.sql',
];

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return null;

  return `postgresql://postgres.${DEFAULT_PROJECT_REF}:${password}@aws-0-${DEFAULT_DB_REGION}.pooler.supabase.com:${DEFAULT_DB_PORT}/postgres`;
}

function resolveFile(file) {
  const candidates = [
    path.resolve(process.cwd(), file),
    path.resolve(__dirname, '..', file),
    path.resolve(__dirname, '../supabase', file),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

async function main() {
  const connectionString = buildConnectionString();
  if (!connectionString) {
    console.log('\nNeed database access before running migrations.\n');
    console.log('Provide one of:');
    console.log('  1. DATABASE_URL');
    console.log('  2. SUPABASE_DB_URL');
    console.log('  3. SUPABASE_DB_PASSWORD');
    console.log('');
    console.log('If using SUPABASE_DB_PASSWORD, the script builds the pooled connection for this workspace project.');
    process.exit(1);
  }

  const requestedFiles = process.argv.slice(2);
  const files = requestedFiles.length > 0 ? requestedFiles : DEFAULT_FILES;
  const resolvedFiles = files.map(file => {
    const resolved = resolveFile(file);
    if (!resolved) {
      console.error(`Migration file not found: ${file}`);
      process.exit(1);
    }
    return { input: file, resolved };
  });

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    prepare: false,
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await sql`select 1`;
    console.log('Connected.\n');

    for (const file of resolvedFiles) {
      const contents = fs.readFileSync(file.resolved, 'utf-8').trim();
      if (!contents) {
        console.log(`Skipping empty migration: ${file.input}`);
        continue;
      }

      console.log(`Running ${file.input}...`);
      await sql.unsafe(contents);
      console.log(`Success: ${file.input}\n`);
    }

    const tables = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('intelligence_jobs', 'intelligence_status_recommendations')
      order by table_name
    `;

    const columns = await sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'promises'
        and column_name in ('published_at', 'origin_signal_id', 'merged_into_id', 'review_notes')
      order by column_name
    `;

    console.log('Verification:');
    for (const row of tables) {
      console.log(`  table: ${row.table_name}`);
    }
    for (const row of columns) {
      console.log(`  promises column: ${row.column_name}`);
    }

    if (tables.length < 2 || columns.length < 4) {
      console.log('\nVerification looks incomplete. Review the database state before continuing.');
      process.exitCode = 1;
      return;
    }

    console.log('\nAll requested migrations applied successfully.');
  } catch (error) {
    console.error('\nMigration failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();
