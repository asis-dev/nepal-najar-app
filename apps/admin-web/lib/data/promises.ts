/**
 * Government Promises Data — based on RSP "बाचा पत्र 2082" (Citizen Contract)
 * Source: bachapatra.rspnepal.org — 100 Pillars of Policy Departure
 *
 * NOTE: This is mock/seed data. When the backend Promise entity is built,
 * this will be replaced by API calls. But the types and structure will remain.
 */

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type PromiseStatus = 'not_started' | 'in_progress' | 'delivered' | 'stalled';
export type TrustLevel = 'verified' | 'partial' | 'unverified' | 'disputed';
export type PromiseCategory =
  | 'Governance'
  | 'Anti-Corruption'
  | 'Infrastructure'
  | 'Transport'
  | 'Energy'
  | 'Technology'
  | 'Health'
  | 'Education'
  | 'Environment'
  | 'Economy'
  | 'Social';

export interface GovernmentPromise {
  id: string;
  slug: string;
  title: string;
  title_ne: string;
  category: PromiseCategory;
  category_ne: string;
  status: PromiseStatus;
  progress: number;
  linkedProjects: number;
  evidenceCount: number;
  lastUpdate: string;
  description: string;
  description_ne: string;
  trustLevel: TrustLevel;
  deadline?: string;
  /** Estimated budget in NPR (lakhs) */
  estimatedBudgetNPR?: number;
  /** Budget spent so far in NPR (lakhs) */
  spentNPR?: number;
  /** Funding source */
  fundingSource?: string;
  fundingSource_ne?: string;
}

export interface Deadline {
  id: string;
  label: string;
  label_ne: string;
  targetDate: string;
  type: 'legal' | 'policy' | 'budget' | 'milestone' | 'parliamentary';
  linkedPromiseIds: string[];
  description?: string;
  description_ne?: string;
}

export interface MockNewsArticle {
  id: string;
  headline: string;
  headline_ne: string;
  source_name: string;
  source_url: string;
  source_type: 'news' | 'government' | 'international' | 'social';
  published_at: string;
  excerpt: string;
  excerpt_ne: string;
  confidence: number;
  classification: 'confirms' | 'contradicts' | 'neutral';
  linkedPromiseIds: string[];
}

export interface TimelineEvent {
  date: string;
  title: string;
  title_ne: string;
  category: string;
  type: 'election' | 'ceremony' | 'governance' | 'policy' | 'finance' | 'milestone';
}

/* ═══════════════════════════════════════════════
   CATEGORY TRANSLATIONS
   ═══════════════════════════════════════════════ */

export const CATEGORY_NE: Record<PromiseCategory, string> = {
  Governance: 'सुशासन',
  'Anti-Corruption': 'भ्रष्टाचार निवारण',
  Infrastructure: 'पूर्वाधार',
  Transport: 'यातायात',
  Energy: 'ऊर्जा',
  Technology: 'प्रविधि',
  Health: 'स्वास्थ्य',
  Education: 'शिक्षा',
  Environment: 'वातावरण',
  Economy: 'अर्थतन्त्र',
  Social: 'सामाजिक',
};

/* ═══════════════════════════════════════════════
   30+ GOVERNMENT PROMISES
   Based on RSP "बाचा पत्र 2082" (Citizen Contract)
   ═══════════════════════════════════════════════ */

