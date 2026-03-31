/**
 * Fetch Nepal's 2015 Constitution text from Constitute Project
 * and update the database with real article body text.
 *
 * Usage: node scripts/fetch-constitution-text.js
 */
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const CONSTITUTE_URL = 'https://www.constituteproject.org/constitution/Nepal_2015';

async function fetchConstitutionPage() {
  console.log('Fetching constitution from Constitute Project...');
  const res = await fetch(CONSTITUTE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();
  console.log(`Fetched ${(html.length / 1024).toFixed(0)} KB`);
  return html;
}

function parseArticles(html) {
  const articles = [];

  // Constitute Project uses data attributes or specific HTML patterns for articles
  // Try to extract article content between article markers
  // Pattern: articles are typically in sections with IDs like "article_1", "article_2" etc.

  // Method 1: Look for article headers and content
  const articleRegex = /Article\s+(\d+)[^<]*<\/[^>]+>([\s\S]*?)(?=Article\s+\d+[^<]*<\/|$)/gi;
  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const num = parseInt(match[1]);
    let text = match[2]
      .replace(/<[^>]+>/g, ' ') // strip HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 20 && num >= 1 && num <= 308) {
      articles.push({ n: num, text: text.slice(0, 5000) });
    }
  }

  // Method 2: If method 1 didn't work, try JSON data embedded in page
  if (articles.length < 10) {
    const jsonMatch = html.match(/__NEXT_DATA__.*?>([\s\S]*?)<\/script>/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        // Navigate the data structure to find articles
        const sections = data?.props?.pageProps?.sections || data?.props?.pageProps?.constitution?.sections || [];
        for (const section of sections) {
          const provisions = section.provisions || section.articles || [];
          for (const p of provisions) {
            const num = parseInt(p.article_number || p.number || p.id?.match(/\d+/)?.[0] || '0');
            const text = (p.text || p.content || p.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (num > 0 && num <= 308 && text.length > 20) {
              articles.push({ n: num, text: text.slice(0, 5000) });
            }
          }
        }
      } catch (e) {
        console.log('JSON parse failed:', e.message);
      }
    }
  }

  return articles;
}

async function updateDatabase(articles) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let updated = 0;
  for (const a of articles) {
    const { rowCount } = await client.query(
      `UPDATE constitution_articles SET body_en = $1 WHERE article_number = $2 AND version = 1 AND body_en LIKE '[Article%'`,
      [a.text, a.n],
    );
    if (rowCount > 0) updated++;
  }

  console.log(`Updated ${updated}/${articles.length} articles in database`);
  await client.end();
}

async function run() {
  console.log('=== Fetch Nepal Constitution Text ===');

  try {
    const html = await fetchConstitutionPage();
    const articles = parseArticles(html);
    console.log(`Parsed ${articles.length} articles from HTML`);

    if (articles.length > 0) {
      await updateDatabase(articles);
    } else {
      console.log('No articles parsed. The page structure may have changed.');
      console.log('Try the PDF approach instead: download the PDF and extract text.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
