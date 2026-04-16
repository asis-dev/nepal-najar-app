/**
 * Insert 12 new commitments (IDs 110-121) into Supabase promises table
 * These were discovered from signals in the last 48 hours — April 2026
 * Usage: node scripts/insert-new-commitments-april-2026.js
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

// Only include columns that exist in the promises table
// (no signal_type column exists)
const NEW_COMMITMENTS = [
  {
    id: 110,
    slug: 'home-delivery-documents',
    title: 'Home Delivery of Passports and Licenses',
    title_ne: 'घर-घरमै राहदानी र सवारी चालक अनुमतिपत्र वितरण',
    category: 'Governance',
    category_ne: 'शासन',
    status: 'in_progress',
    progress: 15,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Government delivers passports and licenses directly to citizens\u2019 homes via postal service. Launched in Myagdi and Makwanpur districts.',
    description_ne: 'सरकारले हुलाक सेवामार्फत नागरिकको घरमै राहदानी र सवारी चालक अनुमतिपत्र वितरण गर्ने। म्याग्दी र मकवानपुर जिल्लामा सुरु भइसकेको।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 15,
    baseline_status: 'in_progress',
  },
  {
    id: 111,
    slug: 'end-elite-business-monopoly',
    title: 'End Elite Business Monopoly Over State Mechanisms',
    title_ne: 'राज्य संयन्त्रमाथिको इजारा व्यापार अन्त्य',
    category: 'Anti-Corruption',
    category_ne: 'भ्रष्टाचार विरोध',
    status: 'in_progress',
    progress: 10,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Finance Minister declared the era of 2-4 business groups influencing state machinery is ending. Active measures to free state structures from oligarchic control.',
    description_ne: 'अर्थमन्त्रीले २-४ व्यापारिक समूहले राज्य संयन्त्र प्रभावित पार्ने युग अन्त्य भइरहेको घोषणा। राज्य संरचनालाई इजारेदार नियन्त्रणबाट मुक्त गर्ने सक्रिय कदम।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 10,
    baseline_status: 'in_progress',
  },
  {
    id: 112,
    slug: 'cancel-spp-military',
    title: 'Cancel SPP Military Partnership Agreement',
    title_ne: 'SPP सैन्य साझेदारी सम्झौता खारेज',
    category: 'Governance',
    category_ne: 'शासन',
    status: 'in_progress',
    progress: 30,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Government cancels State Partnership Program (SPP), a US military partnership, signaling Nepal\u2019s independent foreign policy.',
    description_ne: 'सरकारले SPP (राज्य साझेदारी कार्यक्रम) अमेरिकी सैन्य साझेदारी खारेज गरेको, नेपालको स्वतन्त्र विदेश नीतिको संकेत।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 30,
    baseline_status: 'in_progress',
  },
  {
    id: 113,
    slug: 'one-country-one-education',
    title: 'One Country, One Education Policy',
    title_ne: 'एक देश, एक शिक्षा नीति',
    category: 'Education',
    category_ne: 'शिक्षा',
    status: 'in_progress',
    progress: 10,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Unified national education system. Government employees\u2019 children must attend government schools. Aims to close private-public school quality gap.',
    description_ne: 'एकीकृत राष्ट्रिय शिक्षा प्रणाली। सरकारी कर्मचारीका सन्तानले सरकारी विद्यालयमा पढ्नुपर्ने। निजी-सार्वजनिक विद्यालय गुणस्तर अन्तर कम गर्ने।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 10,
    baseline_status: 'in_progress',
  },
  {
    id: 114,
    slug: 'abolish-vip-culture',
    title: 'Abolish VIP Culture in Government',
    title_ne: 'VIP कल्चर उन्मूलन',
    category: 'Governance',
    category_ne: 'शासन',
    status: 'in_progress',
    progress: 40,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'PM ends VIP culture in police force and government operations. Equal treatment for all citizens.',
    description_ne: 'प्रधानमन्त्रीले प्रहरी बल र सरकारी कार्यालयमा VIP कल्चर अन्त्य गरेका। सबै नागरिकलाई समान व्यवहार।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 40,
    baseline_status: 'in_progress',
  },
  {
    id: 115,
    slug: 'pokhara-free-shuttle-bus',
    title: 'Pokhara Free Electric Shuttle Bus Service',
    title_ne: 'पोखरा निःशुल्क विद्युतीय शटल बस सेवा',
    category: 'Transport',
    category_ne: 'यातायात',
    status: 'in_progress',
    progress: 60,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Free electric shuttle from Pokhara Airport to Amar Singh Chowk. Two buses, 6AM-10PM daily. Already operational.',
    description_ne: 'पोखरा विमानस्थलदेखि अमरसिंह चोकसम्म निःशुल्क विद्युतीय शटल बस। दुई बस, बिहान ६ देखि राति १० बजेसम्म। सञ्चालनमा आइसकेको।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 60,
    baseline_status: 'in_progress',
  },
  {
    id: 116,
    slug: 'khula-manch-community-hub',
    title: 'Reopen Khula Manch as Public Community Hub',
    title_ne: 'खुला मञ्च सार्वजनिक सामुदायिक केन्द्र',
    category: 'Social',
    category_ne: 'सामाजिक',
    status: 'delivered',
    progress: 100,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Kathmandu\u2019s iconic Khula Manch reopened after restoration. Designated for yoga, meditation, community wellness.',
    description_ne: 'काठमाडौंको ऐतिहासिक खुला मञ्च पुनर्निर्माणपछि पुनःसञ्चालन। योग, ध्यान, सामुदायिक स्वास्थ्यका लागि तोकिएको।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 100,
    baseline_status: 'delivered',
  },
  {
    id: 117,
    slug: 'nepse-24-hour-trading',
    title: '24-Hour Share Trading on NEPSE',
    title_ne: 'नेप्सेमा २४ घण्टा शेयर कारोबार',
    category: 'Economy',
    category_ne: 'अर्थतन्त्र',
    status: 'delivered',
    progress: 100,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Nepal introduces 24-hour share trading. Investors can place orders any time of day or night.',
    description_ne: 'नेपालमा २४ घण्टा शेयर कारोबार सुरु। लगानीकर्ताले दिनरात जुनसुकै बेला अर्डर राख्न सक्ने।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 100,
    baseline_status: 'delivered',
  },
  {
    id: 118,
    slug: '103-new-governance-laws',
    title: '103 New Laws for Governance Reform',
    title_ne: 'शासन सुधारका लागि १०३ नयाँ कानून',
    category: 'Governance',
    category_ne: 'शासन',
    status: 'in_progress',
    progress: 5,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Parliament introducing 103 new laws for governance and public accountability.',
    description_ne: 'संसद्मा शासन र सार्वजनिक जवाफदेहिताका लागि १०३ नयाँ कानून प्रस्तुत हुँदै।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 5,
    baseline_status: 'in_progress',
  },
  {
    id: 119,
    slug: 'nepal-wellness-year-2027',
    title: 'Nepal Arogya (Wellness) Year 2027',
    title_ne: 'नेपाल आरोग्य वर्ष २०२७',
    category: 'Health',
    category_ne: 'स्वास्थ्य',
    status: 'in_progress',
    progress: 10,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Government declared Nepal Arogya Year 2027 with 100-point wellness tourism plan. Goal: 1.5 million in yoga/meditation programs.',
    description_ne: 'सरकारले नेपाल आरोग्य वर्ष २०२७ घोषणा गरेको। १०० बुँदे कार्ययोजना। लक्ष्य: १५ लाख जना योग/ध्यान कार्यक्रममा।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 10,
    baseline_status: 'in_progress',
  },
  {
    id: 120,
    slug: 'kathmandu-night-bus',
    title: 'Kathmandu Valley Night Bus Service',
    title_ne: 'काठमाडौं उपत्यका रात्रि बस सेवा',
    category: 'Transport',
    category_ne: 'यातायात',
    status: 'in_progress',
    progress: 50,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Sajha Yatayat night bus service 8PM-11PM on East-West and North-South routes with 7 electric buses. CCTV and police presence.',
    description_ne: 'साझा यातायात रात्रि बस सेवा राति ८-११ बजेसम्म पूर्व-पश्चिम र उत्तर-दक्षिण मार्गमा ७ विद्युतीय बससहित। CCTV र प्रहरी उपस्थिति।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 50,
    baseline_status: 'in_progress',
  },
  {
    id: 121,
    slug: 'satellite-internet-remote',
    title: 'Satellite Internet for Remote Districts',
    title_ne: 'दुर्गम जिल्लामा स्याटेलाइट इन्टरनेट',
    category: 'Technology',
    category_ne: 'प्रविधि',
    status: 'in_progress',
    progress: 8,
    linked_projects: 0,
    evidence_count: 0,
    last_update: '2026-04-16',
    description: 'Government connecting remote districts through satellite internet to bridge digital divide and deliver e-governance services.',
    description_ne: 'सरकारले दुर्गम जिल्लाहरूलाई स्याटेलाइट इन्टरनेटमार्फत जोडेर डिजिटल खाडल पुर्दै ई-शासन सेवा पुर्याउने।',
    trust_level: 'partial',
    review_state: 'published',
    is_public: true,
    scope: 'national',
    baseline_progress: 8,
    baseline_status: 'in_progress',
  },
];

async function run() {
  console.log(`Inserting ${NEW_COMMITMENTS.length} new commitments into Supabase...\n`);

  // Check if any already exist
  const { data: existing } = await supabase
    .from('promises')
    .select('id')
    .in('id', NEW_COMMITMENTS.map(c => c.id));

  const existingIds = new Set((existing || []).map(e => e.id));

  if (existingIds.size > 0) {
    console.log(`Found ${existingIds.size} already in DB: [${[...existingIds].join(', ')}] — skipping those.\n`);
  }

  const toInsert = NEW_COMMITMENTS.filter(c => !existingIds.has(c.id));

  if (toInsert.length === 0) {
    console.log('All commitments already exist. Nothing to insert.');
    return;
  }

  const { data, error } = await supabase
    .from('promises')
    .insert(toInsert)
    .select('id, title, status, progress');

  if (error) {
    console.error('INSERT FAILED:', error.message);
    console.error('Details:', error.details);
    process.exit(1);
  }

  console.log(`Successfully inserted ${data.length} new commitments:\n`);
  for (const row of data) {
    console.log(`  #${row.id}  ${row.title}  [${row.status}, ${row.progress}%]`);
  }

  // Verify total count
  const { count } = await supabase
    .from('promises')
    .select('id', { count: 'exact', head: true });

  console.log(`\nTotal commitments in Supabase: ${count}`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
