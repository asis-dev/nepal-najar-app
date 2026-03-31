require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const now = new Date().toISOString();

// ─── scraped_articles data ───────────────────────────────────────────────────

const scrapedArticles = [
  // Governance
  { source_name: 'myRepublica', source_url: 'https://myrepublica.nagariknetwork.com/news/balen-eyes-lean-smart-cabinet-plans-to-cap-ministries-at-18', source_type: 'news', headline: 'Balen eyes lean, smart cabinet; plans to cap ministries at 18', headline_ne: null, content_excerpt: null, published_at: '2026-03-20', scraped_at: now, language: 'en', promise_ids: ['2','41'], confidence: 0.9, classification: 'confirms', is_processed: true },
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/politics/2026/03/22/rsp-leaders-in-hectic-parleys-over-cabinet-posts', source_type: 'news', headline: 'RSP leaders in hectic parleys over cabinet posts', headline_ne: null, content_excerpt: null, published_at: '2026-03-22', scraped_at: now, language: 'en', promise_ids: ['2','41'], confidence: 0.85, classification: 'confirms', is_processed: true },
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/politics/2026/02/20/rsp-pledges-to-probe-assets-of-public-office-holders-since-1990', source_type: 'news', headline: 'RSP pledges to probe assets of public office holders since 1990', headline_ne: null, content_excerpt: null, published_at: '2026-02-20', scraped_at: now, language: 'en', promise_ids: ['4','5'], confidence: 0.8, classification: 'confirms', is_processed: true },
  { source_name: 'Nepal News', source_url: 'https://english.nepalnews.com/s/politics/breaking-down-the-rsp-manifesto-reform-growth-and-governance/', source_type: 'news', headline: 'Breaking down the RSP manifesto: Reform, growth, and governance', headline_ne: null, content_excerpt: null, published_at: '2026-02-19', scraped_at: now, language: 'en', promise_ids: ['1','2','3','4','5','6','38','39','40'], confidence: 0.85, classification: 'confirms', is_processed: true },
  { source_name: 'Biometric Update', source_url: 'https://www.biometricupdate.com/202603/nepal-rolls-out-integrated-digital-system-faces-acceptance-problem-with-nagarik-app', source_type: 'news', headline: 'Nepal rolls out integrated digital system, faces acceptance problem with Nagarik App', headline_ne: null, content_excerpt: null, published_at: '2026-03-15', scraped_at: now, language: 'en', promise_ids: ['44','18','46'], confidence: 0.9, classification: 'confirms', is_processed: true },
  // Economy
  { source_name: 'IMF', source_url: 'https://www.imf.org/en/news/articles/2026/01/13/cf-steering-nepals-economy-amid-global-challenges', source_type: 'international', headline: 'Steering Nepal Economy Amid Global Challenges - IMF', headline_ne: null, content_excerpt: null, published_at: '2026-01-13', scraped_at: now, language: 'en', promise_ids: ['8'], confidence: 0.95, classification: 'neutral', is_processed: true },
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/columns/2026/03/23/rsp-s-economic-blueprint-1774225304', source_type: 'news', headline: 'RSP economic blueprint: Ambitious targets meet hard realities', headline_ne: null, content_excerpt: null, published_at: '2026-03-23', scraped_at: now, language: 'en', promise_ids: ['8','9','10','87'], confidence: 0.85, classification: 'neutral', is_processed: true },
  { source_name: 'Fiscal Nepal', source_url: 'https://www.fiscalnepal.com/2026/01/18/23954/nepal-moves-to-cut-red-tape-as-ibn-fast-tracks-one-stop-service-centre-to-rebuild-global-investor-confidence/', source_type: 'news', headline: 'Nepal moves to cut red tape as IBN fast-tracks One Stop Service Centre', headline_ne: null, content_excerpt: null, published_at: '2026-01-18', scraped_at: now, language: 'en', promise_ids: ['53'], confidence: 0.85, classification: 'confirms', is_processed: true },
  { source_name: 'Annapurna Express', source_url: 'https://theannapurnaexpress.com/story/51993/', source_type: 'news', headline: 'NRB issues new directives for cooperative banks', headline_ne: null, content_excerpt: null, published_at: '2026-01-16', scraped_at: now, language: 'en', promise_ids: ['59','31','60'], confidence: 0.9, classification: 'confirms', is_processed: true },
  { source_name: 'KhabarHub', source_url: 'https://english.khabarhub.com/2026/16/535399/', source_type: 'news', headline: 'What you need to know about Nepal cooperative crisis', headline_ne: null, content_excerpt: null, published_at: '2026-02-16', scraped_at: now, language: 'en', promise_ids: ['31','59','60'], confidence: 0.85, classification: 'neutral', is_processed: true },
  // Energy
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/money/2024/10/15/nepal-india-bangladesh-energy-deal', source_type: 'news', headline: 'Nepal-India-Bangladesh sign historic energy export agreement', headline_ne: null, content_excerpt: null, published_at: '2024-10-15', scraped_at: now, language: 'en', promise_ids: ['66','65','12'], confidence: 0.95, classification: 'confirms', is_processed: true },
  { source_name: 'NEA Annual Report', source_url: 'https://www.nea.org.np/', source_type: 'government', headline: 'Nepal installed hydropower capacity reaches 3,422 MW', headline_ne: null, content_excerpt: null, published_at: '2025-12-01', scraped_at: now, language: 'en', promise_ids: ['12','65'], confidence: 0.95, classification: 'confirms', is_processed: true },
  // Infrastructure
  { source_name: 'World Bank', source_url: 'https://www.worldbank.org/en/country/nepal/publication/nepaldevelopmentupdate', source_type: 'international', headline: 'Nepal Development Update: National pride projects would take 41 more years at current pace', headline_ne: null, content_excerpt: null, published_at: '2025-06-01', scraped_at: now, language: 'en', promise_ids: ['14','55'], confidence: 0.95, classification: 'contradicts', is_processed: true },
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/valley/2026/01/15/melamchi-water-supply-halted-again', source_type: 'news', headline: 'Melamchi water supply halted again by local protests', headline_ne: null, content_excerpt: null, published_at: '2026-01-15', scraped_at: now, language: 'en', promise_ids: ['13'], confidence: 0.9, classification: 'contradicts', is_processed: true },
  // Technology
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/money/2025/05/20/nepal-digital-nomad-visa', source_type: 'news', headline: 'Nepal announces 5-year digital nomad visa for remote workers', headline_ne: null, content_excerpt: null, published_at: '2025-05-20', scraped_at: now, language: 'en', promise_ids: ['75'], confidence: 0.9, classification: 'confirms', is_processed: true },
  // Health
  { source_name: 'Himalayan Times', source_url: 'https://thehimalayantimes.com/opinion/nepals-health-insurance-system-is-on-the-brink-the-new-government-has-one-chance-to-fix-it', source_type: 'news', headline: 'Nepal health insurance system is on the brink', headline_ne: null, content_excerpt: null, published_at: '2026-02-15', scraped_at: now, language: 'en', promise_ids: ['22'], confidence: 0.9, classification: 'contradicts', is_processed: true },
  { source_name: 'ADB', source_url: 'https://www.adb.org/publications/study-nepal-national-health-insurance-program', source_type: 'international', headline: 'Study on Nepal National Health Insurance Program', headline_ne: null, content_excerpt: null, published_at: '2025-01-01', scraped_at: now, language: 'en', promise_ids: ['22'], confidence: 0.95, classification: 'neutral', is_processed: true },
  // Environment
  { source_name: 'IQAir', source_url: 'https://www.iqair.com/nepal/central-region/kathmandu', source_type: 'international', headline: 'Kathmandu ranked most polluted city in world - March 2026', headline_ne: null, content_excerpt: null, published_at: '2026-03-08', scraped_at: now, language: 'en', promise_ids: ['27'], confidence: 0.95, classification: 'contradicts', is_processed: true },
  { source_name: 'Annapurna Express', source_url: 'https://theannapurnaexpress.com/story/53583/', source_type: 'news', headline: 'Rs 18 billion spent on Bagmati cleanup over 29 years with minimal results', headline_ne: null, content_excerpt: null, published_at: '2025-06-01', scraped_at: now, language: 'en', promise_ids: ['28'], confidence: 0.9, classification: 'contradicts', is_processed: true },
  { source_name: 'Climate Action Tracker', source_url: 'https://climateactiontracker.org/countries/nepal/', source_type: 'international', headline: 'Nepal climate targets rated Almost Sufficient', headline_ne: null, content_excerpt: null, published_at: '2025-12-01', scraped_at: now, language: 'en', promise_ids: ['105'], confidence: 0.95, classification: 'confirms', is_processed: true },
  // Social
  { source_name: 'IDSN', source_url: 'https://idsn.org/countries/nepal/', source_type: 'international', headline: 'Nepal: Only 144 caste discrimination cases filed in 12 years', headline_ne: null, content_excerpt: null, published_at: '2025-06-01', scraped_at: now, language: 'en', promise_ids: ['33','36','37'], confidence: 0.9, classification: 'contradicts', is_processed: true },
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/national/2026/01/10/out-of-constituency-diaspora-voting-not-possible-in-march', source_type: 'news', headline: 'Overseas voting not possible for March 2026 election', headline_ne: null, content_excerpt: null, published_at: '2026-01-10', scraped_at: now, language: 'en', promise_ids: ['30','101'], confidence: 0.95, classification: 'contradicts', is_processed: true },
  { source_name: 'Xinhua', source_url: 'https://english.news.cn/20260308/4ce1c0b7923443fd8791b24d9105bb5e/c.html', source_type: 'international', headline: 'Gen-Z protest investigation report submitted to PM', headline_ne: null, content_excerpt: null, published_at: '2026-03-08', scraped_at: now, language: 'en', promise_ids: ['51'], confidence: 0.9, classification: 'confirms', is_processed: true },
  { source_name: 'Fiscal Nepal', source_url: 'https://www.fiscalnepal.com/2024/11/22/18621/nepal-introduces-guidelines-to-attract-nrn-investment-in-capital-markets/', source_type: 'news', headline: 'Nepal introduces guidelines to attract NRN investment in capital markets', headline_ne: null, content_excerpt: null, published_at: '2024-11-22', scraped_at: now, language: 'en', promise_ids: ['102'], confidence: 0.85, classification: 'confirms', is_processed: true },
  // Anti-Corruption
  { source_name: 'Himalayan Times', source_url: 'https://thehimalayantimes.com/business/2025-in-review-the-year-the-ciaa-took-on-big-corruption-at-the-special-court', source_type: 'news', headline: '2025 in review: The year CIAA took on big corruption', headline_ne: null, content_excerpt: null, published_at: '2025-12-30', scraped_at: now, language: 'en', promise_ids: ['4','47'], confidence: 0.9, classification: 'confirms', is_processed: true },
  { source_name: 'HRW', source_url: 'https://www.hrw.org/news/2025/05/12/nepal-ensure-credible-transitional-justice-appointments', source_type: 'international', headline: 'Nepal: Ensure Credible Transitional Justice Appointments', headline_ne: null, content_excerpt: null, published_at: '2025-05-12', scraped_at: now, language: 'en', promise_ids: ['50'], confidence: 0.9, classification: 'neutral', is_processed: true },
  // Agriculture
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/money/2025/08/04/nepal-s-food-import-bill-hits-rs360-billion-as-india-eases-curbs', source_type: 'news', headline: 'Nepal food import bill hits Rs 360 billion', headline_ne: null, content_excerpt: null, published_at: '2025-08-04', scraped_at: now, language: 'en', promise_ids: ['83'], confidence: 0.95, classification: 'contradicts', is_processed: true },
  { source_name: 'World Bank', source_url: 'https://www.worldbank.org/en/news/press-release/2025/06/01/nepal-world-bank-approves-257-million-to-improve-electricity-and-irrigation-services', source_type: 'international', headline: 'World Bank approves $257M for electricity and irrigation in Nepal', headline_ne: null, content_excerpt: null, published_at: '2025-06-01', scraped_at: now, language: 'en', promise_ids: ['84','65'], confidence: 0.95, classification: 'confirms', is_processed: true },
  // Education
  { source_name: 'Kathmandu Post', source_url: 'https://kathmandupost.com/national/2025/11/27/government-pushes-to-free-universities-from-political-grip', source_type: 'news', headline: 'Government pushes to free universities from political grip', headline_ne: null, content_excerpt: null, published_at: '2025-11-27', scraped_at: now, language: 'en', promise_ids: ['89'], confidence: 0.85, classification: 'confirms', is_processed: true },
  { source_name: 'ICTFrame', source_url: 'https://ictframe.com/kathmandu-skill-fair-2025/', source_type: 'news', headline: 'Kathmandu Skill Fair 2025 trains 2,082 youth across 30 professions', headline_ne: null, content_excerpt: null, published_at: '2025-06-15', scraped_at: now, language: 'en', promise_ids: ['25'], confidence: 0.85, classification: 'confirms', is_processed: true },
];