export const promises: GovernmentPromise[] = [
  // ── GOVERNANCE & CONSTITUTIONAL REFORM ──
  {
    id: '1',
    slug: 'directly-elected-executive',
    title: 'Directly Elected Executive System',
    title_ne: 'प्रत्यक्ष निर्वाचित कार्यकारी प्रणाली',
    category: 'Governance',
    category_ne: 'सुशासन',
    status: 'in_progress',
    progress: 15,
    linkedProjects: 0,
    evidenceCount: 3,
    lastUpdate: '2026-03-15',
    description: 'Prepare constitutional amendment discussion paper within 3 months for directly elected head of state',
    description_ne: 'प्रत्यक्ष निर्वाचित राज्य प्रमुखका लागि ३ महिनाभित्र संविधान संशोधन छलफल पत्र तयार गर्ने',
    trustLevel: 'unverified',
    deadline: '2026-07-01',
    estimatedBudgetNPR: 500,
    fundingSource: 'Federal Budget',
    fundingSource_ne: 'संघीय बजेट',
  },
  {
    id: '2',
    slug: 'limit-18-ministries',
    title: 'Limit Federal Ministries to 18',
    title_ne: 'संघीय मन्त्रालय १८ मा सीमित',
    category: 'Governance',
    category_ne: 'सुशासन',
    status: 'in_progress',
    progress: 25,
    linkedProjects: 0,
    evidenceCount: 5,
    lastUpdate: '2026-03-12',
    description: 'Reduce federal ministries to 18, eliminate duplication between federal, provincial, and local governments',
    description_ne: 'संघीय मन्त्रालय १८ मा घटाउने, संघ, प्रदेश र स्थानीय सरकारबीचको दोहोरोपन हटाउने',
    trustLevel: 'partial',
    estimatedBudgetNPR: 200,
    fundingSource: 'Administrative Budget',
    fundingSource_ne: 'प्रशासनिक बजेट',
  },
  {
    id: '3',
    slug: 'budget-60-percent-local',
    title: 'Allocate 60% Budget to Provincial & Local Governments',
    title_ne: 'बजेटको ६०% प्रदेश र स्थानीय सरकारलाई',
    category: 'Governance',
    category_ne: 'सुशासन',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 1,
    lastUpdate: '2026-03-10',
    description: 'Increase budget allocation to provincial and local governments from current 35% to 60%',
    description_ne: 'प्रदेश र स्थानीय सरकारलाई बजेट विनियोजन हालको ३५% बाट ६०% मा वृद्धि गर्ने',
    trustLevel: 'unverified',
    deadline: '2026-05-29',
    estimatedBudgetNPR: 0,
    fundingSource: 'Budget Restructuring',
    fundingSource_ne: 'बजेट पुनर्संरचना',
  },

  // ── ANTI-CORRUPTION ──
  {
    id: '4',
    slug: 'investigate-assets-since-1990',
    title: 'Investigate Assets of Public Officials Since 1990',
    title_ne: '१९९० देखि सार्वजनिक पदाधिकारीको सम्पत्ति अनुसन्धान',
    category: 'Anti-Corruption',
    category_ne: 'भ्रष्टाचार निवारण',
    status: 'in_progress',
    progress: 10,
    linkedProjects: 1,
    evidenceCount: 7,
    lastUpdate: '2026-03-14',
    description: 'Investigate assets of all public office holders since 2047 BS and nationalize illegally acquired assets',
    description_ne: '२०४७ सालदेखि सबै सार्वजनिक पदाधिकारीको सम्पत्ति अनुसन्धान गरी अवैध सम्पत्ति राष्ट्रियकरण गर्ने',
    trustLevel: 'partial',
    deadline: '2026-07-09',
    estimatedBudgetNPR: 5000,
    spentNPR: 200,
    fundingSource: 'Anti-Corruption Commission',
    fundingSource_ne: 'भ्रष्टाचार निवारण आयोग',
  },
  {
    id: '5',
    slug: 'mandatory-asset-disclosure',
    title: 'Mandatory Public Asset Disclosure',
    title_ne: 'अनिवार्य सार्वजनिक सम्पत्ति विवरण',
    category: 'Anti-Corruption',
    category_ne: 'भ्रष्टाचार निवारण',
    status: 'in_progress',
    progress: 30,
    linkedProjects: 0,
    evidenceCount: 4,
    lastUpdate: '2026-03-16',
    description: 'All public office holders must publicly disclose assets before assuming office',
    description_ne: 'सबै सार्वजनिक पदाधिकारीले पद ग्रहण गर्नुअघि सार्वजनिक रूपमा सम्पत्ति विवरण खुलाउनुपर्ने',
    trustLevel: 'verified',
    estimatedBudgetNPR: 300,
    spentNPR: 50,
    fundingSource: 'Federal Budget',
    fundingSource_ne: 'संघीय बजेट',
  },
  {
    id: '6',
    slug: '100-days-100-works',
    title: '100 Days, 100 Works Plan',
    title_ne: '१०० दिन, १०० काम योजना',
    category: 'Anti-Corruption',
    category_ne: 'भ्रष्टाचार निवारण',
    status: 'in_progress',
    progress: 18,
    linkedProjects: 5,
    evidenceCount: 12,
    lastUpdate: '2026-03-17',
    description: 'Complete 100 specific short-term tasks in the first 100 days including corruption checks',
    description_ne: 'पहिलो १०० दिनमा भ्रष्टाचार जाँच सहित १०० विशिष्ट अल्पकालीन कार्य सम्पन्न गर्ने',
    trustLevel: 'partial',
    deadline: '2026-07-09',
    estimatedBudgetNPR: 10000,
    spentNPR: 800,
    fundingSource: 'Multiple Sources',
    fundingSource_ne: 'विभिन्न स्रोतहरू',
  },
  {
    id: '7',
    slug: 'procurement-transparency',
    title: 'Public Procurement Transparency Portal',
    title_ne: 'सार्वजनिक खरिद पारदर्शिता पोर्टल',
    category: 'Anti-Corruption',
    category_ne: 'भ्रष्टाचार निवारण',
    status: 'not_started',
    progress: 0,
    linkedProjects: 1,
    evidenceCount: 2,
    lastUpdate: '2026-03-08',
    description: 'Open portal for all government procurement data, contracts, and spending',
    description_ne: 'सबै सरकारी खरिद तथ्याङ्क, सम्झौता र खर्चका लागि खुला पोर्टल',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 2000,
    fundingSource: 'Federal Budget + World Bank',
    fundingSource_ne: 'संघीय बजेट + विश्व बैंक',
  },

  // ── ECONOMY & JOBS ──
  {
    id: '8',
    slug: 'gdp-growth-7-percent',
    title: '7% Annual GDP Growth Target',
    title_ne: 'वार्षिक ७% जीडीपी वृद्धि लक्ष्य',
    category: 'Economy',
    category_ne: 'अर्थतन्त्र',
    status: 'in_progress',
    progress: 5,
    linkedProjects: 0,
    evidenceCount: 3,
    lastUpdate: '2026-03-10',
    description: 'Achieve 7% average annual GDP growth, targeting $100 billion GDP within 5 years',
    description_ne: '५ वर्षभित्र $१०० अर्ब जीडीपी लक्ष्य गरी औसत वार्षिक ७% जीडीपी वृद्धि हासिल गर्ने',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 0,
    fundingSource: 'National Economic Policy',
    fundingSource_ne: 'राष्ट्रिय आर्थिक नीति',
  },
  {
    id: '9',
    slug: 'create-500000-jobs',
    title: 'Create 500,000 Jobs',
    title_ne: '५ लाख रोजगारी सिर्जना',
    category: 'Economy',
    category_ne: 'अर्थतन्त्र',
    status: 'not_started',
    progress: 0,
    linkedProjects: 2,
    evidenceCount: 1,
    lastUpdate: '2026-03-10',
    description: 'Create 500,000 jobs through startups, entrepreneurship, foreign investment, and digital economy',
    description_ne: 'स्टार्टअप, उद्यमशीलता, विदेशी लगानी र डिजिटल अर्थतन्त्रमार्फत ५ लाख रोजगारी सिर्जना',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 50000,
    fundingSource: 'Public-Private Partnership',
    fundingSource_ne: 'सार्वजनिक-निजी साझेदारी',
  },
  {
    id: '10',
    slug: 'exports-30-billion',
    title: 'Raise Exports to $30 Billion',
    title_ne: 'निर्यात $३० अर्बमा पुर्याउने',
    category: 'Economy',
    category_ne: 'अर्थतन्त्र',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 2,
    lastUpdate: '2026-03-08',
    description: 'Raise exports to $30 billion within a decade, largely through IT services',
    description_ne: 'मुख्यतया सूचना प्रविधि सेवामार्फत एक दशकभित्र निर्यात $३० अर्बमा पुर्याउने',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 0,
    fundingSource: 'Trade Policy',
    fundingSource_ne: 'व्यापार नीति',
  },
  {
    id: '11',
    slug: 'tax-reform',
    title: 'Tax Reform — Reduce Citizen Burden',
    title_ne: 'कर सुधार — नागरिक भार कम गर्ने',
    category: 'Economy',
    category_ne: 'अर्थतन्त्र',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 1,
    lastUpdate: '2026-03-10',
    description: 'Adjust income tax for family expenses, reduce tax burden on middle class',
    description_ne: 'पारिवारिक खर्चका लागि आयकर समायोजन, मध्यम वर्गको कर भार कम गर्ने',
    trustLevel: 'unverified',
    deadline: '2026-05-29',
    estimatedBudgetNPR: 0,
    fundingSource: 'Ministry of Finance',
    fundingSource_ne: 'अर्थ मन्त्रालय',
  },

  // ── ENERGY & INFRASTRUCTURE ──
  {
    id: '12',
    slug: '30000-mw-electricity',
    title: 'Generate 30,000 MW Electricity in 10 Years',
    title_ne: '१० वर्षमा ३०,००० मेगावाट बिजुली उत्पादन',
    category: 'Energy',
    category_ne: 'ऊर्जा',
    status: 'in_progress',
    progress: 12,
    linkedProjects: 4,
    evidenceCount: 8,
    lastUpdate: '2026-03-15',
    description: 'Achieve 30,000 MW electricity generation and become energy exporter',
    description_ne: '३०,००० मेगावाट बिजुली उत्पादन हासिल गरी ऊर्जा निर्यातक बन्ने',
    trustLevel: 'partial',
    estimatedBudgetNPR: 5000000,
    spentNPR: 120000,
    fundingSource: 'Federal Budget + IPPs + Foreign Investment',
    fundingSource_ne: 'संघीय बजेट + आईपीपी + विदेशी लगानी',
  },
  {
    id: '13',
    slug: 'melamchi-water-supply',
    title: 'Complete Melamchi Water Supply',
    title_ne: 'मेलम्ची खानेपानी आयोजना सम्पन्न',
    category: 'Infrastructure',
    category_ne: 'पूर्वाधार',
    status: 'in_progress',
    progress: 65,
    linkedProjects: 2,
    evidenceCount: 15,
    lastUpdate: '2026-03-15',
    description: 'Deliver clean drinking water to Kathmandu Valley through the Melamchi tunnel',
    description_ne: 'मेलम्ची सुरुङमार्फत काठमाडौं उपत्यकामा सफा खानेपानी वितरण',
    trustLevel: 'verified',
    estimatedBudgetNPR: 350000,
    spentNPR: 280000,
    fundingSource: 'ADB + Government of Nepal',
    fundingSource_ne: 'एडीबी + नेपाल सरकार',
  },
  {
    id: '14',
    slug: 'national-pride-projects',
    title: 'Complete All National Pride Projects in 2 Years',
    title_ne: '२ वर्षमा सबै राष्ट्रिय गौरवका आयोजना सम्पन्न',
    category: 'Infrastructure',
    category_ne: 'पूर्वाधार',
    status: 'in_progress',
    progress: 35,
    linkedProjects: 8,
    evidenceCount: 20,
    lastUpdate: '2026-03-16',
    description: 'Complete all designated national pride projects within 2 years of government formation',
    description_ne: 'सरकार गठनको २ वर्षभित्र सबै तोकिएका राष्ट्रिय गौरवका आयोजना सम्पन्न गर्ने',
    trustLevel: 'partial',
    deadline: '2028-04-01',
    estimatedBudgetNPR: 8000000,
    spentNPR: 2500000,
    fundingSource: 'National Budget + Foreign Aid',
    fundingSource_ne: 'राष्ट्रिय बजेट + वैदेशिक सहायता',
  },
  {
    id: '15',
    slug: 'east-west-highway-4-lane',
    title: 'East-West Highway 4-Lane Expansion',
    title_ne: 'पूर्व-पश्चिम राजमार्ग ४ लेन विस्तार',
    category: 'Transport',
    category_ne: 'यातायात',
    status: 'in_progress',
    progress: 38,
    linkedProjects: 3,
    evidenceCount: 12,
    lastUpdate: '2026-03-10',
    description: 'Upgrade the entire East-West Highway (Mahendra Highway) to 4-lane divided highway',
    description_ne: 'सम्पूर्ण पूर्व-पश्चिम राजमार्ग (महेन्द्र राजमार्ग) लाई ४ लेन विभाजित राजमार्गमा स्तरोन्नति',
    trustLevel: 'partial',
    estimatedBudgetNPR: 2500000,
    spentNPR: 650000,
    fundingSource: 'Government + ADB + India EXIM Bank',
    fundingSource_ne: 'सरकार + एडीबी + भारत एक्जिम बैंक',
  },

  // ── TRANSPORT ──
  {
    id: '16',
    slug: 'east-west-electric-railway',
    title: 'East-West Electric Railway',
    title_ne: 'पूर्व-पश्चिम विद्युतीय रेलमार्ग',
    category: 'Transport',
    category_ne: 'यातायात',
    status: 'not_started',
    progress: 0,
    linkedProjects: 1,
    evidenceCount: 3,
    lastUpdate: '2026-03-08',
    description: 'Build an east-west electric railway line for passengers and goods transport',
    description_ne: 'यात्रु र मालवस्तु ढुवानीका लागि पूर्व-पश्चिम विद्युतीय रेलमार्ग निर्माण',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 15000000,
    fundingSource: 'Foreign Investment + Government',
    fundingSource_ne: 'विदेशी लगानी + सरकार',
  },
  {
    id: '17',
    slug: 'airport-modernization',
    title: 'Operationalize Bhairahawa & Pokhara Airports',
    title_ne: 'भैरहवा र पोखरा विमानस्थल सञ्चालन',
    category: 'Transport',
    category_ne: 'यातायात',
    status: 'in_progress',
    progress: 55,
    linkedProjects: 2,
    evidenceCount: 10,
    lastUpdate: '2026-03-14',
    description: 'Fully operationalize Bhairahawa (Gautam Buddha) and Pokhara international airports',
    description_ne: 'भैरहवा (गौतम बुद्ध) र पोखरा अन्तर्राष्ट्रिय विमानस्थल पूर्ण सञ्चालन',
    trustLevel: 'verified',
    estimatedBudgetNPR: 450000,
    spentNPR: 380000,
    fundingSource: 'Government of Nepal + Chinese Grant',
    fundingSource_ne: 'नेपाल सरकार + चिनियाँ अनुदान',
  },

  // ── TECHNOLOGY ──
  {
    id: '18',
    slug: 'online-not-queue',
    title: '"Online, Not Queue" — Digital Government Services',
    title_ne: '"अनलाइन, लाइन होइन" — डिजिटल सरकारी सेवा',
    category: 'Technology',
    category_ne: 'प्रविधि',
    status: 'in_progress',
    progress: 20,
    linkedProjects: 3,
    evidenceCount: 6,
    lastUpdate: '2026-03-15',
    description: 'Eliminate queues for all government services, end middlemen and brokers',
    description_ne: 'सबै सरकारी सेवामा लाइन हटाउने, बिचौलिया र दलालको अन्त्य गर्ने',
    trustLevel: 'partial',
    estimatedBudgetNPR: 25000,
    spentNPR: 2000,
    fundingSource: 'Federal IT Budget',
    fundingSource_ne: 'संघीय सूचना प्रविधि बजेट',
  },
  {
    id: '19',
    slug: 'digital-parks-7-provinces',
    title: 'Digital Parks in All 7 Provinces',
    title_ne: 'सातवटै प्रदेशमा डिजिटल पार्क',
    category: 'Technology',
    category_ne: 'प्रविधि',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 2,
    lastUpdate: '2026-03-08',
    description: 'Establish technology/digital parks in each province for IT industry growth',
    description_ne: 'सूचना प्रविधि उद्योग वृद्धिका लागि प्रत्येक प्रदेशमा प्रविधि/डिजिटल पार्क स्थापना',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 100000,
    fundingSource: 'PPP Model',
    fundingSource_ne: 'सार्वजनिक-निजी साझेदारी मोडल',
  },
  {
    id: '20',
    slug: 'it-strategic-industry',
    title: 'Declare IT as National Strategic Industry',
    title_ne: 'सूचना प्रविधिलाई राष्ट्रिय रणनीतिक उद्योग घोषणा',
    category: 'Technology',
    category_ne: 'प्रविधि',
    status: 'in_progress',
    progress: 15,
    linkedProjects: 1,
    evidenceCount: 4,
    lastUpdate: '2026-03-12',
    description: 'Declare IT strategic industry, create promotion board, allow IP-backed loans, 500,000 tech jobs target',
    description_ne: 'सूचना प्रविधिलाई रणनीतिक उद्योग घोषणा, प्रवर्धन बोर्ड गठन, बौद्धिक सम्पत्तिमा ऋण, ५ लाख प्रविधि रोजगारी लक्ष्य',
    trustLevel: 'partial',
    estimatedBudgetNPR: 15000,
    spentNPR: 500,
    fundingSource: 'Federal Budget + Private Sector',
    fundingSource_ne: 'संघीय बजेट + निजी क्षेत्र',
  },
  {
    id: '21',
    slug: 'crypto-regulation',
    title: 'Cryptocurrency Regulation & Pilot',
    title_ne: 'क्रिप्टोकरेन्सी नियमन र पाइलट',
    category: 'Technology',
    category_ne: 'प्रविधि',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 1,
    lastUpdate: '2026-03-08',
    description: 'Study global crypto regulations, craft national policy, launch pilot mining projects within 1 year',
    description_ne: 'विश्वव्यापी क्रिप्टो नियमन अध्ययन, राष्ट्रिय नीति तर्जुमा, १ वर्षभित्र पाइलट माइनिङ आयोजना सुरु',
    trustLevel: 'unverified',
    deadline: '2027-04-01',
    estimatedBudgetNPR: 1000,
    fundingSource: 'NRB + Ministry of Finance',
    fundingSource_ne: 'नेपाल राष्ट्र बैंक + अर्थ मन्त्रालय',
  },

  // ── HEALTH ──
  {
    id: '22',
    slug: 'universal-health-insurance',
    title: 'Universal Health Insurance — 100% Coverage',
    title_ne: 'विश्वव्यापी स्वास्थ्य बीमा — १००% कभरेज',
    category: 'Health',
    category_ne: 'स्वास्थ्य',
    status: 'in_progress',
    progress: 22,
    linkedProjects: 2,
    evidenceCount: 6,
    lastUpdate: '2026-03-14',
    description: '100% insured quality healthcare for all citizens through universal health insurance',
    description_ne: 'विश्वव्यापी स्वास्थ्य बीमामार्फत सबै नागरिकका लागि १००% बीमा गरिएको गुणस्तरीय स्वास्थ्य सेवा',
    trustLevel: 'partial',
    estimatedBudgetNPR: 200000,
    spentNPR: 35000,
    fundingSource: 'Health Insurance Board',
    fundingSource_ne: 'स्वास्थ्य बीमा बोर्ड',
  },
  {
    id: '23',
    slug: 'national-ambulance-service',
    title: 'Centralized National Ambulance Service',
    title_ne: 'केन्द्रीकृत राष्ट्रिय एम्बुलेन्स सेवा',
    category: 'Health',
    category_ne: 'स्वास्थ्य',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 1,
    lastUpdate: '2026-03-08',
    description: 'Establish a centralized, nationwide ambulance service reachable through single hotline',
    description_ne: 'एकल हटलाइनमार्फत पहुँचयोग्य केन्द्रीकृत, राष्ट्रव्यापी एम्बुलेन्स सेवा स्थापना',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 30000,
    fundingSource: 'Ministry of Health',
    fundingSource_ne: 'स्वास्थ्य मन्त्रालय',
  },

  // ── EDUCATION ──
  {
    id: '24',
    slug: 'free-education-3-children',
    title: 'Free Education for Up to 3 Children',
    title_ne: '३ सन्तानसम्म निःशुल्क शिक्षा',
    category: 'Education',
    category_ne: 'शिक्षा',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 2,
    lastUpdate: '2026-03-10',
    description: 'Free education through high school for up to 3 children per family',
    description_ne: 'प्रति परिवार ३ सन्तानसम्म माध्यमिक तहसम्म निःशुल्क शिक्षा',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 500000,
    fundingSource: 'Education Budget',
    fundingSource_ne: 'शिक्षा बजेट',
  },
  {
    id: '25',
    slug: 'skill-in-education',
    title: '"Skill in Education" National Expansion',
    title_ne: '"शिक्षामा सीप" राष्ट्रिय विस्तार',
    category: 'Education',
    category_ne: 'शिक्षा',
    status: 'in_progress',
    progress: 12,
    linkedProjects: 1,
    evidenceCount: 5,
    lastUpdate: '2026-03-13',
    description: 'Expand the successful Kathmandu "Skill in Education" program to all districts nationally',
    description_ne: 'काठमाडौंको सफल "शिक्षामा सीप" कार्यक्रम सबै जिल्लामा राष्ट्रिय रूपमा विस्तार गर्ने',
    trustLevel: 'verified',
    estimatedBudgetNPR: 80000,
    spentNPR: 5000,
    fundingSource: 'Education Ministry + UNICEF',
    fundingSource_ne: 'शिक्षा मन्त्रालय + युनिसेफ',
  },
  {
    id: '26',
    slug: 'zero-dropout-rate',
    title: 'Zero Dropout Rate — School Retention Program',
    title_ne: 'शून्य छुट दर — विद्यालय अवधारण कार्यक्रम',
    category: 'Education',
    category_ne: 'शिक्षा',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 1,
    lastUpdate: '2026-03-08',
    description: 'Achieve zero dropout through smart classrooms, labs, libraries, and retention programs',
    description_ne: 'स्मार्ट कक्षाकोठा, प्रयोगशाला, पुस्तकालय र अवधारण कार्यक्रममार्फत शून्य छुट दर हासिल',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 150000,
    fundingSource: 'Education Budget + World Bank',
    fundingSource_ne: 'शिक्षा बजेट + विश्व बैंक',
  },

  // ── ENVIRONMENT ──
  {
    id: '27',
    slug: 'clean-kathmandu-valley',
    title: 'Clean Kathmandu Valley Campaign',
    title_ne: 'स्वच्छ काठमाडौं उपत्यका अभियान',
    category: 'Environment',
    category_ne: 'वातावरण',
    status: 'in_progress',
    progress: 45,
    linkedProjects: 3,
    evidenceCount: 18,
    lastUpdate: '2026-03-17',
    description: 'Comprehensive waste management, river cleanup, and air quality improvement for Kathmandu Valley',
    description_ne: 'काठमाडौं उपत्यकाका लागि व्यापक फोहोर व्यवस्थापन, नदी सफाइ र वायु गुणस्तर सुधार',
    trustLevel: 'verified',
    estimatedBudgetNPR: 120000,
    spentNPR: 45000,
    fundingSource: 'KMC + Federal + JICA',
    fundingSource_ne: 'काठमाडौं महानगर + संघीय + जाइका',
  },
  {
    id: '28',
    slug: 'river-restoration',
    title: 'Bagmati & Major River Restoration',
    title_ne: 'बागमती र प्रमुख नदी पुनर्स्थापना',
    category: 'Environment',
    category_ne: 'वातावरण',
    status: 'in_progress',
    progress: 30,
    linkedProjects: 2,
    evidenceCount: 9,
    lastUpdate: '2026-03-14',
    description: 'Restore Bagmati and other major rivers through sewage treatment and encroachment removal',
    description_ne: 'ढल शोधन र अतिक्रमण हटाउनेमार्फत बागमती र अन्य प्रमुख नदी पुनर्स्थापना',
    trustLevel: 'partial',
    estimatedBudgetNPR: 250000,
    spentNPR: 60000,
    fundingSource: 'Bagmati Civilization Project + ADB',
    fundingSource_ne: 'बागमती सभ्यता आयोजना + एडीबी',
  },

  // ── SOCIAL ──
  {
    id: '29',
    slug: 'land-reform-commission',
    title: 'Land Reform — Commission in 100 Days',
    title_ne: 'भूमि सुधार — १०० दिनमा आयोग',
    category: 'Social',
    category_ne: 'सामाजिक',
    status: 'in_progress',
    progress: 10,
    linkedProjects: 0,
    evidenceCount: 4,
    lastUpdate: '2026-03-15',
    description: 'Establish land commission in 100 days, solve landless/squatter ownership in 1000 days, create Land Bank',
    description_ne: '१०० दिनमा भूमि आयोग स्थापना, १००० दिनमा भूमिहीन/सुकुम्बासी स्वामित्व समाधान, भूमि बैंक गठन',
    trustLevel: 'partial',
    deadline: '2026-07-09',
    estimatedBudgetNPR: 20000,
    spentNPR: 500,
    fundingSource: 'Ministry of Land Management',
    fundingSource_ne: 'भूमि व्यवस्थापन मन्त्रालय',
  },
  {
    id: '30',
    slug: 'overseas-voting-diaspora',
    title: 'Overseas Voting for Diaspora Nepalis',
    title_ne: 'प्रवासी नेपालीका लागि विदेशबाट मतदान',
    category: 'Governance',
    category_ne: 'सुशासन',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 2,
    lastUpdate: '2026-03-08',
    description: 'Enable overseas voting for Nepali citizens abroad and support for dual citizenship',
    description_ne: 'विदेशमा बसोबास गर्ने नेपाली नागरिकका लागि विदेशबाट मतदान र दोहोरो नागरिकताको समर्थन',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 5000,
    fundingSource: 'Election Commission',
    fundingSource_ne: 'निर्वाचन आयोग',
  },
  {
    id: '31',
    slug: 'cooperatives-crisis',
    title: 'Cooperatives Crisis Resolution — Return Depositors Money',
    title_ne: 'सहकारी संकट समाधान — निक्षेपकर्ताको पैसा फिर्ता',
    category: 'Economy',
    category_ne: 'अर्थतन्त्र',
    status: 'in_progress',
    progress: 8,
    linkedProjects: 0,
    evidenceCount: 6,
    lastUpdate: '2026-03-16',
    description: 'Resolve cooperatives crisis through legal settlement and return depositors money',
    description_ne: 'कानूनी समाधानमार्फत सहकारी संकट समाधान गरी निक्षेपकर्ताको पैसा फिर्ता गर्ने',
    trustLevel: 'partial',
    estimatedBudgetNPR: 0,
    fundingSource: 'Legal Recovery',
    fundingSource_ne: 'कानूनी उद्धार',
  },
  {
    id: '32',
    slug: 'double-tourism',
    title: 'Double Tourist Numbers & Spending',
    title_ne: 'पर्यटक संख्या र खर्च दोब्बर',
    category: 'Economy',
    category_ne: 'अर्थतन्त्र',
    status: 'not_started',
    progress: 0,
    linkedProjects: 1,
    evidenceCount: 3,
    lastUpdate: '2026-03-10',
    description: 'Double international tourist arrivals and per-tourist spending within 5 years',
    description_ne: '५ वर्षभित्र अन्तर्राष्ट्रिय पर्यटक आगमन र प्रति-पर्यटक खर्च दोब्बर गर्ने',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 50000,
    fundingSource: 'Tourism Ministry + NTB',
    fundingSource_ne: 'पर्यटन मन्त्रालय + नेपाल पर्यटन बोर्ड',
  },
  {
    id: '33',
    slug: 'dalit-apology',
    title: 'Official State Apology to Dalit Community',
    title_ne: 'दलित समुदायलाई आधिकारिक राज्य माफी',
    category: 'Social',
    category_ne: 'सामाजिक',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 1,
    lastUpdate: '2026-03-08',
    description: 'Issue official state apology to Dalit community for centuries of historical discrimination',
    description_ne: 'शताब्दियौंको ऐतिहासिक विभेदका लागि दलित समुदायलाई आधिकारिक राज्य माफी जारी गर्ने',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 0,
    fundingSource: 'N/A',
    fundingSource_ne: 'लागू नहुने',
  },
  {
    id: '34',
    slug: 'social-security-expansion',
    title: 'Social Security Expansion — Pension & Insurance',
    title_ne: 'सामाजिक सुरक्षा विस्तार — पेन्सन र बीमा',
    category: 'Social',
    category_ne: 'सामाजिक',
    status: 'not_started',
    progress: 0,
    linkedProjects: 0,
    evidenceCount: 2,
    lastUpdate: '2026-03-10',
    description: 'Expand social security with pension fund for athletes, subsidized first-home loans, elder care',
    description_ne: 'खेलाडीका लागि पेन्सन कोष, सहुलियत पहिलो घर ऋण, जेष्ठ नागरिक हेरचाहसहित सामाजिक सुरक्षा विस्तार',
    trustLevel: 'unverified',
    estimatedBudgetNPR: 100000,
    fundingSource: 'Social Security Fund',
    fundingSource_ne: 'सामाजिक सुरक्षा कोष',
  },
  {
    id: '35',
    slug: 'fast-track-citizenship',
    title: 'Fast-Track Citizenship & Passport Processing',
    title_ne: 'द्रुत नागरिकता र राहदानी प्रशोधन',
    category: 'Governance',
    category_ne: 'सुशासन',
    status: 'in_progress',
    progress: 40,
    linkedProjects: 1,
    evidenceCount: 8,
    lastUpdate: '2026-03-16',
    description: 'Eliminate passport and citizenship backlogs through digitization and process reform',
    description_ne: 'डिजिटलाइजेसन र प्रक्रिया सुधारमार्फत राहदानी र नागरिकताको ढिलाइ हटाउने',
    trustLevel: 'verified',
    estimatedBudgetNPR: 8000,
    spentNPR: 3000,
    fundingSource: 'Ministry of Home Affairs',
    fundingSource_ne: 'गृह मन्त्रालय',
  },
];

