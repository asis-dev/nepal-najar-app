/**
 * Entity Extractor
 *
 * Extracts structured entities from signal text using regex patterns.
 * No AI calls — designed to be fast and cheap for every signal.
 */
import { getSupabase } from '@/lib/supabase/server';

export interface ExtractedEntities {
  people: string[];
  organizations: string[];
  locations: string[];
  amounts: string[];
  dates: string[];
  percentages: string[];
  commitmentKeywords: string[];
}

// ── Known entities ────────────────────────────────────────────────────────────

const KNOWN_POLITICIANS: string[] = [
  'Balen Shah',
  'Rabi Lamichhane',
  'Sher Bahadur Deuba',
  'KP Sharma Oli',
  'KP Oli',
  'Pushpa Kamal Dahal',
  'Prachanda',
  'Gagan Thapa',
  'Bishnu Paudel',
  'Narayan Kaji Shrestha',
  'Madhav Kumar Nepal',
  'Baburam Bhattarai',
  'Upendra Yadav',
  'Mahesh Basnet',
  'Ram Sahaya Yadav',
  'Prithvi Subba Gurung',
  'Birodh Khatiwada',
  'Shankar Pokharel',
  'Bal Krishna Khand',
  'Hridayesh Tripathi',
  'Rajendra Lingden',
  'Kamal Thapa',
  'Jeevan Ram Shrestha',
  'Pampha Bhusal',
  'Barsha Man Pun',
  'Pradeep Gyawali',
  'Manoj Pandey',
  'Minendra Rijal',
  'Ram Chandra Paudel',
  'Agni Sapkota',
  'Dev Raj Ghimire',
  'Hari Bahadur Chuman',
  'Yogesh Bhattarai',
  'Damodar Bhandari',
  'Nanda Bahadur Pun',
  'Janardan Sharma',
  'Top Bahadur Rayamajhi',
  'Ishwar Pokhrel',
  'Dhan Raj Gurung',
  'Surya Thapa',
  'Rekha Sharma',
  'Swarnim Wagle',
  'Harka Sampang',
  'Sunita Dangol',
  'Nabin Joshi',
  'Hikmat Karki',
  'Durga Bahadur Rawat',
  'Lal Babu Pandit',
  'Ganesh Man Singh',
  'Bijay Kumar Gachhadar',
];

const NEPALI_HONORIFICS = [
  'प्रधानमन्त्री',
  'मन्त्री',
  'सभापति',
  'अध्यक्ष',
  'उपाध्यक्ष',
  'महासचिव',
  'सचिव',
  'राष्ट्रपति',
  'उपराष्ट्रपति',
  'सभामुख',
  'प्रमुख',
  'मेयर',
];

const PARTY_NAMES_EN = [
  'RSP',
  'Rastriya Swatantra Party',
  'Nepali Congress',
  'CPN-UML',
  'CPN UML',
  'CPN-Maoist',
  'CPN Maoist',
  'RPP',
  'Rastriya Prajatantra Party',
  'JSP',
  'Janata Samajwadi Party',
  'Loktantrik Samajwadi Party',
  'Nagarik Unmukti Party',
  'Janamat Party',
  'CPN-Unified Socialist',
  'CPN Unified Socialist',
];

const PARTY_NAMES_NE = [
  'रास्वपा',
  'राष्ट्रिय स्वतन्त्र पार्टी',
  'कांग्रेस',
  'नेपाली कांग्रेस',
  'एमाले',
  'माओवादी',
  'राप्रपा',
  'जसपा',
  'लोसपा',
  'नागरिक उन्मुक्ति पार्टी',
  'जनमत पार्टी',
  'एकीकृत समाजवादी',
];

const GOVERNMENT_BODIES = [
  'NPC',
  'National Planning Commission',
  'NRB',
  'Nepal Rastra Bank',
  'CIAA',
  'Commission for the Investigation of Abuse of Authority',
  'CAAN',
  'Civil Aviation Authority of Nepal',
  'NEA',
  'Nepal Electricity Authority',
  'NTC',
  'Nepal Telecom',
  'ICIMOD',
  'Election Commission',
  'Supreme Court',
  'Office of the Prime Minister',
  'National Assembly',
  'House of Representatives',
  'Provincial Assembly',
  'TU',
  'Tribhuvan University',
];

const INTERNATIONAL_ORGS = [
  'World Bank',
  'IMF',
  'International Monetary Fund',
  'ADB',
  'Asian Development Bank',
  'UN',
  'United Nations',
  'WHO',
  'World Health Organization',
  'UNICEF',
  'UNDP',
  'USAID',
  'JICA',
  'DFID',
  'EU',
  'European Union',
  'MCC',
  'Millennium Challenge Corporation',
];