// ─── evidence_vault data ─────────────────────────────────────────────────────

// Mapping to valid DB enums:
// source_type: 'youtube'|'facebook'|'twitter'|'tiktok'|'news_interview'|'press_conference'|'parliament'|'official_statement'
// statement_type: 'commitment'|'claim'|'excuse'|'update'|'contradiction'|'denial'|'deflection'|'acknowledgment'
// government_report -> official_statement, international_report -> news_interview
// statistic/fact -> claim, announcement -> update

const evidenceVault = [
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Nepal currently has 3,422 MW installed hydropower capacity with 259 projects (10,692 MW) under construction.', quote_summary: null, quote_context: 'Nepal electricity baseline', language: 'en', source_type: 'official_statement', source_url: 'https://www.nea.org.np/', source_title: 'NEA Annual Report 2025', spoken_date: '2025-12-01', promise_ids: [12,65], statement_type: 'claim', verification_status: 'verified', importance_score: 0.9, tags: ['baseline','energy','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Nepal exports an average of 1,000 MW daily to India, earning Rs 15 billion in FY 2025/26. A tripartite Nepal-India-Bangladesh power sale agreement was signed in October 2024.', quote_summary: null, quote_context: 'Energy export achievements', language: 'en', source_type: 'official_statement', source_url: 'https://kathmandupost.com/money/2024/10/15/nepal-india-bangladesh-energy-deal', source_title: 'Nepal-India-Bangladesh energy deal', spoken_date: '2024-10-15', promise_ids: [66], statement_type: 'claim', verification_status: 'verified', importance_score: 0.95, tags: ['baseline','energy','export','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Only 23-28% of Nepal population is covered by health insurance. The Health Insurance Board is in financial crisis with outpatient coverage slashed to Rs 25,000.', quote_summary: null, quote_context: 'Health insurance crisis baseline', language: 'en', source_type: 'news_interview', source_url: 'https://www.adb.org/publications/study-nepal-national-health-insurance-program', source_title: 'ADB Study on Nepal Health Insurance', spoken_date: '2025-01-01', promise_ids: [22], statement_type: 'claim', verification_status: 'verified', importance_score: 0.9, tags: ['baseline','health','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: '27 national pride projects designated in Nepal. Only 4 completed. World Bank analysis shows remaining 17 would take 41 more years at current spending pace.', quote_summary: null, quote_context: 'National pride projects stalled', language: 'en', source_type: 'news_interview', source_url: 'https://www.worldbank.org/en/country/nepal/publication/nepaldevelopmentupdate', source_title: 'Nepal Development Update - World Bank', spoken_date: '2025-06-01', promise_ids: [14,55], statement_type: 'claim', verification_status: 'verified', importance_score: 0.95, tags: ['baseline','infrastructure','stalled','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Rs 87 billion embezzled from 40 cooperatives affecting hundreds of thousands of depositors. Rs 49 billion is unlikely to be recovered soon. 411 arrested, 1,397 at large.', quote_summary: null, quote_context: 'Cooperative crisis scale', language: 'en', source_type: 'news_interview', source_url: 'https://english.nepalnews.com/s/explainers/what-you-need-to-know-about-nepals-cooperative-crisis/', source_title: 'Nepal cooperative crisis explained', spoken_date: '2026-02-16', promise_ids: [31,59,60], statement_type: 'claim', verification_status: 'verified', importance_score: 0.9, tags: ['baseline','economy','cooperative','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Nepal GDP growth: 4.3-4.6% in FY2025. IMF projects 5.2% for FY2026. ADB estimate is 3.0%. RSP target of 7% would be highest sustained growth in Nepal history.', quote_summary: null, quote_context: 'GDP growth baseline', language: 'en', source_type: 'news_interview', source_url: 'https://www.imf.org/en/news/articles/2026/01/13/cf-steering-nepals-economy-amid-global-challenges', source_title: 'IMF Nepal Economic Assessment', spoken_date: '2026-01-13', promise_ids: [8], statement_type: 'claim', verification_status: 'verified', importance_score: 0.85, tags: ['baseline','economy','gdp','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Kathmandu 2024 average PM2.5 was 45.1 ug/m3 — 9.2 times WHO guideline. Ranked most polluted city in world on March 8, 2026. Air pollution causes 26,000 premature deaths annually.', quote_summary: null, quote_context: 'Kathmandu air quality crisis', language: 'en', source_type: 'news_interview', source_url: 'https://www.iqair.com/nepal/central-region/kathmandu', source_title: 'IQAir Kathmandu Air Quality', spoken_date: '2026-03-08', promise_ids: [27], statement_type: 'claim', verification_status: 'verified', importance_score: 0.9, tags: ['baseline','environment','pollution','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'No state apology for caste discrimination has ever been issued in Nepal. Dalits are 13.8% of population. Only 144 caste discrimination cases filed in 12 years. Police routinely refuse to register complaints.', quote_summary: null, quote_context: 'Dalit discrimination baseline', language: 'en', source_type: 'news_interview', source_url: 'https://idsn.org/countries/nepal/', source_title: 'IDSN Nepal Country Report', spoken_date: '2025-06-01', promise_ids: [33,36,37], statement_type: 'claim', verification_status: 'verified', importance_score: 0.9, tags: ['baseline','social','dalit','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Election Commission formally ruled that diaspora/out-of-constituency voting was NOT possible for March 2026 elections, stating preparations require at least 2 years.', quote_summary: null, quote_context: 'Overseas voting blocked', language: 'en', source_type: 'news_interview', source_url: 'https://kathmandupost.com/national/2026/01/10/out-of-constituency-diaspora-voting-not-possible-in-march', source_title: 'Diaspora voting not possible for March 2026', spoken_date: '2026-01-10', promise_ids: [30,101], statement_type: 'claim', verification_status: 'verified', importance_score: 0.85, tags: ['baseline','governance','diaspora','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: '66.9% of students drop out by Grade 12. Retention rate to Grade 12 is only 29.2%. Primary dropout rate is 3.6%. Girls, Dalits and rural communities have higher rates.', quote_summary: null, quote_context: 'Education dropout crisis', language: 'en', source_type: 'official_statement', source_url: 'https://kathmandupost.com/national/2021/05/30/school-dropout-remains-a-challenge-survey-report-shows', source_title: 'School dropout survey report', spoken_date: '2021-05-30', promise_ids: [26], statement_type: 'claim', verification_status: 'verified', importance_score: 0.85, tags: ['baseline','education','dropout','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Gen-Z protest judicial commission recorded statements from 150+ individuals. 77 people died including dozens shot by police. Report submitted to PM Karki in March 2026.', quote_summary: null, quote_context: 'Gen-Z investigation progress', language: 'en', source_type: 'news_interview', source_url: 'https://english.news.cn/20260308/4ce1c0b7923443fd8791b24d9105bb5e/c.html', source_title: 'Gen-Z protest investigation report', spoken_date: '2026-03-08', promise_ids: [51], statement_type: 'claim', verification_status: 'verified', importance_score: 0.95, tags: ['baseline','accountability','genz','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Year-round irrigation covers only 18-19% of agricultural land. The ADS target of 60% by 2025 was already missed. Food import bill hit Rs 360 billion and is growing.', quote_summary: null, quote_context: 'Agriculture and irrigation baseline', language: 'en', source_type: 'news_interview', source_url: 'https://www.worldbank.org/en/news/press-release/2025/06/01/nepal-world-bank-approves-257-million-to-improve-electricity-and-irrigation-services', source_title: 'World Bank Nepal irrigation investment', spoken_date: '2025-06-01', promise_ids: [84,83], statement_type: 'claim', verification_status: 'verified', importance_score: 0.85, tags: ['baseline','agriculture','irrigation','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Nepal 5-year multi-entry digital nomad visa announced May 2025. Requirements: $1,500/month income, $100K health insurance. Expected to accept applications in 2026.', quote_summary: null, quote_context: 'Digital nomad visa progress', language: 'en', source_type: 'news_interview', source_url: 'https://kathmandupost.com/money/2025/05/20/nepal-digital-nomad-visa', source_title: 'Nepal digital nomad visa announced', spoken_date: '2025-05-20', promise_ids: [75], statement_type: 'update', verification_status: 'verified', importance_score: 0.85, tags: ['technology','visa','progress','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: 'Melamchi Phase 1 delivers 170 MLD via temporary infrastructure. Water resumed Oct 2024 but halted again Jan 2026 by local protests. Valley demand is 470 MLD.', quote_summary: null, quote_context: 'Melamchi water crisis', language: 'en', source_type: 'news_interview', source_url: 'https://kathmandupost.com/valley/2026/01/15/melamchi-water-supply-halted-again', source_title: 'Melamchi water supply halted again', spoken_date: '2026-01-15', promise_ids: [13], statement_type: 'claim', verification_status: 'verified', importance_score: 0.9, tags: ['baseline','infrastructure','water','research'] },
  { official_name: 'Research Baseline', official_title: null, quote_text: '16.1 million citizens have National Identity Numbers. 2 million have physical cards. 5.5 million cards distributed to districts. But institutions still refuse to accept digital documents from Nagarik App.', quote_summary: null, quote_context: 'National ID progress', language: 'en', source_type: 'news_interview', source_url: 'https://www.biometricupdate.com/202603/nepal-rolls-out-integrated-digital-system-faces-acceptance-problem-with-nagarik-app', source_title: 'Nepal digital ID system faces acceptance issues', spoken_date: '2026-03-15', promise_ids: [44], statement_type: 'claim', verification_status: 'verified', importance_score: 0.85, tags: ['baseline','governance','digital','research'] },
];