/* ═══════════════════════════════════════════════
   KEY DEADLINES
   ═══════════════════════════════════════════════ */

export const deadlines: Deadline[] = [
  {
    id: 'd1',
    label: 'First 100 Days Deadline',
    label_ne: 'पहिलो १०० दिनको सीमा',
    targetDate: '2026-07-09',
    type: 'milestone',
    linkedPromiseIds: ['6', '4', '29'],
    description: 'RSP "100 Days, 100 Works" plan expires',
    description_ne: 'रास्वपा "१०० दिन, १०० काम" योजनाको म्याद',
  },
  {
    id: 'd2',
    label: 'Annual Budget Presentation',
    label_ne: 'वार्षिक बजेट प्रस्तुति',
    targetDate: '2026-05-29',
    type: 'budget',
    linkedPromiseIds: ['3', '11', '8'],
    description: 'Constitutional deadline for FY 2083/84 budget (Jestha 15)',
    description_ne: 'आ.व. २०८३/८४ बजेटका लागि संवैधानिक सीमा (जेठ १५)',
  },
  {
    id: 'd3',
    label: 'Constitutional Amendment Paper',
    label_ne: 'संविधान संशोधन पत्र',
    targetDate: '2026-07-01',
    type: 'policy',
    linkedPromiseIds: ['1'],
    description: '3-month deadline for directly elected executive discussion paper',
    description_ne: 'प्रत्यक्ष निर्वाचित कार्यकारी छलफल पत्रको ३ महिने सीमा',
  },
  {
    id: 'd4',
    label: 'New Fiscal Year Begins',
    label_ne: 'नयाँ आर्थिक वर्ष सुरु',
    targetDate: '2026-07-16',
    type: 'budget',
    linkedPromiseIds: ['3', '11'],
    description: 'Start of Nepal fiscal year 2083/84 (Shrawan 1)',
    description_ne: 'नेपाल आर्थिक वर्ष २०८३/८४ सुरु (श्रावण १)',
  },
  {
    id: 'd5',
    label: 'Parliament First Session',
    label_ne: 'संसदको पहिलो अधिवेशन',
    targetDate: '2026-04-01',
    type: 'parliamentary',
    linkedPromiseIds: ['1', '2', '30'],
    description: 'Swearing in and first session of new parliament',
    description_ne: 'नयाँ संसदको शपथ ग्रहण र पहिलो अधिवेशन',
  },
  {
    id: 'd6',
    label: 'Land Commission Formation',
    label_ne: 'भूमि आयोग गठन',
    targetDate: '2026-07-09',
    type: 'policy',
    linkedPromiseIds: ['29'],
    description: 'RSP commitment to form land commission within 100 days',
    description_ne: '१०० दिनभित्र भूमि आयोग गठन गर्ने रास्वपा प्रतिबद्धता',
  },
  {
    id: 'd7',
    label: 'Anti-Corruption Bill',
    label_ne: 'भ्रष्टाचार निवारण विधेयक',
    targetDate: '2026-06-15',
    type: 'legal',
    linkedPromiseIds: ['4', '5', '7'],
    description: 'Deadline for tabling anti-corruption reform legislation',
    description_ne: 'भ्रष्टाचार निवारण सुधार कानून प्रस्तुत गर्ने सीमा',
  },
  {
    id: 'd8',
    label: 'Crypto Regulation Study',
    label_ne: 'क्रिप्टो नियमन अध्ययन',
    targetDate: '2027-04-01',
    type: 'policy',
    linkedPromiseIds: ['21'],
    description: '1-year deadline for cryptocurrency regulation and pilot mining',
    description_ne: 'क्रिप्टोकरेन्सी नियमन र पाइलट माइनिङको १ वर्षे सीमा',
  },
];