const PROVINCES = [
  'Koshi',
  'Koshi Province',
  'Madhesh',
  'Madhesh Province',
  'Bagmati',
  'Bagmati Province',
  'Gandaki',
  'Gandaki Province',
  'Lumbini',
  'Lumbini Province',
  'Karnali',
  'Karnali Province',
  'Sudurpashchim',
  'Sudurpashchim Province',
  'कोशी प्रदेश',
  'मधेश प्रदेश',
  'बागमती प्रदेश',
  'गण्डकी प्रदेश',
  'लुम्बिनी प्रदेश',
  'कर्णाली प्रदेश',
  'सुदूरपश्चिम प्रदेश',
];

const DISTRICTS = [
  'Taplejung', 'Panchthar', 'Ilam', 'Jhapa', 'Morang', 'Sunsari', 'Dhankuta',
  'Terhathum', 'Sankhuwasabha', 'Bhojpur', 'Solukhumbu', 'Okhaldhunga',
  'Khotang', 'Udayapur', 'Saptari', 'Siraha', 'Dhanusha', 'Mahottari',
  'Sarlahi', 'Sindhuli', 'Ramechhap', 'Dolakha', 'Sindhupalchok',
  'Kavrepalanchok', 'Lalitpur', 'Bhaktapur', 'Kathmandu', 'Nuwakot',
  'Rasuwa', 'Dhading', 'Makwanpur', 'Rautahat', 'Bara', 'Parsa',
  'Chitwan', 'Gorkha', 'Lamjung', 'Tanahun', 'Syangja', 'Kaski',
  'Manang', 'Mustang', 'Myagdi', 'Parbat', 'Baglung', 'Gulmi',
  'Palpa', 'Nawalparasi', 'Rupandehi', 'Kapilvastu', 'Arghakhanchi',
  'Pyuthan', 'Rolpa', 'Rukum', 'Salyan', 'Dang', 'Banke', 'Bardiya',
  'Surkhet', 'Dailekh', 'Jajarkot', 'Dolpa', 'Jumla', 'Kalikot',
  'Mugu', 'Humla', 'Bajura', 'Bajhang', 'Achham', 'Doti', 'Kailali',
  'Kanchanpur', 'Dadeldhura', 'Baitadi', 'Darchula',
];

const MAJOR_CITIES = [
  'Kathmandu', 'Pokhara', 'Biratnagar', 'Birgunj', 'Dharan', 'Butwal',
  'Nepalgunj', 'Bharatpur', 'Dhangadhi', 'Itahari', 'Janakpur',
  'Hetauda', 'Tulsipur', 'Ghorahi', 'Damak', 'Bhadrapur', 'Lahan',
  'Rajbiraj', 'Gaur', 'Siddharthanagar', 'Mechinagar',
  'काठमाडौं', 'पोखरा', 'विराटनगर', 'वीरगञ्ज', 'धरान', 'बुटवल',
  'नेपालगञ्ज', 'भरतपुर', 'धनगढी', 'जनकपुर',
];

const LANDMARKS = [
  'Melamchi', 'Melamchi Water', 'Pokhara Airport', 'Gautam Buddha Airport',
  'Tribhuvan Airport', 'Kathmandu Valley', 'Lumbini', 'Sagarmatha',
  'Nijgadh', 'Nijgadh Airport', 'Nagdhunga Tunnel', 'Fast Track',
  'Kathmandu-Terai Fast Track', 'Upper Tamakoshi', 'Arun III',
  'Budhigandaki', 'Bheri Babai', 'Sikta Irrigation', 'Rani Jamara',
];

// ── Commitment keyword sets ──────────────────────────────────────────────────

