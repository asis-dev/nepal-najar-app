/**
 * Nepal Republic — Week 4 seed: 40 more services (lightweight).
 * Keeps directory breadth wide so retrieval + chat has more to ground on.
 */

import type { Service } from './types';

const V = '2026-04-08';

const BLANK = {
  documents: [],
  steps: [],
  offices: [],
  commonProblems: [],
  faqs: [],
  tags: [],
};

type MiniService = Partial<Service> &
  Pick<Service, 'slug' | 'category' | 'providerType' | 'providerName' | 'title' | 'summary'>;

function svc(m: MiniService): Service {
  return {
    ...BLANK,
    ...m,
    documents: m.documents || [],
    steps: m.steps || [],
    offices: m.offices || [],
    commonProblems: m.commonProblems || [],
    faqs: m.faqs || [],
    tags: m.tags || [],
    verifiedAt: V,
  } as Service;
}

export const EXTRA_SERVICES_2: Service[] = [
  // ─── IDENTITY (5) ───
  svc({
    slug: 'citizenship-by-birth',
    category: 'identity',
    providerType: 'gov',
    providerName: 'District Administration Office',
    title: { en: 'Citizenship by Birth', ne: 'जन्मको आधारमा नागरिकता' },
    summary: {
      en: 'Citizenship certificate for those born in Nepal to Nepali parents.',
      ne: 'नेपालमा जन्मेका र नेपाली अभिभावक भएका नागरिकका लागि नागरिकता।',
    },
    feeRange: { en: 'Rs. 10 (form)', ne: 'रु. १० (फारम)' },
    estimatedTime: { en: 'Same day if documents complete', ne: 'कागजात पूरा भए सोही दिन' },
    officialUrl: 'https://moha.gov.np',
    tags: ['citizenship', 'nagarikta', 'birth', 'नागरिकता'],
  }),
  svc({
    slug: 'citizenship-duplicate',
    category: 'identity',
    providerType: 'gov',
    providerName: 'District Administration Office',
    title: { en: 'Duplicate Citizenship (Lost / Damaged)', ne: 'नागरिकताको प्रतिलिपि (हराएको / बिग्रेको)' },
    summary: {
      en: 'Replace a lost or damaged citizenship certificate through your DAO.',
      ne: 'हराएको वा बिग्रेको नागरिकता प्रतिस्थापन।',
    },
    feeRange: { en: 'Rs. 100–300', ne: 'रु. १००–३००' },
    officialUrl: 'https://moha.gov.np',
    tags: ['citizenship duplicate', 'lost citizenship', 'नागरिकता हराएको'],
  }),
  svc({
    slug: 'divorce-registration',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Ward Office / Court',
    title: { en: 'Divorce Registration', ne: 'पारपाचुके दर्ता' },
    summary: {
      en: 'Register a court-granted divorce at the ward office.',
      ne: 'अदालतबाट भएको पारपाचुके वडा कार्यालयमा दर्ता।',
    },
    feeRange: { en: 'Rs. 50–100', ne: 'रु. ५०–१००' },
    tags: ['divorce', 'पारपाचुके'],
  }),
  svc({
    slug: 'death-registration',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Ward Office',
    title: { en: 'Death Registration', ne: 'मृत्यु दर्ता' },
    summary: {
      en: 'Register a death within 35 days at the relevant ward office.',
      ne: 'मृत्यु भएको ३५ दिनभित्र वडामा दर्ता गर्नुपर्छ।',
    },
    feeRange: { en: 'Free within 35 days', ne: '३५ दिनभित्र निःशुल्क' },
    tags: ['death', 'मृत्यु दर्ता'],
  }),
  svc({
    slug: 'nrn-card',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Department of Immigration',
    title: { en: 'Non-Resident Nepali (NRN) Card', ne: 'गैर-आवासीय नेपाली (NRN) कार्ड' },
    summary: {
      en: 'Identity card for Nepali-origin foreigners granting visa-free entry and investment rights.',
      ne: 'नेपाली मूलका विदेशी नागरिकका लागि परिचयपत्र।',
    },
    officialUrl: 'https://nrn.gov.np',
    tags: ['nrn', 'diaspora', 'गैर आवासीय'],
  }),

  // ─── TRANSPORT (5) ───
  svc({
    slug: 'drivers-license-new',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Department of Transport Management',
    title: { en: 'New Driving License', ne: 'नयाँ सवारी चालक अनुमति' },
    summary: {
      en: 'Apply for a smart driving license: written test, trial, biometric, then card.',
      ne: 'लिखित, ट्रायल र बायोमेट्रिक पछि स्मार्ट लाइसेन्स।',
    },
    feeRange: { en: 'Rs. 700–2,500 by category', ne: 'रु. ७००–२५००' },
    officialUrl: 'https://dotm.gov.np',
    tags: ['driving license', 'license', 'लाइसेन्स'],
  }),
  svc({
    slug: 'vehicle-tax-payment',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Transport Management Office',
    title: { en: 'Annual Vehicle Tax', ne: 'वार्षिक सवारी कर' },
    summary: {
      en: 'Pay annual road tax per vehicle category; required for bluebook renewal.',
      ne: 'ब्लुबुक नवीकरणका लागि वार्षिक कर तिर्नुपर्छ।',
    },
    feeRange: { en: 'Varies by CC/category', ne: 'CC अनुसार फरक' },
    tags: ['tax', 'vehicle tax', 'कर'],
  }),
  svc({
    slug: 'pollution-test',
    category: 'transport',
    providerType: 'gov',
    providerName: 'DoTM authorized centers',
    title: { en: 'Pollution Check (Green Sticker)', ne: 'प्रदूषण जाँच (हरियो स्टिकर)' },
    summary: {
      en: 'Mandatory emission test for all motor vehicles.',
      ne: 'सबै सवारीका लागि अनिवार्य प्रदूषण जाँच।',
    },
    feeRange: { en: 'Rs. 200–500', ne: 'रु. २००–५००' },
    tags: ['pollution', 'green sticker', 'प्रदूषण'],
  }),
  svc({
    slug: 'embossed-number-plate',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Department of Transport Management',
    title: { en: 'Embossed Number Plate', ne: 'एम्बोस्ड नम्बर प्लेट' },
    summary: {
      en: 'Mandatory tamper-proof number plate replacement for vehicles.',
      ne: 'सुरक्षित एम्बोस्ड प्लेट अनिवार्य।',
    },
    feeRange: { en: 'Rs. 2,500–3,500', ne: 'रु. २५००–३५००' },
    tags: ['number plate', 'embossed', 'प्लेट'],
  }),
  svc({
    slug: 'bus-route-permit',
    category: 'transport',
    providerType: 'gov',
    providerName: 'DoTM / Transport Committee',
    title: { en: 'Public Bus Route Permit', ne: 'सार्वजनिक बस मार्ग अनुमति' },
    summary: {
      en: 'Permit to operate a passenger bus on a specific route.',
      ne: 'तोकिएको मार्गमा बस सञ्चालन गर्ने अनुमति।',
    },
    tags: ['route permit', 'bus', 'मार्ग'],
  }),

  // ─── UTILITIES (5) ───
  svc({
    slug: 'nea-new-connection',
    category: 'utilities',
    providerType: 'utility',
    providerName: 'Nepal Electricity Authority (NEA)',
    title: { en: 'NEA New Electricity Connection', ne: 'NEA नयाँ विद्युत जडान' },
    summary: {
      en: 'Apply for a new meter connection — residential or commercial.',
      ne: 'आवासीय वा व्यावसायिक नयाँ मिटर जडान।',
    },
    feeRange: { en: 'Rs. 2,000–15,000 + deposit', ne: 'रु. २०००–१५००० + धरौटी' },
    officialUrl: 'https://nea.org.np',
    tags: ['nea', 'electricity connection', 'विद्युत जडान'],
  }),
  svc({
    slug: 'kukl-new-connection',
    category: 'utilities',
    providerType: 'utility',
    providerName: 'Kathmandu Upatyaka Khanepani Limited',
    title: { en: 'KUKL New Water Connection', ne: 'KUKL नयाँ खानेपानी जडान' },
    summary: {
      en: 'Apply for a new KUKL household water connection in Kathmandu valley.',
      ne: 'काठमाडौं उपत्यकामा नयाँ पानी जडान।',
    },
    officialUrl: 'https://kathmanduwater.org',
    tags: ['water', 'kukl', 'खानेपानी'],
  }),
  svc({
    slug: 'lpg-booking',
    category: 'utilities',
    providerType: 'private',
    providerName: 'LPG distributors',
    title: { en: 'LPG Cylinder Booking', ne: 'ग्यास सिलिन्डर बुकिङ' },
    summary: {
      en: 'Book a refill cooking gas cylinder through your local distributor.',
      ne: 'स्थानीय वितरकसँग खाना पकाउने ग्यास बुक गर्ने।',
    },
    feeRange: { en: 'MRP ~Rs. 1,895', ne: 'MRP ~रु. १८९५' },
    tags: ['lpg', 'gas', 'ग्यास'],
  }),
  svc({
    slug: 'garbage-collection',
    category: 'utilities',
    providerType: 'gov',
    providerName: 'Local Municipality',
    title: { en: 'Municipal Waste Collection', ne: 'नगरपालिका फोहोर उठाउने सेवा' },
    summary: {
      en: 'Household waste collection subscription through your ward.',
      ne: 'वडा मार्फत घरायसी फोहोर उठाउने सेवा।',
    },
    tags: ['garbage', 'waste', 'फोहोर'],
  }),
  svc({
    slug: 'internet-nt-adsl',
    category: 'utilities',
    providerType: 'utility',
    providerName: 'Nepal Telecom',
    title: { en: 'Nepal Telecom FTTH Internet', ne: 'नेपाल टेलिकम FTTH इन्टरनेट' },
    summary: {
      en: 'Fiber-to-the-home broadband from Nepal Telecom.',
      ne: 'नेपाल टेलिकमको FTTH ब्रोडब्यान्ड।',
    },
    officialUrl: 'https://ntc.net.np',
    tags: ['internet', 'ntc', 'fiber'],
  }),

  // ─── HEALTH (5) ───
  svc({
    slug: 'health-insurance-board',
    category: 'health',
    providerType: 'gov',
    providerName: 'Health Insurance Board',
    title: { en: 'National Health Insurance', ne: 'स्वास्थ्य बीमा' },
    summary: {
      en: 'Enroll a family in the national health insurance scheme (~Rs. 3,500/year for 5 members).',
      ne: '५ सदस्य परिवार वार्षिक ~रु ३५०० मा स्वास्थ्य बीमा।',
    },
    feeRange: { en: 'Rs. 3,500/yr (5 members)', ne: 'रु ३५००/वर्ष' },
    officialUrl: 'https://hib.gov.np',
    tags: ['health insurance', 'बीमा'],
  }),
  svc({
    slug: 'kanti-childrens-hospital',
    category: 'health',
    providerType: 'hospital',
    providerName: 'Kanti Children\u2019s Hospital',
    title: { en: 'Kanti Children\u2019s Hospital OPD', ne: 'कान्ति बालअस्पताल OPD' },
    summary: {
      en: 'Pediatric OPD at Nepal\u2019s largest children\u2019s hospital (Maharajgunj).',
      ne: 'महाराजगञ्जस्थित कान्ति बालअस्पतालमा बालबालिकाको OPD।',
    },
    feeRange: { en: 'Rs. 50 OPD ticket', ne: 'रु. ५० OPD' },
    officialUrl: 'https://kantihospital.gov.np',
    offices: [
      { name: { en: 'Kanti Children\u2019s Hospital', ne: 'कान्ति बाल अस्पताल' }, address: { en: 'Maharajgunj, Kathmandu', ne: 'महाराजगन्ज, काठमाडौँ' }, phone: '01-4411550', hours: { en: 'OPD: Sun\u2013Fri 10:00\u201314:00 \u00b7 Emergency: 24/7', ne: 'OPD: आइत\u2013शुक्र १०:००\u2013२:०० \u00b7 आपतकालीन: २४ घण्टा' }, lat: 27.7352, lng: 85.3310 },
    ],
    tags: ['child', 'pediatric', 'kanti', 'कान्ति', 'बाल अस्पताल'],
  }),
  svc({
    slug: 'maternity-hospital',
    category: 'health',
    providerType: 'hospital',
    providerName: 'Paropakar Maternity Hospital',
    title: { en: 'Paropakar Maternity Hospital', ne: 'परोपकार प्रसूति अस्पताल' },
    summary: {
      en: 'Free maternity services including delivery, ANC and PNC checkups.',
      ne: 'निःशुल्क प्रसूति, ANC र PNC सेवा।',
    },
    officialUrl: 'https://paropakarmaternity.org.np',
    offices: [
      { name: { en: 'Paropakar Maternity & Women\u2019s Hospital', ne: 'परोपकार प्रसूति तथा स्त्री रोग अस्पताल' }, address: { en: 'Thapathali, Kathmandu', ne: 'ठपाथली, काठमाडौँ' }, phone: '01-4252314', hours: { en: 'OPD: Sun\u2013Fri 10:00\u201314:00 \u00b7 Emergency/Delivery: 24/7', ne: 'OPD: आइत\u2013शुक्र १०:००\u2013२:०० \u00b7 आपतकालीन/प्रसूति: २४ घण्टा' }, lat: 27.6912, lng: 85.3198 },
    ],
    tags: ['maternity', 'delivery', 'प्रसूति', 'paropakar', 'परोपकार'],
  }),
  svc({
    slug: 'bharatpur-cancer',
    category: 'health',
    providerType: 'gov',
    providerName: 'B.P. Koirala Memorial Cancer Hospital',
    title: { en: 'B.P. Koirala Cancer Hospital', ne: 'बी.पी. कोइराला स्मृति क्यान्सर अस्पताल' },
    summary: {
      en: 'Nepal\u2019s leading government cancer hospital in Bharatpur, Chitwan.',
      ne: 'चितवन भरतपुरमा सरकारी क्यान्सर अस्पताल।',
    },
    tags: ['cancer', 'oncology', 'क्यान्सर'],
  }),
  svc({
    slug: 'ambulance-102',
    category: 'health',
    providerType: 'gov',
    providerName: 'Nepal Ambulance Service',
    title: { en: 'Ambulance (Call 102)', ne: 'एम्बुलेन्स (१०२)' },
    summary: {
      en: 'Emergency ambulance dispatch by dialing 102 from anywhere in Nepal.',
      ne: '१०२ डायल गरेर एम्बुलेन्स बोलाउने।',
    },
    tags: ['ambulance', 'emergency', 'एम्बुलेन्स'],
  }),

  // ─── TAX (3) ───
  svc({
    slug: 'house-land-tax',
    category: 'tax',
    providerType: 'gov',
    providerName: 'Local Municipality',
    title: { en: 'House & Land Tax', ne: 'घरजग्गा कर' },
    summary: {
      en: 'Annual property tax paid to your municipality.',
      ne: 'नगरपालिकामा बुझाउने वार्षिक घरजग्गा कर।',
    },
    tags: ['property tax', 'land tax', 'घरजग्गा कर'],
  }),
  svc({
    slug: 'ird-taxpayer-portal',
    category: 'tax',
    providerType: 'gov',
    providerName: 'Inland Revenue Department',
    title: { en: 'IRD Taxpayer Portal', ne: 'IRD करदाता पोर्टल' },
    summary: {
      en: 'Online filing of PAN, VAT, TDS and income tax returns.',
      ne: 'PAN, VAT, TDS र आयकर रिटर्न अनलाइन भर्ने।',
    },
    officialUrl: 'https://ird.gov.np',
    tags: ['ird', 'tax', 'कर'],
  }),
  svc({
    slug: 'customs-declaration',
    category: 'tax',
    providerType: 'gov',
    providerName: 'Department of Customs',
    title: { en: 'Customs Declaration', ne: 'भन्सार घोषणा' },
    summary: {
      en: 'Declare imported goods and pay duties at Nepal customs points.',
      ne: 'आयातित सामानको भन्सार घोषणा र शुल्क तिर्ने।',
    },
    officialUrl: 'https://customs.gov.np',
    tags: ['customs', 'import', 'भन्सार'],
  }),

  // ─── BUSINESS (4) ───
  svc({
    slug: 'industry-registration',
    category: 'business',
    providerType: 'gov',
    providerName: 'Department of Industry',
    title: { en: 'Industry Registration', ne: 'उद्योग दर्ता' },
    summary: {
      en: 'Register small, medium or large industry with DoI.',
      ne: 'सानो, मझौला वा ठूलो उद्योग दर्ता।',
    },
    officialUrl: 'https://doind.gov.np',
    tags: ['industry', 'उद्योग'],
  }),
  svc({
    slug: 'cottage-industry',
    category: 'business',
    providerType: 'gov',
    providerName: 'Department of Cottage & Small Industries',
    title: { en: 'Cottage & Small Industry Registration', ne: 'घरेलु तथा साना उद्योग दर्ता' },
    summary: {
      en: 'Register a cottage or small-scale enterprise (handicraft, tailoring, food).',
      ne: 'घरेलु वा साना उद्योग दर्ता।',
    },
    officialUrl: 'https://dcsi.gov.np',
    tags: ['cottage', 'small industry', 'घरेलु'],
  }),
  svc({
    slug: 'fssai-food-license',
    category: 'business',
    providerType: 'gov',
    providerName: 'Department of Food Technology',
    title: { en: 'Food Business License (DFTQC)', ne: 'खाद्य व्यवसाय इजाजत (DFTQC)' },
    summary: {
      en: 'Mandatory food safety license for restaurants, bakeries, processors.',
      ne: 'रेस्टुरेन्ट, बेकरी र प्रशोधकहरूका लागि खाद्य इजाजत।',
    },
    officialUrl: 'https://dftqc.gov.np',
    tags: ['food license', 'dftqc', 'खाद्य'],
  }),
  svc({
    slug: 'tourism-trekking-permit',
    category: 'business',
    providerType: 'gov',
    providerName: 'Nepal Tourism Board',
    title: { en: 'TIMS / Trekking Permit', ne: 'TIMS / ट्रेकिङ अनुमति' },
    summary: {
      en: 'Trekkers\u2019 Information Management System card required on most trekking routes.',
      ne: 'अधिकांश ट्रेकिङ मार्गमा TIMS कार्ड अनिवार्य।',
    },
    officialUrl: 'https://ntb.gov.np',
    tags: ['tims', 'trekking', 'ट्रेकिङ'],
  }),

  // ─── LAND (3) ───
  svc({
    slug: 'land-valuation',
    category: 'land',
    providerType: 'gov',
    providerName: 'Land Revenue Office',
    title: { en: 'Government Land Valuation (Minimum Rate)', ne: 'सरकारी मूल्यांकन (न्यूनतम दर)' },
    summary: {
      en: 'Look up government minimum valuation used for land tax and transfers.',
      ne: 'जग्गा कर र हस्तान्तरणका लागि सरकारी न्यूनतम मूल्यांकन।',
    },
    tags: ['land value', 'मूल्यांकन'],
  }),
  svc({
    slug: 'land-measurement',
    category: 'land',
    providerType: 'gov',
    providerName: 'Survey Office',
    title: { en: 'Land Survey / Measurement', ne: 'जग्गा नाप नक्सा' },
    summary: {
      en: 'Official survey and boundary measurement of a land parcel.',
      ne: 'जग्गाको नाप र सिमाना निर्धारण।',
    },
    tags: ['survey', 'नाप'],
  }),
  svc({
    slug: 'land-inheritance',
    category: 'land',
    providerType: 'gov',
    providerName: 'Land Revenue Office',
    title: { en: 'Land Inheritance Transfer (Dakhil Kharij)', ne: 'अंशबण्डा / दाखिल खारिज' },
    summary: {
      en: 'Transfer inherited land to heirs in the Land Revenue Office records.',
      ne: 'मृतकको जग्गा हकदारको नाममा सार्ने प्रक्रिया।',
    },
    tags: ['inheritance', 'दाखिल खारिज'],
  }),

  // ─── BANKING (3) ───
  svc({
    slug: 'esewa-wallet',
    category: 'banking',
    providerType: 'private',
    providerName: 'eSewa',
    title: { en: 'eSewa Digital Wallet', ne: 'eSewa डिजिटल वालेट' },
    summary: {
      en: 'Nepal\u2019s largest digital wallet for payments, transfers and bills.',
      ne: 'नेपालको सबैभन्दा ठूलो डिजिटल वालेट।',
    },
    officialUrl: 'https://esewa.com.np',
    tags: ['esewa', 'wallet', 'डिजिटल'],
  }),
  svc({
    slug: 'khalti-wallet',
    category: 'banking',
    providerType: 'private',
    providerName: 'Khalti',
    title: { en: 'Khalti Digital Wallet', ne: 'Khalti डिजिटल वालेट' },
    summary: {
      en: 'Popular digital wallet for bill pay, top-ups and online shopping.',
      ne: 'बिल तिर्ने, रिचार्ज र किनमेलका लागि लोकप्रिय वालेट।',
    },
    officialUrl: 'https://khalti.com',
    tags: ['khalti', 'wallet'],
  }),
  svc({
    slug: 'remittance-inward',
    category: 'banking',
    providerType: 'private',
    providerName: 'Banks / Remittance Companies',
    title: { en: 'Inward Remittance Collection', ne: 'विदेशबाट रेमिट्यान्स बुझ्ने' },
    summary: {
      en: 'Receive money sent from abroad via banks or remittance agents.',
      ne: 'विदेशबाट पैसा बुझ्ने।',
    },
    tags: ['remittance', 'रेमिट्यान्स'],
  }),

  // ─── EDUCATION (3) ───
  svc({
    slug: 'noc-foreign-study',
    category: 'education',
    providerType: 'gov',
    providerName: 'Ministry of Education',
    title: { en: 'No Objection Certificate (NOC) — Foreign Study', ne: 'विदेश अध्ययनका लागि NOC' },
    summary: {
      en: 'Mandatory NOC for Nepali students planning to study abroad.',
      ne: 'विदेश पढ्न जाने विद्यार्थीका लागि अनिवार्य NOC।',
    },
    feeRange: { en: 'Rs. 2,000', ne: 'रु. २०००' },
    officialUrl: 'https://moest.gov.np',
    tags: ['noc', 'foreign study', 'विदेश'],
  }),
  svc({
    slug: 'scholarship-portal',
    category: 'education',
    providerType: 'gov',
    providerName: 'Ministry of Education',
    title: { en: 'Government Scholarship Portal', ne: 'सरकारी छात्रवृत्ति पोर्टल' },
    summary: {
      en: 'Apply for government-funded scholarships for domestic and foreign study.',
      ne: 'सरकारी छात्रवृत्तिका लागि आवेदन।',
    },
    tags: ['scholarship', 'छात्रवृत्ति'],
  }),
  svc({
    slug: 'loksewa-application',
    category: 'education',
    providerType: 'gov',
    providerName: 'Public Service Commission',
    title: { en: 'Lok Sewa Application (Civil Service Exam)', ne: 'लोकसेवा आवेदन' },
    summary: {
      en: 'Apply online for Public Service Commission vacancies.',
      ne: 'लोकसेवा आयोगमा अनलाइन आवेदन।',
    },
    officialUrl: 'https://psc.gov.np',
    tags: ['loksewa', 'civil service', 'लोकसेवा'],
  }),

  // ─── LEGAL (4) ───
  svc({
    slug: 'legal-aid',
    category: 'legal',
    providerType: 'gov',
    providerName: 'Nepal Bar Association Legal Aid',
    title: { en: 'Free Legal Aid', ne: 'निःशुल्क कानुनी सहायता' },
    summary: {
      en: 'Free legal consultation for low-income citizens.',
      ne: 'विपन्न नागरिकका लागि निःशुल्क कानुनी सहायता।',
    },
    tags: ['legal aid', 'कानुनी सहायता'],
  }),
  svc({
    slug: 'right-to-information',
    category: 'legal',
    providerType: 'gov',
    providerName: 'National Information Commission',
    title: { en: 'Right to Information Request', ne: 'सूचनाको हक अनुरोध' },
    summary: {
      en: 'File an RTI request to any public body under the 2007 Act.',
      ne: 'सार्वजनिक निकायबाट सूचना माग्ने।',
    },
    feeRange: { en: 'Rs. 5/page', ne: 'रु. ५ प्रति पेज' },
    officialUrl: 'https://nic.gov.np',
    tags: ['rti', 'सूचनाको हक'],
  }),
  svc({
    slug: 'ciaa-complaint',
    category: 'legal',
    providerType: 'gov',
    providerName: 'Commission for Investigation of Abuse of Authority',
    title: { en: 'File Corruption Complaint (CIAA)', ne: 'अख्तियारमा उजुरी' },
    summary: {
      en: 'Report bribery and abuse of authority to the CIAA.',
      ne: 'अख्तियार दुरुपयोगको उजुरी अख्तियारमा।',
    },
    officialUrl: 'https://ciaa.gov.np',
    tags: ['ciaa', 'corruption', 'अख्तियार'],
  }),
  svc({
    slug: 'human-rights-complaint',
    category: 'legal',
    providerType: 'gov',
    providerName: 'National Human Rights Commission',
    title: { en: 'Human Rights Complaint (NHRC)', ne: 'मानव अधिकार उजुरी (NHRC)' },
    summary: {
      en: 'File a human rights violation complaint with NHRC.',
      ne: 'मानव अधिकार उल्लंघनको उजुरी।',
    },
    officialUrl: 'https://nhrcnepal.org',
    tags: ['nhrc', 'human rights', 'मानव अधिकार'],
  }),
];