async function main() {
  console.log('Seeding research evidence into Supabase...\n');

  // ── Insert scraped_articles ──────────────────────────────────────────────
  console.log(`Inserting ${scrapedArticles.length} scraped_articles...`);
  const { data: articlesData, error: articlesError } = await supabase
    .from('scraped_articles')
    .upsert(scrapedArticles, { onConflict: 'source_url', ignoreDuplicates: true })
    .select('id, headline');

  if (articlesError) {
    console.error('Error inserting scraped_articles:', articlesError.message);
    console.error('Details:', JSON.stringify(articlesError, null, 2));
  } else {
    console.log(`Successfully inserted/upserted ${articlesData?.length ?? 0} scraped_articles`);
    if (articlesData) {
      articlesData.forEach(a => console.log(`  - ${a.headline}`));
    }
  }

  // ── Insert evidence_vault ────────────────────────────────────────────────
  console.log(`\nInserting ${evidenceVault.length} evidence_vault entries...`);
  const { data: evidenceData, error: evidenceError } = await supabase
    .from('evidence_vault')
    .insert(evidenceVault)
    .select('id, quote_context');

  if (evidenceError) {
    console.error('Error inserting evidence_vault:', evidenceError.message);
    console.error('Details:', JSON.stringify(evidenceError, null, 2));
    // Try inserting one-by-one to identify problematic rows
    console.log('\nRetrying individual inserts to identify issues...');
    let successCount = 0;
    for (const ev of evidenceVault) {
      const { error: singleError } = await supabase
        .from('evidence_vault')
        .insert(ev);
      if (singleError) {
        console.error(`  FAIL: ${ev.quote_context} => ${singleError.message}`);
      } else {
        successCount++;
        console.log(`  OK: ${ev.quote_context}`);
      }
    }
    console.log(`Individual insert results: ${successCount}/${evidenceVault.length} succeeded`);
  } else {
    console.log(`Successfully inserted/upserted ${evidenceData?.length ?? 0} evidence_vault entries`);
    if (evidenceData) {
      evidenceData.forEach(e => console.log(`  - ${e.quote_context}`));
    }
  }

  // ── Verification counts ──────────────────────────────────────────────────
  console.log('\n--- Verification ---');
  const { count: articleCount } = await supabase.from('scraped_articles').select('*', { count: 'exact', head: true });
  const { count: evidenceCount } = await supabase.from('evidence_vault').select('*', { count: 'exact', head: true });
  console.log(`Total scraped_articles in DB: ${articleCount}`);
  console.log(`Total evidence_vault in DB: ${evidenceCount}`);
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
