#!/usr/bin/env node
/**
 * Run SQL migration against Supabase via direct PostgreSQL connection
 * Usage: node scripts/run-pg-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase PostgreSQL connection string
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const PROJECT_REF = 'kmyftbmtdabuyfampklz';

// The database password is the one set when the Supabase project was created
// We'll try the pooler connection (transaction mode)
const CONNECTION_STRING = `postgresql://postgres.${PROJECT_REF}:${process.env.SUPABASE_DB_PASSWORD || ''}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

// Read all SQL migration files in order
const sqlDir = path.resolve(__dirname, '../supabase');
const files = ['004-intelligence.sql'];

async function run() {
  // Check for password
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Need your Supabase database password.');
    console.log('');
    console.log('  Find it at:');
    console.log('  https://supabase.com/dashboard/project/kmyftbmtdabuyfampklz/settings/database');
    console.log('');
    console.log('  Then run:');
    console.log('  SUPABASE_DB_PASSWORD=your_password node scripts/run-pg-migration.js');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }

  const client = new Client({ connectionString: CONNECTION_STRING });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    for (const file of files) {
      const filePath = path.join(sqlDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${file} (not found)`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Running ${file}...`);

      try {
        await client.query(sql);
        console.log(`✅ ${file} — success\n`);
      } catch (err) {
        // "already exists" errors are OK
        if (err.message.includes('already exists')) {
          console.log(`✅ ${file} — tables already exist\n`);
        } else {
          console.log(`❌ ${file} — ${err.message}\n`);
        }
      }
    }

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('officials', 'intelligence_sources', 'intelligence_signals', 'intelligence_sweeps')
      ORDER BY table_name;
    `);

    console.log('Verification — tables found:');
    for (const row of result.rows) {
      console.log(`  ✅ ${row.table_name}`);
    }

    if (result.rows.length < 4) {
      const found = result.rows.map(r => r.table_name);
      const missing = ['officials', 'intelligence_sources', 'intelligence_signals', 'intelligence_sweeps'].filter(t => !found.includes(t));
      console.log(`  ❌ Missing: ${missing.join(', ')}`);
    }

  } catch (err) {
    console.error('Connection error:', err.message);

    if (err.message.includes('password')) {
      console.log('\n💡 Wrong password. Check: https://supabase.com/dashboard/project/kmyftbmtdabuyfampklz/settings/database');
    }
  } finally {
    await client.end();
  }
}

run();