/* ═══════════════════════════════════════════════
   KEY EVENTS TIMELINE
   ═══════════════════════════════════════════════ */

export const timelineEvents: TimelineEvent[] = [
  {
    date: '2026-03-05',
    title: 'RSP wins 182 of 275 seats — historic mandate',
    title_ne: 'रास्वपाले २७५ मध्ये १८२ सिट जित्यो — ऐतिहासिक जनादेश',
    category: 'Election',
    type: 'election',
  },
  {
    date: '2026-03-07',
    title: 'Balen Shah elected from Jhapa-5 — highest votes in history',
    title_ne: 'बालेन शाह झापा-५ बाट निर्वाचित — इतिहासकै सर्वाधिक मत',
    category: 'Election',
    type: 'election',
  },
  {
    date: '2026-04-01',
    title: 'Inauguration as Prime Minister — government formation',
    title_ne: 'प्रधानमन्त्रीको रूपमा शपथ ग्रहण — सरकार गठन',
    category: 'Governance',
    type: 'ceremony',
  },
  {
    date: '2026-04-05',
    title: 'Cabinet Formation — 18 ministries (reduced from 25)',
    title_ne: 'मन्त्रिपरिषद गठन — १८ मन्त्रालय (२५ बाट घटाइएको)',
    category: 'Governance',
    type: 'governance',
  },
  {
    date: '2026-04-10',
    title: '"100 Days, 100 Works" plan officially launched',
    title_ne: '"१०० दिन, १०० काम" योजना आधिकारिक सुरु',
    category: 'Policy',
    type: 'policy',
  },
  {
    date: '2026-04-15',
    title: 'First National Development Council Meeting',
    title_ne: 'पहिलो राष्ट्रिय विकास परिषद बैठक',
    category: 'Policy',
    type: 'policy',
  },
  {
    date: '2026-05-01',
    title: 'Asset disclosure order — all officials must comply',
    title_ne: 'सम्पत्ति विवरण आदेश — सबै पदाधिकारीले पालना गर्नुपर्ने',
    category: 'Anti-Corruption',
    type: 'governance',
  },
  {
    date: '2026-05-29',
    title: 'Budget 2083/84 presented to Parliament',
    title_ne: 'बजेट २०८३/८४ संसदमा प्रस्तुत',
    category: 'Finance',
    type: 'finance',
  },
  {
    date: '2026-06-15',
    title: 'Anti-Corruption Commission Reform Bill tabled',
    title_ne: 'भ्रष्टाचार निवारण आयोग सुधार विधेयक पेश',
    category: 'Governance',
    type: 'governance',
  },
  {
    date: '2026-07-09',
    title: '100 Days Mark — progress report due',
    title_ne: '१०० दिनको सीमा — प्रगति प्रतिवेदन बुझाउनुपर्ने',
    category: 'Milestone',
    type: 'milestone',
  },
];

