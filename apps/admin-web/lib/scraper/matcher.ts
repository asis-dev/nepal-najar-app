/**
 * Promise keyword matcher — maps scraped articles to government promises.
 * Phase 1: keyword-based matching (no AI).
 * Phase 3: will add Claude API for intelligent classification.
 */

/** Keywords for each promise (EN + NE), used for article matching */
const PROMISE_KEYWORDS: Record<string, string[]> = {
  '1': [
    'directly elected', 'executive system', 'constitutional amendment', 'head of state',
    'presidential system', 'प्रत्यक्ष निर्वाचित', 'कार्यकारी प्रणाली', 'संविधान संशोधन',
  ],
  '2': [
    '18 ministries', 'ministry limit', 'ministry reduction', 'reduce ministries',
    'मन्त्रालय १८', 'मन्त्रालय सीमित', 'मन्त्रालय घटाउ',
  ],
  '3': [
    '60% budget', 'budget allocation', 'provincial budget', 'local government budget',
    'fiscal federalism', 'बजेटको ६०%', 'प्रदेश बजेट', 'स्थानीय सरकार बजेट',
  ],
  '4': [
    'asset investigation', 'CIAA', 'corruption investigation', 'illegally acquired',
    'सम्पत्ति अनुसन्धान', 'अख्तियार', 'भ्रष्टाचार अनुसन्धान',
  ],
  '5': [
    'asset disclosure', 'property declaration', 'mandatory disclosure',
    'सम्पत्ति विवरण', 'सम्पत्ति खुलाउ',
  ],
  '6': [
    '100 days', '100 works', 'first 100 days', '१०० दिन', '१०० काम',
  ],
  '7': [
    'procurement transparency', 'procurement portal', 'public procurement',
    'खरिद पारदर्शिता', 'सार्वजनिक खरिद',
  ],
  '8': [
    'GDP growth', '7% growth', 'economic growth', 'GDP target',
    'जीडीपी वृद्धि', '७% वृद्धि', 'आर्थिक वृद्धि',
  ],
  '9': [
    '500,000 jobs', 'job creation', 'employment generation', 'startup jobs',
    '५ लाख रोजगारी', 'रोजगारी सिर्जना',
  ],
  '10': [
    'exports', 'export target', '$30 billion', 'IT exports',
    'निर्यात', '$३० अर्ब',
  ],
  '11': [
    'tax reform', 'income tax', 'tax burden', 'tax adjustment',
    'कर सुधार', 'आयकर', 'कर भार',
  ],
  '12': [
    '30,000 MW', 'electricity generation', 'hydropower', 'energy export',
    '३०,००० मेगावाट', 'बिजुली उत्पादन', 'जलविद्युत',
  ],
  '13': [
    'melamchi', 'water supply', 'drinking water', 'kathmandu water',
    'मेलम्ची', 'खानेपानी',
  ],
  '14': [
    'national pride', 'pride project', 'राष्ट्रिय गौरव',
  ],
  '15': [
    'east-west highway', 'mahendra highway', '4 lane', 'four lane highway',
    'पूर्व-पश्चिम राजमार्ग', 'महेन्द्र राजमार्ग', '४ लेन',
  ],
  '16': [
    'electric railway', 'railway', 'rail line', 'train',
    'विद्युतीय रेलमार्ग', 'रेलमार्ग',
  ],
  '17': [
    'bhairahawa airport', 'pokhara airport', 'gautam buddha airport', 'airport',
    'भैरहवा विमानस्थल', 'पोखरा विमानस्थल', 'गौतम बुद्ध विमानस्थल',
  ],
  '18': [
    'online not queue', 'digital government', 'digital service', 'e-government',
    'अनलाइन लाइन होइन', 'डिजिटल सरकार', 'ई-सरकार',
  ],
  '19': [
    'digital park', 'tech park', 'technology park', 'IT park',
    'डिजिटल पार्क', 'प्रविधि पार्क',
  ],
  '20': [
    'IT strategic', 'strategic industry', 'IT promotion', 'tech industry',
    'सूचना प्रविधि रणनीतिक', 'रणनीतिक उद्योग',
  ],
  '21': [
    'cryptocurrency', 'crypto regulation', 'crypto mining', 'bitcoin',
    'क्रिप्टोकरेन्सी', 'क्रिप्टो नियमन',
  ],
  '22': [
    'universal health', 'health insurance', 'health coverage',
    'विश्वव्यापी स्वास्थ्य', 'स्वास्थ्य बीमा',
  ],
  '23': [
    'ambulance service', 'national ambulance', 'emergency ambulance',
    'एम्बुलेन्स सेवा', 'राष्ट्रिय एम्बुलेन्स',
  ],
  '24': [
    'free education', '3 children education', 'free schooling',
    'निःशुल्क शिक्षा', '३ सन्तान',
  ],
  '25': [
    'skill in education', 'vocational training', 'skill training',
    'शिक्षामा सीप', 'व्यावसायिक तालिम',
  ],
  '26': [
    'zero dropout', 'dropout rate', 'school retention', 'smart classroom',
    'शून्य छुट', 'छुट दर', 'स्मार्ट कक्षाकोठा',
  ],
  '27': [
    'clean kathmandu', 'waste management', 'air quality', 'kathmandu pollution',
    'स्वच्छ काठमाडौं', 'फोहोर व्यवस्थापन', 'वायु गुणस्तर',
  ],
  '28': [
    'bagmati', 'river restoration', 'river cleanup', 'sewage treatment',
    'बागमती', 'नदी पुनर्स्थापना', 'ढल शोधन',
  ],
  '29': [
    'land reform', 'land commission', 'landless', 'squatter', 'land bank',
    'भूमि सुधार', 'भूमि आयोग', 'भूमिहीन', 'सुकुम्बासी',
  ],
  '30': [
    'overseas voting', 'diaspora voting', 'dual citizenship', 'NRN voting',
    'विदेशबाट मतदान', 'प्रवासी मतदान', 'दोहोरो नागरिकता',
  ],
  '31': [
    'cooperatives crisis', 'cooperatives depositor', 'cooperative fraud',
    'सहकारी संकट', 'निक्षेपकर्ता',
  ],
  '32': [
    'tourism', 'tourist numbers', 'tourist spending', 'visit nepal',
    'पर्यटक', 'पर्यटन',
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
    classification: 'neutral', // Phase 1: always neutral, Phase 3 adds AI classification
  };
}