const COMMITMENT_KEYWORDS: Record<string, string[]> = {
  infrastructure: [
    'road', 'bridge', 'airport', 'highway', 'tunnel', 'expressway',
    'railway', 'construction', 'infrastructure',
    'सडक', 'पुल', 'विमानस्थल', 'राजमार्ग', 'सुरुङ',
  ],
  health: [
    'hospital', 'health post', 'health center', 'medicine', 'vaccine',
    'healthcare', 'ambulance', 'doctor', 'nurse',
    'अस्पताल', 'स्वास्थ्य चौकी', 'औषधि', 'खोप',
  ],
  education: [
    'school', 'university', 'scholarship', 'college', 'teacher',
    'curriculum', 'education', 'student', 'literacy',
    'विद्यालय', 'विश्वविद्यालय', 'छात्रवृत्ति', 'शिक्षा',
  ],
  budget: [
    'budget', 'allocation', 'spending', 'fiscal', 'revenue', 'tax',
    'expenditure', 'appropriation',
    'बजेट', 'विनियोजन', 'खर्च', 'राजस्व', 'कर',
  ],
  anticorruption: [
    'CIAA', 'corruption', 'investigation', 'transparency', 'accountability',
    'audit', 'scam', 'embezzlement', 'bribery',
    'भ्रष्टाचार', 'अख्तियार', 'छानबिन', 'पारदर्शिता',
  ],
  energy: [
    'hydropower', 'electricity', 'solar', 'energy', 'power plant',
    'megawatt', 'MW', 'dam', 'transmission line',
    'जलविद्युत', 'विद्युत', 'ऊर्जा', 'बाँध',
  ],
  water: [
    'drinking water', 'water supply', 'irrigation', 'sanitation', 'sewer',
    'खानेपानी', 'सिँचाइ', 'पानी',
  ],
  tourism: [
    'tourism', 'tourist', 'visit nepal', 'trekking', 'mountaineering',
    'पर्यटन', 'पर्यटक',
  ],
  agriculture: [
    'agriculture', 'farming', 'crop', 'fertilizer', 'harvest',
    'food security', 'irrigation',
    'कृषि', 'किसान', 'खेती', 'मल', 'खाद्य',
  ],
  governance: [
    'federalism', 'local government', 'municipality', 'province',
    'decentralization', 'election', 'constitution',
    'संघीयता', 'स्थानीय सरकार', 'नगरपालिका', 'निर्वाचन', 'संविधान',
  ],
  employment: [
    'employment', 'job', 'unemployment', 'foreign employment', 'labor',
    'minimum wage', 'migration',
    'रोजगारी', 'बेरोजगारी', 'वैदेशिक रोजगार', 'श्रम',
  ],
  technology: [
    'digital', 'internet', 'broadband', 'e-governance', 'IT', 'fiber optic',
    'डिजिटल', 'इन्टरनेट', 'ई-शासन',
  ],
};

// ── Extraction functions ─────────────────────────────────────────────────────

function extractPeople(text: string): string[] {
  const people = new Set<string>();

  // Match known politicians
  for (const name of KNOWN_POLITICIANS) {
    if (text.includes(name)) {
      people.add(name);
    }
  }

  // Match Nepali honorifics followed by names
  for (const honorific of NEPALI_HONORIFICS) {
    const regex = new RegExp(`${honorific}\\s+([\\u0900-\\u097F\\s]+?)(?=[,।\\.]|$)`, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim();
      if (name.length > 2 && name.length < 60) {
        people.add(`${honorific} ${name}`);
      }
    }
  }

  // Match English capitalized name patterns (2-4 words)
  const namePattern = /\b([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|[A-Z]\.?))+)\b/g;
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    const words = candidate.split(/\s+/);
    // Skip if it looks like a location, org, or is too long
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      !MAJOR_CITIES.includes(candidate) &&
      !DISTRICTS.includes(candidate) &&
      !LANDMARKS.some((l) => candidate.includes(l))
    ) {
      people.add(candidate);
    }
  }

  return [...people].slice(0, 30);
}

function extractOrganizations(text: string): string[] {
  const orgs = new Set<string>();

  const allOrgs = [
    ...PARTY_NAMES_EN,
    ...PARTY_NAMES_NE,
    ...GOVERNMENT_BODIES,
    ...INTERNATIONAL_ORGS,
  ];

  for (const org of allOrgs) {
    // Use word-boundary-aware matching for short names (avoid false positives)
    if (org.length <= 4) {
      const regex = new RegExp(`\\b${org}\\b`, 'g');
      if (regex.test(text)) orgs.add(org);
    } else {
      if (text.includes(org)) orgs.add(org);
    }
  }

  // Match "Ministry of ..." pattern
  const ministryEn = /\bMinistry of [A-Z][a-zA-Z\s,]+?(?=\.|,|\band\b|\bin\b|\bhas\b|\bwill\b|\bto\b|$)/gi;
  let match;
  while ((match = ministryEn.exec(text)) !== null) {
    const ministry = match[0].trim().replace(/[,.]$/, '').trim();
    if (ministry.length < 80) orgs.add(ministry);
  }

  // Match "...मन्त्रालय" pattern (Nepali ministries)
  const ministryNe = /[\u0900-\u097F\s]+मन्त्रालय/g;
  while ((match = ministryNe.exec(text)) !== null) {
    const ministry = match[0].trim();
    if (ministry.length > 5 && ministry.length < 80) orgs.add(ministry);
  }

  return [...orgs].slice(0, 30);
}

