/**
 * Nepal Republic — Week 3 seed: 30 more services.
 * Split into a second file to keep the main seed-data.ts readable.
 * Merged via getAllSeedServices() in seed-data-all.ts.
 */

import type { Service } from './types';

const V = '2026-04-08';

const BLANK = { documents: [], steps: [], offices: [], commonProblems: [], faqs: [], tags: [] };

/* Minimal service helper so we stay concise but consistent */
type MiniService = Partial<Service> & Pick<Service, 'slug' | 'category' | 'providerType' | 'providerName' | 'title' | 'summary'>;

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

export const EXTRA_SERVICES: Service[] = [
  // ─── IDENTITY ───
  svc({
    slug: 'national-id-nid',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Department of National ID and Civil Registration',
    title: { en: 'National ID Card (NID)', ne: 'राष्ट्रिय परिचय पत्र (NID)' },
    summary: {
      en: 'Biometric national identity card. Being rolled out district by district. Required for many services over time.',
      ne: 'बायोमेट्रिक राष्ट्रिय परिचय पत्र। जिल्लाजिल्लामा क्रमशः लागू हुँदैछ।',
    },
    estimatedTime: { en: '~1 hour on enrollment day + 30–60 days delivery', ne: 'नामांकन दिन १ घण्टा + ३०–६० दिन डेलिभरी' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://donidcr.gov.np',
    documents: [
      { title: { en: 'Citizenship (original + copy)', ne: 'नागरिकता (सक्कल + प्रतिलिपि)' }, required: true },
      { title: { en: 'Birth certificate', ne: 'जन्मदर्ता' }, required: false },
    ],
    steps: [
      { order: 1, title: { en: 'Wait for ward-level enrollment camp', ne: 'वडा स्तरको नामांकन शिविर पर्खनुहोस्' }, detail: { en: 'Camps scheduled ward by ward; announced locally.', ne: 'वडागत रुपमा तालिका बन्छ; स्थानीय रुपमा सूचना दिइन्छ।' } },
      { order: 2, title: { en: 'Go to DAO or enrollment center', ne: 'DAO वा नामांकन केन्द्र जानुहोस्' }, detail: { en: 'Fingerprints + iris + photo captured.', ne: 'फिंगरप्रिन्ट + आँखा + फोटो लिइन्छ।' } },
      { order: 3, title: { en: 'Collect card', ne: 'कार्ड लिनुहोस्' }, detail: { en: 'Delivered to DAO or ward office.', ne: 'DAO वा वडा कार्यालयमा पुग्छ।' } },
    ],
    tags: ['nid', 'national id', 'identity', 'परिचय'],
  }),
  svc({
    slug: 'birth-registration',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Ward Office (Local Registrar)',
    title: { en: 'Birth Registration Certificate', ne: 'जन्मदर्ता प्रमाणपत्र' },
    summary: {
      en: 'Legal birth registration at the ward where birth occurred. Must be done within 35 days to avoid late fee.',
      ne: 'जन्म भएको वडामा जन्मदर्ता। ३५ दिनभित्र नगरे जरिवाना लाग्छ।',
    },
    estimatedTime: { en: 'Same day', ne: 'एकै दिन' },
    feeRange: { en: 'Free (within 35 days) · Rs. 50–500 late', ne: 'निःशुल्क (३५ दिनभित्र) · रु. ५०–५०० ढिलो' },
    documents: [
      { title: { en: 'Hospital discharge letter / birth proof', ne: 'अस्पताल डिस्चार्ज / जन्म प्रमाण' }, required: true },
      { title: { en: "Parents' citizenship + marriage cert", ne: 'अभिभावकको नागरिकता + विवाहदर्ता' }, required: true },
    ],
    tags: ['birth', 'janma darta', 'ward', 'जन्मदर्ता'],
  }),
  svc({
    slug: 'marriage-registration',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Ward Office (Local Registrar)',
    title: { en: 'Marriage Registration Certificate', ne: 'विवाहदर्ता प्रमाणपत्र' },
    summary: {
      en: 'Register your marriage at the ward where the couple resides. Required for passport, foreign travel, joint bank accounts.',
      ne: 'दम्पतीको निवास वडामा विवाहदर्ता। पासपोर्ट, विदेश भ्रमण, संयुक्त खाताका लागि चाहिन्छ।',
    },
    estimatedTime: { en: 'Same day', ne: 'एकै दिन' },
    feeRange: { en: 'Rs. 100–500', ne: 'रु. १००–५००' },
    documents: [
      { title: { en: 'Citizenship of both spouses', ne: 'दुवैको नागरिकता' }, required: true },
      { title: { en: '2 witnesses with citizenship', ne: '२ साक्षी नागरिकता सहित' }, required: true },
      { title: { en: 'Photos of couple', ne: 'दम्पतीको फोटो' }, required: true },
    ],
    tags: ['marriage', 'bibaha darta', 'विवाहदर्ता'],
  }),
  svc({
    slug: 'migration-certificate',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Ward Office',
    title: { en: 'Migration (Bardaasi) Certificate', ne: 'बसाइँ-सराइ प्रमाणपत्र' },
    summary: {
      en: 'Official certificate when you move from one ward to another permanently. Needed for voter list updates, new ration.',
      ne: 'एक वडाबाट अर्को वडामा स्थायी बसाइँ सर्दा आवश्यक। मतदाता नामावली अद्यावधिक, राशनका लागि।',
    },
    estimatedTime: { en: 'Same day (both wards)', ne: 'एकै दिन (दुवै वडा)' },
    feeRange: { en: 'Rs. 100–300', ne: 'रु. १००–३००' },
    tags: ['migration', 'bardaasi', 'basai sarai', 'बसाइँसराइ'],
  }),
  svc({
    slug: 'police-report',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Nepal Police',
    title: { en: 'Police Character / Clearance Report', ne: 'प्रहरी प्रमाणपत्र' },
    summary: {
      en: 'Police background check required for foreign employment, visa applications, some jobs.',
      ne: 'वैदेशिक रोजगार, भिसा आवेदन, केही जागिरका लागि प्रहरी पृष्ठभूमि जाँच।',
    },
    estimatedTime: { en: '3–7 working days', ne: '३–७ कार्यदिन' },
    feeRange: { en: 'Rs. 500–1,000', ne: 'रु. ५००–१,०००' },
    officialUrl: 'https://www.nepalpolice.gov.np',
    tags: ['police report', 'clearance', 'background check', 'प्रहरी'],
  }),

  // ─── TRANSPORT ───
  svc({
    slug: 'bike-bluebook-renewal',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Department of Transport Management',
    title: { en: 'Bike/Car Bluebook Renewal', ne: 'बाइक/कार बिलबुक नवीकरण' },
    summary: {
      en: 'Annual vehicle tax + bluebook renewal. Must be done before Ashadh (mid-July) or penalty applies.',
      ne: 'वार्षिक सवारी कर र बिलबुक नवीकरण। असारभित्र गर्नुपर्छ।',
    },
    estimatedTime: { en: '1–2 hours', ne: '१–२ घण्टा' },
    feeRange: { en: 'Bike: Rs. 3,000–5,500 · Car: Rs. 21,000–55,000', ne: 'बाइक: रु. ३,०००–५,५०० · कार: रु. २१,०००–५५,०००' },
    documents: [
      { title: { en: 'Old bluebook', ne: 'पुरानो बिलबुक' }, required: true },
      { title: { en: 'Third-party insurance (valid)', ne: 'तेस्रो पक्ष बीमा (मान्य)' }, required: true },
      { title: { en: 'Pollution certificate', ne: 'प्रदूषण प्रमाणपत्र' }, required: true },
      { title: { en: 'Citizenship', ne: 'नागरिकता' }, required: true },
    ],
    tags: ['bluebook', 'bilbook', 'vehicle tax', 'बिलबुक', 'सवारी कर'],
  }),
  svc({
    slug: 'drivers-license-trial',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Department of Transport Management',
    title: { en: "New Driver's License (Trial)", ne: 'नयाँ सवारी चालक अनुमतिपत्र (ट्रायल)' },
    summary: {
      en: 'Get your first smart driving license. Written test + practical test (trial) required.',
      ne: 'पहिलो पटक स्मार्ट लाइसेन्स। लिखित + प्रयोगात्मक (ट्रायल) परीक्षा चाहिन्छ।',
    },
    estimatedTime: { en: '2–4 months (book → trial → card)', ne: '२–४ महिना (बुक → ट्रायल → कार्ड)' },
    feeRange: { en: 'Rs. 1,000–2,500', ne: 'रु. १,०००–२,५००' },
    documents: [
      { title: { en: 'Citizenship (18+)', ne: 'नागरिकता (१८+)' }, required: true },
      { title: { en: 'Medical certificate (blood group)', ne: 'स्वास्थ्य प्रमाणपत्र (रगत समूह)' }, required: true },
      { title: { en: '2 passport photos', ne: '२ पासपोर्ट फोटो' }, required: true },
    ],
    tags: ['license trial', 'new license', 'driving test', 'ट्रायल'],
  }),
  svc({
    slug: 'route-permit',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Department of Transport Management',
    title: { en: 'Commercial Route Permit', ne: 'रुट परमिट (व्यावसायिक)' },
    summary: {
      en: 'Permission to operate taxi, bus, or microbus on a specific route.',
      ne: 'ट्याक्सी, बस, माइक्रो सञ्चालनका लागि निश्चित रुटमा अनुमति।',
    },
    estimatedTime: { en: '2–8 weeks', ne: '२–८ हप्ता' },
    feeRange: { en: 'Rs. 5,000+ (varies)', ne: 'रु. ५,०००+ (फरक)' },
    tags: ['route permit', 'taxi', 'bus', 'commercial', 'रुट'],
  }),
  svc({
    slug: 'vehicle-registration',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Department of Transport Management',
    title: { en: 'New Vehicle Registration', ne: 'नयाँ सवारी दर्ता' },
    summary: {
      en: 'Register a newly purchased vehicle and get bluebook + number plate.',
      ne: 'नयाँ किनेको सवारी दर्ता गरी बिलबुक र नम्बर प्लेट लिनुहोस्।',
    },
    estimatedTime: { en: '2–4 weeks', ne: '२–४ हप्ता' },
    feeRange: { en: 'Varies by cc + price (~2–5% of vehicle cost)', ne: 'सिसी र मूल्यअनुसार (~२–५%)' },
    documents: [
      { title: { en: 'Dealer invoice (purjiyo)', ne: 'पसल बिल (पुर्जा)' }, required: true },
      { title: { en: 'Customs clearance (imported)', ne: 'भन्सार प्रमाण (आयातित)' }, required: false },
      { title: { en: 'Insurance policy', ne: 'बीमा पोलिसी' }, required: true },
      { title: { en: 'Citizenship', ne: 'नागरिकता' }, required: true },
    ],
    tags: ['vehicle registration', 'new vehicle', 'नयाँ सवारी'],
  }),

  // ─── TAX ───
  svc({
    slug: 'vat-registration',
    category: 'tax',
    providerType: 'gov',
    providerName: 'Inland Revenue Department',
    title: { en: 'VAT Registration', ne: 'मूल्य अभिवृद्धि कर (VAT) दर्ता' },
    summary: {
      en: 'Mandatory if annual turnover exceeds Rs. 50 lakh (goods) or Rs. 30 lakh (services). Voluntary otherwise.',
      ne: 'वार्षिक कारोबार रु. ५० लाख (वस्तु) वा रु. ३० लाख (सेवा) भन्दा बढी भए अनिवार्य।',
    },
    estimatedTime: { en: '3–5 working days', ne: '३–५ कार्यदिन' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://ird.gov.np',
    documents: [
      { title: { en: 'Company PAN', ne: 'कम्पनी PAN' }, required: true },
      { title: { en: 'Company registration certificate', ne: 'कम्पनी दर्ता प्रमाणपत्र' }, required: true },
      { title: { en: 'Rent agreement / location proof', ne: 'भाडा सम्झौता / स्थान प्रमाण' }, required: true },
    ],
    tags: ['vat', 'tax', 'ird', 'कर', 'मूल्य अभिवृद्धि'],
  }),
  svc({
    slug: 'income-tax-filing',
    category: 'tax',
    providerType: 'gov',
    providerName: 'Inland Revenue Department',
    title: { en: 'Annual Income Tax Filing', ne: 'वार्षिक आयकर विवरण' },
    summary: {
      en: 'File your annual income tax return (D-01 for individuals, D-03 for companies). Deadline: end of Poush.',
      ne: 'वार्षिक आयकर विवरण पेश गर्नुहोस् (व्यक्तिका लागि D-०१, कम्पनीका लागि D-०३)। अन्तिम म्याद: पुस मसान्त।',
    },
    estimatedTime: { en: '30 min (online)', ne: 'अनलाइन ३० मिनेट' },
    feeRange: { en: 'Free to file', ne: 'दर्ता निःशुल्क' },
    officialUrl: 'https://taxpayerportal.ird.gov.np',
    tags: ['income tax', 'd-01', 'ird', 'tax return', 'आयकर'],
  }),
  svc({
    slug: 'pan-business',
    category: 'tax',
    providerType: 'gov',
    providerName: 'Inland Revenue Department',
    title: { en: 'Business PAN', ne: 'व्यावसायिक PAN' },
    summary: {
      en: 'PAN for a sole proprietorship or company. Required before opening bank account in business name.',
      ne: 'एकल स्वामित्व वा कम्पनीको PAN। व्यवसायको नाममा बैंक खाता खोल्न आवश्यक।',
    },
    estimatedTime: { en: '1–2 days', ne: '१–२ दिन' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    tags: ['pan', 'business', 'ird', 'व्यावसायिक प्यान'],
  }),

  // ─── HEALTH ───
  svc({
    slug: 'patan-hospital-opd',
    category: 'health',
    providerType: 'hospital',
    providerName: 'Patan Hospital',
    title: { en: 'Patan Hospital OPD', ne: 'पाटन अस्पताल OPD' },
    summary: {
      en: 'Major teaching + service hospital in Lalitpur. Government + mission funded.',
      ne: 'ललितपुरको प्रमुख शिक्षण एवं सेवा अस्पताल।',
    },
    estimatedTime: { en: '1–3 hours', ne: '१–३ घण्टा' },
    feeRange: { en: 'OPD Rs. 50 + specialist Rs. 300–800', ne: 'OPD रु. ५० + विशेषज्ञ रु. ३००–८००' },
    officialUrl: 'https://patanhospital.gov.np',
    offices: [
      { name: { en: 'Patan Hospital, Lagankhel', ne: 'पाटन अस्पताल, लगनखेल' }, address: { en: 'Lagankhel, Lalitpur', ne: 'लगनखेल, ललितपुर' }, phone: '01-5522266', hours: { en: 'OPD: Sun–Fri 8:30 – 14:00', ne: 'OPD: आइत–शुक्र ८:३० – २:००' }, lat: 27.6674, lng: 85.3247 },
    ],
    tags: ['patan hospital', 'opd', 'lalitpur', 'पाटन अस्पताल'],
  }),
  svc({
    slug: 'civil-hospital-opd',
    category: 'health',
    providerType: 'hospital',
    providerName: 'Civil Service Hospital',
    title: { en: 'Civil Service Hospital OPD', ne: 'सिभिल अस्पताल OPD' },
    summary: {
      en: 'Government hospital at Minbhawan. Serves civil servants on insurance but open to all.',
      ne: 'मिनभवनको सरकारी अस्पताल। निजामती कर्मचारीका लागि बीमा तर सबैलाई खुला।',
    },
    estimatedTime: { en: '1–3 hours', ne: '१–३ घण्टा' },
    feeRange: { en: 'Rs. 50–500', ne: 'रु. ५०–५००' },
    offices: [
      { name: { en: 'Civil Hospital Minbhawan', ne: 'सिभिल अस्पताल मिनभवन' }, address: { en: 'Minbhawan, Kathmandu', ne: 'मिनभवन, काठमाडौँ' }, phone: '01-4107000', hours: { en: 'Sun–Fri 8:00 – 14:00', ne: 'आइत–शुक्र ८:०० – २:००' }, lat: 27.6930, lng: 85.3436 },
    ],
    tags: ['civil hospital', 'opd', 'minbhawan', 'सिभिल अस्पताल'],
  }),
  svc({
    slug: 'vaccination-child',
    category: 'health',
    providerType: 'gov',
    providerName: 'Ministry of Health and Population',
    title: { en: 'Child Vaccination Schedule', ne: 'बाल खोप तालिका' },
    summary: {
      en: 'Free childhood vaccines (BCG, Polio, DPT, MR, etc.) at government health posts and hospitals.',
      ne: 'सरकारी स्वास्थ्य चौकी र अस्पतालमा निःशुल्क बाल खोप (BCG, पोलियो, DPT, MR आदि)।',
    },
    estimatedTime: { en: '15–30 min per visit', ne: 'प्रत्येक पटक १५–३० मिनेट' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    documents: [
      { title: { en: 'Child birth record / vaccination card', ne: 'बच्चाको जन्मरेकर्ड / खोप कार्ड' }, required: true },
    ],
    tags: ['vaccination', 'child', 'immunization', 'खोप'],
  }),

  // ─── UTILITIES ───
  svc({
    slug: 'ntc-sim-new',
    category: 'utilities',
    providerType: 'telecom',
    providerName: 'Nepal Telecom',
    title: { en: 'New NTC SIM Card', ne: 'नयाँ NTC SIM' },
    summary: {
      en: 'Get a new prepaid or postpaid Nepal Telecom SIM card.',
      ne: 'नयाँ प्रिपेड वा पोस्टपेड NTC SIM लिनुहोस्।',
    },
    estimatedTime: { en: '15 minutes', ne: '१५ मिनेट' },
    feeRange: { en: 'Rs. 200 (prepaid)', ne: 'रु. २०० (प्रिपेड)' },
    officialUrl: 'https://www.ntc.net.np',
    documents: [
      { title: { en: 'Citizenship (original)', ne: 'नागरिकता (सक्कल)' }, required: true },
      { title: { en: '1 passport photo', ne: '१ पासपोर्ट फोटो' }, required: true },
    ],
    tags: ['ntc', 'sim', 'prepaid', 'nepal telecom'],
  }),
  svc({
    slug: 'ncell-sim-new',
    category: 'utilities',
    providerType: 'telecom',
    providerName: 'Ncell',
    title: { en: 'New Ncell SIM Card', ne: 'नयाँ Ncell SIM' },
    summary: {
      en: 'Get a new prepaid Ncell SIM. Available at Ncell centers and authorized retailers.',
      ne: 'नयाँ प्रिपेड Ncell SIM। Ncell सेन्टर र अधिकृत रिटेलरमा उपलब्ध।',
    },
    estimatedTime: { en: '15 minutes', ne: '१५ मिनेट' },
    feeRange: { en: 'Rs. 100–200', ne: 'रु. १००–२००' },
    officialUrl: 'https://www.ncell.axiata.com',
    documents: [
      { title: { en: 'Citizenship (original)', ne: 'नागरिकता (सक्कल)' }, required: true },
      { title: { en: '1 passport photo', ne: '१ पासपोर्ट फोटो' }, required: true },
    ],
    tags: ['ncell', 'sim', 'prepaid'],
  }),
  svc({
    slug: 'worldlink-internet',
    category: 'utilities',
    providerType: 'private',
    providerName: 'WorldLink Communications',
    title: { en: 'WorldLink Home Internet', ne: 'वर्ल्डलिंक घर इन्टरनेट' },
    summary: {
      en: 'Home fiber internet connection. Installation in 1–7 days depending on area.',
      ne: 'घरको फाइबर इन्टरनेट। स्थानअनुसार १–७ दिनमा जडान।',
    },
    estimatedTime: { en: '1–7 days', ne: '१–७ दिन' },
    feeRange: { en: 'Rs. 1,200–3,500/month + installation', ne: 'रु. १,२००–३,५००/महिना + जडान' },
    officialUrl: 'https://worldlink.com.np',
    tags: ['worldlink', 'internet', 'fiber', 'isp'],
  }),

  // ─── BUSINESS ───
  svc({
    slug: 'trademark-registration',
    category: 'business',
    providerType: 'gov',
    providerName: 'Department of Industry',
    title: { en: 'Trademark Registration', ne: 'ट्रेडमार्क दर्ता' },
    summary: {
      en: 'Protect your brand name / logo. Registered with Department of Industry.',
      ne: 'आफ्नो ब्रान्ड नाम / लोगो सुरक्षित गर्न। उद्योग विभागमा दर्ता।',
    },
    estimatedTime: { en: '6–18 months', ne: '६–१८ महिना' },
    feeRange: { en: 'Rs. 1,000 application + Rs. 10,000+ registration', ne: 'रु. १,००० आवेदन + रु. १०,०००+ दर्ता' },
    officialUrl: 'https://doind.gov.np',
    tags: ['trademark', 'brand', 'intellectual property'],
  }),
  svc({
    slug: 'sole-proprietorship',
    category: 'business',
    providerType: 'gov',
    providerName: 'Ward Office / Municipality',
    title: { en: 'Sole Proprietorship Registration', ne: 'एकल स्वामित्व दर्ता' },
    summary: {
      en: 'Simplest form of business registration. Done at local ward / municipality.',
      ne: 'सबैभन्दा सरल व्यवसाय दर्ता। वडा/नगरपालिकामा।',
    },
    estimatedTime: { en: '1–3 days', ne: '१–३ दिन' },
    feeRange: { en: 'Rs. 500–2,000', ne: 'रु. ५००–२,०००' },
    documents: [
      { title: { en: 'Citizenship', ne: 'नागरिकता' }, required: true },
      { title: { en: 'Location / rent agreement', ne: 'स्थान / भाडा सम्झौता' }, required: true },
      { title: { en: '2 photos', ne: '२ फोटो' }, required: true },
    ],
    tags: ['sole proprietor', 'firm registration', 'एकल स्वामित्व'],
  }),
  svc({
    slug: 'ngo-registration',
    category: 'business',
    providerType: 'gov',
    providerName: 'District Administration Office',
    title: { en: 'NGO Registration', ne: 'गैरसरकारी संस्था (NGO) दर्ता' },
    summary: {
      en: 'Register a non-profit at your district DAO under the Associations Registration Act.',
      ne: 'संस्था दर्ता ऐन अनुसार जिल्ला प्रशासन कार्यालयमा गैरसरकारी संस्था दर्ता।',
    },
    estimatedTime: { en: '2–4 weeks', ne: '२–४ हप्ता' },
    feeRange: { en: 'Rs. 1,000–3,000', ne: 'रु. १,०००–३,०००' },
    documents: [
      { title: { en: 'Constitution / bylaws', ne: 'विधान' }, required: true },
      { title: { en: 'Minimum 7 founders + citizenship', ne: 'न्यूनतम ७ संस्थापक + नागरिकता' }, required: true },
      { title: { en: 'Meeting minute electing committee', ne: 'समिति चयन गरिएको माइन्युट' }, required: true },
    ],
    tags: ['ngo', 'non-profit', 'association', 'संस्था'],
  }),

  // ─── LAND ───
  svc({
    slug: 'land-parcha',
    category: 'land',
    providerType: 'gov',
    providerName: 'Survey Office (Napi Karyalaya)',
    title: { en: 'Land Parcha / Trace Map', ne: 'नाप नक्सा / पर्चा' },
    summary: {
      en: 'Official parcel map and measurements from the Survey Office. Needed for sale, loans, boundary disputes.',
      ne: 'नापी कार्यालयबाट आधिकारिक जग्गा नक्सा र नाप। बिक्री, ऋण, सीमा विवादका लागि।',
    },
    estimatedTime: { en: '1–7 days', ne: '१–७ दिन' },
    feeRange: { en: 'Rs. 500–2,000', ne: 'रु. ५००–२,०००' },
    documents: [
      { title: { en: 'Dhani purja', ne: 'धनी पुर्जा' }, required: true },
      { title: { en: 'Citizenship', ne: 'नागरिकता' }, required: true },
    ],
    tags: ['parcha', 'napi', 'survey', 'नापी', 'पर्चा'],
  }),
  svc({
    slug: 'land-mutation',
    category: 'land',
    providerType: 'gov',
    providerName: 'Malpot Karyalaya',
    title: { en: 'Land Mutation (Namsari)', ne: 'जग्गा नामसारी' },
    summary: {
      en: 'Transfer ownership on the land records after inheritance, gift, or court order.',
      ne: 'हकबाली, दानपत्र वा अदालतको आदेशपछि जग्गा स्वामित्व सार्ने।',
    },
    estimatedTime: { en: '1–2 weeks', ne: '१–२ हप्ता' },
    feeRange: { en: 'Varies (inheritance cheaper)', ne: 'फरक (हकबाली सस्तो)' },
    documents: [
      { title: { en: 'Death certificate (inheritance)', ne: 'मृत्यु दर्ता (हकबाली)' }, required: false },
      { title: { en: 'Relationship proof', ne: 'नाता प्रमाण' }, required: true },
      { title: { en: 'Ward recommendation', ne: 'वडा सिफारिस' }, required: true },
    ],
    tags: ['mutation', 'namsari', 'inheritance', 'नामसारी'],
  }),

  // ─── BANKING ───
  svc({
    slug: 'bank-account-opening',
    category: 'banking',
    providerType: 'bank',
    providerName: 'Any Commercial Bank (NIC Asia, Nabil, NIBL, etc.)',
    title: { en: 'Open a Bank Account', ne: 'बैंक खाता खोल्ने' },
    summary: {
      en: 'Open a savings account at any commercial bank. Most offer same-day account opening.',
      ne: 'कुनै पनि वाणिज्य बैंकमा बचत खाता। अधिकांशले एकै दिन खाता खोल्छन्।',
    },
    estimatedTime: { en: '30 min – 2 hours', ne: '३० मिनेट – २ घण्टा' },
    feeRange: { en: 'Rs. 0–500 minimum balance (depends on product)', ne: 'रु. ०–५०० न्यूनतम शेष (उत्पादनअनुसार)' },
    documents: [
      { title: { en: 'Citizenship', ne: 'नागरिकता' }, required: true },
      { title: { en: '2 passport photos', ne: '२ पासपोर्ट फोटो' }, required: true },
      { title: { en: 'Address proof (utility bill)', ne: 'ठेगाना प्रमाण (बिल)' }, required: false },
      { title: { en: 'Nominee citizenship + photo', ne: 'नोमिनी नागरिकता + फोटो' }, required: true },
    ],
    tags: ['bank account', 'savings', 'kyc', 'बैंक खाता'],
  }),
  svc({
    slug: 'forex-card-nrb',
    category: 'banking',
    providerType: 'bank',
    providerName: 'Nepal Rastra Bank / Commercial Banks',
    title: { en: 'Forex Card / Travel Exchange', ne: 'विदेशी मुद्रा / विदेश भ्रमण सटही' },
    summary: {
      en: 'NRB allows USD 2,500/year for personal travel per passport. Available at any commercial bank.',
      ne: 'NRB ले वार्षिक USD २,५०० प्रति पासपोर्ट व्यक्तिगत भ्रमणका लागि अनुमति दिन्छ। वाणिज्य बैंकमा उपलब्ध।',
    },
    estimatedTime: { en: '1–2 hours', ne: '१–२ घण्टा' },
    feeRange: { en: 'Bank charges Rs. 500–1,500', ne: 'बैंक शुल्क रु. ५००–१,५००' },
    documents: [
      { title: { en: 'Valid passport', ne: 'मान्य राहदानी' }, required: true },
      { title: { en: 'Visa or travel tickets', ne: 'भिसा वा टिकट' }, required: true },
    ],
    tags: ['forex', 'travel', 'nrb', 'usd', 'विदेशी मुद्रा'],
  }),

  // ─── EDUCATION ───
  svc({
    slug: 'see-results',
    category: 'education',
    providerType: 'gov',
    providerName: 'National Examination Board (NEB)',
    title: { en: 'SEE Results & Transcript', ne: 'SEE नतिजा र प्रमाणपत्र' },
    summary: {
      en: 'Check SEE results online and get mark sheet / transcript from NEB.',
      ne: 'अनलाइन SEE नतिजा र मार्कसिट / प्रमाणपत्र NEB बाट।',
    },
    estimatedTime: { en: 'Results: instant · Hard copy: 1–4 weeks', ne: 'नतिजा: तत्काल · हार्ड कपी: १–४ हप्ता' },
    feeRange: { en: 'Online: free · Hard copy: Rs. 200–500', ne: 'अनलाइन: निःशुल्क · हार्ड कपी: रु. २००–५००' },
    officialUrl: 'https://see.ntc.net.np',
    tags: ['see', 'results', 'neb', 'transcript', 'नतिजा'],
  }),
  svc({
    slug: 'tu-transcript',
    category: 'education',
    providerType: 'gov',
    providerName: 'Tribhuvan University',
    title: { en: 'TU Transcript / Certificate', ne: 'TU ट्रान्सक्रिप्ट / प्रमाणपत्र' },
    summary: {
      en: 'Get official TU transcript/certificate. Needed for jobs, higher studies abroad.',
      ne: 'आधिकारिक TU ट्रान्सक्रिप्ट / प्रमाणपत्र। रोजगार, विदेश अध्ययनका लागि।',
    },
    estimatedTime: { en: '2–8 weeks', ne: '२–८ हप्ता' },
    feeRange: { en: 'Rs. 500–2,000', ne: 'रु. ५००–२,०००' },
    officialUrl: 'https://tribhuvan-university.edu.np',
    tags: ['tu', 'transcript', 'certificate', 'त्रिभुवन विश्वविद्यालय'],
  }),

  // ─── LEGAL ───
  svc({
    slug: 'consumer-complaint',
    category: 'legal',
    providerType: 'gov',
    providerName: 'Department of Commerce, Supplies and Consumer Protection',
    title: { en: 'Consumer Complaint', ne: 'उपभोक्ता उजुरी' },
    summary: {
      en: 'File a complaint against a business for fraud, overpricing, or fake products.',
      ne: 'व्यापारीविरुद्ध ठगी, महंगो मूल्य, वा नक्कली वस्तुको उजुरी।',
    },
    estimatedTime: { en: '2–8 weeks resolution', ne: '२–८ हप्ता समाधान' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://doscpc.gov.np',
    tags: ['consumer', 'complaint', 'fraud', 'उपभोक्ता'],
  }),
  svc({
    slug: 'lokpal-complaint',
    category: 'legal',
    providerType: 'gov',
    providerName: 'Commission for the Investigation of Abuse of Authority (CIAA)',
    title: { en: 'CIAA Corruption Complaint', ne: 'अख्तियार दुरुपयोग उजुरी (CIAA)' },
    summary: {
      en: 'Report corruption, bribery, or abuse of authority by public officials to CIAA.',
      ne: 'सार्वजनिक अधिकारीको भ्रष्टाचार, घुस, अख्तियारको दुरुपयोगबारे अख्तियारमा उजुरी।',
    },
    estimatedTime: { en: 'Varies — investigation based', ne: 'अनुसन्धानमा निर्भर' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://ciaa.gov.np',
    tags: ['ciaa', 'corruption', 'lokpal', 'अख्तियार', 'भ्रष्टाचार'],
  }),
  svc({
    slug: 'court-case-lookup',
    category: 'legal',
    providerType: 'gov',
    providerName: 'Supreme Court of Nepal',
    title: { en: 'Check Court Case Status', ne: 'अदालती मुद्दाको स्थिति' },
    summary: {
      en: 'Look up pending/decided case status online at all levels (district, high, supreme).',
      ne: 'जिल्ला, उच्च, सर्वोच्च सबै तहका मुद्दाको स्थिति अनलाइन हेर्नुहोस्।',
    },
    estimatedTime: { en: 'Instant', ne: 'तत्काल' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://supremecourt.gov.np',
    tags: ['court', 'case', 'supreme court', 'अदालत', 'मुद्दा'],
  }),
];
