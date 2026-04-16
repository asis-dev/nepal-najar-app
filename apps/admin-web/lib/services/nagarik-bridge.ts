/**
 * Nagarik App Bridge — maps Nepal Republic services to Nagarik App equivalents.
 *
 * The Nagarik App (नागरिक एप) is Nepal's national digital identity & services gateway.
 * Rather than competing, we complement it: show users which services are available on
 * Nagarik, deep-link to the app/website, and layer on accountability features they'll
 * never build (scoring, tracking, evidence, transparency).
 */

export interface NagarikService {
  /** The Nepal Republic service slug that maps to this Nagarik feature */
  slug: string;
  /** What Nagarik calls this feature */
  nagarikLabel: { en: string; ne: string };
  /** Deep link into the Nagarik app (if available) or web portal */
  nagarikUrl: string;
  /** Brief description of what Nagarik offers for this service */
  nagarikCapability: { en: string; ne: string };
  /** What Nepal Republic adds on top of Nagarik */
  ourAdvantage?: { en: string; ne: string };
}

/**
 * Map of Nepal Republic service slugs → Nagarik App equivalents.
 * Only includes services where Nagarik has a concrete feature.
 */
export const NAGARIK_SERVICES: NagarikService[] = [
  // ── Identity ──
  {
    slug: 'citizenship-by-descent',
    nagarikLabel: { en: 'Citizenship Certificate', ne: 'नागरिकता प्रमाणपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link & view your citizenship certificate digitally', ne: 'नागरिकता डिजिटल रूपमा लिंक गर्नुहोस्' },
    ourAdvantage: { en: 'Step-by-step guide, document checklist, office locations with wait times', ne: 'चरणबद्ध गाइड, कागजात चेकलिस्ट, कार्यालय स्थान' },
  },
  {
    slug: 'citizenship-by-birth',
    nagarikLabel: { en: 'Citizenship Certificate', ne: 'नागरिकता प्रमाणपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link & view your citizenship certificate digitally', ne: 'नागरिकता डिजिटल रूपमा लिंक गर्नुहोस्' },
    ourAdvantage: { en: 'In-app form filling with PDF export, office wait times', ne: 'एपमा फारम भर्ने, PDF निर्यात' },
  },
  {
    slug: 'citizenship-duplicate',
    nagarikLabel: { en: 'Citizenship Correction', ne: 'नागरिकता सच्याउने' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Request corrections to citizenship records', ne: 'नागरिकताको विवरण सच्याउन अनुरोध' },
  },
  {
    slug: 'national-id-nid',
    nagarikLabel: { en: 'National ID (NID)', ne: 'राष्ट्रिय परिचयपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link NID with biometric data, access National Identity Number', ne: 'NID लिंक गर्ने, राष्ट्रिय परिचय नम्बर हेर्ने' },
    ourAdvantage: { en: 'Registration guide, office finder, document checklist', ne: 'दर्ता गाइड, कार्यालय खोज्ने' },
  },
  {
    slug: 'new-passport',
    nagarikLabel: { en: 'Passport', ne: 'राहदानी' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link passport, apply online (coming mid-2026)', ne: 'राहदानी लिंक, अनलाइन आवेदन (आगामी)' },
    ourAdvantage: { en: 'Full form filling, fee breakdown, fast-track options, office wait times', ne: 'पूर्ण फारम, शुल्क विवरण, फास्ट-ट्र्याक' },
  },
  {
    slug: 'passport-renewal',
    nagarikLabel: { en: 'Passport', ne: 'राहदानी' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'View passport details digitally', ne: 'राहदानी विवरण डिजिटल हेर्ने' },
    ourAdvantage: { en: 'Renewal form, lost/stolen process, office locations', ne: 'नवीकरण फारम, हराएको प्रक्रिया' },
  },

  // ── Transport ──
  {
    slug: 'drivers-license-renewal',
    nagarikLabel: { en: 'Driving License', ne: 'सवारी चालक अनुमति' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link & view driving license digitally, apply for renewal (coming)', ne: 'लाइसेन्स लिंक गर्ने, नवीकरण आवेदन (आगामी)' },
    ourAdvantage: { en: 'DoTM appointment booking, biometric capture guide, delivery tracking', ne: 'DoTM भेटघाट बुकिङ, ट्र्याकिङ' },
  },
  {
    slug: 'drivers-license-new',
    nagarikLabel: { en: 'Driving License', ne: 'सवारी चालक अनुमति' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link driving license after issue', ne: 'जारी भएपछि लिंक गर्ने' },
    ourAdvantage: { en: 'Full process guide: written test → trial → biometric → card delivery', ne: 'पूर्ण प्रक्रिया गाइड' },
  },
  {
    slug: 'vehicle-tax-payment',
    nagarikLabel: { en: 'Vehicle Tax', ne: 'सवारी कर' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Pay vehicle tax directly without office visit', ne: 'कार्यालय नगई सवारी कर तिर्ने' },
  },

  // ── Tax ──
  {
    slug: 'pan-individual',
    nagarikLabel: { en: 'PAN Card', ne: 'प्यान कार्ड' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link PAN, register new PAN through the app', ne: 'प्यान लिंक, नयाँ प्यान दर्ता' },
    ourAdvantage: { en: 'Step-by-step registration guide, nearest IRD office, documents list', ne: 'चरणबद्ध दर्ता गाइड, नजिकको IRD कार्यालय' },
  },

  // ── Utilities ──
  {
    slug: 'nea-electricity-bill',
    nagarikLabel: { en: 'Electricity Bill', ne: 'विद्युत बिल' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'View NEA bills (payments via eSewa/Khalti)', ne: 'NEA बिल हेर्ने' },
    ourAdvantage: { en: 'Quick Pay shortcuts, payment history, complaint filing', ne: 'Quick Pay, भुक्तानी इतिहास, उजुरी' },
  },
  {
    slug: 'kukl-water-bill',
    nagarikLabel: { en: 'KUKL Water Bill', ne: 'KUKL पानी बिल' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link KUKL ID, view water billing details', ne: 'KUKL ID लिंक गरी बिल हेर्ने' },
    ourAdvantage: { en: 'Quick Pay via eSewa/Khalti, new connection guide', ne: 'Quick Pay, नयाँ जडान गाइड' },
  },

  // ── Education ──
  {
    slug: 'see-results',
    nagarikLabel: { en: 'SEE Report Card', ne: 'SEE मार्कशिट' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link & view SEE (SLC) results', ne: 'SEE नतिजा लिंक गरी हेर्ने' },
  },
  {
    slug: 'loksewa-application',
    nagarikLabel: { en: 'Lok Sewa Admit Card', ne: 'लोकसेवा प्रवेशपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Download PSC exam admit cards', ne: 'लोकसेवा प्रवेशपत्र डाउनलोड' },
    ourAdvantage: { en: 'Application guide, vacancy tracking, exam schedule', ne: 'आवेदन गाइड, रिक्ति ट्र्याकिङ' },
  },
  {
    slug: 'noc-foreign-study',
    nagarikLabel: { en: 'NOC for Study Abroad', ne: 'विदेश अध्ययन NOC' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Apply for No Objection Certificate', ne: 'NOC आवेदन' },
    ourAdvantage: { en: 'Document checklist, step-by-step process, common rejection reasons', ne: 'कागजात चेकलिस्ट, प्रक्रिया गाइड' },
  },

  // ── Banking ──
  {
    slug: 'bank-account-opening',
    nagarikLabel: { en: 'Digital Bank Account', ne: 'डिजिटल बैंक खाता' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Open bank account with virtual KYC (Nepal Bank, Nepal Banijya, Siddhartha)', ne: 'भर्चुअल KYC बाट बैंक खाता खोल्ने' },
  },

  // ── Legal ──
  {
    slug: 'police-report',
    nagarikLabel: { en: 'Police Clearance', ne: 'चारित्रिक प्रमाणपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Apply for police clearance certificate', ne: 'चारित्रिक प्रमाणपत्रका लागि आवेदन' },
    ourAdvantage: { en: 'Process guide, required documents, nearest police station', ne: 'प्रक्रिया गाइड, कागजात, नजिकको थाना' },
  },

  // ── Identity: voter ──
  {
    slug: 'voter-registration',
    nagarikLabel: { en: 'Voter ID', ne: 'मतदाता परिचयपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link voter card, pre-register for voter ID', ne: 'मतदाता कार्ड लिंक, पूर्व-दर्ता' },
  },
  {
    slug: 'birth-registration',
    nagarikLabel: { en: 'Birth Certificate', ne: 'जन्मदर्ता प्रमाणपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Birth registration certificate (coming soon)', ne: 'जन्मदर्ता प्रमाणपत्र (आगामी)' },
  },
  {
    slug: 'marriage-registration',
    nagarikLabel: { en: 'Marriage Certificate', ne: 'विवाह दर्ता प्रमाणपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Marriage registration certificate (coming soon)', ne: 'विवाह दर्ता प्रमाणपत्र (आगामी)' },
  },

  // ── New services only on Nagarik ──
  {
    slug: 'e-chalan-traffic-fine',
    nagarikLabel: { en: 'E-Chalan Traffic Fine', ne: 'ई-चालान ट्राफिक जरिवाना' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'View traffic violations, pay fines digitally', ne: 'ट्राफिक उल्लंघन हेर्ने, डिजिटल जरिवाना तिर्ने' },
    ourAdvantage: { en: 'Fine lookup guide, payment options, dispute process', ne: 'जरिवाना खोज गाइड, भुक्तानी विकल्प' },
  },
  {
    slug: 'neb-plus-two-results',
    nagarikLabel: { en: 'NEB +2 Results', ne: 'NEB +२ नतिजा' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Link & view NEB (+2) results', ne: 'NEB +२ नतिजा लिंक गरी हेर्ने' },
  },
  {
    slug: 'epf-provident-fund',
    nagarikLabel: { en: 'EPF Statement', ne: 'कर्मचारी सञ्चय कोष' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'View EPF contribution & loan statements', ne: 'सञ्चय कोष जम्मा र ऋण विवरण हेर्ने' },
  },
  {
    slug: 'police-clearance-certificate',
    nagarikLabel: { en: 'Police Clearance', ne: 'चारित्रिक प्रमाणपत्र' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Apply for and obtain police clearance certificate', ne: 'चारित्रिक प्रमाणपत्र आवेदन र प्राप्ति' },
  },
  {
    slug: 'social-security-fund',
    nagarikLabel: { en: 'Social Security Tax', ne: 'सामाजिक सुरक्षा कर' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Access social security tax records', ne: 'सामाजिक सुरक्षा कर अभिलेख हेर्ने' },
  },
  {
    slug: 'land-revenue-payment',
    nagarikLabel: { en: 'Land Revenue', ne: 'मालपोत' },
    nagarikUrl: 'https://nagarikapp.gov.np',
    nagarikCapability: { en: 'Pay land revenue online', ne: 'मालपोत अनलाइन तिर्ने' },
  },
];

/** Quick lookup: slug → NagarikService */
const NAGARIK_MAP = new Map(NAGARIK_SERVICES.map((s) => [s.slug, s]));

/** Check if a service has a Nagarik App equivalent */
export function getNagarikBridge(slug: string): NagarikService | undefined {
  return NAGARIK_MAP.get(slug);
}

/** Get all service slugs that are available on Nagarik */
export function getNagarikSlugs(): string[] {
  return NAGARIK_SERVICES.map((s) => s.slug);
}

/** Count of Nagarik-bridged services */
export function getNagarikCount(): number {
  return NAGARIK_SERVICES.length;
}
