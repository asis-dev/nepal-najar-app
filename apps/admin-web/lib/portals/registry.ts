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
    description: 'Online passport application (MRP/ePassport)',
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
    services: ['citizenship-by-descent', 'citizenship-by-birth', 'citizenship-copy'],
    contact: '01-4211231',
  },
  {
    id: 'nid-registration',
    name_en: 'National ID Management Center',
    name_ne: 'राष्ट्रिय परिचयपत्र व्यवस्थापन केन्द्र',
    url: 'https://donidcr.gov.np',
    description: 'National identity card registration & biometrics',
    category: 'identity',
    services: ['national-id'],
    has_online_application: true,
    contact: '01-5970888',
  },
  {
    id: 'election-commission',
    name_en: 'Election Commission Nepal',
    name_ne: 'निर्वाचन आयोग',
    url: 'https://election.gov.np',
    description: 'Voter registration, voter ID, election info',
    category: 'identity',
    services: ['voter-registration', 'voter-id-reprint'],
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
    description: 'Driving license, vehicle registration, road permits',
    category: 'transport',
    services: ['drivers-license-new', 'drivers-license-renewal', 'vehicle-registration', 'bluebook-renewal', 'route-permit'],
    has_online_application: true,
    contact: '01-4474920',
  },
  {
    id: 'dotm-online',
    name_en: 'DoTM Online Service',
    name_ne: 'यातायात अनलाइन सेवा',
    url: 'https://www.dotm.gov.np/en/online-form/',
    description: 'Online smart license application form',
    category: 'transport',
    services: ['smart-license-application'],
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
    url: 'https://taxpayerportal.ird.gov.np',
    description: 'E-filing, e-payment, PAN registration online',
    category: 'tax',
    services: ['e-filing', 'e-payment', 'pan-online'],
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
    id: 'nea-online',
    name_en: 'NEA Online Payment',
    name_ne: 'NEA अनलाइन भुक्तानी',
    url: 'https://nea.org.np/onlinepayment',
    description: 'Pay electricity bill online with customer ID',
    category: 'utilities',
    services: ['electricity-bill-online'],
    has_online_application: true,
    payment_methods: ['esewa', 'khalti', 'connectips'],
  },
  {
    id: 'kukl',
    name_en: 'Kathmandu Upatyaka Khanepani Limited',
    name_ne: 'काठमाडौं उपत्यका खानेपानी लिमिटेड',
    url: 'https://www.kathmanduwater.org',
    description: 'Water supply bill payment, new connection, complaints',
    category: 'utilities',
    services: ['water-bill', 'new-water-connection'],
    payment_methods: ['esewa', 'khalti', 'bank'],
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
    url: 'https://www.ncell.axiata.com',
    description: 'Mobile recharge, data packs, bill payment',
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
    id: 'malpot',
    name_en: 'Department of Land Management & Archive',
    name_ne: 'भूमि व्यवस्थापन तथा अभिलेख विभाग',
    url: 'https://www.dolma.gov.np',
    description: 'Land ownership transfer, Lalpurja, land revenue, survey',
    category: 'land',
    services: ['land-ownership-transfer', 'lalpurja-copy', 'land-revenue-payment'],
    contact: '01-4218654',
  },
  {
    id: 'land-info',
    name_en: 'Land Information System',
    name_ne: 'भूमि सूचना प्रणाली',
    url: 'https://lis.mofaga.gov.np',
    description: 'Online land records search, plot information',
    category: 'land',
    services: ['land-record-search'],
    has_online_application: true,
  },

  // ── Business ──
  {
    id: 'ocr',
    name_en: 'Office of Company Registrar',
    name_ne: 'कम्पनी रजिस्ट्रार कार्यालय',
    url: 'https://www.ocr.gov.np',
    description: 'Company registration, annual filing, name reservation',
    category: 'business',
    services: ['company-registration', 'company-annual-filing', 'company-name-reservation'],
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
    description: 'Labor permit, foreign employment registration',
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
    description: 'Social security registration, contribution, claims',
    category: 'health',
    services: ['ssf-registration', 'ssf-contribution', 'ssf-claim'],
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
    description: 'Visa services, arrival cards, immigration clearance',
    category: 'identity',
    services: ['visa-extension', 'arrival-card'],
    has_online_application: true,
    contact: '01-4223590',
  },

  // ── Nagarik App ──
  {
    id: 'nagarik-app',
    name_en: 'Nagarik App',
    name_ne: 'नागरिक एप',
    url: 'https://nagarikapp.gov.np',
    description: 'National digital identity, government service gateway, digital documents',
    category: 'identity',
    services: ['digital-identity', 'digital-documents', 'govt-service-gateway'],
    has_online_application: true,
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