/* ═══════════════════════════════════════════════
   MOCK NEWS ARTICLES
   ═══════════════════════════════════════════════ */

export const mockNewsArticles: MockNewsArticle[] = [
  {
    id: 'n1',
    headline: 'PM Balen announces asset investigation of all public officials since 1990',
    headline_ne: 'प्रधानमन्त्री बालेनले १९९० देखिका सबै सार्वजनिक पदाधिकारीको सम्पत्ति अनुसन्धान घोषणा',
    source_name: 'Kathmandu Post',
    source_url: 'https://kathmandupost.com',
    source_type: 'news',
    published_at: '2026-03-16T10:00:00Z',
    excerpt: 'The Prime Minister signed an executive order directing the Anti-Corruption Commission to begin investigating assets of all public office holders from 2047 BS onwards.',
    excerpt_ne: 'प्रधानमन्त्रीले भ्रष्टाचार निवारण आयोगलाई २०४७ सालदेखिका सबै सार्वजनिक पदाधिकारीको सम्पत्ति अनुसन्धान सुरु गर्न कार्यकारी आदेशमा हस्ताक्षर गरे।',
    confidence: 0.95,
    classification: 'confirms',
    linkedPromiseIds: ['4', '5'],
  },
  {
    id: 'n2',
    headline: 'Melamchi water supply tunnel reaches 87% completion, delays expected',
    headline_ne: 'मेलम्ची खानेपानी सुरुङ ८७% सम्पन्न, ढिलाइ अपेक्षित',
    source_name: 'Online Khabar',
    source_url: 'https://www.onlinekhabar.com',
    source_type: 'news',
    published_at: '2026-03-15T14:30:00Z',
    excerpt: 'While the main tunnel work has progressed well, the distribution network within Kathmandu Valley faces land acquisition challenges.',
    excerpt_ne: 'मुख्य सुरुङको काम राम्रोसँग अगाडि बढेको भए पनि काठमाडौं उपत्यकाभित्रको वितरण सञ्जालले भूमि अधिग्रहणको चुनौती सामना गरिरहेको छ।',
    confidence: 0.88,
    classification: 'contradicts',
    linkedPromiseIds: ['13'],
  },
  {
    id: 'n3',
    headline: 'World Bank pledges $500M for Nepal digital transformation',
    headline_ne: 'विश्व बैंकले नेपालको डिजिटल रूपान्तरणका लागि $५०० मिलियन प्रतिज्ञा',
    source_name: 'MyRepublica',
    source_url: 'https://myrepublica.nagariknetwork.com',
    source_type: 'news',
    published_at: '2026-03-14T09:00:00Z',
    excerpt: 'The World Bank has announced a $500 million package to support Nepal\'s "Online, Not Queue" initiative and digital parks establishment.',
    excerpt_ne: 'विश्व बैंकले नेपालको "अनलाइन, लाइन होइन" पहल र डिजिटल पार्क स्थापनालाई समर्थन गर्न $५०० मिलियन प्याकेज घोषणा गरेको छ।',
    confidence: 0.92,
    classification: 'confirms',
    linkedPromiseIds: ['18', '19', '20'],
  },
  {
    id: 'n4',
    headline: 'Teachers union protests "Skill in Education" expansion plan',
    headline_ne: 'शिक्षक युनियनले "शिक्षामा सीप" विस्तार योजनाको विरोध गर्यो',
    source_name: 'Himalayan Times',
    source_url: 'https://thehimalayantimes.com',
    source_type: 'news',
    published_at: '2026-03-13T16:00:00Z',
    excerpt: 'All Nepal Teachers Organization staged protests in 45 districts claiming the Skill in Education program undermines traditional pedagogy.',
    excerpt_ne: 'अखिल नेपाल शिक्षक संगठनले शिक्षामा सीप कार्यक्रमले परम्परागत शिक्षा विधिलाई कमजोर बनाउँछ भन्दै ४५ जिल्लामा विरोध प्रदर्शन गर्यो।',
    confidence: 0.85,
    classification: 'contradicts',
    linkedPromiseIds: ['25'],
  },
  {
    id: 'n5',
    headline: 'NPC releases first quarterly development progress report',
    headline_ne: 'राष्ट्रिय योजना आयोगले पहिलो त्रैमासिक विकास प्रगति प्रतिवेदन जारी',
    source_name: 'Gorkhapatra',
    source_url: 'https://gorkhapatra.gov.np',
    source_type: 'government',
    published_at: '2026-03-12T08:00:00Z',
    excerpt: 'The National Planning Commission published its first quarterly review showing 35% of national pride projects are on track.',
    excerpt_ne: 'राष्ट्रिय योजना आयोगले ३५% राष्ट्रिय गौरवका आयोजना समयमा रहेको देखाउने पहिलो त्रैमासिक समीक्षा प्रकाशित गर्यो।',
    confidence: 0.97,
    classification: 'confirms',
    linkedPromiseIds: ['14'],
  },
  {
    id: 'n6',
    headline: 'East-West Highway expansion stalls in 3 districts due to land disputes',
    headline_ne: 'भूमि विवादका कारण ३ जिल्लामा पूर्व-पश्चिम राजमार्ग विस्तार रोकियो',
    source_name: 'Setopati',
    source_url: 'https://www.setopati.com',
    source_type: 'news',
    published_at: '2026-03-11T11:30:00Z',
    excerpt: 'Compensation disputes have halted the 4-lane expansion work in Bara, Parsa, and Rautahat districts.',
    excerpt_ne: 'क्षतिपूर्ति विवादले बारा, पर्सा र रौतहट जिल्लामा ४ लेन विस्तार कार्य रोकिएको छ।',
    confidence: 0.90,
    classification: 'contradicts',
    linkedPromiseIds: ['15'],
  },
  {
    id: 'n7',
    headline: 'UNDP Nepal supports universal health insurance rollout',
    headline_ne: 'युएनडीपी नेपालले विश्वव्यापी स्वास्थ्य बीमा सुरु गर्न समर्थन',
    source_name: 'UNDP Nepal',
    source_url: 'https://www.undp.org/nepal',
    source_type: 'international',
    published_at: '2026-03-10T07:00:00Z',
    excerpt: 'UNDP announced technical and financial support for Nepal\'s universal health insurance program targeting 100% coverage.',
    excerpt_ne: 'युएनडीपीले १००% कभरेज लक्षित नेपालको विश्वव्यापी स्वास्थ्य बीमा कार्यक्रमका लागि प्राविधिक र आर्थिक समर्थन घोषणा गर्यो।',
    confidence: 0.93,
    classification: 'confirms',
    linkedPromiseIds: ['22'],
  },
  {
    id: 'n8',
    headline: 'Bagmati river cleanup shows visible results — fish spotted for first time in decade',
    headline_ne: 'बागमती नदी सफाइले देखिने नतिजा दियो — एक दशकमा पहिलो पटक माछा देखियो',
    source_name: 'Nepal24Hours',
    source_url: 'https://nepal24hours.com',
    source_type: 'news',
    published_at: '2026-03-09T13:00:00Z',
    excerpt: 'Citizens report fish being spotted in the Bagmati near Pashupati for the first time since 2016, indicating improved water quality.',
    excerpt_ne: 'नागरिकहरूले २०१६ पछि पहिलो पटक पशुपति नजिक बागमतीमा माछा देखिएको रिपोर्ट गरे, जसले सुधारिएको पानीको गुणस्तर संकेत गर्छ।',
    confidence: 0.78,
    classification: 'confirms',
    linkedPromiseIds: ['27', '28'],
  },
  {
    id: 'n9',
    headline: 'Cabinet approves 18-ministry structure — 7 ministries to be merged',
    headline_ne: 'मन्त्रिपरिषदले १८ मन्त्रालय संरचना स्वीकृत गर्यो — ७ मन्त्रालय गाभिने',
    source_name: 'Ratopati',
    source_url: 'https://www.ratopati.com',
    source_type: 'news',
    published_at: '2026-03-08T15:00:00Z',
    excerpt: 'The cabinet has approved reducing federal ministries from 25 to 18, with mergers to take effect from next fiscal year.',
    excerpt_ne: 'मन्त्रिपरिषदले संघीय मन्त्रालय २५ बाट १८ मा घटाउने स्वीकृत गरेको छ, गाभिने प्रक्रिया अर्को आर्थिक वर्षदेखि लागू हुने।',
    confidence: 0.91,
    classification: 'confirms',
    linkedPromiseIds: ['2'],
  },
  {
    id: 'n10',
    headline: 'Cooperatives crisis — depositors stage nationwide protest demanding refunds',
    headline_ne: 'सहकारी संकट — निक्षेपकर्ताले फिर्ता माग गर्दै राष्ट्रव्यापी विरोध प्रदर्शन',
    source_name: 'Annapurna Post',
    source_url: 'https://annapurnapost.com',
    source_type: 'news',
    published_at: '2026-03-07T10:00:00Z',
    excerpt: 'Thousands of depositors from failed cooperatives staged protests in major cities demanding the government fulfill its promise to return their savings.',
    excerpt_ne: 'असफल सहकारीका हजारौं निक्षेपकर्ताले प्रमुख शहरहरूमा आफ्नो बचत फिर्ता गर्ने सरकारी वाचा पूरा गर्न माग गर्दै विरोध प्रदर्शन गरे।',
    confidence: 0.87,
    classification: 'neutral',
    linkedPromiseIds: ['31'],
  },
];

