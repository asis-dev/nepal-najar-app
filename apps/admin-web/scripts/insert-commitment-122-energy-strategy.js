/**
 * Insert commitment #122: Energy Consumption Growth and Export Strategy 2026.
 *
 * Cabinet-approved Apr 2026 — targets 24,500 MW of electricity generation
 * by FY 2035/36 through combined government, public, and private investment.
 *
 * Usage: node scripts/insert-commitment-122-energy-strategy.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COMMITMENT = {
  id: 122,
  slug: 'energy-strategy-2026',
  title: 'Energy Consumption Growth and Export Strategy 2026 (24,500 MW by 2035)',
  title_ne: 'ऊर्जा खपत वृद्धि तथा निर्यात रणनीति, २०२६ (२०३५ सम्म २४,५०० मेगावाट)',
  category: 'Economy',
  category_ne: 'अर्थतन्त्र',
  status: 'in_progress',
  progress: 10,
  linked_projects: 0,
  evidence_count: 0,
  last_update: '2026-04-29',
  description:
    'Cabinet-approved Energy Consumption Growth and Export Strategy 2026: target of 24,500 MW of electricity generation by FY 2035/36 via combined government, public, and private-sector investment. Sets domestic consumption growth and export expansion path; pairs with the IBN one-stop service for investor onboarding.',
  description_ne:
    'मन्त्रिपरिषद्बाट स्वीकृत ऊर्जा खपत वृद्धि तथा निर्यात रणनीति, २०२६: सरकारी, सार्वजनिक र निजी क्षेत्रको संयुक्त लगानीबाट आ.व. २०३५/३६ सम्म २४,५०० मेगावाट विद्युत् उत्पादन गर्ने लक्ष्य। आन्तरिक खपत वृद्धि र निर्यात विस्तारको खाका।',
  trust_level: 'partial',
  review_state: 'published',
  is_public: true,
  scope: 'national',
  baseline_progress: 10,
  baseline_status: 'in_progress',
};

async function main() {
  console.log(`Upserting commitment #${COMMITMENT.id}: ${COMMITMENT.title}`);
  const { data, error } = await supabase
    .from('promises')
    .upsert(COMMITMENT, { onConflict: 'id' })
    .select('id, title, status, progress');

  if (error) {
    console.error('FAILED:', error.message);
    process.exit(1);
  }
  console.log('OK:', data);
}

main();
