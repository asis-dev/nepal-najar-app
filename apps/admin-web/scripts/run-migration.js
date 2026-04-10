const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) { console.log('Usage: node run-migration.js <sql-file>'); process.exit(1); }

const connStr = 'postgresql://postgres.kmyftbmtdabuyfampklz:Hil1234ton$$@aws-1-us-east-2.pooler.supabase.com:6543/postgres';
const sql = fs.readFileSync(path.resolve(file), 'utf8');

const client = new Client({ connectionString: connStr });
client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('Migration OK'); return client.end(); })
  .catch(e => { console.log('Error:', e.message); client.end().catch(() => {}); process.exit(1); });
