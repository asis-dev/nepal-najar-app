/**
 * Promise keyword matcher — maps scraped articles to government promises.
 * Expanded with 15-20 keywords per promise including Nepali terms,
 * department names, project names, and abbreviations.
 */

/** Keywords for each promise (EN + NE + proper nouns), used for article matching */
const PROMISE_KEYWORDS: Record<string, string[]> = {
  '1': [
    'directly elected', 'executive system', 'constitutional amendment', 'head of state',
    'presidential system', 'executive prime minister', 'governance restructuring',
    'constitution reform', 'sambidhaan sansodhan', 'prajatantrik',
    'प्रत्यक्ष निर्वाचित', 'कार्यकारी प्रणाली', 'संविधान संशोधन',
    'राज्य प्रमुख', 'law commission', 'कानून आयोग',
  ],
  '2': [
    '18 ministries', 'ministry limit', 'ministry reduction', 'reduce ministries',
    'ministry restructuring', 'cabinet restructuring', 'ministry merger',
    'government downsizing', 'bureaucratic reform', 'ministry consolidation',
    'administrative reform', 'cabinet size', 'ministry rationalization',
    'मन्त्रालय १८', 'मन्त्रालय सीमित', 'मन्त्रालय घटाउ', 'मन्त्रालय पुनर्संरचना',
  ],
  '3': [
    '60% budget', 'budget allocation', 'provincial budget', 'local government budget',
    'fiscal federalism', 'fiscal transfer', 'revenue sharing', 'red book',
    'intergovernmental fiscal', 'provincial grant', 'equalization grant',
    'conditional grant', 'unconditional grant', 'FCGO', 'financial comptroller',
    'बजेटको ६०%', 'प्रदेश बजेट', 'स्थानीय सरकार बजेट', 'राजस्व बाँडफाँड',
    'लाल किताब', 'अनुदान',
  ],
  '4': [
    'asset investigation', 'ciaa', 'corruption investigation', 'illegally acquired',
    'akhtiyar', 'corruption probe', 'wealth investigation', 'prosecution corruption',
    'integrity commission', 'special court', 'asset forfeiture', 'corruption case',
    'सम्पत्ति अनुसन्धान', 'अख्तियार', 'भ्रष्टाचार अनुसन्धान', 'विशेष अदालत',
    'अख्तियार दुरुपयोग', 'भ्रष्टाचार मुद्दा',
  ],
  '5': [
    'asset disclosure', 'property declaration', 'mandatory disclosure',
    'financial disclosure', 'wealth declaration', 'property filing',
    'asset registration', 'conflict of interest', 'transparency declaration',
    'सम्पत्ति विवरण', 'सम्पत्ति खुलाउ', 'सम्पत्ति प्रकाशन',
  ],
  '6': [
    '100 days', '100 works', 'first 100 days', 'hundred days',
    '100 day program', '100-day', 'quick win', 'immediate delivery',
    '१०० दिन', '१०० काम', 'सय दिन', 'सय कार्यक्रम',
    'पहिलो सय दिन', 'सय दिनको उपलब्धि',
  ],
  '7': [
    'procurement transparency', 'procurement portal', 'public procurement',
    'ppmo', 'e-procurement', 'bolpatra', 'e-bidding', 'procurement monitoring',
    'tender transparency', 'government tender', 'procurement reform',
    'contract disclosure', 'bid evaluation',
    'खरिद पारदर्शिता', 'सार्वजनिक खरिद', 'बोलपत्र', 'ई-खरिद',
  ],
  '8': [
    'gdp growth', '7% growth', 'economic growth', 'gdp target',
    'gross domestic product', 'national income', 'economic expansion',
    'cbs gdp', 'national accounts', 'economic survey', 'real gdp',
    'per capita income', 'economic indicator', 'growth rate',
    'जीडीपी वृद्धि', '७% वृद्धि', 'आर्थिक वृद्धि', 'आर्थिक सर्वेक्षण',
    'कुल गार्हस्थ्य उत्पादन',
  ],
  '9': [
    '500,000 jobs', 'job creation', 'employment generation', 'startup jobs',
    'employment', 'labor force survey', 'ssf enrollment', 'business registration',
    'company registration', 'formal employment', 'youth employment',
    'self employment', 'rojgar guarantee', 'unemployment',
    '५ लाख रोजगारी', 'रोजगारी सिर्जना', 'रोजगार ग्यारेन्टी', 'बेरोजगारी',
  ],
  '10': [
    'exports', 'export target', '$30 billion', 'it exports',
    'export growth', 'trade promotion', 'tepc', 'export statistics',
    'customs export', 'export earnings', 'trade deficit',
    'export diversification', 'merchandise exports', 'service exports',
    'निर्यात', '$३० अर्ब', 'व्यापार प्रवर्धन', 'निर्यात वृद्धि',
  ],
  '11': [
    'tax reform', 'income tax', 'tax burden', 'tax adjustment',
    'ird', 'inland revenue', 'revenue collection', 'tax policy',
    'fiscal reform', 'vat reform', 'tax exemption', 'income tax act',
    'tax bracket', 'revenue mobilization', 'digital tax',
    'कर सुधार', 'आयकर', 'कर भार', 'राजस्व संकलन', 'आन्तरिक राजस्व',
  ],
  '12': [
    '30,000 mw', 'electricity generation', 'hydropower', 'energy export',
    'nea', 'nepal electricity authority', 'doed', 'installed capacity',
    'power generation', 'power purchase agreement', 'ppa', 'transmission line',
    'national grid', 'solar energy', 'renewable energy', 'megawatt',
    '३०,००० मेगावाट', 'बिजुली उत्पादन', 'जलविद्युत', 'ऊर्जा निर्यात',
  ],
  '13': [
    'melamchi', 'water supply', 'drinking water', 'kathmandu water',
    'kukl', 'water treatment', 'water distribution', 'water pipeline',
    'bulk water supply', 'sundarijal', 'helambu', 'melamchi tunnel',
    'melamchi phase', 'liters per day',
    'मेलम्ची', 'खानेपानी', 'पानी वितरण', 'मेलम्ची सुरुङ',
  ],
  '14': [
    'national pride', 'pride project', 'national pride project',
    'npc national pride', 'mega project', 'national flagship',
    'strategic project', 'national priority', 'pride project completion',
    'राष्ट्रिय गौरव', 'गौरवका आयोजना', 'राष्ट्रिय आयोजना',
  ],
  '15': [
    'east-west highway', 'mahendra highway', '4 lane', 'four lane highway',
    'highway widening', 'highway expansion', 'department of roads', 'dor',
    'highway km', 'road widening', 'highway contract', 'highway section',
    'national highway', 'highway four lane',
    'पूर्व-पश्चिम राजमार्ग', 'महेन्द्र राजमार्ग', '४ लेन',
    'राजमार्ग चौडीकरण', 'सडक विभाग',
  ],
  '16': [
    'electric railway', 'railway', 'rail line', 'train',
    'railway project', 'railway dpr', 'department of railways',
    'mechi mahakali railway', 'railway alignment', 'rail network',
    'railway construction', 'mass transit', 'railway feasibility',
    'विद्युतीय रेलमार्ग', 'रेलमार्ग', 'रेल आयोजना',
  ],
  '17': [
    'bhairahawa airport', 'pokhara airport', 'gautam buddha airport', 'airport',
    'gbia', 'pokhara international', 'caan', 'civil aviation',
    'international flights', 'airport operation', 'airport inauguration',
    'airline route', 'airport terminal', 'runway',
    'भैरहवा विमानस्थल', 'पोखरा विमानस्थल', 'गौतम बुद्ध विमानस्थल',
    'नागरिक उड्डयन',
  ],
  '18': [
    'online not queue', 'digital government', 'digital service', 'e-government',
    'nagarik app', 'e-service', 'government digitization', 'nitc',
    'digital transformation', 'citizen portal', 'online government',
    'smart governance', 'digital public service', 'mocit',
    'अनलाइन लाइन होइन', 'डिजिटल सरकार', 'ई-सरकार', 'नागरिक एप',
  ],
  '19': [
    'digital park', 'tech park', 'technology park', 'it park',
    'digital hub', 'it zone', 'technology zone', 'software park',
    'bpo park', 'it park construction', 'technology center',
    'डिजिटल पार्क', 'प्रविधि पार्क', 'आईटी पार्क',
  ],
  '20': [
    'it strategic', 'strategic industry', 'it promotion', 'tech industry',
    'it board', 'technology sector', 'bpo industry', 'it export',
    'digital economy', 'it startup', 'outsourcing nepal', 'innovation policy',
    'it sector growth', 'technology industry',
    'सूचना प्रविधि रणनीतिक', 'रणनीतिक उद्योग', 'डिजिटल अर्थतन्त्र',
  ],
  '21': [
    'cryptocurrency', 'crypto regulation', 'crypto mining', 'bitcoin',
    'nrb crypto', 'digital currency', 'virtual currency', 'blockchain',
    'crypto study committee', 'crypto policy', 'digital asset',
    'cbdc', 'fintech regulation', 'virtual asset',
    'क्रिप्टोकरेन्सी', 'क्रिप्टो नियमन', 'डिजिटल मुद्रा', 'ब्लकचेन',
  ],
  '22': [
    'universal health', 'health insurance', 'health coverage',
    'hib', 'health insurance board', 'insurance enrollment',
    'social health insurance', 'uhc', 'health card', 'insurance beneficiary',
    'health insurance premium', 'insurance claim',
    'विश्वव्यापी स्वास्थ्य', 'स्वास्थ्य बीमा', 'बीमा दर्ता', 'स्वास्थ्य कार्ड',
  ],
  '23': [
    'ambulance service', 'national ambulance', 'emergency ambulance',
    '102 ambulance', 'ambulance hotline', 'emergency medical',
    'pre-hospital care', 'ambulance deployment', 'emergency response',
    'paramedic service', 'ambulance fleet',
    'एम्बुलेन्स सेवा', 'राष्ट्रिय एम्बुलेन्स', 'आकस्मिक सेवा',
  ],
  '24': [
    'free education', '3 children education', 'free schooling',
    'education subsidy', 'school fee waiver', 'education policy',
    'compulsory free education', 'government school', 'education grant',
    'education access', 'flash report education',
    'निःशुल्क शिक्षा', '३ सन्तान', 'शिक्षा नीति', 'सरकारी विद्यालय',
  ],
  '25': [
    'skill in education', 'vocational training', 'skill training',
    'tvet', 'ctevt', 'technical education', 'skill development',
    'technical school', 'diploma program', 'apprenticeship',
    'workforce skill', 'industry skill gap',
    'शिक्षामा सीप', 'व्यावसायिक तालिम', 'प्राविधिक शिक्षा', 'सीप विकास',
  ],
  '26': [
    'zero dropout', 'dropout rate', 'school retention', 'smart classroom',
    'student retention', 'school completion', 'dropout reduction',
    'flash report', 'school attendance', 'dropout statistics',
    'out of school children', 'dropout prevention',
    'शून्य छुट', 'छुट दर', 'स्मार्ट कक्षाकोठा', 'विद्यालय उपस्थिति',
  ],
  '27': [
    'clean kathmandu', 'waste management', 'air quality', 'kathmandu pollution',
    'aqi kathmandu', 'solid waste', 'sisdole', 'banchare danda',
    'air pollution', 'municipal waste', 'recycling', 'landfill',
    'valley cleanup', 'pollution control',
    'स्वच्छ काठमाडौं', 'फोहोर व्यवस्थापन', 'वायु गुणस्तर', 'वायु प्रदूषण',
  ],
  '28': [
    'bagmati', 'river restoration', 'river cleanup', 'sewage treatment',
    'bagmati civilization', 'hpcidbc', 'river water quality', 'bod cod',
    'river encroachment', 'bagmati corridor', 'sewage plant',
    'river rejuvenation', 'bagmati action plan',
    'बागमती', 'नदी पुनर्स्थापना', 'ढल शोधन', 'बागमती सभ्यता',
  ],
  '29': [
    'land reform', 'land commission', 'landless', 'squatter', 'land bank',
    'land distribution', 'land ceiling', 'land rights', 'mohi rights',
    'land redistribution', 'dual ownership', 'guthi land', 'sukumbasi',
    'भूमि सुधार', 'भूमि आयोग', 'भूमिहीन', 'सुकुम्बासी', 'भूमि अधिकार',
  ],
  '30': [
    'overseas voting', 'diaspora voting', 'dual citizenship', 'nrn voting',
    'voting abroad', 'absentee ballot', 'migrant voting', 'election commission',
    'overseas voter registration', 'embassy voting', 'foreign employment voting',
    'विदेशबाट मतदान', 'प्रवासी मतदान', 'दोहोरो नागरिकता', 'निर्वाचन आयोग',
  ],
  '31': [
    'cooperatives crisis', 'cooperatives depositor', 'cooperative fraud',
    'depositor refund', 'cooperative investigation', 'cooperative regulation',
    'savings fraud', 'cooperative restructuring', 'cooperative liquidation',
    'depositor protection', 'department of cooperatives',
    'सहकारी संकट', 'निक्षेपकर्ता', 'सहकारी धोखाधडी', 'सहकारी नियमन',
  ],
  '32': [
    'tourism', 'tourist numbers', 'tourist spending', 'visit nepal',
    'ntb', 'nepal tourism board', 'tourist arrivals', 'tourism revenue',
    'mountaineering permit', 'hotel occupancy', 'tourist visa',
    'tourism growth', 'foreign tourist', 'visitor statistics', 'tourist',
    'पर्यटक', 'पर्यटन', 'पर्यटक आगमन', 'पर्यटन राजस्व',
  ],
  '33': [
    'dalit apology', 'dalit commission', 'national dalit commission',
    'dalit rights', 'caste discrimination', 'untouchability',
    'dalit empowerment', 'dalit dignity', 'social inclusion',
    'caste atrocity', 'anti-discrimination', 'dalit justice',
    'दलित', 'जात भेदभाव', 'छुवाछुत', 'दलित आयोग', 'दलित अधिकार',
  ],
  '34': [
    'social security', 'ssf', 'social security fund', 'pension scheme',
    'contributory pension', 'gratuity scheme', 'social protection',
    'old age pension', 'disability pension', 'maternity benefit',
    'social insurance', 'worker protection', 'ssf enrollment',
    'सामाजिक सुरक्षा', 'सामाजिक सुरक्षा कोष', 'पेन्सन', 'सामाजिक बीमा',
  ],
  '35': [
    'passport processing', 'citizenship backlog', 'passport delivery',
    'mrp passport', 'e-passport', 'citizenship fast track',
    'passport queue', 'citizenship application', 'passport delay',
    'biometric passport', 'machine readable passport', 'department of passports',
    'nagarikta', 'rahadani',
    'नागरिकता', 'राहदानी', 'ई-पासपोर्ट', 'नागरिकता प्रमाण पत्र',
  ],
};

