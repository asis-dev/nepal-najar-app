/**
 * Nepal Republic — Nagarik App complementary services.
 * High-use services available on the Nagarik App that we didn't already cover.
 * Nepal Republic adds guides, document checklists, and accountability on top.
 */

import type { Service } from './types';

const V = '2026-04-16';

const BLANK = {
  documents: [] as Service['documents'],
  steps: [] as Service['steps'],
  offices: [] as Service['offices'],
  commonProblems: [] as Service['commonProblems'],
  faqs: [] as Service['faqs'],
  tags: [] as string[],
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

export const NAGARIK_SERVICES: Service[] = [
  // ─── E-Chalan (Traffic Fine) — Nagarik's most popular new feature ───
  svc({
    slug: 'e-chalan-traffic-fine',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Metropolitan Traffic Police Division',
    title: { en: 'E-Chalan Traffic Fine', ne: 'ई-चालान ट्राफिक जरिवाना' },
    summary: {
      en: 'Check and pay traffic violation fines digitally. Replaces physical license confiscation in Kathmandu Valley.',
      ne: 'ट्राफिक उल्लंघनको जरिवाना डिजिटल रूपमा हेर्ने र तिर्ने। काठमाडौं उपत्यकामा लाइसेन्स जफत हटाइएको।',
    },
    feeRange: { en: 'Rs. 500–5,000+ by violation type', ne: 'रु. ५००–५,००० उल्लंघन अनुसार' },
    estimatedTime: { en: 'Instant (digital payment)', ne: 'तुरुन्तै (डिजिटल भुक्तानी)' },
    officialUrl: 'https://nagarikapp.gov.np',
    steps: [
      { order: 1, title: { en: 'Check violation on Nagarik App', ne: 'नागरिक एपमा उल्लंघन जाँच गर्नुहोस्' }, detail: { en: 'Open Nagarik App → E-Chalan → enter license number to see violations.', ne: 'नागरिक एप → ई-चालान → लाइसेन्स नम्बर हालेर उल्लंघन हेर्नुहोस्।' } },
      { order: 2, title: { en: 'Review violation details', ne: 'उल्लंघन विवरण हेर्नुहोस्' }, detail: { en: 'See date, location, type of violation and fine amount.', ne: 'मिति, स्थान, उल्लंघनको प्रकार र जरिवाना रकम हेर्नुहोस्।' } },
      { order: 3, title: { en: 'Pay fine digitally', ne: 'जरिवाना डिजिटल तिर्नुहोस्' }, detail: { en: 'Pay via eSewa, Khalti, ConnectIPS, or bank transfer.', ne: 'eSewa, Khalti, ConnectIPS, वा बैंक ट्रान्सफर बाट तिर्नुहोस्।' } },
    ],
    commonProblems: [
      { problem: { en: 'Fine shows but I wasn\'t driving', ne: 'जरिवाना देखिन्छ तर म चलाइरहेको थिइनँ' }, solution: { en: 'The fine is tied to the vehicle owner. Contact the traffic police office with evidence to dispute.', ne: 'जरिवाना सवारी धनीसँग जोडिएको हुन्छ। विवाद गर्न ट्राफिक कार्यालयमा प्रमाण लिएर जानुहोस्।' } },
      { problem: { en: 'Payment failed but money deducted', ne: 'भुक्तानी असफल तर पैसा कटियो' }, solution: { en: 'Contact your payment provider (eSewa/Khalti) for a refund, or visit the traffic office with the transaction ID.', ne: 'रिफण्डका लागि eSewa/Khalti सम्पर्क गर्नुहोस्, वा ट्रान्जाक्सन ID लिएर ट्राफिक कार्यालय जानुहोस्।' } },
    ],
    faqs: [
      { q: { en: 'Is E-Chalan available outside Kathmandu?', ne: 'काठमाडौं बाहिर ई-चालान उपलब्ध छ?' }, a: { en: 'Currently only in Kathmandu Valley. Expansion to other cities is planned.', ne: 'हाल काठमाडौं उपत्यकामा मात्र। अन्य शहरमा विस्तार योजना छ।' } },
    ],
    tags: ['e-chalan', 'traffic fine', 'challan', 'ट्राफिक', 'जरिवाना', 'चालान', 'traffic police'],
  }),

  // ─── NEB +2 Results ───
  svc({
    slug: 'neb-plus-two-results',
    category: 'education',
    providerType: 'gov',
    providerName: 'National Examination Board (NEB)',
    title: { en: 'NEB +2 Results Check', ne: 'NEB +२ नतिजा जाँच' },
    summary: {
      en: 'Check National Examination Board Grade 11 & 12 results online or via Nagarik App.',
      ne: 'कक्षा ११ र १२ को NEB नतिजा अनलाइन वा नागरिक एपबाट हेर्नुहोस्।',
    },
    estimatedTime: { en: 'Instant (online)', ne: 'तुरुन्तै (अनलाइन)' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://neb.gov.np',
    steps: [
      { order: 1, title: { en: 'Visit NEB website or Nagarik App', ne: 'NEB वेबसाइट वा नागरिक एप खोल्नुहोस्' }, detail: { en: 'Go to neb.gov.np or open Nagarik App → NEB Results.', ne: 'neb.gov.np वा नागरिक एप → NEB नतिजा।' } },
      { order: 2, title: { en: 'Enter exam details', ne: 'परीक्षा विवरण हाल्नुहोस्' }, detail: { en: 'Enter symbol number, date of birth, and year to view results.', ne: 'सिम्बोल नम्बर, जन्ममिति र वर्ष हालेर नतिजा हेर्नुहोस्।' } },
    ],
    tags: ['neb', '+2', 'plus two', 'results', 'grade 12', 'board exam', 'नतिजा', '+२'],
  }),

  // ─── EPF / Provident Fund ───
  svc({
    slug: 'epf-provident-fund',
    category: 'banking',
    providerType: 'gov',
    providerName: 'Employees\' Provident Fund (EPF)',
    title: { en: 'EPF Provident Fund Statement', ne: 'कर्मचारी सञ्चय कोष विवरण' },
    summary: {
      en: 'View your Employees\' Provident Fund contribution history and loan statements via Nagarik App.',
      ne: 'नागरिक एपबाट कर्मचारी सञ्चय कोषको जम्मा र ऋण विवरण हेर्नुहोस्।',
    },
    estimatedTime: { en: 'Instant (digital)', ne: 'तुरुन्तै (डिजिटल)' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://epf.org.np',
    steps: [
      { order: 1, title: { en: 'Link EPF on Nagarik App', ne: 'नागरिक एपमा EPF लिंक गर्नुहोस्' }, detail: { en: 'Open Nagarik App → EPF → enter your EPF member number.', ne: 'नागरिक एप → EPF → सदस्य नम्बर हाल्नुहोस्।' } },
      { order: 2, title: { en: 'View statements', ne: 'विवरण हेर्नुहोस्' }, detail: { en: 'View annual contributions, employer match, loan details and balance.', ne: 'वार्षिक जम्मा, रोजगारदाता योगदान, ऋण र ब्यालेन्स हेर्नुहोस्।' } },
    ],
    faqs: [
      { q: { en: 'Who is eligible for EPF?', ne: 'EPF का लागि कसको योग्यता छ?' }, a: { en: 'All salaried employees in Nepal contributing to the provident fund scheme.', ne: 'सञ्चय कोषमा योगदान गर्ने सबै तलबी कर्मचारी।' } },
    ],
    tags: ['epf', 'provident fund', 'सञ्चय कोष', 'retirement', 'pension', 'contribution'],
  }),

  // ─── Police Clearance Certificate ───
  svc({
    slug: 'police-clearance-certificate',
    category: 'legal',
    providerType: 'gov',
    providerName: 'Nepal Police / Metropolitan Police',
    title: { en: 'Police Clearance Certificate', ne: 'चारित्रिक प्रमाणपत्र' },
    summary: {
      en: 'Obtain a character/police clearance certificate required for jobs, visa applications, and foreign employment.',
      ne: 'रोजगार, भिसा र वैदेशिक रोजगारका लागि आवश्यक चारित्रिक प्रमाणपत्र।',
    },
    estimatedTime: { en: '3–7 working days', ne: '३–७ कार्य दिन' },
    feeRange: { en: 'Rs. 500', ne: 'रु. ५००' },
    officialUrl: 'https://nepalpolice.gov.np',
    documents: [
      { title: { en: 'Citizenship certificate + copy', ne: 'नागरिकता प्रमाणपत्र + प्रतिलिपि' }, required: true },
      { title: { en: 'Passport-size photos (2)', ne: 'पासपोर्ट साइज फोटो (२)' }, required: true },
      { title: { en: 'Application form (from police office)', ne: 'आवेदन फारम (प्रहरी कार्यालयबाट)' }, required: true },
      { title: { en: 'Job offer letter or visa requirement (if applicable)', ne: 'रोजगार पत्र वा भिसा आवश्यकता (लागू भए)' }, required: false },
    ],
    steps: [
      { order: 1, title: { en: 'Apply via Nagarik App or in person', ne: 'नागरिक एप वा प्रहरी कार्यालयमा आवेदन' }, detail: { en: 'Submit through Nagarik App or visit nearest Metropolitan Police office.', ne: 'नागरिक एपबाट वा नजिकको प्रहरी कार्यालयमा आवेदन दिनुहोस्।' } },
      { order: 2, title: { en: 'Fingerprint & background check', ne: 'औँठाछाप र पृष्ठभूमि जाँच' }, detail: { en: 'Biometric fingerprints taken and criminal background verified.', ne: 'बायोमेट्रिक औँठाछाप र अपराधिक पृष्ठभूमि जाँच।' } },
      { order: 3, title: { en: 'Collect certificate', ne: 'प्रमाणपत्र लिनुहोस्' }, detail: { en: 'Pick up certificate after processing or download from Nagarik App.', ne: 'प्रक्रिया पछि प्रमाणपत्र लिनुहोस् वा नागरिक एपबाट डाउनलोड।' } },
    ],
    offices: [
      { name: { en: 'Metropolitan Police Range, Kathmandu', ne: 'महानगरीय प्रहरी परिसर, काठमाडौँ' }, address: { en: 'Ranipokhari, Kathmandu', ne: 'रानीपोखरी, काठमाडौँ' }, phone: '01-4261945', hours: { en: 'Sun–Fri, 10:00–15:00', ne: 'आइत–शुक्र, १०:००–३:००' }, lat: 27.7085, lng: 85.3153 },
    ],
    commonProblems: [
      { problem: { en: 'Takes longer than 7 days', ne: '७ दिनभन्दा बढी लाग्छ' }, solution: { en: 'Follow up at the same police office with your receipt number. Normal during peak visa season.', ne: 'रसिद नम्बर लिएर सोही प्रहरी कार्यालयमा फलो-अप गर्नुहोस्।' } },
    ],
    tags: ['police clearance', 'character certificate', 'चारित्रिक', 'clearance', 'background check', 'visa'],
  }),

  // ─── Voter Registration ───
  svc({
    slug: 'voter-registration',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Election Commission Nepal',
    title: { en: 'Voter Registration / Voter ID', ne: 'मतदाता दर्ता / मतदाता परिचयपत्र' },
    summary: {
      en: 'Register as a voter or pre-register via Nagarik App to get your voter ID card from the Election Commission.',
      ne: 'निर्वाचन आयोगबाट मतदाता परिचयपत्र पाउन नागरिक एपमार्फत दर्ता वा पूर्व-दर्ता गर्नुहोस्।',
    },
    estimatedTime: { en: '1–2 weeks (during registration drives)', ne: '१–२ हप्ता (दर्ता अभियानमा)' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://election.gov.np',
    documents: [
      { title: { en: 'Citizenship certificate', ne: 'नागरिकता प्रमाणपत्र' }, required: true },
      { title: { en: 'Passport-size photo', ne: 'पासपोर्ट साइज फोटो' }, required: true },
    ],
    steps: [
      { order: 1, title: { en: 'Pre-register on Nagarik App', ne: 'नागरिक एपमा पूर्व-दर्ता' }, detail: { en: 'Open Nagarik App → Voter Registration → fill details for pre-registration.', ne: 'नागरिक एप → मतदाता दर्ता → पूर्व-दर्ताका लागि विवरण भर्नुहोस्।' } },
      { order: 2, title: { en: 'Visit registration center', ne: 'दर्ता केन्द्र जानुहोस्' }, detail: { en: 'During registration drives, visit your ward\'s voter registration center with citizenship.', ne: 'दर्ता अभियानमा नागरिकता लिएर वडाको दर्ता केन्द्र जानुहोस्।' } },
      { order: 3, title: { en: 'Receive voter ID card', ne: 'मतदाता परिचयपत्र प्राप्त गर्नुहोस्' }, detail: { en: 'Card issued after verification. Link it on Nagarik App for digital access.', ne: 'प्रमाणीकरण पछि कार्ड जारी। नागरिक एपमा लिंक गर्नुहोस्।' } },
    ],
    tags: ['voter', 'election', 'voter id', 'registration', 'मतदाता', 'निर्वाचन', 'दर्ता'],
  }),

  // ─── Social Security Fund ───
  svc({
    slug: 'social-security-fund',
    category: 'banking',
    providerType: 'gov',
    providerName: 'Social Security Fund',
    title: { en: 'Social Security Fund (SSF)', ne: 'सामाजिक सुरक्षा कोष' },
    summary: {
      en: 'View social security tax contributions and access benefits (medical, maternity, accident insurance) via Nagarik App.',
      ne: 'सामाजिक सुरक्षा कर योगदान हेर्ने र लाभ (चिकित्सा, प्रसूति, दुर्घटना बीमा) नागरिक एपबाट प्राप्त गर्ने।',
    },
    estimatedTime: { en: 'Instant (digital)', ne: 'तुरुन्तै (डिजिटल)' },
    feeRange: { en: 'Employee: 11% + Employer: 20% of basic salary', ne: 'कर्मचारी: ११% + रोजगारदाता: २०% आधारभूत तलबको' },
    officialUrl: 'https://ssf.gov.np',
    tags: ['ssf', 'social security', 'सामाजिक सुरक्षा', 'contribution', 'insurance'],
  }),

  // ─── Land Revenue Payment ───
  svc({
    slug: 'land-revenue-payment',
    category: 'land',
    providerType: 'gov',
    providerName: 'Land Revenue Office (Malpot)',
    title: { en: 'Land Revenue Payment (Malpot)', ne: 'मालपोत (भूमि राजस्व) भुक्तानी' },
    summary: {
      en: 'Pay annual land revenue (malpot) to the Land Revenue Office. Now payable online via Nagarik App.',
      ne: 'वार्षिक मालपोत भूमि राजस्व कार्यालयमा तिर्ने। अब नागरिक एपबाट अनलाइन तिर्न सकिन्छ।',
    },
    estimatedTime: { en: 'Instant (online) or same day (office)', ne: 'तुरुन्तै (अनलाइन) वा सोही दिन (कार्यालय)' },
    officialUrl: 'https://dolma.gov.np',
    documents: [
      { title: { en: 'Landowner Identification Number (11-digit)', ne: 'जग्गाधनी पहिचान नम्बर (११ अंक)' }, required: true },
      { title: { en: 'Land ownership certificate (Lal Purja)', ne: 'जग्गाधनी प्रमाणपत्र (लालपुर्जा)' }, required: false },
    ],
    tags: ['malpot', 'land revenue', 'land tax', 'मालपोत', 'भूमि राजस्व', 'जग्गा कर'],
  }),
];