function extractLocations(text: string): string[] {
  const locations = new Set<string>();

  const allLocations = [...PROVINCES, ...DISTRICTS, ...MAJOR_CITIES, ...LANDMARKS];

  for (const loc of allLocations) {
    if (loc.length <= 3) continue; // Skip very short names to avoid false positives
    if (text.includes(loc)) {
      locations.add(loc);
    }
  }

  return [...locations].slice(0, 30);
}

function extractAmounts(text: string): string[] {
  const amounts = new Set<string>();

  const patterns = [
    /Rs\.?\s*[\d,]+(?:\.\d+)?\s*(?:billion|million|crore|lakh|arab)?/gi,
    /NPR\s*[\d,]+(?:\.\d+)?\s*(?:billion|million|crore|lakh|arab)?/gi,
    /\$[\d,]+(?:\.\d+)?\s*(?:billion|million|crore|lakh)?/gi,
    /रु\.?\s*[\d,]+(?:\.\d+)?\s*(?:अर्ब|करोड|लाख)?/g,
    /[\d,]+(?:\.\d+)?\s*(?:billion|million|crore|lakh|arab)\b/gi,
    /[\d,]+(?:\.\d+)?\s*(?:अर्ब|करोड|लाख)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amount = match[0].trim();
      if (amount.length > 1) amounts.add(amount);
    }
  }

  return [...amounts].slice(0, 20);
}

function extractDates(text: string): string[] {
  const dates = new Set<string>();

  const patterns = [
    // English: "March 24, 2026", "March 24"
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s*\d{4})?/gi,
    // ISO: "2026-03-24"
    /\b\d{4}-\d{2}-\d{2}\b/g,
    // Numeric: "03/24/2026", "24/03/2026"
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    // Nepali month names
    /(?:बैशाख|जेठ|असार|श्रावण|भदौ|असोज|कार्तिक|मंसिर|पुष|माघ|फागुन|चैत्र)\s*[\d०-९]+/g,
    // Nepali year + month: "२०८२ चैत्र"
    /[२०-९]+\s*(?:बैशाख|जेठ|असार|श्रावण|भदौ|असोज|कार्तिक|मंसिर|पुष|माघ|फागुन|चैत्र)/g,
    // Relative dates
    /\b(?:yesterday|today|last week|last month|this week|this month|next week|next month)\b/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dates.add(match[0].trim());
    }
  }

  return [...dates].slice(0, 20);
}

function extractPercentages(text: string): string[] {
  const percentages = new Set<string>();

  const patterns = [
    /\d+(?:\.\d+)?%/g,
    /\d+(?:\.\d+)?\s*percent\b/gi,
    /\d+(?:\.\d+)?\s*प्रतिशत/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      percentages.add(match[0].trim());
    }
  }

  return [...percentages].slice(0, 20);
}

function extractCommitmentKeywords(text: string): string[] {
  const matched = new Set<string>();
  const lowerText = text.toLowerCase();

  for (const [sector, keywords] of Object.entries(COMMITMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      // Nepali keywords are case-sensitive (no toLowerCase)
      const isNepali = /[\u0900-\u097F]/.test(keyword);
      if (isNepali) {
        if (text.includes(keyword)) {
          matched.add(`${sector}:${keyword}`);
        }
      } else {
        if (lowerText.includes(keyword.toLowerCase())) {
          matched.add(`${sector}:${keyword}`);
        }
      }
    }
  }

  return [...matched].slice(0, 40);
}

// ── Main export ──────────────────────────────────────────────────────────────

export function extractEntities(text: string): ExtractedEntities {
  return {
    people: extractPeople(text),
    organizations: extractOrganizations(text),
    locations: extractLocations(text),
    amounts: extractAmounts(text),
    dates: extractDates(text),
    percentages: extractPercentages(text),
    commitmentKeywords: extractCommitmentKeywords(text),
  };
}

export async function extractAndStoreEntities(
  signalId: string,
  text: string,
): Promise<void> {
  const entities = extractEntities(text);
  const supabase = getSupabase();

  const { error } = await supabase
    .from('intelligence_signals')
    .update({
      extracted_data: entities,
    })
    .eq('id', signalId);

  if (error) {
    console.warn(
      `[EntityExtractor] Failed to store entities for ${signalId}: ${error.message}`,
    );
  }
}