interface MatchInput {
  headline: string;
  headline_ne?: string | null;
  content_excerpt: string;
}

interface MatchResult {
  promiseIds: string[];
  confidence: number;
  classification: 'confirms' | 'contradicts' | 'neutral';
}

/**
 * Match an article to relevant promises using keyword overlap.
 * Returns matched promise IDs, confidence score, and classification.
 */
export function matchArticleToPromises(article: MatchInput): MatchResult {
  const text = [
    article.headline || '',
    article.headline_ne || '',
    article.content_excerpt || '',
  ]
    .join(' ')
    .toLowerCase();

  const matches: Array<{ id: string; matchCount: number }> = [];

  for (const [id, keywords] of Object.entries(PROMISE_KEYWORDS)) {
    const matchCount = keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
    if (matchCount > 0) {
      matches.push({ id, matchCount });
    }
  }

  // Sort by match count (strongest match first)
  matches.sort((a, b) => b.matchCount - a.matchCount);

  // Cap at top 5 matches to avoid noise
  const topMatches = matches.slice(0, 5);

  // Confidence: based on how many keywords matched
  const maxMatchCount = topMatches.length > 0 ? topMatches[0].matchCount : 0;
  const confidence =
    topMatches.length > 0
      ? Math.min(0.3 + maxMatchCount * 0.15, 0.9)
      : 0.1;

  return {
    promiseIds: topMatches.map((m) => m.id),
    confidence,
    classification: 'neutral', // Phase 1: always neutral, AI adds real classification
  };
}
