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
    'online service', 'digital id', 'paperless', 'queue', 'service delivery',
    'one stop service', 'sewa', 'app launch', 'digital signature', 'biometric',
    'national id', 'digital nepal', 'govtech', 'digital portal', 'mobile app government',
    'अनलाइन लाइन होइन', 'डिजिटल सरकार', 'ई-सरकार', 'नागरिक एप',
    'अनलाइन सेवा', 'डिजिटल नेपाल', 'सरकारी सेवा', 'लाइन', 'झन्झट', 'डिजिटल आईडी',
    'राष्ट्रिय परिचयपत्र', 'डिजिटल हस्ताक्षर', 'सेवा प्रवाह',
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
  '36': [
    'state apology', 'caste discrimination', 'formal apology', 'caste apology',
    'dalit apology', 'pm apology', 'first address', 'public apology',
    'historical injustice', 'caste atrocity', 'discrimination apology',
    'औपचारिक माफी', 'जातीय भेदभाव', 'राज्य माफी', 'जात भेदभाव माफी',
    'प्रधानमन्त्री माफी', 'पहिलो सम्बोधन',
  ],
  '37': [
    'structural caste', 'caste discrimination', 'dismantle caste', 'caste reform',
    'anti-untouchability', 'untouchability law', 'dalit rights', 'caste-based violence',
    'social inclusion', 'discrimination reform', 'caste abolition', 'dalit commission',
    'संरचनागत जातीय भेदभाव', 'जातीय भेदभाव उन्मूलन', 'छुवाछुत', 'दलित अधिकार',
    'सामाजिक समावेशीकरण', 'जातीय सुधार',
  ],
  '38': [
    'ban mps ministers', 'mp minister ban', 'separation of powers', 'legislative executive',
    'constitutional reform', 'mp cannot be minister', 'ministerial appointment',
    'separation legislature', 'executive separation', 'cabinet reform',
    'सांसद मन्त्री प्रतिबन्ध', 'विधायिकी कार्यकारी अलग', 'सांसदलाई मन्त्री बन्न',
    'संवैधानिक सुधार', 'मन्त्री नियुक्ति सुधार',
  ],
  '39': [
    'non-partisan local', 'non-partisan election', 'local government partisan',
    'party-free local', 'independent local', 'ward chair independent',
    'local election reform', 'community governance', 'apolitical local',
    'non-party local', 'local body reform', 'municipal election reform',
    'गैर-दलीय स्थानीय', 'गैर-दलीय निर्वाचन', 'स्थानीय सरकार सुधार',
    'दलविहीन स्थानीय', 'वडा अध्यक्ष स्वतन्त्र',
  ],
  '40': [
    'two-term limit', 'term limit party', 'party leadership limit', 'party chairperson term',
    'leadership rotation', 'term limit', 'party president term', 'political parties act',
    'party democracy', 'internal democracy', 'leadership change', 'party reform',
    'दुई कार्यकाल सीमा', 'पार्टी नेतृत्व सीमा', 'पार्टी अध्यक्ष कार्यकाल',
    'आन्तरिक लोकतन्त्र', 'राजनीतिक दल ऐन',
  ],
  '41': [
    'expert minister', 'technocrat minister', 'specialist minister', 'subject expert',
    'professional cabinet', 'non-political minister', 'expertise cabinet',
    'technocrat cabinet', 'qualified minister', 'merit-based minister',
    'विज्ञ मन्त्री', 'विषय विशेषज्ञ मन्त्री', 'प्राविधिक मन्त्री',
    'गैर-राजनीतिक मन्त्री', 'योग्यता आधारित मन्त्री', 'विशेषज्ञ क्याबिनेट',
  ],
  '42': [
    'political parties act', 'party funding', 'party finance', 'party transparency',
    'party regulation', 'political finance', 'party loophole', 'party money',
    'campaign finance', 'dark money politics', 'party audit', 'election funding',
    'राजनीतिक दल ऐन', 'दल ऐन संशोधन', 'पार्टी कोष', 'पार्टी पारदर्शिता',
    'राजनीतिक वित्त', 'निर्वाचन कोष',
  ],
  '43': [
    'time-bound service', 'service delivery', 'public service deadline', 'service guarantee',
    'government service time', 'digital service delivery', 'citizen charter',
    'service timeline', 'accountability service', 'nagarik badapatra',
    'समयबद्ध सेवा', 'सार्वजनिक सेवा', 'सेवा ग्यारेन्टी', 'नागरिक बडापत्र',
    'सेवा समयसीमा', 'डिजिटल सेवा वितरण',
  ],
  '44': [
    'national identity card', 'national id', 'identity card integration', 'single id card',
    'unified identity', 'biometric id', 'digital identity', 'id card system',
    'rashtriya parichay patra', 'nid card', 'smart id card', 'identity document',
    'राष्ट्रिय परिचयपत्र', 'एकल परिचय कार्ड', 'परिचयपत्र एकीकरण',
    'डिजिटल पहिचान', 'बायोमेट्रिक आईडी', 'स्मार्ट कार्ड',
  ],
  '45': [
    'tippani', 'digital approval', 'tippani.gov.np', 'e-approval', 'digital tippani',
    'government approval system', 'paperless approval', 'online tippani',
    'file approval digital', 'approval automation', 'note sheet digital',
    'डिजिटल टिप्पणी', 'टिप्पणी प्रणाली', 'डिजिटल स्वीकृति',
    'कागजरहित स्वीकृति', 'ई-स्वीकृति', 'tippani.gov',
  ],
  '46': [
    'faceless administration', 'paperless administration', 'faceless government',
    'paperless government', 'no-contact service', 'zero-paper government',
    'digital administration', 'contactless service', 'automated government',
    'अनुहारविहीन प्रशासन', 'कागजविहीन प्रशासन', 'अनुहारविहीन सरकार',
    'कागजविहीन सरकार', 'डिजिटल प्रशासन', 'शून्य कागज',
  ],
  '47': [
    'ciaa independent', 'ciaa reform', 'akhtiyar reform', 'ciaa effective',
    'anti-corruption commission', 'akhtiyar independence', 'corruption watchdog',
    'ciaa autonomy', 'commission independence', 'corruption body reform',
    'अख्तियार स्वतन्त्र', 'अख्तियार सुधार', 'भ्रष्टाचार आयोग',
    'अख्तियार स्वायत्तता', 'अख्तियार प्रभावकारी', 'निगरानी निकाय',
  ],
  '48': [
    'sister organization', 'party sister org', 'abolish sister', 'bhratri sangathan',
    'party wing state', 'political union government', 'party affiliate',
    'trade union political', 'student wing government', 'party penetration state',
    'भातृ संगठन', 'पार्टी भातृ संगठन उन्मूलन', 'दलीय युनियन',
    'राज्य संयन्त्रमा पार्टी', 'विद्यार्थी शाखा सरकार', 'राजनीतिक युनियन',
  ],
  '49': [
    'civil service transfer', 'transfer board', 'autonomous transfer', 'posting transfer',
    'civil service board', 'merit transfer', 'source force', 'political transfer',
    'bureaucratic transfer', 'transfer reform', 'civil service autonomy',
    'सरुवा बोर्ड', 'निजामती सेवा सरुवा', 'स्वायत्त सरुवा',
    'सोर्स फोर्स', 'योग्यता सरुवा', 'सरुवा सुधार',
  ],
  '50': [
    'transitional justice', 'truth reconciliation', 'conflict era', 'civil war justice',
    'trc nepal', 'ciedp', 'disappearance commission', 'conflict victim',
    'war crime', 'maoist conflict', 'victim reparation', 'truth commission',
    'संक्रमणकालीन न्याय', 'सत्य मेलमिलाप', 'द्वन्द्वकाल', 'बेपत्ता आयोग',
    'द्वन्द्व पीडित', 'मावोवादी द्वन्द्व',
  ],
  '51': [
    'gen-z movement', 'gen-z protest', 'bhadra 23', 'bhadra 24', 'youth protest',
    'gen-z investigation', 'protest investigation', 'bhadra incident',
    'youth movement nepal', 'generation z protest', 'student protest 2081',
    'जेन-जी आन्दोलन', 'भदौ २३', 'भदौ २४', 'युवा आन्दोलन',
    'जेन-जी अनुसन्धान', 'विरोध अनुसन्धान',
  ],
  '52': [
    'repeal outdated law', 'outdated economic law', 'law reform', 'economic deregulation',
    'business law reform', 'repeal old law', 'regulatory reform', 'law modernization',
    'legislative cleanup', 'red tape reduction', 'ease of business',
    'पुराना कानून खारेज', 'आर्थिक कानून सुधार', 'नियमन सुधार',
    'कानून आधुनिकीकरण', 'व्यापार सुधार', 'लालफिताशाही',
  ],
  '53': [
    'one-stop service', 'single window', 'investor one stop', 'one door service',
    'investment board', 'ibn', 'investor facilitation', 'investment approval',
    'ekdwar sewa', 'one window investor', 'single window clearance',
    'एकद्वार सेवा', 'लगानी बोर्ड', 'लगानीकर्ता सेवा केन्द्र',
    'एकल खिडकी', 'लगानी स्वीकृति', 'एकद्वार केन्द्र',
  ],
  '54': [
    'digital business registration', 'online company registration', 'ocr nepal',
    'business registration', 'company registration online', '24 hour registration',
    'e-registration business', 'startup registration', 'online licensing',
    'डिजिटल व्यवसाय दर्ता', 'अनलाइन कम्पनी दर्ता', 'व्यवसाय दर्ता',
    '२४ घण्टा दर्ता', 'ई-दर्ता', 'अनलाइन इजाजतपत्र',
  ],
  '55': [
    'stalled national pride', 'pride project stalled', 'fast track road', 'melamchi',
    'budhigandaki', 'nijgadh airport', 'stalled mega project', 'national pride completion',
    'pride project audit', 'kathmandu tarai fast track', 'national pride budget',
    'रोकिएका राष्ट्रिय गौरव', 'गौरव आयोजना रोकिएको', 'फास्ट ट्र्याक',
    'बुढीगण्डकी', 'निजगढ विमानस्थल', 'मेलम्ची',
  ],
  '56': [
    'new national pride', '10 new pride', 'new mega project', 'npc national pride',
    'national pride addition', 'new flagship project', 'pride project planning',
    'national priority project', 'nalsing gad', 'tamor storage', 'madan bhandari highway',
    'नयाँ राष्ट्रिय गौरव', '१० नयाँ गौरव', 'नयाँ मेगा आयोजना',
    'गौरव आयोजना थप', 'राष्ट्रिय प्राथमिकता आयोजना',
  ],
  '57': [
    'multidimensional poverty', 'poverty reduction', 'mpi nepal', 'poverty index',
    'poverty target', 'poverty 10 percent', 'poverty alleviation',
    'extreme poverty', 'poverty measurement', 'cbs poverty', 'npc poverty',
    'बहुआयामिक गरिबी', 'गरिबी निवारण', 'गरिबी सूचकांक',
    'गरिबी १०%', 'गरिबी लक्ष्य', 'गरिबी उन्मूलन',
  ],
  '58': [
    'nepal production fund', 'production fund', 'domestic manufacturing', 'made in nepal',
    'manufacturing fund', 'production enterprise', 'industrial fund',
    'local manufacturing', 'import substitution', 'production subsidy',
    'नेपाल उत्पादन कोष', 'उत्पादन कोष', 'घरेलु उत्पादन',
    'नेपालमा बनेको', 'उत्पादन उद्यम', 'आयात प्रतिस्थापन',
  ],
  '59': [
    'cooperative nrb', 'cooperative supervision', 'cooperative regulation',
    'nrb cooperative', 'nepal rastra bank cooperative', 'savings cooperative',
    'credit cooperative', 'cooperative oversight', 'cooperative reform',
    'cooperative crisis', 'cooperative monitoring', 'department of cooperatives',
    'सहकारी नेपाल राष्ट्र बैंक', 'सहकारी सुपरिवेक्षण', 'सहकारी नियमन',
    'बचत सहकारी', 'ऋण सहकारी', 'सहकारी सुधार',
  ],
  '60': [
    'deposit return', 'small savers', 'cooperative deposit', 'depositor refund',
    'first 100 days deposit', 'failed cooperative', 'deposit recovery',
    'small depositor', 'cooperative victim', 'savings refund',
    'निक्षेप फिर्ता', 'साना बचतकर्ता', 'सहकारी निक्षेप',
    'निक्षेपकर्ता', 'सहकारी पीडित', 'बचत फिर्ता', '१०० दिन निक्षेप',
  ],
  '61': [
    'predatory lending', 'metre interest', 'usury', 'loan shark', 'criminalize lending',
    'high interest rate', 'exploitative lending', 'metre byaj', 'debt bondage',
    'informal lending', 'moneylender', 'lending crime', 'interest cap',
    'मेट्रे ब्याज', 'शिकारी ऋण', 'सूदखोरी', 'साहू',
    'अत्यधिक ब्याज', 'ऋण दासत्व', 'ऋण अपराधीकरण',
  ],
  '62': [
    'nepse reform', 'stock market reform', 'nepse intraday', 'derivatives market',
    'share market reform', 'sebon', 'securities board', 'stock exchange modernization',
    'nepse trading', 'capital market reform', 'equity market', 'nepse international',
    'नेप्से सुधार', 'शेयर बजार सुधार', 'इन्ट्राडे ट्रेडिङ',
    'डेरिभेटिभ्स', 'पूँजी बजार सुधार', 'धितोपत्र बोर्ड',
  ],
  '63': [
    'rupee peg', 'india rupee peg', 'currency peg', 'exchange rate review',
    'nepal india currency', 'fixed exchange rate', 'peg review', 'currency regime',
    'monetary sovereignty', 'exchange rate policy', 'nrb exchange rate',
    'रुपैयाँ पेग', 'भारतीय रुपैयाँ पेग', 'विनिमय दर',
    'मुद्रा पेग पुनरावलोकन', 'स्थिर विनिमय दर', 'मौद्रिक नीति',
  ],
  '64': [
    'cryptocurrency regulation', 'crypto policy', 'crypto nepal', 'bitcoin nepal',
    'digital currency policy', 'crypto legalization', 'nrb crypto',
    'cbdc digital rupee', 'virtual asset', 'crypto mining nepal', 'blockchain policy',
    'क्रिप्टोकरेन्सी नियमन', 'क्रिप्टो नीति', 'डिजिटल मुद्रा नीति',
    'बिटकोइन नेपाल', 'क्रिप्टो कानूनीकरण', 'डिजिटल रुपी',
  ],
  '65': [
    '15000 mw', '15,000 mw', 'installed capacity', 'electricity capacity',
    'hydropower capacity', 'power generation target', 'nea capacity',
    'megawatt target', 'generation capacity', 'tanahu hydropower', 'upper trishuli',
    '१५,००० मेगावाट', '१५००० मेगावाट', 'जडित क्षमता', 'विद्युत क्षमता',
    'जलविद्युत क्षमता', 'उत्पादन क्षमता लक्ष्य',
  ],
  '66': [
    'energy export', 'power export', 'electricity export india', 'electricity export bangladesh',
    'cross-border transmission', 'power trade', 'ppa india', 'energy diplomacy',
    'nea export', 'power purchase agreement', 'tripartite power', 'bpdb nepal',
    'ऊर्जा निर्यात', 'विद्युत निर्यात', 'भारत विद्युत निर्यात',
    'बंगलादेश विद्युत', 'सीमापार ट्रान्समिसन', 'ऊर्जा कूटनीति',
  ],
  '67': [
    'green data center', 'data center hydropower', 'data center nepal',
    'cloud himalaya', 'hyperscale data center', 'clean energy data center',
    'data center investment', 'banepa it park', 'green computing',
    'हरित डाटा सेन्टर', 'जलविद्युत डाटा सेन्टर', 'क्लाउड हिमालय',
    'डाटा सेन्टर लगानी', 'स्वच्छ ऊर्जा डाटा', 'हरित कम्प्युटिङ',
  ],
  '68': [
    'gpu computing', 'gpu export', 'ai computing nepal', 'green gpu',
    'gpu farm', 'ai training export', 'high performance computing', 'hpc nepal',
    'machine learning compute', 'gpu infrastructure', 'computing export',
    'जीपीयू कम्प्युटिङ', 'हरित जीपीयू', 'एआई कम्प्युटिङ',
    'जीपीयू निर्यात', 'उच्च प्रदर्शन कम्प्युटिङ', 'कम्प्युटिङ पूर्वाधार',
  ],
  '69': [
    'electricity tariff', 'tariff restructure', 'power tariff', 'nea tariff',
    'electricity rate', 'open access directive', 'erc tariff', 'industrial tariff',
    'residential tariff', 'tariff reform', 'electricity pricing', 'tariff hike',
    'विद्युत महसुल', 'महसुल पुनर्संरचना', 'बिजुली दर',
    'ओपन एक्सेस', 'औद्योगिक महसुल', 'महसुल सुधार',
  ],
  '70': [
    'it strategic industry', 'it national priority', 'it special industry',
    'it decade', 'it tax exemption', 'it export income', 'national ai policy',
    'national ai centre', 'it sector incentive', 'technology promotion',
    'सूचना प्रविधि रणनीतिक उद्योग', 'आईटी दशक', 'आईटी कर छुट',
    'राष्ट्रिय एआई नीति', 'राष्ट्रिय एआई केन्द्र', 'प्रविधि प्रवर्धन',
  ],
  '71': [
    '$30 billion it', 'it export target', 'it services export', 'it export 10 years',
    'software export', 'bpo export nepal', 'tech export', 'it talent development',
    'outsourcing export', 'digital service export', 'it revenue target',
    '$३० अर्ब आईटी', 'सूचना प्रविधि निर्यात लक्ष्य', 'सफ्टवेयर निर्यात',
    'बीपीओ निर्यात', 'डिजिटल सेवा निर्यात', 'प्रविधि निर्यात',
  ],
  '72': [
    'it promotion board', 'autonomous it board', 'it board nepal', 'technology board',
    'it governance', 'nas-it', 'it industry board', 'tech promotion board',
    'it sector governance', 'independent it board', 'nitc reform',
    'सूचना प्रविधि प्रवर्धन बोर्ड', 'स्वायत्त आईटी बोर्ड', 'प्रविधि बोर्ड',
    'आईटी उद्योग बोर्ड', 'आईटी शासन', 'प्रविधि प्रवर्धन बोर्ड',
  ],
  '73': [
    'digital park province', 'digital park all provinces', 'it park province',
    'technology park province', 'banepa it park', 'provincial it park',
    'tech hub province', 'software park province', 'digital ecosystem',
    'डिजिटल पार्क प्रदेश', 'सातवटै प्रदेश डिजिटल', 'प्रादेशिक आईटी पार्क',
    'प्रविधि पार्क प्रदेश', 'बनेपा आईटी पार्क', 'डिजिटल पारिस्थितिकी',
  ],
  '74': [
    'remote work legal', 'remote work recognition', 'freelancing law', 'gig economy law',
    'labor act remote', 'work from home legal', 'digital labor', 'remote employment',
    'freelancer rights', 'telecommuting law', 'remote work amendment',
    'रिमोट काम कानूनी', 'रिमोट कामको मान्यता', 'फ्रिल्यान्सिङ कानून',
    'गिग अर्थतन्त्र', 'श्रम ऐन रिमोट', 'डिजिटल श्रम',
  ],
  '75': [
    'digital nomad visa', 'digital nomad', 'nomad visa nepal', 'remote worker visa',
    'dnv nepal', 'five year visa', 'long stay visa', 'tech worker visa',
    'freelancer visa', 'work visa remote', 'nomad visa policy',
    'डिजिटल नोम्याड भिसा', 'डिजिटल नोम्याड', 'रिमोट कर्मचारी भिसा',
    'दीर्घकालीन भिसा', 'प्रविधि कर्मचारी भिसा', 'नोम्याड भिसा नीति',
  ],
  '76': [
    'cashless society', 'cashless platform', 'digital payment', 'esewa',
    'khalti', 'fonepay', 'ime pay', 'mobile payment', 'qr payment',
    'digital wallet', 'cbdc', 'digital rupee', 'e-commerce payment',
    'नगदरहित समाज', 'डिजिटल भुक्तानी', 'मोबाइल भुक्तानी',
    'डिजिटल वालेट', 'डिजिटल रुपी', 'क्यूआर भुक्तानी',
  ],
  '77': [
    'international payment gateway', 'paypal nepal', 'stripe nepal', 'payment gateway',
    'international payment', 'cross-border payment', 'payoneer nepal',
    'freelancer payment', 'foreign payment', 'nrb payment gateway', 'wise nepal',
    'अन्तर्राष्ट्रिय भुक्तानी गेटवे', 'पेप्याल नेपाल', 'स्ट्राइप नेपाल',
    'विदेशी भुक्तानी', 'सीमापार भुक्तानी', 'फ्रिल्यान्सर भुक्तानी',
  ],
  '78': [
    'satellite internet', 'starlink nepal', 'starlink', 'satellite broadband',
    'leo satellite', 'rural internet', 'remote connectivity', 'nta satellite',
    'satellite license', 'internet mountain', 'telecom satellite', 'space internet',
    'उपग्रह इन्टरनेट', 'स्टारलिंक नेपाल', 'स्टारलिंक',
    'ग्रामीण इन्टरनेट', 'दुर्गम जडान', 'उपग्रह ब्रोडब्यान्ड',
  ],
  '79': [
    'double tourist', 'tourist arrivals double', 'tourism growth target',
    'tourist spending double', 'tourism marketing', 'visit nepal', 'ntb tourism',
    'tourism revenue growth', 'tourist target', 'tourism promotion', 'inbound tourism',
    'पर्यटक दोब्बर', 'पर्यटक आगमन दोब्बर', 'पर्यटन वृद्धि लक्ष्य',
    'पर्यटक खर्च दोब्बर', 'पर्यटन प्रवर्धन', 'पर्यटन राजस्व वृद्धि',
  ],
  '80': [
    'pokhara airport operation', 'bhairahawa airport operation', 'pokhara international flights',
    'gautam buddha airport flights', 'gbia operation', 'airport full operation',
    'international flights pokhara', 'airport revival', 'caan airport', 'airport terminal',
    'pokhara airport', 'bhairahawa airport', 'gautam buddha airport', 'gbia',
    'pia pokhara', 'second international airport', 'regional international airport',
    'caan', 'civil aviation authority', 'airport', 'flights nepal', 'aviation nepal',
    'tourist arrival', 'international airline', 'wide body', 'airline route',
    'पोखरा विमानस्थल', 'भैरहवा विमानस्थल', 'पोखरा अन्तर्राष्ट्रिय उडान',
    'गौतम बुद्ध विमानस्थल', 'विमानस्थल', 'अन्तर्राष्ट्रिय उडान',
    'क्षेत्रीय अन्तर्राष्ट्रिय विमानस्थल', 'नागरिक उड्डयन', 'विमान कम्पनी',
  ],
  '81': [
    'hill station', 'hill station india border', 'hill tourism', 'wellness tourism',
    'leisure tourism', 'indian tourist', 'border tourism', 'weekend getaway',
    'hill resort', 'terai hills tourism', 'cross-border tourism',
    'हिल स्टेसन', 'भारत सीमा हिल स्टेसन', 'कल्याण पर्यटन',
    'विश्राम पर्यटन', 'भारतीय पर्यटक', 'सीमा पर्यटन',
  ],
  '82': [
    'digital tourism permit', 'online trekking permit', 'e-permit', 'digital tims',
    'online park entry', 'trekking permit online', 'national park permit online',
    'digital pass', 'tourism permit digitize', 'annapurna permit online',
    'डिजिटल पर्यटन अनुमतिपत्र', 'अनलाइन ट्रेकिङ अनुमतिपत्र', 'ई-अनुमतिपत्र',
    'डिजिटल टिम्स', 'राष्ट्रिय निकुञ्ज अनलाइन', 'पर्यटन डिजिटाइज',
  ],
  '83': [
    'food self-sufficiency', 'food security', 'food production', 'staple crop',
    'rice self-sufficiency', 'wheat production', 'agricultural production',
    'food import reduction', 'food sovereignty', 'cereal production',
    'खाद्य आत्मनिर्भरता', 'खाद्य सुरक्षा', 'खाद्य उत्पादन',
    'चामल आत्मनिर्भरता', 'गहुँ उत्पादन', 'कृषि उत्पादन',
  ],
  '84': [
    'irrigation coverage', '80% irrigation', 'irrigation expansion', 'irrigation project',
    'canal irrigation', 'doi irrigation', 'department of irrigation',
    'arable land irrigation', 'irrigation target', 'water management agriculture',
    'सिँचाइ कभरेज', '८०% सिँचाइ', 'सिँचाइ विस्तार',
    'सिँचाइ आयोजना', 'नहर सिँचाइ', 'कृषियोग्य भूमि सिँचाइ',
  ],
  '85': [
    'narc restructure', 'narc reform', 'agricultural research council', 'narc nepal',
    'agriculture research', 'seed development', 'crop research', 'narc autonomy',
    'agricultural innovation', 'farming research', 'agriculture modernization',
    'कृषि अनुसन्धान परिषद', 'कृषि अनुसन्धान सुधार', 'बीउ विकास',
    'बाली अनुसन्धान', 'कृषि नवप्रवर्तन', 'कृषि आधुनिकीकरण',
  ],
  '86': [
    'agritech', 'fintech farming', 'digital agriculture', 'farming app',
    'agriculture technology', 'farmer credit', 'digital loan farming',
    'precision agriculture', 'smart farming', 'agriculture fintech',
    'एग्रिटेक', 'फिनटेक कृषि', 'डिजिटल कृषि',
    'कृषि प्रविधि', 'किसान ऋण', 'स्मार्ट कृषि', 'कृषि एप',
  ],
  '87': [
    'production economy', 'export economy', 'import substitution', 'trade deficit reduce',
    'domestic production', 'manufacturing sector', 'export oriented',
    'value addition', 'industrial production', 'nepal export growth',
    'उत्पादन अर्थतन्त्र', 'निर्यात अर्थतन्त्र', 'आयात प्रतिस्थापन',
    'व्यापार घाटा', 'घरेलु उत्पादन', 'निर्यातमुखी',
  ],
  '88': [
    'free education 3 children', 'free schooling', 'education up to 3',
    'free primary education', 'free secondary education', 'school fee waiver',
    'education subsidy', 'government school free', 'compulsory education',
    'निःशुल्क शिक्षा ३ सन्तान', 'निःशुल्क विद्यालय', '३ सन्तान शिक्षा',
    'निःशुल्क प्राथमिक शिक्षा', 'सरकारी विद्यालय निःशुल्क', 'अनिवार्य शिक्षा',
  ],
  '89': [
    'university autonomy', 'university research', 'autonomous university',
    'academic freedom', 'research university', 'university reform', 'tu reform',
    'tribhuvan university reform', 'higher education research', 'university governance',
    'विश्वविद्यालय स्वायत्तता', 'विश्वविद्यालय अनुसन्धान', 'स्वायत्त विश्वविद्यालय',
    'शैक्षिक स्वतन्त्रता', 'उच्च शिक्षा अनुसन्धान', 'विश्वविद्यालय सुधार',
  ],
  '90': [
    'politics in schools', 'political activity campus', 'student union politics',
    'ban politics campus', 'student wing ban', 'campus politics', 'school politics',
    'political interference education', 'student strike', 'bandh campus',
    'विद्यालयमा राजनीति', 'क्याम्पस राजनीति', 'विद्यार्थी संगठन राजनीति',
    'क्याम्पसमा राजनीतिक गतिविधि', 'विद्यार्थी शाखा प्रतिबन्ध', 'शिक्षामा राजनीतिक हस्तक्षेप',
  ],
  '91': [
    'inclusive education', 'disability education', 'neurodiverse education',
    'special needs education', 'disability school', 'accessible education',
    'learning disability', 'autism education', 'inclusive classroom',
    'समावेशी शिक्षा', 'अपाङ्गता शिक्षा', 'न्यूरोडाइभर्स शिक्षा',
    'विशेष शिक्षा', 'पहुँचयोग्य शिक्षा', 'समावेशी कक्षा', 'अपाङ्ग विद्यार्थी',
  ],
  '92': [
    'higher education hub', 'education hub nepal', 'international students nepal',
    'foreign student', 'education destination', 'regional education hub',
    'university international', 'student exchange', 'education export',
    'उच्च शिक्षा हब', 'शिक्षा हब नेपाल', 'अन्तर्राष्ट्रिय विद्यार्थी',
    'विदेशी विद्यार्थी', 'शिक्षा गन्तव्य', 'क्षेत्रीय शिक्षा हब',
  ],
  '93': [
    'mental health program', 'mental health structure', 'community mental health',
    'depression treatment', 'anxiety program', 'psychiatric care', 'mental health center',
    'mental health funding', 'psychosocial support', 'mental health act',
    'मानसिक स्वास्थ्य कार्यक्रम', 'मानसिक स्वास्थ्य संरचना', 'सामुदायिक मानसिक स्वास्थ्य',
    'डिप्रेसन उपचार', 'मनोसामाजिक सहयोग', 'मानसिक स्वास्थ्य केन्द्र',
  ],
  '94': [
    'medicine price', 'drug price control', 'medicine regulation', 'pharma price',
    'essential drug', 'medicine markup', 'dda nepal', 'drug administration',
    'pharmaceutical pricing', 'generic medicine', 'medicine affordability',
    'औषधि मूल्य', 'औषधि मूल्य नियन्त्रण', 'औषधि नियमन',
    'आवश्यक औषधि', 'जेनेरिक औषधि', 'औषधि सस्तो', 'फार्मा मूल्य',
  ],
  '95': [
    'disability rehabilitation', 'rehabilitation center', 'disability center province',
    'disability care', 'physical rehabilitation', 'disability service',
    'provincial rehabilitation', 'disability welfare', 'rehab center',
    'अपाङ्गता पुनर्स्थापना', 'पुनर्स्थापना केन्द्र', 'प्रदेश पुनर्स्थापना',
    'अपाङ्ग हेरचाह', 'शारीरिक पुनर्स्थापना', 'अपाङ्गता सेवा', 'अपाङ्ग कल्याण',
  ],
  '96': [
    'pandemic management', 'pandemic preparedness', 'pandemic infrastructure',
    'epidemic response', 'disease outbreak', 'health emergency', 'stockpile medical',
    'lab infrastructure', 'response protocol', 'disease surveillance',
    'pandemic', 'epidemic', 'outbreak', 'covid', 'covid-19', 'dengue', 'cholera',
    'influenza', 'h5n1', 'bird flu', 'who nepal', 'public health emergency',
    'quarantine', 'isolation ward', 'oxygen plant', 'icu beds', 'pcr lab',
    'national public health', 'edcd', 'department of health',
    'महामारी', 'सङ्क्रमण', 'डेङ्गु', 'कोभिड', 'कोरोना', 'फैलावट',
    'स्वास्थ्य आपतकाल', 'रोग निगरानी', 'प्रयोगशाला', 'क्वारेन्टाइन',
    'अक्सिजन प्लान्ट', 'जनस्वास्थ्य',
  ],
  '97': [
    'merit-based judge', 'judge appointment', 'judicial appointment reform',
    'judicial merit', 'judicial council', 'judge selection', 'court appointment',
    'judiciary reform', 'judicial independence', 'nyaya parishad',
    'योग्यता आधारित न्यायाधीश', 'न्यायाधीश नियुक्ति', 'न्यायिक नियुक्ति सुधार',
    'न्यायिक परिषद', 'न्यायपालिका सुधार', 'न्यायिक स्वतन्त्रता',
  ],
  '98': [
    'live court', 'court proceedings live', 'broadcast court', 'court transparency',
    'court streaming', 'open court', 'court telecast', 'judicial transparency',
    'court public access', 'court hearing live', 'supreme court live',
    'प्रत्यक्ष अदालत', 'अदालत कार्यवाही प्रसारण', 'अदालत पारदर्शिता',
    'अदालत स्ट्रिमिङ', 'खुला अदालत', 'न्यायिक पारदर्शिता',
  ],
  '99': [
    'judicial asset', 'judge asset disclosure', 'judge wealth declaration',
    'judicial property', 'judge financial disclosure', 'court official asset',
    'judge transparency', 'judicial accountability', 'judge income disclosure',
    'न्यायिक सम्पत्ति', 'न्यायाधीश सम्पत्ति विवरण', 'न्यायाधीश सम्पत्ति खुलाउ',
    'न्यायिक पारदर्शिता', 'न्यायिक जवाफदेहिता', 'न्यायाधीश आय विवरण',
  ],
  '100': [
    '1950 treaty', 'nepal india treaty', 'peace friendship treaty', 'treaty renegotiate',
    'treaty revision', 'sugauli', 'india treaty reform', 'bilateral treaty',
    'sovereign treaty', 'unequal treaty', 'treaty review', 'foreign policy india',
    '१९५० सन्धि', 'नेपाल भारत सन्धि', 'शान्ति मैत्री सन्धि',
    'सन्धि पुनर्वार्ता', 'सन्धि संशोधन', 'द्विपक्षीय सन्धि',
  ],
  '101': [
    'online voting abroad', 'i-voting', 'internet voting', 'diaspora voting online',
    'e-voting abroad', 'electronic voting overseas', 'migrant worker voting',
    'overseas e-ballot', 'digital voting', 'remote voting', 'election commission voting',
    'अनलाइन मतदान विदेश', 'आई-भोटिङ', 'इन्टरनेट मतदान',
    'प्रवासी अनलाइन मतदान', 'ई-मतदान', 'डिजिटल मतदान',
  ],
  '102': [
    'sovereign diaspora fund', 'diaspora fund', 'diaspora investment', 'remittance fund',
    'remittance investment', 'sovereign fund', 'nrn investment fund',
    'diaspora bond', 'remittance channeling', 'diaspora development fund',
    'सार्वभौम प्रवासी कोष', 'प्रवासी कोष', 'प्रवासी लगानी',
    'विप्रेषण कोष', 'विप्रेषण लगानी', 'प्रवासी बन्ड',
  ],
  '103': [
    'once nepali always nepali', 'nepali origin', 'dual citizenship', 'foreign citizenship nepali',
    'nrn rights', 'nepali diaspora rights', 'origin card', 'nepali origin policy',
    'citizenship recognition', 'property rights nrn', 'investment rights diaspora',
    'एकपटक नेपाली सधैं नेपाली', 'नेपाली मूल', 'दोहोरो नागरिकता',
    'प्रवासी अधिकार', 'मूल कार्ड', 'नेपाली मूल नीति',
  ],
  '104': [
    'knowledge bank', 'diaspora knowledge', 'brain gain', 'diaspora expertise',
    'knowledge transfer', 'diaspora professional', 'brain drain reverse',
    'nrn expertise', 'skill transfer', 'diaspora contribution', 'expert database',
    'ज्ञान बैंक', 'प्रवासी ज्ञान', 'ब्रेन गेन', 'प्रवासी विशेषज्ञता',
    'ज्ञान हस्तान्तरण', 'प्रवासी पेशेवर',
  ],
  '105': [
    'net-zero', 'net zero', 'carbon neutral', 'carbon emissions', 'climate action',
    'ndc nepal', 'nationally determined contribution', 'carbon target',
    'climate roadmap', 'green economy', 'emissions reduction', 'paris agreement nepal',
    'शून्य उत्सर्जन', 'कार्बन तटस्थ', 'जलवायु कार्य',
    'कार्बन उत्सर्जन', 'जलवायु रोडम्याप', 'हरित अर्थतन्त्र',
  ],
  '106': [
    'forest fire center', 'forest fire drone', 'forest fire satellite', 'wildfire monitoring',
    'fire detection', 'forest fire response', 'fire center', 'drone firefighting',
    'forest fire nepal', 'fire early warning', 'fire surveillance',
    'वन आगो केन्द्र', 'वन आगो ड्रोन', 'वन आगो उपग्रह',
    'वन डढेलो', 'आगो अनुगमन', 'वन आगो प्रतिक्रिया',
  ],
  '107': [
    'waste to energy', 'waste-to-energy', 'wte plant', 'garbage energy',
    'solid waste energy', 'incineration plant', 'waste power plant',
    'municipal waste energy', 'waste management energy', 'waste crisis solution',
    'फोहोरबाट ऊर्जा', 'फोहोर विद्युत', 'ठोस फोहोर ऊर्जा',
    'फोहोर व्यवस्थापन ऊर्जा', 'फोहोर संकट', 'कचरा ऊर्जा',
  ],
  '108': [
    'flood early warning', 'landslide early warning', 'flood warning system',
    'landslide warning', 'disaster early warning', 'river monitoring',
    'dhm flood', 'hydrological monitoring', 'flood sensor', 'landslide sensor',
    'monsoon warning', 'disaster preparedness', 'bipad portal',
    'बाढी पूर्व चेतावनी', 'पहिरो पूर्व चेतावनी', 'बाढी चेतावनी प्रणाली',
    'विपद पूर्व चेतावनी', 'नदी अनुगमन', 'विपद तयारी',
  ],
  '109': [
    'athlete pension', 'athlete insurance', 'sports pension', 'national athlete welfare',
    'player pension', 'sports health insurance', 'athlete fund', 'nsc pension',
    'national sports council', 'sports welfare', 'retired athlete', 'player health',
    'athlete', 'sportsperson', 'national player', 'cricket nepal', 'football nepal',
    'paragliding athlete', 'taekwondo nepal', 'sports ministry', 'sports board',
    'anfa', 'can cricket', 'olympic committee nepal', 'noc nepal', 'sports policy',
    'sag games', 'asian games nepal', 'commonwealth games nepal',
    'खेलाडी', 'खेलकुद', 'राष्ट्रिय खेलाडी', 'क्रिकेट', 'फुटबल',
    'राष्ट्रिय खेलकुद परिषद्', 'खेलकुद मन्त्रालय', 'खेलाडी पेन्सन',
    'खेलाडी बीमा', 'खेलकुद नीति', 'दक्षिण एसियाली खेल',
  ],
  '110': [
    'home delivery passport', 'home delivery license', 'passport home delivery',
    'driving license home delivery', 'licence home delivery', 'door-to-door passport',
    'doorstep passport', 'doorstep license', 'mobile passport service',
    'passport doorstep', 'passport courier', 'license courier delivery',
    'department of passport', 'transport management office', 'license office home',
    'घर-घरमा राहदानी', 'घरमै राहदानी', 'घरमै सवारी चालक अनुमतिपत्र',
    'राहदानी घर वितरण', 'सवारी चालक अनुमतिपत्र घरमा', 'राहदानी विभाग',
    'यातायात व्यवस्था कार्यालय', 'राहदानी सेवा', 'चालक अनुमतिपत्र सेवा',
  ],
  '111': [
    'business monopoly', 'elite monopoly', 'crony capitalism', 'business cartel nepal',
    'syndicate business', 'oligarchy business', 'state capture', 'big business politics',
    'business politician nexus', 'syndicate', 'cartel', 'monopoly nepal',
    'fair trade competition', 'competition commission', 'anti-syndicate',
    'business influence policy', 'corporate capture state',
    'व्यापारिक इजारा', 'राज्य संयन्त्र इजारा', 'सिन्डिकेट', 'व्यापारी राजनीति',
    'धनाढ्य व्यवसायी', 'व्यापारिक माफिया', 'इजारा अन्त्य',
    'प्रतिस्पर्धा आयोग', 'निष्पक्ष व्यापार',
  ],
  '112': [
    'spp', 'state partnership program', 'state partnership programme',
    'spp agreement', 'spp military', 'us military partnership',
    'spp cancellation', 'spp scrap', 'spp khareji', 'spp withdraw',
    'us nepal military', 'pentagon nepal', 'mcc spp', 'military partnership us',
    'military pact nepal us', 'security cooperation us nepal',
    'एसपीपी', 'एसपीपी सम्झौता', 'एसपीपी खारेज', 'राज्य साझेदारी कार्यक्रम',
    'अमेरिकी सैन्य सम्झौता', 'सैन्य साझेदारी', 'एसपीपी रद्द',
    'सुरक्षा सहकार्य', 'अमेरिका नेपाल सैन्य',
  ],
  '113': [
    'one country one education', 'unified education policy', 'education system reform',
    'national curriculum unified', 'public private school equalization',
    'school equalization', 'common school system', 'community school reform',
    'private school regulation', 'education uniformity',
    'cee curriculum', 'curriculum development centre', 'school education act',
    'ministry of education science technology', 'moest',
    'एक देश एक शिक्षा', 'एकीकृत शिक्षा नीति', 'समान शिक्षा प्रणाली',
    'राष्ट्रिय पाठ्यक्रम', 'सामुदायिक विद्यालय सुधार', 'निजी विद्यालय नियमन',
    'शिक्षा सुधार', 'शिक्षा मन्त्रालय', 'विद्यालय शिक्षा ऐन',
  ],
  '114': [
    'vip culture', 'vip convoy', 'vip protocol', 'red beacon car',
    'pilot vehicle', 'ministerial convoy', 'vip security cut',
    'minister escort', 'siren convoy', 'protocol abolish',
    'public servant privilege', 'official privilege removal',
    'lal batti', 'red light vehicle',
    'भिआईपी कल्चर', 'भीआईपी संस्कार', 'लालबत्ती', 'मन्त्री काफिला',
    'भिआईपी सुरक्षा', 'विशेष सुरक्षा हटाउ', 'विशेष सुविधा अन्त्य',
    'प्रोटोकल कटौती', 'भीआईपी उन्मूलन',
  ],
  '115': [
    'pokhara electric bus', 'pokhara shuttle', 'pokhara free bus',
    'pokhara metropolitan transport', 'electric shuttle pokhara',
    'pokhara public transport', 'pokhara ev bus', 'pokhara mayor transport',
    'pokhara tourism transport', 'lakeside shuttle', 'phewa shuttle',
    'pokhara metropolitan city', 'gandaki bus electric',
    'पोखरा विद्युतीय बस', 'पोखरा शटल', 'पोखरा निःशुल्क बस',
    'पोखरा महानगरपालिका', 'पोखरा यातायात', 'पोखरा सार्वजनिक यातायात',
    'पोखरा इलेक्ट्रिक बस', 'फेवा शटल',
  ],
  '116': [
    'khula manch', 'khula manch reopen', 'khula manch ground',
    'khula manch concert', 'open theatre kathmandu', 'tundikhel khula manch',
    'kathmandu open ground', 'public community hub', 'community space kathmandu',
    'kathmandu mayor balen khula manch', 'kathmandu metropolitan city public space',
    'खुला मञ्च', 'खुला मञ्च पुनः सञ्चालन', 'खुला मञ्च खोल्ने',
    'टुँडिखेल खुला मञ्च', 'सामुदायिक केन्द्र', 'सार्वजनिक स्थल काठमाडौं',
    'काठमाडौं महानगर खुला मञ्च',
  ],
  '117': [
    'nepse 24 hour', '24 hour share trading', '24-hour trading',
    'nepse trading hours', 'nepse extension', 'continuous trading nepse',
    'stock exchange 24 hour', 'sebon nepse', 'securities board nepal',
    'share market hours', 'nepse online trading', 'tms nepse',
    'capital market reform', 'nepse modernization',
    'नेप्से २४ घण्टा', 'चौबीस घण्टा शेयर कारोबार', 'नेप्से कारोबार समय',
    'नेपाल स्टक एक्सचेन्ज', 'धितोपत्र बोर्ड', 'सेबोन',
    'शेयर बजार सुधार', 'पुँजी बजार',
  ],
  '118': [
    '103 new laws', '103 laws governance', '103 bills', 'omnibus reform bill',
    'governance reform laws', 'legal reform package', 'parliament bill package',
    'law commission reform bill', 'governance amendment bill',
    'mass legal reform', 'parliamentary reform agenda', 'legislative overhaul',
    '१०३ कानून', '१०३ नयाँ कानून', 'शासन सुधार कानून',
    'कानूनी सुधार प्याकेज', 'विधेयक प्याकेज', 'संसदीय सुधार',
    'व्यापक कानूनी सुधार', 'विधायन सुधार',
  ],
  '119': [
    'arogya year', 'wellness year nepal', 'nepal arogya', 'arogya 2027',
    'health tourism nepal', 'wellness tourism', 'ayurveda nepal',
    'health campaign year', 'national wellness campaign', 'arogya barsha',
    'visit nepal wellness', 'spiritual tourism nepal',
    'ministry of health and population wellness',
    'आरोग्य वर्ष', 'नेपाल आरोग्य', 'स्वास्थ्य पर्यटन',
    'आरोग्य २०२७', 'आरोग्य अभियान', 'आयुर्वेद नेपाल',
    'स्वास्थ्य अभियान वर्ष', 'आरोग्य २०८४',
  ],
  '120': [
    'kathmandu night bus', 'valley night bus', 'ktm night service',
    'night public transport kathmandu', '24 hour bus kathmandu',
    'late night bus valley', 'sajha yatayat night', 'kathmandu valley transport',
    'bagmati night bus', 'kathmandu lalitpur bhaktapur night transport',
    'kathmandu safety night transport', 'nightlife transport kathmandu',
    'काठमाडौं रात्रि बस', 'उपत्यका रात्रि बस', 'रातको बस सेवा',
    'काठमाडौं रात्रि यातायात', 'साझा यातायात रात्रि',
    'उपत्यका २४ घण्टा बस',
  ],
  '121': [
    'satellite internet', 'starlink nepal', 'rural internet satellite',
    'remote district internet', 'low earth orbit nepal', 'leo satellite nepal',
    'oneweb nepal', 'project kuiper nepal', 'rural broadband satellite',
    'mountain district connectivity', 'remote area broadband',
    'nta satellite license', 'telecom satellite nepal', 'digital nepal satellite',
    'स्याटेलाइट इन्टरनेट', 'दुर्गम इन्टरनेट', 'स्टारलिंक नेपाल',
    'दुर्गम जिल्ला इन्टरनेट', 'ग्रामीण ब्रोडब्यान्ड', 'भूउपग्रह इन्टरनेट',
    'दूरसञ्चार स्याटेलाइट', 'दुर्गम क्षेत्र इन्टरनेट',
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
// Stop-words (English + romanized Nepali) excluded from word-level matching
const STOP_WORDS = new Set([
  'the','a','an','of','to','in','on','at','for','and','or','by','with','from','is','are','be','as','it','its','this','that','these','those','will','was','were','has','have','had','not','no','do','does','did','but','if','then','than','so','can','could','should','would','i','you','we','they','he','she','his','her','their','our','your','my','me','us','them','him','one','two','three','new','more','also','about','into','over','under','out','up','down','only','just','very','any','all','some','most','many','much','make','made','make','said','says','say','get','got','go','goes','went','now','today','yesterday','tomorrow','here','there','what','which','who','whom','when','where','why','how','नेपाल','नेपाली','छ','छन्','हो','हुन्','भयो','गर्न','गर्दै','गरेको','गरेका','देखि','सम्म','मात्र','पनि','तर','र','वा','यो','यी','त्यो','ती','हाम्रो','हाम्रा','तपाईं','उनी','उहाँ','सबै','धेरै','केही','गत','आज','हिजो','भोलि','कि','के','कसले','कसरी','किन','कहाँ','कहिले','भने','भन्ने','भन्छ','भन्छन्','साथै','नयाँ','भन्दा','गर्ने','गरिएको','गरेको','भएको','हुन्छ','हुने','छैन','छैनन्','थियो','थिए',
]);

function tokenize(s: string): Set<string> {
  if (!s) return new Set();
  // Split on non-letters/digits, including Devanagari range, then drop stop-words and very short tokens
  const tokens = s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t && t.length >= 3 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

function tokenizeKeyword(kw: string): string[] {
  return Array.from(tokenize(kw));
}

export function matchArticleToPromises(article: MatchInput): MatchResult {
  const rawText = [
    article.headline || '',
    article.headline_ne || '',
    article.content_excerpt || '',
  ].join(' ');
  const lower = rawText.toLowerCase();
  const textTokens = tokenize(rawText);

  const matches: Array<{ id: string; matchCount: number; score: number }> = [];

  for (const [id, keywords] of Object.entries(PROMISE_KEYWORDS)) {
    let matchCount = 0;
    let score = 0;
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      // Tier 1: exact phrase substring (strongest)
      if (lower.includes(kwLower)) {
        matchCount += 1;
        score += 3;
        continue;
      }
      // Tier 2: word-level overlap — for multi-word keywords
      const kwTokens = tokenizeKeyword(kw);
      if (kwTokens.length === 0) continue;
      let overlap = 0;
      for (const t of kwTokens) if (textTokens.has(t)) overlap += 1;
      if (kwTokens.length === 1) {
        // Single distinctive word — count it
        if (overlap === 1) {
          matchCount += 1;
          score += 1;
        }
      } else {
        // Multi-word keyword: need ≥60% of words present (and ≥2)
        const ratio = overlap / kwTokens.length;
        if (overlap >= 2 && ratio >= 0.6) {
          matchCount += 1;
          score += 1 + ratio; // 1.6 – 2.0
        }
      }
    }
    if (matchCount > 0) matches.push({ id, matchCount, score });
  }

  // Rank by score (which weights exact phrase matches highest)
  matches.sort((a, b) => b.score - a.score || b.matchCount - a.matchCount);
  const topMatches = matches.slice(0, 5);

  const maxScore = topMatches.length > 0 ? topMatches[0].score : 0;
  const confidence =
    topMatches.length > 0
      ? Math.min(0.3 + maxScore * 0.08, 0.9)
      : 0.1;

  return {
    promiseIds: topMatches.map((m) => m.id),
    confidence,
    classification: 'neutral', // Phase 1: always neutral, AI adds real classification
  };
}
