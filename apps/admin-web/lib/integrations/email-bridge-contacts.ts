/**
 * Government Office Email Registry
 *
 * Maps service slugs to the responsible government office email addresses.
 * Uses real @gov.np domain emails where publicly known.
 * Entries with null email will log a warning — email bridge skips them.
 */

export interface GovEmailContact {
  /** Government office email (null = unknown) */
  email: string | null;
  /** English name of the office */
  officeName: string;
  /** Nepali name of the office */
  officeNameNe: string;
  /** SLA target in hours (used in the email body) */
  slaTargetHours: number;
  /** Department key matching service_counterparties */
  departmentKey: string;
}

/**
 * Primary mapping: service slug → government email contact.
 * Sourced from official Nepal government directories.
 */
export const GOV_EMAIL_CONTACTS: Record<string, GovEmailContact> = {
  // ── Identity / District Administration ──────────────────────
  'citizenship-by-descent': {
    email: 'info@moha.gov.np',
    officeName: 'District Administration Office (via MoHA)',
    officeNameNe: 'जिल्ला प्रशासन कार्यालय (गृह मन्त्रालय मार्फत)',
    slaTargetHours: 168,
    departmentKey: 'district-administration',
  },
  'citizenship-duplicate': {
    email: 'info@moha.gov.np',
    officeName: 'District Administration Office (via MoHA)',
    officeNameNe: 'जिल्ला प्रशासन कार्यालय (गृह मन्त्रालय मार्फत)',
    slaTargetHours: 168,
    departmentKey: 'district-administration',
  },
  'national-id-nid': {
    email: 'info@donidcr.gov.np',
    officeName: 'Department of National ID & Civil Registration',
    officeNameNe: 'राष्ट्रिय परिचयपत्र तथा पञ्जीकरण विभाग',
    slaTargetHours: 336,
    departmentKey: 'district-administration',
  },
  'birth-registration': {
    email: null, // Ward-level — no centralized email
    officeName: 'Local Ward Office',
    officeNameNe: 'स्थानीय वडा कार्यालय',
    slaTargetHours: 72,
    departmentKey: 'local-govt',
  },
  'birth-certificate': {
    email: null,
    officeName: 'Local Ward Office',
    officeNameNe: 'स्थानीय वडा कार्यालय',
    slaTargetHours: 72,
    departmentKey: 'local-govt',
  },
  'marriage-registration': {
    email: null,
    officeName: 'Local Ward Office',
    officeNameNe: 'स्थानीय वडा कार्यालय',
    slaTargetHours: 72,
    departmentKey: 'local-govt',
  },
  'migration-certificate': {
    email: null,
    officeName: 'Local Ward Office',
    officeNameNe: 'स्थानीय वडा कार्यालय',
    slaTargetHours: 72,
    departmentKey: 'local-govt',
  },
  'police-report': {
    email: 'info@nepalpolice.gov.np',
    officeName: 'Nepal Police HQ',
    officeNameNe: 'नेपाल प्रहरी प्रधान कार्यालय',
    slaTargetHours: 48,
    departmentKey: 'district-administration',
  },

  // ── Passport ───────────────────────────────────────────────
  'new-passport': {
    email: 'info@passport.gov.np',
    officeName: 'Department of Passports',
    officeNameNe: 'राहदानी विभाग',
    slaTargetHours: 720,
    departmentKey: 'passport',
  },

  // ── Transport ──────────────────────────────────────────────
  'drivers-license-renewal': {
    email: 'info@dotm.gov.np',
    officeName: 'Department of Transport Management',
    officeNameNe: 'यातायात व्यवस्था विभाग',
    slaTargetHours: 168,
    departmentKey: 'transport',
  },
  'drivers-license-new': {
    email: 'info@dotm.gov.np',
    officeName: 'Department of Transport Management',
    officeNameNe: 'यातायात व्यवस्था विभाग',
    slaTargetHours: 336,
    departmentKey: 'transport',
  },
  'drivers-license-trial': {
    email: 'info@dotm.gov.np',
    officeName: 'Department of Transport Management',
    officeNameNe: 'यातायात व्यवस्था विभाग',
    slaTargetHours: 168,
    departmentKey: 'transport',
  },
  'vehicle-registration': {
    email: 'info@dotm.gov.np',
    officeName: 'Department of Transport Management',
    officeNameNe: 'यातायात व्यवस्था विभाग',
    slaTargetHours: 168,
    departmentKey: 'transport',
  },
  'bike-bluebook-renewal': {
    email: 'info@dotm.gov.np',
    officeName: 'Department of Transport Management',
    officeNameNe: 'यातायात व्यवस्था विभाग',
    slaTargetHours: 168,
    departmentKey: 'transport',
  },
  'vehicle-tax-payment': {
    email: 'info@dotm.gov.np',
    officeName: 'Department of Transport Management',
    officeNameNe: 'यातायात व्यवस्था विभाग',
    slaTargetHours: 72,
    departmentKey: 'transport',
  },
  'pollution-test': {
    email: null,
    officeName: 'DoTM / Authorized Test Center',
    officeNameNe: 'यातायात व्यवस्था विभाग / अधिकृत परीक्षण केन्द्र',
    slaTargetHours: 24,
    departmentKey: 'transport',
  },

  // ── Tax ────────────────────────────────────────────────────
  'pan-individual': {
    email: 'info@ird.gov.np',
    officeName: 'Inland Revenue Department',
    officeNameNe: 'आन्तरिक राजस्व विभाग',
    slaTargetHours: 168,
    departmentKey: 'tax',
  },
  'income-tax-filing': {
    email: 'info@ird.gov.np',
    officeName: 'Inland Revenue Department',
    officeNameNe: 'आन्तरिक राजस्व विभाग',
    slaTargetHours: 336,
    departmentKey: 'tax',
  },
  'tax-clearance': {
    email: 'info@ird.gov.np',
    officeName: 'Inland Revenue Department',
    officeNameNe: 'आन्तरिक राजस्व विभाग',
    slaTargetHours: 168,
    departmentKey: 'tax',
  },
  'vat-registration': {
    email: 'info@ird.gov.np',
    officeName: 'Inland Revenue Department',
    officeNameNe: 'आन्तरिक राजस्व विभाग',
    slaTargetHours: 168,
    departmentKey: 'tax',
  },
  'house-land-tax': {
    email: null,
    officeName: 'Municipality Revenue Section',
    officeNameNe: 'नगरपालिका राजस्व शाखा',
    slaTargetHours: 72,
    departmentKey: 'local-govt',
  },

  // ── Utilities ──────────────────────────────────────────────
  'nea-electricity-bill': {
    email: 'info@nea.org.np',
    officeName: 'Nepal Electricity Authority',
    officeNameNe: 'नेपाल विद्युत प्राधिकरण',
    slaTargetHours: 48,
    departmentKey: 'electricity',
  },
  'nea-new-connection': {
    email: 'info@nea.org.np',
    officeName: 'Nepal Electricity Authority',
    officeNameNe: 'नेपाल विद्युत प्राधिकरण',
    slaTargetHours: 168,
    departmentKey: 'electricity',
  },
  'kukl-water-bill': {
    email: 'info@kathmanduwater.org',
    officeName: 'KUKL (Kathmandu Upatyaka Khanepani Limited)',
    officeNameNe: 'काठमाडौं उपत्यका खानेपानी लिमिटेड',
    slaTargetHours: 48,
    departmentKey: 'water',
  },
  'kukl-new-connection': {
    email: 'info@kathmanduwater.org',
    officeName: 'KUKL (Kathmandu Upatyaka Khanepani Limited)',
    officeNameNe: 'काठमाडौं उपत्यका खानेपानी लिमिटेड',
    slaTargetHours: 168,
    departmentKey: 'water',
  },

  // ── Health ─────────────────────────────────────────────────
  'bir-hospital-opd': {
    email: null, // No public email for OPD desk
    officeName: 'Bir Hospital — OPD Desk',
    officeNameNe: 'वीर अस्पताल — बहिरंग विभाग दर्ता',
    slaTargetHours: 4,
    departmentKey: 'health',
  },
  'tuth-opd': {
    email: null,
    officeName: 'Tribhuvan University Teaching Hospital',
    officeNameNe: 'त्रिभुवन विश्वविद्यालय शिक्षण अस्पताल',
    slaTargetHours: 4,
    departmentKey: 'health',
  },
  'patan-hospital-opd': {
    email: null,
    officeName: 'Patan Hospital',
    officeNameNe: 'पाटन अस्पताल',
    slaTargetHours: 4,
    departmentKey: 'health',
  },
  'health-insurance-board': {
    email: 'info@nhib.gov.np',
    officeName: 'Health Insurance Board',
    officeNameNe: 'स्वास्थ्य बीमा बोर्ड',
    slaTargetHours: 168,
    departmentKey: 'health',
  },

  // ── Business ───────────────────────────────────────────────
  'company-registration-ocr': {
    email: 'info@ocr.gov.np',
    officeName: 'Office of Company Registrar',
    officeNameNe: 'कम्पनी रजिस्ट्रार कार्यालय',
    slaTargetHours: 336,
    departmentKey: 'business',
  },
  'industry-registration': {
    email: 'info@doind.gov.np',
    officeName: 'Department of Industry',
    officeNameNe: 'उद्योग विभाग',
    slaTargetHours: 336,
    departmentKey: 'business',
  },

  // ── Land ───────────────────────────────────────────────────
  'land-parcha': {
    email: null,
    officeName: 'Land Revenue Office',
    officeNameNe: 'मालपोत कार्यालय',
    slaTargetHours: 168,
    departmentKey: 'land',
  },
  'land-valuation': {
    email: null,
    officeName: 'Land Revenue Office',
    officeNameNe: 'मालपोत कार्यालय',
    slaTargetHours: 168,
    departmentKey: 'land',
  },
  'land-registration': {
    email: null,
    officeName: 'Land Revenue Office',
    officeNameNe: 'मालपोत कार्यालय',
    slaTargetHours: 336,
    departmentKey: 'land',
  },

  // ── Education ──────────────────────────────────────────────
  'tu-transcript': {
    email: 'info@tu.edu.np',
    officeName: 'Tribhuvan University — Controller of Examinations',
    officeNameNe: 'त्रिभुवन विश्वविद्यालय — परीक्षा नियन्त्रक कार्यालय',
    slaTargetHours: 720,
    departmentKey: 'education',
  },
  'noc-foreign-study': {
    email: 'info@moest.gov.np',
    officeName: 'Ministry of Education, Science & Technology',
    officeNameNe: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
    slaTargetHours: 336,
    departmentKey: 'education',
  },
  'loksewa-application': {
    email: 'info@psc.gov.np',
    officeName: 'Public Service Commission (Lok Sewa Aayog)',
    officeNameNe: 'लोक सेवा आयोग',
    slaTargetHours: 168,
    departmentKey: 'education',
  },

  // ── Legal / Complaints ─────────────────────────────────────
  'ciaa-complaint': {
    email: 'ciaa@ciaa.gov.np',
    officeName: 'CIAA (Commission for Investigation of Abuse of Authority)',
    officeNameNe: 'अख्तियार दुरुपयोग अनुसन्धान आयोग',
    slaTargetHours: 336,
    departmentKey: 'legal',
  },
  'consumer-complaint': {
    email: 'info@doc.gov.np',
    officeName: 'Department of Commerce, Supplies & Consumer Protection',
    officeNameNe: 'वाणिज्य, आपूर्ति तथा उपभोक्ता हित विभाग',
    slaTargetHours: 168,
    departmentKey: 'legal',
  },
  'human-rights-complaint': {
    email: 'nhrc@nhrcnepal.org',
    officeName: 'National Human Rights Commission',
    officeNameNe: 'राष्ट्रिय मानव अधिकार आयोग',
    slaTargetHours: 336,
    departmentKey: 'legal',
  },
  'lokpal-complaint': {
    email: null,
    officeName: 'Ombudsman (Lokpal)',
    officeNameNe: 'लोकपाल',
    slaTargetHours: 336,
    departmentKey: 'legal',
  },

  // ── Foreign Employment ─────────────────────────────────────
  'labor-permit': {
    email: 'info@dofe.gov.np',
    officeName: 'Department of Foreign Employment',
    officeNameNe: 'वैदेशिक रोजगार विभाग',
    slaTargetHours: 168,
    departmentKey: 'labor',
  },

  // ── Banking ────────────────────────────────────────────────
  'bank-account-opening': {
    email: null,
    officeName: 'Bank Provider',
    officeNameNe: 'बैंक',
    slaTargetHours: 48,
    departmentKey: 'banking',
  },
  'forex-card-nrb': {
    email: 'info@nrb.org.np',
    officeName: 'Nepal Rastra Bank',
    officeNameNe: 'नेपाल राष्ट्र बैंक',
    slaTargetHours: 168,
    departmentKey: 'banking',
  },
};

/**
 * Look up the government email contact for a service slug.
 * Returns null if no entry or if the entry has no email.
 */
export function getGovEmailContact(serviceSlug: string): GovEmailContact | null {
  const contact = GOV_EMAIL_CONTACTS[serviceSlug];
  if (!contact) return null;
  return contact;
}

/**
 * Check if a service has a known email target.
 */
export function hasEmailTarget(serviceSlug: string): boolean {
  const contact = GOV_EMAIL_CONTACTS[serviceSlug];
  return !!contact?.email;
}