/* ═══════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════ */

/** NPR to USD conversion (approximate rate) */
export const NPR_TO_USD_RATE = 133.5;

/** Format NPR amount in lakh/crore notation */
export function formatNPR(lakhs: number): string {
  if (lakhs >= 100) {
    const crore = lakhs / 100;
    return `रु. ${crore.toFixed(crore % 1 === 0 ? 0 : 1)} करोड`;
  }
  return `रु. ${lakhs} लाख`;
}

/** Format NPR amount to USD equivalent */
export function formatNPRtoUSD(lakhs: number): string {
  const nprTotal = lakhs * 100000; // lakhs to actual
  const usd = nprTotal / NPR_TO_USD_RATE;
  if (usd >= 1000000000) return `$${(usd / 1000000000).toFixed(1)}B`;
  if (usd >= 1000000) return `$${(usd / 1000000).toFixed(1)}M`;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

/** Get promises by category */
export function getPromisesByCategory(category: PromiseCategory): GovernmentPromise[] {
  return promises.filter((p) => p.category === category);
}

/** Get promise by ID */
export function getPromiseById(id: string): GovernmentPromise | undefined {
  return promises.find((p) => p.id === id);
}

/** Get promise by slug */
export function getPromiseBySlug(slug: string): GovernmentPromise | undefined {
  return promises.find((p) => p.slug === slug);
}

/** Get news articles for a promise */
export function getNewsForPromise(promiseId: string): MockNewsArticle[] {
  return mockNewsArticles.filter((a) => a.linkedPromiseIds.includes(promiseId));
}

/** Compute overall stats */
export function computeStats() {
  const total = promises.length;
  const delivered = promises.filter((p) => p.status === 'delivered').length;
  const inProgress = promises.filter((p) => p.status === 'in_progress').length;
  const stalled = promises.filter((p) => p.status === 'stalled').length;
  const notStarted = promises.filter((p) => p.status === 'not_started').length;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const avgProgress = total > 0 ? Math.round(promises.reduce((sum, p) => sum + p.progress, 0) / total) : 0;

  return { total, delivered, inProgress, stalled, notStarted, deliveryRate, avgProgress };
}
