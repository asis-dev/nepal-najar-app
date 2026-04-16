/**
 * Nepal Government Portal Registry
 * Deep links to official government service portals for every major service category.
 * Used by the services super-app to link users directly to official systems.
 */

export interface PortalEntry {
  id: string;
  name_en: string;
  name_ne: string;
  url: string;
  /** Direct deep-link URL to the application/action page (if different from main url) */
  action_url?: string;
  description: string;
  category: string;
  services: string[];
  payment_methods?: string[];
  has_online_application?: boolean;
  contact?: string;
}

export const PORTAL_REGISTRY: PortalEntry[] = [
  // ── Identity & Documents ──
  {
    id: 'dop-passport',
    name_en: 'Department of Passport',
    name_ne: 'राहदानी विभाग',
    url: 'https://nepalpassport.gov.np',
    action_url: 'https://emrtds.nepalpassport.gov.np/',
    description: 'e-Passport pre-enrollment, appointment booking, status tracking',
    category: 'identity',
    services: ['new-passport', 'passport-renewal', 'lost-passport'],
    has_online_application: true,
    contact: '01-4410842',
  },
  {
    id: 'moha-citizenship',
    name_en: 'Ministry of Home Affairs',
    name_ne: 'गृह मन्त्रालय',
    url: 'https://moha.gov.np',
    description: 'Citizenship certificate issuance, distribution & records',
    category: 'identity',
    services: ['citizenship-by-descent', 'citizenship-by-birth', 'citizenship-duplicate', 'citizenship-copy'],
    contact: '01-4211231',
  },
  {
    id: 'nid-registration',
    name_en: 'Department of National ID & Civil Registration',
    name_ne: 'राष्ट्रिय परिचयपत्र तथा पञ्जीकरण विभाग',
    url: 'https://donidcr.gov.np',
    action_url: 'https://enrollment.donidcr.gov.np/',
    description: 'National ID pre-enrollment, biometric appointment, citizen portal',
    category: 'identity',
    services: ['national-id', 'national-id-nid', 'birth-registration', 'death-registration', 'marriage-registration', 'divorce-registration', 'birth-certificate', 'death-certificate', 'marriage-certificate'],
    has_online_application: true,
    contact: '01-4478110',
  },
  {
    id: 'election-commission',
    name_en: 'Election Commission Nepal',
    name_ne: 'निर्वाचन आयोग',
    url: 'https://election.gov.np',
    action_url: 'https://applyvr.election.gov.np/',
    description: 'Voter pre-registration (via NID), voter roll search, election info',
    category: 'identity',
    services: ['voter-registration', 'voter-id-reprint'],
    has_online_application: true,
    contact: '01-4228802',
  },
  {
    id: 'civil-registration',
    name_en: 'Department of Civil Registration',
    name_ne: 'व्यक्तिगत घटना दर्ता विभाग',
    url: 'https://docr.gov.np',
    description: 'Birth, death, marriage, divorce, migration certificates',
    category: 'identity',
    services: ['birth-certificate', 'death-certificate', 'marriage-certificate', 'migration-certificate'],
    has_online_application: true,
  },

  // ── Transport & License ──
  {
    id: 'dotm',
    name_en: 'Department of Transport Management',
    name_ne: 'यातायात व्यवस्था विभाग',
    url: 'https://dotm.gov.np',
    action_url: 'https://applydlnew.dotm.gov.np/login',
    description: 'Driving license, vehicle registration, bluebook, road permits',
    category: 'transport',
    services: ['drivers-license-new', 'drivers-license-renewal', 'vehicle-registration', 'bluebook-renewal', 'route-permit'],
    has_online_application: true,
    contact: '01-4474920',
  },
  {
    id: 'dotm-license-search',
    name_en: 'DoTM License Search',
    name_ne: 'लाइसेन्स खोज',
    url: 'https://www.dotm.gov.np/DrivingLicense/SearchLicense',
    description: 'Search & verify driving license status online',
    category: 'transport',
    services: ['license-search'],
    has_online_application: true,
  },

  // ── Tax & Revenue ──
  {
    id: 'ird',
    name_en: 'Inland Revenue Department',
    name_ne: 'आन्तरिक राजस्व विभाग',
    url: 'https://ird.gov.np',
    description: 'PAN registration, tax filing, TDS, VAT',
    category: 'tax',
    services: ['pan-individual', 'pan-company', 'tax-return', 'tax-clearance'],
    has_online_application: true,
    contact: '01-4415802',
  },
  {
    id: 'taxpayer-portal',
    name_en: 'Taxpayer Portal',
    name_ne: 'करदाता पोर्टल',
    url: 'https://taxpayerportal.ird.gov.np/taxpayer/app.html',
    description: 'E-filing, e-payment, PAN registration online',
    category: 'tax',
    services: ['e-filing', 'e-payment', 'pan-online', 'pan-individual', 'tax-return', 'tax-clearance'],
    has_online_application: true,
  },

  // ── Utilities ──
  {
    id: 'nea',
    name_en: 'Nepal Electricity Authority',
    name_ne: 'नेपाल विद्युत प्राधिकरण',
    url: 'https://nea.org.np',
    description: 'Electricity bill payment, new connection, meter reading',
    category: 'utilities',
    services: ['electricity-bill', 'new-electricity-connection', 'meter-complaint'],
    payment_methods: ['esewa', 'khalti', 'connectips', 'bank'],
    contact: '1152',
  },
  {
    id: 'nea-billing',
    name_en: 'NEA Bill Check',
    name_ne: 'NEA बिल जाँच',
    url: 'https://www.neabilling.com/viewonline/',
    description: 'View electricity bill statement & payment history online',
    category: 'utilities',
    services: ['electricity-bill-check'],
    has_online_application: true,
  },
  {
    id: 'nea-online',
    name_en: 'NEA Online Payment',
    name_ne: 'NEA अनलाइन भुक्तानी',
    url: 'https://www.nea.org.np/bill_payment',
    description: 'Pay electricity bill online with customer ID',
    category: 'utilities',
    services: ['electricity-bill-online', 'electricity-bill'],
    has_online_application: true,
    payment_methods: ['esewa', 'khalti', 'connectips'],
  },
  {
    id: 'kukl',
    name_en: 'Kathmandu Upatyaka Khanepani Limited',
    name_ne: 'काठमाडौं उपत्यका खानेपानी लिमिटेड',
    url: 'https://kathmanduwater.org',
    action_url: 'https://kathmanduwater.org/index.php/online-payment/',
    description: 'Water bill payment, self meter reading, new connection',
    category: 'utilities',
    services: ['water-bill', 'new-water-connection'],
    payment_methods: ['esewa', 'khalti', 'fonepay'],
    contact: '01-4414744',
  },
  {
    id: 'ntc',
    name_en: 'Nepal Telecom',
    name_ne: 'नेपाल टेलिकम',
    url: 'https://www.ntc.net.np',
    description: 'Recharge, bill payment, postpaid, FTTH, SIM services',
    category: 'utilities',
    services: ['ntc-recharge', 'ntc-bill', 'ntc-ftth'],
    payment_methods: ['esewa', 'khalti', 'connectips'],
    contact: '1498',
  },
  {
    id: 'ncell',
    name_en: 'Ncell',
    name_ne: 'एनसेल',
    url: 'https://www.ncell.com.np',
    action_url: 'https://www.ncell.com.np/en/individual/recharge',
    description: 'Mobile recharge, data packs, postpaid bill payment',
    category: 'utilities',
    services: ['ncell-recharge', 'ncell-data-pack'],
    payment_methods: ['esewa', 'khalti'],
  },

  // ── Payment Gateways ──
  {
    id: 'esewa',
    name_en: 'eSewa',
    name_ne: 'इसेवा',
    url: 'https://esewa.com.np',
    description: 'Digital wallet: bill pay, money transfer, top-up, govt fees',
    category: 'banking',
    services: ['esewa-transfer', 'esewa-topup', 'esewa-bill-pay'],
    payment_methods: ['esewa'],
  },
  {
    id: 'khalti',
    name_en: 'Khalti',
    name_ne: 'खल्ती',
    url: 'https://khalti.com',
    description: 'Digital wallet: bill pay, top-up, government fee payment',
    category: 'banking',
    services: ['khalti-transfer', 'khalti-topup', 'khalti-bill-pay'],
    payment_methods: ['khalti'],
  },
  {
    id: 'connectips',
    name_en: 'ConnectIPS',
    name_ne: 'कनेक्ट आइपीएस',
    url: 'https://www.connectips.com',
    description: 'Interbank payment system for government fees',
    category: 'banking',
    services: ['connectips-transfer', 'govt-fee-payment'],
    payment_methods: ['connectips'],
  },

  // ── Land & Property ──
  {
    id: 'dolma',
    name_en: 'Department of Land Management & Archive',
    name_ne: 'भूमि व्यवस्थापन तथा अभिलेख विभाग',
    url: 'https://molcpa.gov.np',
    action_url: 'https://public.dolma.gov.np/',
    description: 'Land ownership records, revenue payment, Lalpurja verification',
    category: 'land',
    services: ['land-ownership-transfer', 'lalpurja-copy', 'land-revenue-payment'],
    has_online_application: true,
    contact: '01-4218654',
  },
  {
    id: 'lrims',
    name_en: 'Land Records Information (LRIMS)',
    name_ne: 'भूमि अभिलेख सूचना',
    url: 'https://lrims.dolrm.gov.np/',
    description: 'Online land records search, plot information, ownership history',
    category: 'land',
    services: ['land-record-search'],
    has_online_application: true,
  },

  // ── Business ──
  {
    id: 'ocr',
    name_en: 'Office of Company Registrar',
    name_ne: 'कम्पनी रजिस्ट्रार कार्यालय',
    url: 'https://ocr.gov.np',
    action_url: 'https://application.ocr.gov.np/',
    description: 'Company registration, annual filing, name reservation, company search',
    category: 'business',
    services: ['company-registration', 'company-registration-ocr', 'company-annual-filing', 'company-name-reservation', 'sole-proprietorship', 'ngo-registration'],
    has_online_application: true,
    contact: '01-4256718',
  },
  {
    id: 'cottage-industry',
    name_en: 'Department of Cottage & Small Industries',
    name_ne: 'घरेलु तथा साना उद्योग विभाग',
    url: 'https://www.dcsi.gov.np',
    description: 'Industry registration for small businesses',
    category: 'business',
    services: ['cottage-industry-registration'],
    contact: '01-5521181',
  },

  // ── Foreign Employment ──
  {
    id: 'dofe',
    name_en: 'Department of Foreign Employment',
    name_ne: 'वैदेशिक रोजगार विभाग',
    url: 'https://dofe.gov.np',
    action_url: 'https://feims.dofe.gov.np/',
    description: 'Labor permit (FEIMS), foreign job search, recruitment agency verification',
    category: 'identity',
    services: ['labor-permit', 'foreign-employment-registration'],
    has_online_application: true,
    contact: '01-4782008',
  },

  // ── Health ──
  {
    id: 'mohp',
    name_en: 'Ministry of Health & Population',
    name_ne: 'स्वास्थ्य तथा जनसंख्या मन्त्रालय',
    url: 'https://mohp.gov.np',
    description: 'Health insurance, vaccination records, NHIS',
    category: 'health',
    services: ['health-insurance', 'vaccination-card'],
    contact: '01-4262543',
  },
  {
    id: 'social-security',
    name_en: 'Social Security Fund',
    name_ne: 'सामाजिक सुरक्षा कोष',
    url: 'https://ssf.gov.np',
    action_url: 'https://sosys.ssf.gov.np/',
    description: 'Social security registration (employer ERN, contributor enrollment), contribution voucher, claims',
    category: 'health',
    services: ['ssf-registration', 'ssf-contribution', 'ssf-claim', 'health-insurance-board'],
    has_online_application: true,
    contact: '01-5353100',
  },

  // ── Education ──
  {
    id: 'neb',
    name_en: 'National Examination Board',
    name_ne: 'राष्ट्रिय परीक्षा बोर्ड',
    url: 'https://neb.gov.np',
    description: 'SEE results, exam registration, transcripts',
    category: 'education',
    services: ['see-results', 'transcript-request'],
    contact: '01-4220085',
  },
  {
    id: 'ugc',
    name_en: 'University Grants Commission',
    name_ne: 'विश्वविद्यालय अनुदान आयोग',
    url: 'https://www.ugcnepal.edu.np',
    description: 'Scholarships, equivalence, higher education grants',
    category: 'education',
    services: ['scholarship-application', 'degree-equivalence'],
    contact: '01-5010360',
  },

  // ── Local Government ──
  {
    id: 'mofaga',
    name_en: 'Ministry of Federal Affairs & General Administration',
    name_ne: 'संघीय मामिला तथा सामान्य प्रशासन मन्त्रालय',
    url: 'https://mofaga.gov.np',
    description: 'Local government coordination, ward services, birth/death registration',
    category: 'identity',
    services: ['ward-office-services', 'recommendation-letter'],
    contact: '01-4200083',
  },

  // ── Legal & Courts ──
  {
    id: 'supreme-court',
    name_en: 'Supreme Court of Nepal',
    name_ne: 'सर्वोच्च अदालत',
    url: 'https://supremecourt.gov.np',
    description: 'Case status, cause list, judgments',
    category: 'legal',
    services: ['case-status-check', 'judgment-search'],
    has_online_application: true,
  },

  // ── Banking ──
  {
    id: 'nrb',
    name_en: 'Nepal Rastra Bank',
    name_ne: 'नेपाल राष्ट्र बैंक',
    url: 'https://nrb.org.np',
    description: 'Foreign exchange rates, banking complaints, monetary policy',
    category: 'banking',
    services: ['forex-rates', 'banking-complaint'],
    contact: '01-4410158',
  },
  {
    id: 'nepse',
    name_en: 'Nepal Stock Exchange',
    name_ne: 'नेपाल स्टक एक्सचेन्ज',
    url: 'https://nepalstock.com.np',
    description: 'Stock trading, IPO applications, DEMAT',
    category: 'banking',
    services: ['ipo-application', 'demat-account'],
    has_online_application: true,
  },

  // ── Immigration ──
  {
    id: 'immigration',
    name_en: 'Department of Immigration',
    name_ne: 'अध्यागमन विभाग',
    url: 'https://www.immigration.gov.np',
    action_url: 'https://nepaliport.immigration.gov.np/on-arrival/IO01',
    description: 'Visa on-arrival, online visa application, visa tracking, immigration clearance',
    category: 'identity',
    services: ['visa-extension', 'arrival-card', 'nrn-card', 'tourism-trekking-permit'],
    has_online_application: true,
    contact: '01-4223590',
  },

  // ── Local Government ──
  {
    id: 'smartpalika',
    name_en: 'SmartPalika',
    name_ne: 'स्मार्टपालिका',
    url: 'https://smartpalika.org',
    description: 'Ward-level digital services: certificates, sifaris, local tax',
    category: 'identity',
    services: ['birth-certificate', 'death-certificate', 'marriage-certificate', 'recommendation-letter'],
    has_online_application: true,
  },
  {
    id: 'digitalpalika',
    name_en: 'Digital Palika',
    name_ne: 'डिजिटल पालिका',
    url: 'https://digitalpalika.org',
    description: 'Municipal digital services: vital events, permits, local services',
    category: 'identity',
    services: ['birth-certificate', 'death-certificate', 'building-permit'],
    has_online_application: true,
  },

  // ── Nagarik App ──
  {
    id: 'nagarik-app',
    name_en: 'Nagarik App',
    name_ne: 'नागरिक एप',
    url: 'https://nagarikapp.gov.np',
    description: 'National digital identity & services gateway — citizenship, passport, driving license, PAN, voter ID, traffic fines, EPF, exam results, police clearance, and more',
    category: 'identity',
    services: [
      'citizenship-by-descent', 'citizenship-by-birth', 'citizenship-duplicate',
      'national-id-nid', 'new-passport', 'passport-renewal',
      'voter-registration', 'birth-registration', 'marriage-registration',
      'drivers-license-renewal', 'drivers-license-new', 'vehicle-tax-payment',
      'e-chalan-traffic-fine',
      'pan-individual',
      'nea-electricity-bill', 'kukl-water-bill',
      'see-results', 'neb-plus-two-results', 'loksewa-application', 'noc-foreign-study',
      'bank-account-opening', 'epf-provident-fund', 'social-security-fund',
      'police-report', 'police-clearance-certificate',
      'land-revenue-payment',
    ],
    has_online_application: true,
  },

  // ── Anti-corruption & Complaints ──
  {
    id: 'ciaa',
    name_en: 'Commission for Investigation of Abuse of Authority',
    name_ne: 'अख्तियार दुरुपयोग अनुसन्धान आयोग',
    url: 'https://ciaa.gov.np',
    action_url: 'https://ciaa.gov.np/online-complaint',
    description: 'Online anti-corruption complaint filing (anonymous accepted). Hotline 107.',
    category: 'legal',
    services: ['ciaa-complaint'],
    has_online_application: true,
    contact: '107',
  },
  {
    id: 'nhrc',
    name_en: 'National Human Rights Commission',
    name_ne: 'राष्ट्रिय मानव अधिकार आयोग',
    url: 'https://nhrcnepal.org',
    action_url: 'https://www.nhrcnepal.org/online_complaint',
    description: 'Human rights violation complaint. Hotline 50-10-000.',
    category: 'legal',
    services: ['human-rights-complaint'],
    has_online_application: true,
    contact: '50-10-000',
  },
  {
    id: 'consumer-protection',
    name_en: 'Department of Commerce, Supply & Consumer Protection',
    name_ne: 'वाणिज्य, आपूर्ति तथा उपभोक्ता हित विभाग',
    url: 'https://www.dcs.gov.np',
    description: 'Consumer complaints, price monitoring, market regulation',
    category: 'legal',
    services: ['consumer-complaint'],
    contact: '01-4214454',
  },
  {
    id: 'lokpal',
    name_en: 'Lokpal (Ombudsman)',
    name_ne: 'लोकपाल',
    url: 'https://lokpal.gov.np',
    description: 'Government service complaints, misconduct reporting',
    category: 'legal',
    services: ['lokpal-complaint'],
    has_online_application: true,
  },

  // ── Police ──
  {
    id: 'nepal-police',
    name_en: 'Nepal Police',
    name_ne: 'नेपाल प्रहरी',
    url: 'https://nepalpolice.gov.np',
    description: 'FIR filing, police clearance certificate, missing person reports',
    category: 'identity',
    services: ['police-report'],
    contact: '100',
  },

  // ── Hello Sarkar ──
  {
    id: 'hello-sarkar',
    name_en: 'Hello Sarkar (1111)',
    name_ne: 'हेल्लो सरकार',
    url: 'https://hellonepal.gov.np',
    description: 'Government grievance hotline — toll-free 1111 (NTC/Ncell), Viber 9851145045, WhatsApp',
    category: 'legal',
    services: ['right-to-information', 'lokpal-complaint', 'consumer-complaint'],
    contact: '1111',
  },

  // ── Education portals ──
  {
    id: 'see-results',
    name_en: 'SEE Results',
    name_ne: 'SEE नतिजा',
    url: 'https://see.gov.np',
    action_url: 'http://verify.see.gov.np/result',
    description: 'SEE exam results, mark sheet verification',
    category: 'education',
    services: ['see-results'],
    has_online_application: true,
  },
  {
    id: 'neb-exam',
    name_en: 'NEB Exam Portal',
    name_ne: 'NEB परीक्षा पोर्टल',
    url: 'https://exam.neb.gov.np',
    description: 'NEB exam registration, admit card, results',
    category: 'education',
    services: ['see-results'],
    has_online_application: true,
  },
  {
    id: 'tu',
    name_en: 'Tribhuvan University',
    name_ne: 'त्रिभुवन विश्वविद्यालय',
    url: 'https://tribhuvan-university.edu.np',
    description: 'Transcript requests, exam results, admission',
    category: 'education',
    services: ['tu-transcript'],
    contact: '01-4330433',
  },
  {
    id: 'ugc-scholarship',
    name_en: 'UGC Scholarship Portal',
    name_ne: 'छात्रवृत्ति पोर्टल',
    url: 'https://ugc.pathway.com.np/',
    description: 'Government scholarship application portal (seasonal)',
    category: 'education',
    services: ['scholarship-application', 'scholarship-portal'],
    has_online_application: true,
  },
  {
    id: 'moe-noc',
    name_en: 'Ministry of Education — NOC',
    name_ne: 'शिक्षा मन्त्रालय अनापत्ति',
    url: 'https://moest.gov.np',
    description: 'No Objection Certificate for foreign study',
    category: 'education',
    services: ['noc-foreign-study'],
    contact: '01-4200343',
  },
  {
    id: 'loksewa',
    name_en: 'Public Service Commission (Lok Sewa Aayog)',
    name_ne: 'लोक सेवा आयोग',
    url: 'https://psc.gov.np',
    action_url: 'https://online.psc.gov.np/',
    description: 'Civil service exam application, results, notices',
    category: 'education',
    services: ['loksewa-application'],
    has_online_application: true,
    contact: '01-4771488',
  },

  // ── Tax extras ──
  {
    id: 'ird-taxpayer',
    name_en: 'IRD Taxpayer Portal',
    name_ne: 'करदाता पोर्टल',
    url: 'https://taxpayerportal.ird.gov.np/taxpayer/app.html',
    description: 'PAN registration, tax filing, e-payment, TDS, VAT online',
    category: 'tax',
    services: ['pan-individual', 'pan-business', 'vat-registration', 'income-tax-filing', 'tax-clearance', 'ird-taxpayer-portal'],
    has_online_application: true,
  },
  {
    id: 'ird-pan-search',
    name_en: 'PAN Search',
    name_ne: 'PAN खोज',
    url: 'https://ird.gov.np/pan-search/',
    description: 'Search and verify PAN number (requires captcha)',
    category: 'tax',
    services: ['pan-individual', 'pan-business'],
    has_online_application: true,
  },

  // ── Transport extras ──
  {
    id: 'dotm-trial',
    name_en: 'DoTM License Trial Booking',
    name_ne: 'ट्रायल बुकिङ',
    url: 'https://applydlnew.dotm.gov.np/login',
    description: 'Driving license trial date booking, application tracking',
    category: 'transport',
    services: ['drivers-license-trial', 'drivers-license-new'],
    has_online_application: true,
  },

  // ── Land extras ──
  {
    id: 'survey-dept',
    name_en: 'Department of Survey',
    name_ne: 'नापी विभाग',
    url: 'https://dos.gov.np',
    description: 'Land survey / measurement (Napi), cadastral maps',
    category: 'land',
    services: ['land-measurement', 'land-valuation'],
    contact: '01-4218654',
  },

  // ── Telecom ──
  {
    id: 'worldlink',
    name_en: 'WorldLink Communications',
    name_ne: 'वर्ल्डलिंक',
    url: 'https://worldlink.com.np',
    description: 'Internet connection, WiFi plans, customer support',
    category: 'utilities',
    services: ['worldlink-internet'],
    contact: '01-5523050',
  },

  // ── Banking extras ──
  {
    id: 'esewa-developer',
    name_en: 'eSewa Developer Portal',
    name_ne: 'इसेवा डेभलपर',
    url: 'https://developer.esewa.com.np/',
    description: 'eSewa payment API integration — Epay REST API, Android/iOS/Flutter SDKs',
    category: 'banking',
    services: ['esewa-wallet'],
    has_online_application: true,
  },
  {
    id: 'khalti-developer',
    name_en: 'Khalti Developer Portal',
    name_ne: 'खल्ती डेभलपर',
    url: 'https://docs.khalti.com/',
    description: 'Khalti payment API — supports wallet, eBanking, mobile banking, VISA, ConnectIPS',
    category: 'banking',
    services: ['khalti-wallet'],
    has_online_application: true,
  },

  // ── Industry ──
  {
    id: 'doi',
    name_en: 'Department of Industry',
    name_ne: 'उद्योग विभाग',
    url: 'https://www.doind.gov.np',
    description: 'Industry registration, manufacturing license, foreign investment approval',
    category: 'business',
    services: ['industry-registration', 'fssai-food-license', 'cottage-industry'],
    contact: '01-5521181',
  },

  // ── Remittance ──
  {
    id: 'remit',
    name_en: 'Remittance Collection',
    name_ne: 'रेमिट्यान्स',
    url: 'https://ime.com.np',
    description: 'IME, Prabhu, Western Union — inward remittance collection',
    category: 'banking',
    services: ['remittance-inward'],
    payment_methods: ['esewa', 'khalti', 'connectips'],
  },

  // ── Legal aid ──
  {
    id: 'legal-aid-council',
    name_en: 'Legal Aid Council',
    name_ne: 'कानूनी सहायता परिषद्',
    url: 'https://nlac.gov.np',
    description: 'Free legal aid for those who cannot afford a lawyer',
    category: 'legal',
    services: ['legal-aid'],
    contact: '01-4232675',
  },
];

/**
 * Find portal entries relevant to a service slug.
 */
export function findPortalsForService(serviceSlug: string): PortalEntry[] {
  return PORTAL_REGISTRY.filter((p) => p.services.includes(serviceSlug));
}

/**
 * Find portal entries by category.
 */
export function getPortalsByCategory(category: string): PortalEntry[] {
  return PORTAL_REGISTRY.filter((p) => p.category === category);
}

/**
 * Get the best payment deep-link for a service.
 */
export function getPaymentLink(serviceSlug: string, method: 'esewa' | 'khalti' | 'connectips'): string | null {
  const urls: Record<string, string> = {
    esewa: 'https://esewa.com.np/#/home',
    khalti: 'https://khalti.com',
    connectips: 'https://www.connectips.com',
  };
  // Check if any portal for this service supports this payment method
  const portal = PORTAL_REGISTRY.find(
    (p) => p.services.includes(serviceSlug) && p.payment_methods?.includes(method)
  );
  if (portal) return urls[method] || null;
  return urls[method] || null;
}
