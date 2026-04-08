/**
 * Nepal Republic — Week 1 seed: 10 core services.
 * All content researched from official sources. `verifiedAt` reflects research date.
 * Update this file, re-run `scripts/seed-services.ts`.
 *
 * Sources:
 * - DoTM: https://www.dotm.gov.np
 * - DoI (Passport): https://www.nepalpassport.gov.np
 * - MoHA (Citizenship): https://www.moha.gov.np
 * - IRD (PAN): https://ird.gov.np
 * - NEA: https://www.nea.org.np
 * - KUKL (Khanepani): https://kathmanduwater.org
 * - Bir Hospital: https://www.bhnepal.gov.np
 * - TUTH: https://iom.edu.np/tuth
 * - OCR: https://ocr.gov.np
 * - DoLMA: https://dolma.gov.np
 */

import type { Service } from './types';

const VERIFIED = '2026-04-08';

export const SEED_SERVICES: Service[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. DRIVER'S LICENSE RENEWAL
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'drivers-license-renewal',
    category: 'transport',
    providerType: 'gov',
    providerName: 'Department of Transport Management (DoTM)',
    title: {
      en: "Driver's License Renewal",
      ne: 'सवारी चालक अनुमतिपत्र नवीकरण',
    },
    summary: {
      en: "Renew your smart driver's license. Must be done before expiry to avoid penalty.",
      ne: 'स्मार्ट सवारी चालक अनुमतिपत्र नवीकरण। जरिवाना जोगाउन म्याद सकिनुअघि नै गर्नुहोस्।',
    },
    estimatedTime: { en: '1 day (at office) + 15–30 days for card delivery', ne: '१ दिन (कार्यालयमा) + १५–३० दिन कार्ड आउन' },
    feeRange: { en: 'Rs. 1,500 – 3,000 (category dependent)', ne: 'रु. १,५०० – ३,००० (वर्गअनुसार)' },
    officialUrl: 'https://www.dotm.gov.np',
    documents: [
      { title: { en: 'Old (expiring) license', ne: 'पुरानो (म्याद सकिने) अनुमतिपत्र' }, required: true },
      { title: { en: 'Citizenship certificate (original + copy)', ne: 'नागरिकता प्रमाणपत्र (सक्कल + प्रतिलिपि)' }, required: true },
      { title: { en: '2 passport-size photos', ne: '२ प्रति पासपोर्ट साइज फोटो' }, required: true },
      { title: { en: 'Medical fitness certificate (for heavy license)', ne: 'स्वास्थ्य जाँच प्रमाणपत्र (भारी लाइसेन्सका लागि)' }, required: false },
      { title: { en: 'Blood group certificate', ne: 'रगत समूह प्रमाणपत्र' }, required: false, notes: { en: 'Often requested; carry it', ne: 'प्राय: मागिन्छ; लिएर जानुहोस्' } },
    ],
    steps: [
      { order: 1, title: { en: 'Book online appointment', ne: 'अनलाइन समय बुक गर्नुहोस्' }, detail: { en: 'Go to dotm.gov.np → online services → license renewal. Pick your DoTM office and date.', ne: 'dotm.gov.np → अनलाइन सेवा → लाइसेन्स नवीकरणमा जानुहोस्। आफ्नो यातायात कार्यालय र मिति छान्नुहोस्।' } },
      { order: 2, title: { en: 'Pay the renewal fee', ne: 'नवीकरण शुल्क तिर्नुहोस्' }, detail: { en: 'Pay via eSewa, Khalti, or ConnectIPS. Keep the receipt.', ne: 'eSewa, Khalti वा ConnectIPS बाट तिर्नुहोस्। रसिद राख्नुहोस्।' } },
      { order: 3, title: { en: 'Visit the office on your date', ne: 'तोकिएको दिन कार्यालय जानुहोस्' }, detail: { en: 'Bring all documents. Biometrics and photo will be taken. Total time: ~1–3 hours.', ne: 'सबै कागजात लिएर जानुहोस्। बायोमेट्रिक र फोटो लिइन्छ। कुल समय: १–३ घण्टा।' } },
      { order: 4, title: { en: 'Collect SMS receipt / tracking ID', ne: 'SMS रसिद / ट्र्याकिङ आईडी लिनुहोस्' }, detail: { en: 'Smart card is printed at central office and posted to your DoTM office. Typically 15–30 days.', ne: 'स्मार्ट कार्ड केन्द्रमा छापिन्छ र तपाईँको कार्यालयमा पुग्छ। सामान्यतया १५–३० दिन।' } },
    ],
    offices: [
      { name: { en: 'DoTM Ekantakuna (Lalitpur)', ne: 'यातायात कार्यालय एकान्तकुना (ललितपुर)' }, address: { en: 'Ekantakuna, Lalitpur', ne: 'एकान्तकुना, ललितपुर' }, phone: '01-5529593', hours: { en: 'Sun–Fri, 10:00 – 17:00', ne: 'आइत–शुक्र, १०:०० – ५:००' }, lat: 27.6697, lng: 85.3090 },
      { name: { en: 'DoTM Chabahil (Kathmandu)', ne: 'यातायात कार्यालय चाबहिल (काठमाडौँ)' }, address: { en: 'Chabahil, Kathmandu', ne: 'चाबहिल, काठमाडौँ' }, phone: '01-4474921', hours: { en: 'Sun–Fri, 10:00 – 17:00', ne: 'आइत–शुक्र, १०:०० – ५:००' }, lat: 27.7172, lng: 85.3452 },
    ],
    commonProblems: [
      { problem: { en: 'License expired long ago — can I still renew?', ne: 'लाइसेन्स पुरानै सकिइसकेको छ — अझै नवीकरण हुन्छ?' }, solution: { en: 'Yes within 1 year with penalty (~Rs. 1,000+). After 1 year, you may need to take a fresh trial.', ne: 'एक वर्षभित्र जरिवाना (~रु. १,०००+) सहित हुन्छ। एक वर्षपछि नयाँ ट्रायल चाहिन सक्छ।' } },
      { problem: { en: 'Online slot not available anywhere', ne: 'अनलाइन समय कतै खाली छैन' }, solution: { en: 'Slots open at midnight. Try at 00:00 – 01:00. Alternatively visit the office early morning to request walk-in.', ne: 'समय मध्यरातमा खुल्छ। ०:०० – १:०० बीच प्रयास गर्नुहोस्। वा कार्यालय बिहान सबेरै गएर walk-in मागिहेर्नुहोस्।' } },
    ],
    faqs: [
      { q: { en: 'Do I need to take a driving test again?', ne: 'फेरि ट्रायल दिनुपर्छ?' }, a: { en: 'No, not for simple renewal. Only if license expired >1 year ago.', ne: 'होइन, साधारण नवीकरणमा पर्दैन। एक वर्षभन्दा बढी भएमा मात्र।' } },
      { q: { en: 'Can someone else collect my card for me?', ne: 'कसैले मेरो सट्टामा कार्ड लिन सक्छ?' }, a: { en: 'Yes, with an authorization letter and their citizenship.', ne: 'सक्छ, अधिकार पत्र र उनको नागरिकता सहित।' } },
    ],
    tags: ['license', 'driving', 'dotm', 'renewal', 'smart license', 'लाइसेन्स', 'सवारी', 'यातायात'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 2. NEW PASSPORT (MRP / e-Passport)
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'new-passport',
    category: 'identity',
    providerType: 'gov',
    providerName: 'Department of Passports, Ministry of Foreign Affairs',
    title: { en: 'New Passport (e-Passport)', ne: 'नयाँ राहदानी (ई-पासपोर्ट)' },
    summary: {
      en: 'Apply for a new Nepali e-Passport. Nepal switched to biometric e-Passport in 2021.',
      ne: 'नयाँ नेपाली ई-पासपोर्टका लागि आवेदन। नेपालले २०२१ देखि बायोमेट्रिक ई-पासपोर्ट लागू गरेको छ।',
    },
    estimatedTime: { en: 'Normal: 21 days · Fast-track: 3 days · Same-day (Kathmandu): 1 day', ne: 'सामान्य: २१ दिन · फास्ट-ट्र्याक: ३ दिन · एकै दिन (काठमाडौँ): १ दिन' },
    feeRange: { en: 'Rs. 5,000 (normal) – Rs. 15,000 (same-day)', ne: 'रु. ५,००० (सामान्य) – रु. १५,००० (एकै दिन)' },
    officialUrl: 'https://nepalpassport.gov.np',
    documents: [
      { title: { en: 'Original citizenship certificate + copy', ne: 'नागरिकताको सक्कल + प्रतिलिपि' }, required: true },
      { title: { en: 'Completed application form (online)', ne: 'भरिएको आवेदन फारम (अनलाइन)' }, required: true },
      { title: { en: 'Voucher of paid fee', ne: 'तिरेको शुल्कको भौचर' }, required: true },
      { title: { en: 'Old passport (if renewal)', ne: 'पुरानो राहदानी (नवीकरण भए)' }, required: false },
    ],
    steps: [
      { order: 1, title: { en: 'Fill online form', ne: 'अनलाइन फारम भर्नुहोस्' }, detail: { en: 'Go to nepalpassport.gov.np → Apply → fill personal info → submit.', ne: 'nepalpassport.gov.np → Apply → व्यक्तिगत विवरण → submit।' } },
      { order: 2, title: { en: 'Pay voucher at bank', ne: 'बैंकमा भौचर तिर्नुहोस्' }, detail: { en: 'Print voucher. Pay at Nepal Bank, Rastra Bank or via ConnectIPS.', ne: 'भौचर प्रिन्ट गरी नेपाल बैंक, राष्ट्र बैंक वा ConnectIPS बाट तिर्नुहोस्।' } },
      { order: 3, title: { en: 'Visit passport office for biometrics', ne: 'बायोमेट्रिकका लागि राहदानी कार्यालय जानुहोस्' }, detail: { en: 'Fingerprints + photo + signature captured. Bring all originals.', ne: 'फिंगरप्रिन्ट + फोटो + हस्ताक्षर लिइन्छ। सक्कल कागजात लिएर जानुहोस्।' } },
      { order: 4, title: { en: 'Collect passport', ne: 'राहदानी लिनुहोस्' }, detail: { en: 'SMS notification when ready. Collect from the same office.', ne: 'तयार भएपछि SMS आउँछ। सोही कार्यालयबाट लिनुहोस्।' } },
    ],
    offices: [
      { name: { en: 'Department of Passports, Tripureshwor', ne: 'राहदानी विभाग, त्रिपुरेश्वर' }, address: { en: 'Narayanhiti Path, Tripureshwor, Kathmandu', ne: 'नारायणहिटी पथ, त्रिपुरेश्वर, काठमाडौँ' }, phone: '01-4416011', hours: { en: 'Sun–Fri, 10:00 – 15:00', ne: 'आइत–शुक्र, १०:०० – ३:००' }, lat: 27.6960, lng: 85.3150 },
    ],
    commonProblems: [
      { problem: { en: 'Name on citizenship different from what I want on passport', ne: 'नागरिकताको नाम राहदानीमा चाहिने नामसँग फरक' }, solution: { en: 'Passport must exactly match citizenship. Correct citizenship first via DAO.', ne: 'राहदानी नागरिकतासँग ठीक मिल्नुपर्छ। पहिले जिल्ला प्रशासन कार्यालयबाट नागरिकता सच्याउनुहोस्।' } },
    ],
    faqs: [
      { q: { en: 'Can I apply from any district?', ne: 'जुनसुकै जिल्लाबाट आवेदन दिन मिल्छ?' }, a: { en: 'Yes, from any DAO or the central office in Tripureshwor.', ne: 'मिल्छ, कुनै पनि जिल्ला प्रशासन कार्यालय वा त्रिपुरेश्वरको केन्द्रीय कार्यालयबाट।' } },
      { q: { en: 'How long is the e-Passport valid?', ne: 'ई-पासपोर्टको अवधि कति हो?' }, a: { en: '10 years for adults, 5 years for minors.', ne: 'वयस्कका लागि १० वर्ष, नाबालकका लागि ५ वर्ष।' } },
    ],
    tags: ['passport', 'e-passport', 'MRP', 'travel', 'राहदानी', 'पासपोर्ट'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 3. CITIZENSHIP CERTIFICATE (by descent, 16+)
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'citizenship-by-descent',
    category: 'identity',
    providerType: 'gov',
    providerName: 'District Administration Office (DAO)',
    title: { en: 'Nepali Citizenship by Descent', ne: 'वंशजको आधारमा नेपाली नागरिकता' },
    summary: {
      en: 'Issued by DAO once you turn 16 if at least one parent is Nepali.',
      ne: '१६ वर्ष पुगेपछि आमा/बुबामध्ये कोही नेपाली भए जिल्ला प्रशासन कार्यालयबाट जारी हुन्छ।',
    },
    estimatedTime: { en: 'Same day if documents complete', ne: 'कागजात पूरा भए एकै दिन' },
    feeRange: { en: 'Free (formally) — stationery charges only', ne: 'निःशुल्क — स्टेसनरी शुल्क मात्र' },
    officialUrl: 'https://www.moha.gov.np',
    documents: [
      { title: { en: "Father's or mother's citizenship", ne: 'बुबा वा आमाको नागरिकता' }, required: true },
      { title: { en: 'Birth registration certificate', ne: 'जन्मदर्ता प्रमाणपत्र' }, required: true },
      { title: { en: 'Character certificate from school (SEE)', ne: 'विद्यालयको चालचलन प्रमाणपत्र (SEE)' }, required: true },
      { title: { en: 'Ward recommendation letter', ne: 'वडा सिफारिस पत्र' }, required: true },
      { title: { en: 'Marriage certificate (for married women)', ne: 'विवाहदर्ता (विवाहित महिलाका लागि)' }, required: false },
      { title: { en: '2 passport-size photos', ne: '२ पासपोर्ट साइज फोटो' }, required: true },
    ],
    steps: [
      { order: 1, title: { en: 'Get ward recommendation', ne: 'वडाबाट सिफारिस लिनुहोस्' }, detail: { en: 'Visit your ward office with parent citizenship + birth cert. Get a recommendation letter.', ne: 'बुबा/आमाको नागरिकता र जन्मदर्ता लिएर वडा कार्यालय जानुहोस्। सिफारिस पत्र लिनुहोस्।' } },
      { order: 2, title: { en: 'Collect all documents', ne: 'सबै कागजात जुटाउनुहोस्' }, detail: { en: 'Originals + photocopies of everything listed.', ne: 'सूचीमा भएका सबै कागजातको सक्कल र प्रतिलिपि।' } },
      { order: 3, title: { en: 'Visit your District Administration Office', ne: 'जिल्ला प्रशासन कार्यालय जानुहोस्' }, detail: { en: 'Go to DAO of the district where your parent is from. Fill form, submit documents, photo is taken on-site.', ne: 'बुबा/आमाको जिल्लाको प्रशासन कार्यालय जानुहोस्। फारम भरेर कागजात बुझाउनुहोस्, त्यहीँ फोटो लिइन्छ।' } },
      { order: 4, title: { en: 'Receive citizenship certificate', ne: 'नागरिकता प्रमाणपत्र लिनुहोस्' }, detail: { en: 'Usually issued same day. Check name, DOB, photo carefully before leaving.', ne: 'प्राय: एकै दिन पाइन्छ। कार्यालय छोड्नुअघि नाम, जन्ममिति, फोटो राम्रोसँग जाँच्नुहोस्।' } },
    ],
    offices: [
      { name: { en: 'DAO Kathmandu (Babar Mahal)', ne: 'जिल्ला प्रशासन कार्यालय काठमाडौँ (बबरमहल)' }, address: { en: 'Babar Mahal, Kathmandu', ne: 'बबरमहल, काठमाडौँ' }, phone: '01-4262828', hours: { en: 'Sun–Fri, 10:00 – 16:00', ne: 'आइत–शुक्र, १०:०० – ४:००' }, lat: 27.6953, lng: 85.3236 },
      { name: { en: 'DAO Lalitpur', ne: 'जिल्ला प्रशासन कार्यालय ललितपुर' }, address: { en: 'Pulchowk, Lalitpur', ne: 'पुल्चोक, ललितपुर' }, phone: '01-5521050', hours: { en: 'Sun–Fri, 10:00 – 16:00', ne: 'आइत–शुक्र, १०:०० – ४:००' }, lat: 27.6794, lng: 85.3173 },
    ],
    commonProblems: [
      { problem: { en: 'Parents never got citizenship themselves', ne: 'बुबा/आमाले आफैँले नागरिकता लिएकै छैनन्' }, solution: { en: 'Parent must obtain their citizenship first. Consult DAO or a legal aid clinic.', ne: 'पहिले बुबा/आमाले नागरिकता लिनुपर्छ। DAO वा कानुनी सहायता केन्द्रसँग परामर्श गर्नुहोस्।' } },
      { problem: { en: 'Birth registration missing', ne: 'जन्मदर्ता छैन' }, solution: { en: 'File late birth registration at your ward with 2 witnesses.', ne: 'वडामा २ साक्षी सहित ढिलो जन्मदर्ता गर्नुहोस्।' } },
    ],
    faqs: [
      { q: { en: 'Can I get citizenship in a district where I live now instead of my father\'s?', ne: 'बुबाको जिल्ला छोडेर हाल बसेको जिल्लामा लिन सकिन्छ?' }, a: { en: 'Generally no — must be the district on the parent citizenship. Transfer is a separate process.', ne: 'सामान्यतया सकिँदैन — बुबा/आमाको नागरिकतामा उल्लिखित जिल्लामै लिनुपर्छ। सारुवा छुट्टै प्रक्रिया हो।' } },
    ],
    tags: ['citizenship', 'nagarikta', 'dao', 'identity', 'नागरिकता'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 4. PAN CARD (INDIVIDUAL)
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'pan-individual',
    category: 'tax',
    providerType: 'gov',
    providerName: 'Inland Revenue Department (IRD)',
    title: { en: 'Personal PAN Card', ne: 'व्यक्तिगत स्थायी लेखा नम्बर (PAN)' },
    summary: {
      en: 'Required for salaried jobs, many bank transactions, and filing taxes. Free to obtain.',
      ne: 'जागिर, धेरै बैंक कारोबार र कर फाइलिङका लागि अनिवार्य। निःशुल्क।',
    },
    estimatedTime: { en: 'Same day', ne: 'एकै दिन' },
    feeRange: { en: 'Free', ne: 'निःशुल्क' },
    officialUrl: 'https://ird.gov.np',
    documents: [
      { title: { en: 'Citizenship certificate', ne: 'नागरिकता प्रमाणपत्र' }, required: true },
      { title: { en: '2 passport-size photos', ne: '२ पासपोर्ट साइज फोटो' }, required: true },
      { title: { en: 'PAN application form (filled)', ne: 'भरिएको PAN आवेदन फारम' }, required: true },
    ],
    steps: [
      { order: 1, title: { en: 'Register online on IRD taxpayer portal', ne: 'IRD करदाता पोर्टलमा अनलाइन दर्ता गर्नुहोस्' }, detail: { en: 'taxpayerportal.ird.gov.np → taxpayer registration → personal PAN.', ne: 'taxpayerportal.ird.gov.np → taxpayer registration → personal PAN।' } },
      { order: 2, title: { en: 'Print submission number', ne: 'सबमिसन नम्बर प्रिन्ट गर्नुहोस्' }, detail: { en: 'You get a submission number — print the generated form.', ne: 'सबमिसन नम्बर सहित generated फारम प्रिन्ट गर्नुहोस्।' } },
      { order: 3, title: { en: 'Visit your local IRD office', ne: 'नजिकको IRD कार्यालय जानुहोस्' }, detail: { en: 'Submit printed form + documents + photos. Biometric captured.', ne: 'प्रिन्ट फारम, कागजात र फोटो बुझाउनुहोस्। बायोमेट्रिक लिइन्छ।' } },
      { order: 4, title: { en: 'Receive PAN card', ne: 'PAN कार्ड लिनुहोस्' }, detail: { en: 'Printed and issued same day at most offices.', ne: 'अधिकांश कार्यालयमा एकै दिन छापिएर दिइन्छ।' } },
    ],
    offices: [
      { name: { en: 'IRD Lazimpat', ne: 'आन्तरिक राजस्व कार्यालय लाजिम्पाट' }, address: { en: 'Lazimpat, Kathmandu', ne: 'लाजिम्पाट, काठमाडौँ' }, phone: '01-4415802', hours: { en: 'Sun–Fri, 10:00 – 17:00', ne: 'आइत–शुक्र, १०:०० – ५:००' }, lat: 27.7211, lng: 85.3194 },
    ],
    commonProblems: [],
    faqs: [
      { q: { en: 'Is PAN mandatory for all jobs?', ne: 'हरेक जागिरका लागि PAN अनिवार्य हो?' }, a: { en: 'Yes, any salaried employment and any income above Rs. 4 lakh per year requires PAN.', ne: 'हो, तलबी जागिर र वार्षिक रु. ४ लाखभन्दा बढी आम्दानीमा PAN अनिवार्य हुन्छ।' } },
    ],
    tags: ['pan', 'tax', 'ird', 'employment', 'प्यान', 'कर'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 5. NEA ELECTRICITY BILL PAYMENT
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'nea-electricity-bill',
    category: 'utilities',
    providerType: 'utility',
    providerName: 'Nepal Electricity Authority (NEA)',
    title: { en: 'Pay NEA Electricity Bill', ne: 'NEA विद्युत बिल तिर्नुहोस्' },
    summary: {
      en: 'Pay online in 1 minute via eSewa / Khalti / IME Pay / ConnectIPS — no need to stand in line.',
      ne: 'eSewa / Khalti / IME Pay / ConnectIPS बाट १ मिनेटमा तिर्नुहोस् — लाइन बस्नु पर्दैन।',
    },
    estimatedTime: { en: '1–2 minutes online', ne: 'अनलाइन १–२ मिनेट' },
    feeRange: { en: 'As per bill', ne: 'बिलमा उल्लेख भएबमोजिम' },
    officialUrl: 'https://www.nea.org.np',
    documents: [
      { title: { en: 'SC / Customer ID (from old bill)', ne: 'SC / ग्राहक आईडी (पुरानो बिलमा)' }, required: true },
    ],
    steps: [
      { order: 1, title: { en: 'Open eSewa / Khalti / IME Pay app', ne: 'eSewa / Khalti / IME Pay एप खोल्नुहोस्' }, detail: { en: 'Any one of these works.', ne: 'यीमध्ये जुनसुकै एप प्रयोग गर्न सकिन्छ।' } },
      { order: 2, title: { en: 'Go to Electricity → NEA', ne: 'Electricity → NEA मा जानुहोस्' }, detail: { en: 'Select your NEA office (Maharajgunj / Balaju / Patan / etc.).', ne: 'आफ्नो NEA कार्यालय (महाराजगन्ज / बालाजु / पाटन आदि) छान्नुहोस्।' } },
      { order: 3, title: { en: 'Enter Customer ID / SC number', ne: 'ग्राहक आईडी / SC नम्बर राख्नुहोस्' }, detail: { en: 'Found on your old bill or SMS notification.', ne: 'पुरानो बिल वा SMS मा पाइन्छ।' } },
      { order: 4, title: { en: 'Pay', ne: 'भुक्तानी गर्नुहोस्' }, detail: { en: 'Amount shows automatically. Pay — done. Keep receipt in app.', ne: 'रकम स्वतः देखिन्छ। तिर्नुहोस् — सकियो। एपमै रसिद हुन्छ।' } },
    ],
    offices: [],
    commonProblems: [
      { problem: { en: "SC number doesn't show a bill", ne: 'SC नम्बरमा बिल देखिएन' }, solution: { en: 'Either wrong office selected, or bill not yet generated. Try a different NEA office in the dropdown.', ne: 'कार्यालय गलत छनौट भएको वा बिल अझै जेनेरेट नभएको हुन सक्छ। ड्रपडाउनमा अर्को कार्यालय प्रयास गर्नुहोस्।' } },
    ],
    faqs: [
      { q: { en: 'What if electricity is already cut?', ne: 'बत्ती काटिसकेको छ भने?' }, a: { en: 'Pay online first; reconnection takes 2–24 hours. Call NEA 1150 to speed it up.', ne: 'पहिले अनलाइन तिर्नुहोस्; पुनः जडान २–२४ घण्टा लाग्छ। NEA 1150 मा फोन गरे छिटो हुन्छ।' } },
    ],
    tags: ['nea', 'electricity', 'bill', 'esewa', 'khalti', 'विद्युत', 'बिजुली'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 6. KHANEPANI (KUKL) WATER BILL
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'kukl-water-bill',
    category: 'utilities',
    providerType: 'utility',
    providerName: 'Kathmandu Upatyaka Khanepani Limited (KUKL)',
    title: { en: 'Pay KUKL Water Bill', ne: 'खानेपानी बिल (KUKL) तिर्नुहोस्' },
    summary: {
      en: 'Pay Kathmandu Valley water bill online or at KUKL branch offices.',
      ne: 'काठमाडौँ उपत्यकाको खानेपानी बिल अनलाइन वा KUKL शाखाबाट तिर्न सकिन्छ।',
    },
    estimatedTime: { en: '1–2 minutes online', ne: 'अनलाइन १–२ मिनेट' },
    feeRange: { en: 'As per bill', ne: 'बिल बमोजिम' },
    officialUrl: 'https://kathmanduwater.org',
    documents: [{ title: { en: 'KUKL customer ID', ne: 'KUKL ग्राहक आईडी' }, required: true }],
    steps: [
      { order: 1, title: { en: 'Open eSewa / Khalti', ne: 'eSewa / Khalti खोल्नुहोस्' }, detail: { en: 'Both support KUKL.', ne: 'दुवैले KUKL समर्थन गर्छ।' } },
      { order: 2, title: { en: 'Go to Water → KUKL', ne: 'Water → KUKL मा जानुहोस्' }, detail: { en: 'Select your branch.', ne: 'आफ्नो शाखा छान्नुहोस्।' } },
      { order: 3, title: { en: 'Enter customer ID and pay', ne: 'ग्राहक आईडी राखेर तिर्नुहोस्' }, detail: { en: 'Done.', ne: 'सकियो।' } },
    ],
    offices: [
      { name: { en: 'KUKL Tripureshwor', ne: 'KUKL त्रिपुरेश्वर' }, address: { en: 'Tripureshwor, Kathmandu', ne: 'त्रिपुरेश्वर, काठमाडौँ' }, phone: '01-4268057', hours: { en: 'Sun–Fri, 10:00 – 17:00', ne: 'आइत–शुक्र, १०:०० – ५:००' }, lat: 27.6966, lng: 85.3156 },
    ],
    commonProblems: [],
    faqs: [
      { q: { en: 'Water not coming but bill arriving?', ne: 'पानी आउँदैन तर बिल आउँछ?' }, a: { en: 'File a complaint at your KUKL branch with bill + photo evidence. Bill may be waived for the affected period.', ne: 'बिल र फोटो सहित KUKL शाखामा उजुरी दिनुहोस्। प्रभावित अवधिको बिल मिनाहा हुन सक्छ।' } },
    ],
    tags: ['water', 'khanepani', 'kukl', 'bill', 'खानेपानी'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 7. BIR HOSPITAL OPD APPOINTMENT
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'bir-hospital-opd',
    category: 'health',
    providerType: 'hospital',
    providerName: 'Bir Hospital',
    title: { en: 'Bir Hospital OPD Ticket', ne: 'वीर अस्पताल OPD टिकट' },
    summary: {
      en: 'Outpatient ticket for Nepal\'s oldest government hospital. Arrive early — queues form from 6 AM.',
      ne: 'नेपालको सबैभन्दा पुरानो सरकारी अस्पतालको OPD टिकट। बिहान ६ बजेदेखि लाइन लाग्छ।',
    },
    estimatedTime: { en: '2–5 hours in line (arrive 6:00)', ne: '२–५ घण्टा लाइनमा (६:०० मा पुग्नुहोस्)' },
    feeRange: { en: 'Rs. 50 OPD ticket + Rs. 300–500 specialist fee', ne: 'रु. ५० OPD टिकट + रु. ३००–५०० विशेषज्ञ शुल्क' },
    officialUrl: 'https://www.bhnepal.gov.np',
    documents: [
      { title: { en: 'Citizenship / ID', ne: 'नागरिकता / परिचय पत्र' }, required: true },
      { title: { en: 'Old hospital card (if repeat visit)', ne: 'पुरानो अस्पताल कार्ड (पहिले आएको भए)' }, required: false },
    ],
    steps: [
      { order: 1, title: { en: 'Reach by 6:00 AM', ne: 'बिहान ६ बजेसम्म पुग्नुहोस्' }, detail: { en: 'OPD tickets open around 7:00 but line starts much earlier.', ne: 'OPD टिकट ७:०० तिर खुल्छ तर लाइन त्यसअघि नै शुरु हुन्छ।' } },
      { order: 2, title: { en: 'Get ticket', ne: 'टिकट लिनुहोस्' }, detail: { en: 'Ticket counter on ground floor. Tell them which department (e.g., medicine, ENT, orthopedics).', ne: 'ग्राउन्ड फ्लोरको टिकट काउन्टर। कुन विभाग चाहिएको हो भन्नुहोस् (मेडिसिन, ENT, ओर्थो आदि)।' } },
      { order: 3, title: { en: 'Wait for your turn at department', ne: 'विभागमा पालो पर्खनुहोस्' }, detail: { en: 'Usually 30 min – 2 hours after ticket.', ne: 'टिकटपछि सामान्यतया ३० मिनेट – २ घण्टा।' } },
      { order: 4, title: { en: 'Consultation + prescription', ne: 'परामर्श + औषधि सिफारिस' }, detail: { en: 'Doctor examines you, may order lab tests on the same campus.', ne: 'डाक्टरले जाँच गर्नुहुन्छ, सोही प्राङ्गणमा ल्याब परीक्षण लेख्न सक्नुहुन्छ।' } },
    ],
    offices: [
      { name: { en: 'Bir Hospital', ne: 'वीर अस्पताल' }, address: { en: 'Mahaboudha, Kathmandu', ne: 'महाबौद्ध, काठमाडौँ' }, phone: '01-4221119', hours: { en: 'OPD: Sun–Fri 8:00 – 14:00 · Emergency: 24/7', ne: 'OPD: आइत–शुक्र ८:०० – २:०० · आपतकालीन: २४ घण्टा' }, lat: 27.7038, lng: 85.3134 },
    ],
    commonProblems: [
      { problem: { en: 'Queue too long, can\'t take a day off', ne: 'लाइन लामो छ, छुट्टी लिन सकिँदैन' }, solution: { en: 'For non-emergency, Patan Hospital or TUTH often have shorter queues. For known chronic issues, follow-up tickets are faster.', ne: 'गैर-आपतकालीन समस्यामा पाटन अस्पताल वा TUTH मा लाइन छोटो हुन्छ। पुरानो समस्याका लागि फलोअप टिकट छिटो हुन्छ।' } },
    ],
    faqs: [
      { q: { en: 'Does Bir take insurance?', ne: 'वीरमा बीमा चल्छ?' }, a: { en: 'Yes — government health insurance and some private insurance accepted.', ne: 'चल्छ — सरकारी स्वास्थ्य बीमा र केही निजी बीमा स्वीकार्य।' } },
    ],
    tags: ['bir', 'hospital', 'opd', 'health', 'वीर', 'अस्पताल'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 8. TUTH (TU TEACHING HOSPITAL) APPOINTMENT
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'tuth-opd',
    category: 'health',
    providerType: 'hospital',
    providerName: 'Tribhuvan University Teaching Hospital (TUTH)',
    title: { en: 'TUTH OPD Appointment', ne: 'TUTH OPD समय' },
    summary: {
      en: 'TU Teaching Hospital in Maharajgunj. Supports online appointments for many departments — avoid the queue.',
      ne: 'महाराजगन्जको TU शिक्षण अस्पताल। धेरै विभागमा अनलाइन बुकिङ मिल्छ — लाइन बस्नु नपर्ने।',
    },
    estimatedTime: { en: 'Online booking: 5 min · Same-day: 1–3 hours', ne: 'अनलाइन बुकिङ: ५ मिनेट · सोही दिन: १–३ घण्टा' },
    feeRange: { en: 'Rs. 500 – 1,000 specialist', ne: 'रु. ५०० – १,००० विशेषज्ञ' },
    officialUrl: 'https://iom.edu.np/tuth',
    documents: [
      { title: { en: 'Citizenship / ID', ne: 'नागरिकता / परिचय पत्र' }, required: true },
      { title: { en: 'Online booking reference (if booked)', ne: 'अनलाइन बुकिङ रेफरेन्स (बुक भए)' }, required: false },
    ],
    steps: [
      { order: 1, title: { en: 'Book online', ne: 'अनलाइन बुक गर्नुहोस्' }, detail: { en: 'Visit TUTH booking portal, pick department and slot.', ne: 'TUTH बुकिङ पोर्टलमा गई विभाग र समय छान्नुहोस्।' } },
      { order: 2, title: { en: 'Go to hospital at booked time', ne: 'बुक गरेको समयमा जानुहोस्' }, detail: { en: 'Show reference at OPD counter.', ne: 'OPD काउन्टरमा रेफरेन्स देखाउनुहोस्।' } },
      { order: 3, title: { en: 'Consultation', ne: 'परामर्श' }, detail: { en: 'Doctor examines you and may order tests.', ne: 'डाक्टरले जाँच गर्नुहुन्छ र परीक्षण लेख्न सक्नुहुन्छ।' } },
    ],
    offices: [
      { name: { en: 'TU Teaching Hospital', ne: 'त्रिभुवन विश्वविद्यालय शिक्षण अस्पताल' }, address: { en: 'Maharajgunj, Kathmandu', ne: 'महाराजगन्ज, काठमाडौँ' }, phone: '01-4412303', hours: { en: 'OPD: Sun–Fri 8:00 – 14:00 · Emergency: 24/7', ne: 'OPD: आइत–शुक्र ८:०० – २:०० · आपतकालीन: २४ घण्टा' }, lat: 27.7362, lng: 85.3302 },
    ],
    commonProblems: [],
    faqs: [
      { q: { en: 'Can I walk in without booking?', ne: 'बुक नगरी सीधै जान मिल्छ?' }, a: { en: 'Yes, but queue may be long. Online is faster.', ne: 'मिल्छ, तर लाइन लामो हुन सक्छ। अनलाइन छिटो।' } },
    ],
    tags: ['tuth', 'teaching hospital', 'opd', 'maharajgunj', 'अस्पताल'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 9. OCR COMPANY REGISTRATION
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'company-registration-ocr',
    category: 'business',
    providerType: 'gov',
    providerName: 'Office of the Company Registrar (OCR)',
    title: { en: 'Register a Private Limited Company', ne: 'प्राइभेट लिमिटेड कम्पनी दर्ता' },
    summary: {
      en: 'Register your business as a Pvt Ltd company with OCR. Entirely online via ocr.gov.np.',
      ne: 'ocr.gov.np बाट पूर्णतः अनलाइन प्रा.लि. दर्ता प्रक्रिया।',
    },
    estimatedTime: { en: '3–7 working days', ne: '३–७ कार्य दिन' },
    feeRange: { en: 'Rs. 1,000 – 43,000 (depends on authorized capital)', ne: 'रु. १,००० – ४३,००० (अधिकृत पुँजीअनुसार)' },
    officialUrl: 'https://ocr.gov.np',
    documents: [
      { title: { en: 'Memorandum of Association (MoA)', ne: 'प्रबन्धपत्र (MoA)' }, required: true },
      { title: { en: 'Articles of Association (AoA)', ne: 'नियमावली (AoA)' }, required: true },
      { title: { en: 'Citizenship of all promoters', ne: 'सबै प्रवर्तकको नागरिकता' }, required: true },
      { title: { en: 'Name reservation approval', ne: 'नाम आरक्षण स्वीकृति' }, required: true },
      { title: { en: 'Registered office address proof', ne: 'दर्ता कार्यालयको ठेगाना प्रमाण' }, required: true },
    ],
    steps: [
      { order: 1, title: { en: 'Reserve company name', ne: 'कम्पनीको नाम आरक्षण गर्नुहोस्' }, detail: { en: 'Login to ocr.gov.np, submit 3 proposed names for approval.', ne: 'ocr.gov.np मा लगइन गरी ३ प्रस्तावित नाम स्वीकृतिका लागि पठाउनुहोस्।' } },
      { order: 2, title: { en: 'Prepare MoA + AoA', ne: 'MoA र AoA तयार गर्नुहोस्' }, detail: { en: 'Lawyer help recommended. Use OCR templates as starting point.', ne: 'वकिलको सहयोग सिफारिस। OCR नमुना प्रयोग गर्न सकिन्छ।' } },
      { order: 3, title: { en: 'Submit online application + fee', ne: 'अनलाइन आवेदन र शुल्क बुझाउनुहोस्' }, detail: { en: 'Upload documents, pay via ConnectIPS.', ne: 'कागजात अपलोड, ConnectIPS बाट भुक्तानी।' } },
      { order: 4, title: { en: 'Receive certificate of incorporation', ne: 'दर्ता प्रमाणपत्र लिनुहोस्' }, detail: { en: 'Download from portal once approved. Then register for PAN with IRD.', ne: 'स्वीकृत भएपछि पोर्टलबाट डाउनलोड। त्यसपछि IRD मा PAN दर्ता गर्नुहोस्।' } },
    ],
    offices: [
      { name: { en: 'Office of the Company Registrar', ne: 'कम्पनी रजिस्ट्रारको कार्यालय' }, address: { en: 'Tripureshwor, Kathmandu', ne: 'त्रिपुरेश्वर, काठमाडौँ' }, phone: '01-4259948', hours: { en: 'Sun–Fri, 10:00 – 17:00', ne: 'आइत–शुक्र, १०:०० – ५:००' }, lat: 27.6953, lng: 85.3138 },
    ],
    commonProblems: [
      { problem: { en: 'Name rejected', ne: 'नाम अस्वीकृत भयो' }, solution: { en: 'Avoid names similar to existing companies. Add distinctive word.', ne: 'पहिलै दर्ता भएका कम्पनीसँग मिल्ने नाम नराख्नुहोस्। विशिष्ट शब्द थप्नुहोस्।' } },
    ],
    faqs: [
      { q: { en: 'Minimum paid-up capital?', ne: 'न्यूनतम पुँजी?' }, a: { en: 'Rs. 1 lakh for most Pvt Ltd companies.', ne: 'अधिकांश प्रा.लि. कम्पनीका लागि रु. १ लाख।' } },
    ],
    tags: ['company', 'business', 'ocr', 'registration', 'pvt ltd', 'कम्पनी'],
    verifiedAt: VERIFIED,
  },

  // ─────────────────────────────────────────────────────────────
  // 10. LAND REGISTRATION / DHANI PURJA
  // ─────────────────────────────────────────────────────────────
  {
    slug: 'land-registration',
    category: 'land',
    providerType: 'gov',
    providerName: 'Malpot Karyalaya (Land Revenue Office)',
    title: { en: 'Land Registration (Dhani Purja)', ne: 'जग्गा दर्ता (धनी पुर्जा)' },
    summary: {
      en: 'Register purchase/sale/inheritance of land at Malpot. Dhani purja is the ownership document.',
      ne: 'जग्गा खरिदबिक्री / दानपत्र / हकबाली दर्ता मालपोत कार्यालयमा। धनी पुर्जा स्वामित्वको कागज हो।',
    },
    estimatedTime: { en: '1 day (if documents ready)', ne: '१ दिन (कागजात तयार भए)' },
    feeRange: { en: 'Registration fee: 4–5% of valuation + stationery', ne: 'दर्ता शुल्क: मूल्याङ्कनको ४–५% + स्टेसनरी' },
    officialUrl: 'https://dolma.gov.np',
    documents: [
      { title: { en: 'Citizenship of buyer and seller', ne: 'खरिदकर्ता र बिक्रेताको नागरिकता' }, required: true },
      { title: { en: 'Existing dhani purja (seller)', ne: 'बिक्रेताको हालको धनी पुर्जा' }, required: true },
      { title: { en: 'Land survey map (naksa)', ne: 'जग्गाको नक्सा' }, required: true },
      { title: { en: 'Tax clearance receipt (malpot)', ne: 'मालपोत तिरेको रसिद' }, required: true },
      { title: { en: 'Sales deed (rajinama)', ne: 'राजीनामा' }, required: true },
      { title: { en: 'Ward recommendation', ne: 'वडा सिफारिस' }, required: true },
    ],
    steps: [
      { order: 1, title: { en: 'Agree on price, draft rajinama', ne: 'मूल्य तय गरेर राजीनामा तयार गर्नुहोस्' }, detail: { en: 'Usually drafted with help of a lekhandas (deed writer).', ne: 'सामान्यतया लेखनदासको सहयोगमा तयार पारिन्छ।' } },
      { order: 2, title: { en: 'Get ward recommendation', ne: 'वडा सिफारिस लिनुहोस्' }, detail: { en: 'From the ward where land is located.', ne: 'जग्गा रहेको वडाबाट।' } },
      { order: 3, title: { en: 'Pay tax + fee at Malpot', ne: 'मालपोतमा कर र शुल्क तिर्नुहोस्' }, detail: { en: 'Assessed based on government valuation rate for that ward.', ne: 'त्यस वडाको सरकारी मूल्याङ्कन दरअनुसार गणना हुन्छ।' } },
      { order: 4, title: { en: 'Registration + new dhani purja', ne: 'दर्ता + नयाँ धनी पुर्जा' }, detail: { en: 'Both parties sign in front of officer. New dhani purja issued in buyer\'s name.', ne: 'दुवै पक्षले अधिकारीको अगाडि हस्ताक्षर गर्छन्। खरिदकर्ताको नाममा नयाँ धनी पुर्जा जारी हुन्छ।' } },
    ],
    offices: [
      { name: { en: 'Malpot Dillibazar', ne: 'मालपोत कार्यालय दिल्लीबजार' }, address: { en: 'Dillibazar, Kathmandu', ne: 'दिल्लीबजार, काठमाडौँ' }, phone: '01-4412233', hours: { en: 'Sun–Fri, 10:00 – 17:00', ne: 'आइत–शुक्र, १०:०० – ५:००' }, lat: 27.7048, lng: 85.3280 },
    ],
    commonProblems: [
      { problem: { en: 'Land already has a bank loan on it', ne: 'जग्गामा पहिले नै बैंक ऋण छ' }, solution: { en: 'Loan must be cleared and bank must release the dhani purja before sale.', ne: 'बिक्रीअघि ऋण टुंगिएर बैंकले धनी पुर्जा छोड्नुपर्छ।' } },
    ],
    faqs: [
      { q: { en: 'Can I sell land without being present?', ne: 'आफूै नगई जग्गा बेच्न सकिन्छ?' }, a: { en: 'Yes, via notarized Power of Attorney (mukhtiyari).', ne: 'सकिन्छ, मुख्तियारी (Power of Attorney) मार्फत।' } },
    ],
    tags: ['land', 'dhani purja', 'malpot', 'property', 'registration', 'जग्गा', 'धनीपुर्जा'],
    verifiedAt: VERIFIED,
  },
];
