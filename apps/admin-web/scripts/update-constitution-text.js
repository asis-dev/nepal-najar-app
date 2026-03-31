/**
 * Update constitution articles with real body text
 * Usage: node scripts/update-constitution-text.js
 */
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function updateArticle(client, num, text) {
  const { rowCount } = await client.query(
    `UPDATE constitution_articles SET body_en = $1 WHERE article_number = $2 AND version = 1`,
    [text, num],
  );
  return rowCount > 0;
}

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Read articles from stdin as JSON
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const articles = JSON.parse(Buffer.concat(chunks).toString());

  let updated = 0;
  for (const a of articles) {
    if (await updateArticle(client, a.n, a.text)) updated++;
  }

  console.log(`Updated ${updated}/${articles.length} articles`);
  await client.end();
}

run().catch(console.error);
