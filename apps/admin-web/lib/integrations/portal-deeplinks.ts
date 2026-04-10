/**
 * Portal Deep-Link Generator
 *
 * Generates context-aware, pre-filled links to government portals for each service.
 * Used by the service detail page, task flow, and API to give users
 * the best possible link to continue on the government's own website.
 */

import { findPortalsForService, type PortalEntry } from '@/lib/portals/registry';

export interface PortalDeepLink {
  url: string;
  portalName: string;
  portalNameNe: string;
  action: 'apply' | 'check_status' | 'pay' | 'book' | 'lookup' | 'login';
  instructions: string;
  instructionsNe: string;
  requiresLogin: boolean;
  canPreFill: boolean;
  preFilledUrl?: string;
  portalId: string;
  contact?: string;
}

// ── Per-service deep-link configurations ────────────────────────────

interface DeepLinkConfig {
  /** Which portal IDs this config applies to (matched from registry) */
  portalIds: string[];
  action: PortalDeepLink['action'];
  /** Override the action URL from the portal registry */
  actionUrl?: string;
  instructions: string;
  instructionsNe: string;
  requiresLogin: boolean;
  canPreFill: boolean;
  /** Build a pre-filled URL from form data. Return null if insufficient data. */
  buildPreFilledUrl?: (formData: Record<string, any>) => string | null;
}

const SERVICE_DEEP_LINKS: Record<string, DeepLinkConfig[]> = {
  // ── Passport ──────────────────────────────────────────────────────
  'new-passport': [
    {
      portalIds: ['dop-passport'],
      action: 'apply',
      actionUrl: 'https://emrtds.nepalpassport.gov.np/',
      instructions:
        'Click "Register" to create an account, then start a new e-Passport application. You will need to upload a photo and book a biometric appointment.',
      instructionsNe:
        '"Register" मा क्लिक गर्नुहोस्, नयाँ ई-राहदानी आवेदन सुरु गर्नुहोस्। फोटो अपलोड र बायोमेट्रिक अपोइन्टमेन्ट बुक गर्नुपर्छ।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],
  'passport-renewal': [
    {
      portalIds: ['dop-passport'],
      action: 'apply',
      actionUrl: 'https://emrtds.nepalpassport.gov.np/',
      instructions:
        'Log in to the e-Passport portal and select "Renewal" as the application type. Have your old passport number ready.',
      instructionsNe:
        'ई-राहदानी पोर्टलमा लग इन गर्नुहोस् र "Renewal" छान्नुहोस्। पुरानो राहदानी नम्बर तयार राख्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],

  // ── National ID ───────────────────────────────────────────────────
  'national-id-nid': [
    {
      portalIds: ['nid-registration'],
      action: 'apply',
      actionUrl: 'https://enrollment.donidcr.gov.np/',
      instructions:
        'Start your National ID pre-enrollment online. After submission, you will receive an appointment date for biometric capture at a nearby enrollment center.',
      instructionsNe:
        'राष्ट्रिय परिचयपत्र प्रि-इन्रोलमेन्ट सुरु गर्नुहोस्। पेश गरेपछि नजिकको केन्द्रमा बायोमेट्रिक लिनका लागि मिति पाउनुहुनेछ।',
      requiresLogin: false,
      canPreFill: false,
    },
  ],

  // ── Driving License ───────────────────────────────────────────────
  'drivers-license-new': [
    {
      portalIds: ['dotm', 'dotm-trial'],
      action: 'apply',
      actionUrl: 'https://applydlnew.dotm.gov.np/login',
      instructions:
        'Create an account or log in to the DoTM portal. Fill in the online application form, upload your photo, and book a written exam date.',
      instructionsNe:
        'DoTM पोर्टलमा खाता बनाउनुहोस् वा लग इन गर्नुहोस्। अनलाइन फारम भर्नुहोस्, फोटो अपलोड गर्नुहोस् र लिखित परीक्षाको मिति बुक गर्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],
  'drivers-license-renewal': [
    {
      portalIds: ['dotm', 'dotm-trial'],
      action: 'apply',
      actionUrl: 'https://applydlnew.dotm.gov.np/login',
      instructions:
        'Log in to the DoTM portal and select "License Renewal". Have your existing license number ready.',
      instructionsNe:
        'DoTM पोर्टलमा लग इन गर्नुहोस् र "License Renewal" छान्नुहोस्। तपाईंको लाइसेन्स नम्बर तयार राख्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],
  'drivers-license-trial': [
    {
      portalIds: ['dotm-trial'],
      action: 'book',
      actionUrl: 'https://applydlnew.dotm.gov.np/login',
      instructions:
        'Log in to book your practical driving trial date. Check availability for your preferred transport office.',
      instructionsNe:
        'ट्रायलको मिति बुक गर्न लग इन गर्नुहोस्। आफ्नो मनपर्ने यातायात कार्यालयको उपलब्धता जाँच गर्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],
  'license-search': [
    {
      portalIds: ['dotm-license-search'],
      action: 'lookup',
      actionUrl: 'https://www.dotm.gov.np/DrivingLicense/SearchLicense',
      instructions:
        'Enter your license number or full name to search driving license status.',
      instructionsNe:
        'लाइसेन्स नम्बर वा पूरा नाम प्रविष्ट गरेर लाइसेन्सको स्थिति खोज्नुहोस्।',
      requiresLogin: false,
      canPreFill: false,
    },
  ],

  // ── Tax ───────────────────────────────────────────────────────────
  'income-tax-filing': [
    {
      portalIds: ['taxpayer-portal', 'ird-taxpayer'],
      action: 'login',
      actionUrl: 'https://taxpayerportal.ird.gov.np/taxpayer/app.html',
      instructions:
        'Log in with your PAN credentials. Navigate to "E-Filing" to submit your annual income tax return.',
      instructionsNe:
        'PAN प्रमाणपत्रले लग इन गर्नुहोस्। वार्षिक आयकर विवरण पेश गर्न "E-Filing" मा जानुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],
  'vat-registration': [
    {
      portalIds: ['taxpayer-portal', 'ird-taxpayer'],
      action: 'apply',
      actionUrl: 'https://taxpayerportal.ird.gov.np/taxpayer/app.html',
      instructions:
        'Log in to the taxpayer portal and select "VAT Registration" from the services menu. You will need your PAN number and business details.',
      instructionsNe:
        'करदाता पोर्टलमा लग इन गर्नुहोस् र सेवा मेनुबाट "VAT Registration" छान्नुहोस्। PAN नम्बर र व्यवसायको विवरण चाहिन्छ।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],
  'pan-individual': [
    {
      portalIds: ['taxpayer-portal', 'ird-taxpayer'],
      action: 'apply',
      actionUrl: 'https://taxpayerportal.ird.gov.np/taxpayer/app.html',
      instructions:
        'Click "New PAN Registration" and select "Individual". Fill in your details and submit for PAN allocation.',
      instructionsNe:
        '"New PAN Registration" मा क्लिक गर्नुहोस् र "Individual" छान्नुहोस्। विवरण भर्नुहोस् र PAN प्राप्तिका लागि पेश गर्नुहोस्।',
      requiresLogin: false,
      canPreFill: false,
    },
    {
      portalIds: ['ird-pan-search'],
      action: 'lookup',
      actionUrl: 'https://ird.gov.np/pan-search/',
      instructions:
        'Search your PAN number by name or verify an existing PAN. Requires solving a captcha.',
      instructionsNe:
        'नामले PAN नम्बर खोज्नुहोस् वा विद्यमान PAN प्रमाणित गर्नुहोस्। क्याप्चा समाधान गर्नुपर्छ।',
      requiresLogin: false,
      canPreFill: false,
    },
  ],
  'tax-clearance': [
    {
      portalIds: ['taxpayer-portal', 'ird-taxpayer'],
      action: 'login',
      actionUrl: 'https://taxpayerportal.ird.gov.np/taxpayer/app.html',
      instructions:
        'Log in to the taxpayer portal to request a tax clearance certificate. Ensure all tax returns are filed.',
      instructionsNe:
        'कर चुक्ता प्रमाणपत्र अनुरोध गर्न करदाता पोर्टलमा लग इन गर्नुहोस्। सबै कर विवरण दाखिला भएको सुनिश्चित गर्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],

  // ── Complaints ────────────────────────────────────────────────────
  'ciaa-complaint': [
    {
      portalIds: ['ciaa'],
      action: 'apply',
      actionUrl: 'https://ciaa.gov.np/online-complaint',
      instructions:
        'Fill in the online complaint form. Anonymous complaints are accepted. Include as much detail as possible about the corruption or abuse of authority.',
      instructionsNe:
        'अनलाइन उजुरी फारम भर्नुहोस्। गोप्य उजुरी स्वीकार्य छ। भ्रष्टाचार वा अधिकारको दुरुपयोगबारे सकेसम्म विस्तृत विवरण दिनुहोस्।',
      requiresLogin: false,
      canPreFill: false,
    },
  ],
  'human-rights-complaint': [
    {
      portalIds: ['nhrc'],
      action: 'apply',
      actionUrl: 'https://www.nhrcnepal.org/online_complaint',
      instructions:
        'File a human rights complaint online. Provide details of the violation, date, and location.',
      instructionsNe:
        'मानवअधिकार उजुरी अनलाइन दायर गर्नुहोस्। उल्लङ्घनको विवरण, मिति र स्थान प्रदान गर्नुहोस्।',
      requiresLogin: false,
      canPreFill: false,
    },
  ],

  // ── Education ─────────────────────────────────────────────────────
  'loksewa-application': [
    {
      portalIds: ['loksewa'],
      action: 'apply',
      actionUrl: 'https://online.psc.gov.np/',
      instructions:
        'Register or log in to the PSC online portal. Browse current vacancies and submit your application before the deadline.',
      instructionsNe:
        'PSC अनलाइन पोर्टलमा दर्ता गर्नुहोस् वा लग इन गर्नुहोस्। हालका रिक्तिहरू हेर्नुहोस् र म्याद अगावै आवेदन पेश गर्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],
  'see-results': [
    {
      portalIds: ['see-results', 'neb-exam'],
      action: 'lookup',
      actionUrl: 'http://verify.see.gov.np/result',
      instructions:
        'Enter your symbol number and date of birth to view your SEE results and mark sheet.',
      instructionsNe:
        'आफ्नो सिम्बोल नम्बर र जन्म मिति प्रविष्ट गरेर SEE नतिजा र अंकपत्र हेर्नुहोस्।',
      requiresLogin: false,
      canPreFill: true,
      buildPreFilledUrl: (formData: Record<string, any>) => {
        const symbol = formData.symbol_number || formData.symbolNumber;
        if (!symbol) return null;
        return `http://verify.see.gov.np/result?symbol_number=${encodeURIComponent(symbol)}`;
      },
    },
  ],

  // ── Business ──────────────────────────────────────────────────────
  'company-registration-ocr': [
    {
      portalIds: ['ocr'],
      action: 'apply',
      actionUrl: 'https://application.ocr.gov.np/',
      instructions:
        'Log in to the OCR portal to start a new company registration. Reserve your company name first, then fill the incorporation form.',
      instructionsNe:
        'OCR पोर्टलमा लग इन गर्नुहोस्। पहिले कम्पनीको नाम आरक्षण गर्नुहोस्, त्यसपछि दर्ता फारम भर्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],

  // ── Health ────────────────────────────────────────────────────────
  'health-insurance-board': [
    {
      portalIds: ['social-security'],
      action: 'apply',
      actionUrl: 'https://sosys.ssf.gov.np/',
      instructions:
        'Register on the Social Security Fund portal (SOSYS) for health insurance enrollment. Your employer may need to register first.',
      instructionsNe:
        'स्वास्थ्य बीमा दर्ताका लागि सामाजिक सुरक्षा कोष पोर्टल (SOSYS) मा दर्ता गर्नुहोस्। तपाईंको रोजगारदाताले पहिले दर्ता गर्नुपर्न सक्छ।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],

  // ── Utilities (pre-fillable) ──────────────────────────────────────
  'electricity-bill': [
    {
      portalIds: ['nea-online', 'nea-billing'],
      action: 'pay',
      actionUrl: 'https://www.nea.org.np/bill_payment',
      instructions:
        'Enter your NEA customer ID (SC No.) to view and pay your electricity bill online.',
      instructionsNe:
        'बिजुली बिल हेर्न र तिर्न आफ्नो NEA ग्राहक ID (SC No.) प्रविष्ट गर्नुहोस्।',
      requiresLogin: false,
      canPreFill: true,
      buildPreFilledUrl: (formData: Record<string, any>) => {
        const customerId =
          formData.customer_id || formData.nea_customer_id || formData.sc_no;
        if (!customerId) return null;
        return `https://www.nea.org.np/bill_payment?customer_id=${encodeURIComponent(customerId)}`;
      },
    },
  ],
  'nea-electricity-bill': [
    {
      portalIds: ['nea-online', 'nea-billing'],
      action: 'pay',
      actionUrl: 'https://www.nea.org.np/bill_payment',
      instructions:
        'Enter your NEA customer ID (SC No.) to view and pay your electricity bill online.',
      instructionsNe:
        'बिजुली बिल हेर्न र तिर्न आफ्नो NEA ग्राहक ID (SC No.) प्रविष्ट गर्नुहोस्।',
      requiresLogin: false,
      canPreFill: true,
      buildPreFilledUrl: (formData: Record<string, any>) => {
        const customerId =
          formData.customer_id || formData.nea_customer_id || formData.sc_no;
        if (!customerId) return null;
        return `https://www.nea.org.np/bill_payment?customer_id=${encodeURIComponent(customerId)}`;
      },
    },
  ],
  'electricity-bill-check': [
    {
      portalIds: ['nea-billing'],
      action: 'lookup',
      actionUrl: 'https://www.neabilling.com/viewonline/',
      instructions:
        'Enter your NEA customer ID to view bill statement and payment history.',
      instructionsNe:
        'बिल विवरण र भुक्तानी इतिहास हेर्न आफ्नो NEA ग्राहक ID प्रविष्ट गर्नुहोस्।',
      requiresLogin: false,
      canPreFill: true,
      buildPreFilledUrl: (formData: Record<string, any>) => {
        const customerId =
          formData.customer_id || formData.nea_customer_id || formData.sc_no;
        if (!customerId) return null;
        return `https://www.neabilling.com/viewonline/?sc=${encodeURIComponent(customerId)}`;
      },
    },
  ],

  // ── Land (pre-fillable) ───────────────────────────────────────────
  'land-record-search': [
    {
      portalIds: ['lrims'],
      action: 'lookup',
      actionUrl: 'https://lrims.dolrm.gov.np/',
      instructions:
        'Search land records by district, municipality, and ward. You can look up plot details, ownership history, and parcha records.',
      instructionsNe:
        'जिल्ला, नगरपालिका र वडा अनुसार भूमि अभिलेख खोज्नुहोस्। कित्ताको विवरण, स्वामित्व इतिहास र पर्चा अभिलेख हेर्न सक्नुहुन्छ।',
      requiresLogin: false,
      canPreFill: true,
      buildPreFilledUrl: (formData: Record<string, any>) => {
        const district = formData.district || formData.permanent_district;
        const vdc = formData.municipality || formData.vdc || formData.permanent_municipality;
        if (!district) return null;
        const params = new URLSearchParams();
        params.set('district', district);
        if (vdc) params.set('vdc', vdc);
        return `https://lrims.dolrm.gov.np/?${params.toString()}`;
      },
    },
  ],
  'land-parcha': [
    {
      portalIds: ['lrims'],
      action: 'lookup',
      actionUrl: 'https://lrims.dolrm.gov.np/',
      instructions:
        'Search land records by district, municipality, and ward on the LRIMS portal.',
      instructionsNe:
        'LRIMS पोर्टलमा जिल्ला, नगरपालिका र वडा अनुसार भूमि अभिलेख खोज्नुहोस्।',
      requiresLogin: false,
      canPreFill: true,
      buildPreFilledUrl: (formData: Record<string, any>) => {
        const district = formData.district || formData.permanent_district;
        const vdc = formData.municipality || formData.vdc || formData.permanent_municipality;
        if (!district) return null;
        const params = new URLSearchParams();
        params.set('district', district);
        if (vdc) params.set('vdc', vdc);
        return `https://lrims.dolrm.gov.np/?${params.toString()}`;
      },
    },
  ],
  'land-ownership-transfer': [
    {
      portalIds: ['dolma'],
      action: 'apply',
      actionUrl: 'https://public.dolma.gov.np/',
      instructions:
        'Access the DOLMA public portal for land ownership transfer inquiries and document submission.',
      instructionsNe:
        'जग्गा स्वामित्व हस्तान्तरण सोधपुछ र कागजात पेशका लागि DOLMA सार्वजनिक पोर्टल प्रयोग गर्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],

  // ── Foreign Employment ────────────────────────────────────────────
  'labor-permit': [
    {
      portalIds: ['dofe'],
      action: 'apply',
      actionUrl: 'https://feims.dofe.gov.np/',
      instructions:
        'Log in to FEIMS to apply for a labor permit. You will need your passport details and the demand letter from your employer.',
      instructionsNe:
        'श्रम अनुमतिपत्रका लागि FEIMS मा लग इन गर्नुहोस्। राहदानी विवरण र रोजगारदाताको माग पत्र चाहिन्छ।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],

  // ── Immigration ───────────────────────────────────────────────────
  'visa-extension': [
    {
      portalIds: ['immigration'],
      action: 'apply',
      actionUrl: 'https://nepaliport.immigration.gov.np/on-arrival/IO01',
      instructions:
        'Start visa extension or on-arrival visa application. Have your passport and travel details ready.',
      instructionsNe:
        'भिसा विस्तार वा आगमनमा भिसा आवेदन सुरु गर्नुहोस्। राहदानी र यात्रा विवरण तयार राख्नुहोस्।',
      requiresLogin: false,
      canPreFill: false,
    },
  ],

  // ── Voter Registration ────────────────────────────────────────────
  'voter-registration': [
    {
      portalIds: ['election-commission'],
      action: 'apply',
      actionUrl: 'https://applyvr.election.gov.np/',
      instructions:
        'Apply for voter pre-registration online. You must have a National ID to complete registration.',
      instructionsNe:
        'मतदाता प्रि-दर्ताका लागि अनलाइन आवेदन गर्नुहोस्। दर्ता पूरा गर्न राष्ट्रिय परिचयपत्र चाहिन्छ।',
      requiresLogin: false,
      canPreFill: false,
    },
  ],

  // ── Water bill ────────────────────────────────────────────────────
  'water-bill': [
    {
      portalIds: ['kukl'],
      action: 'pay',
      actionUrl: 'https://kathmanduwater.org/index.php/online-payment/',
      instructions:
        'Pay your KUKL water bill online. Enter your customer number from your bill statement.',
      instructionsNe:
        'KUKL पानी बिल अनलाइन तिर्नुहोस्। बिल विवरणबाट ग्राहक नम्बर प्रविष्ट गर्नुहोस्।',
      requiresLogin: false,
      canPreFill: false,
    },
  ],

  // ── Scholarship ───────────────────────────────────────────────────
  'scholarship-application': [
    {
      portalIds: ['ugc-scholarship'],
      action: 'apply',
      actionUrl: 'https://ugc.pathway.com.np/',
      instructions:
        'Apply for government scholarships when the portal is open (seasonal). Check eligibility criteria before applying.',
      instructionsNe:
        'पोर्टल खुला हुँदा सरकारी छात्रवृत्तिका लागि आवेदन गर्नुहोस् (मौसमी)। आवेदन गर्नु अघि योग्यता मापदण्ड जाँच गर्नुहोस्।',
      requiresLogin: true,
      canPreFill: false,
    },
  ],
};

// ── Action labels for display ───────────────────────────────────────

export const ACTION_LABELS: Record<PortalDeepLink['action'], { en: string; ne: string }> = {
  apply: { en: 'Apply online', ne: 'अनलाइन आवेदन गर्नुहोस्' },
  check_status: { en: 'Check status', ne: 'स्थिति जाँच गर्नुहोस्' },
  pay: { en: 'Pay online', ne: 'अनलाइन तिर्नुहोस्' },
  book: { en: 'Book appointment', ne: 'अपोइन्टमेन्ट बुक गर्नुहोस्' },
  lookup: { en: 'Look up', ne: 'हेर्नुहोस्' },
  login: { en: 'Log in to portal', ne: 'पोर्टलमा लग इन गर्नुहोस्' },
};

// ── Main generator function ─────────────────────────────────────────

/**
 * Generates deep-link objects for a given service slug.
 * If formData is provided, pre-filled URLs are generated where possible.
 */
export function getPortalDeepLinks(
  serviceSlug: string,
  formData?: Record<string, any>
): PortalDeepLink[] {
  const configs = SERVICE_DEEP_LINKS[serviceSlug];

  // If we have explicit deep-link configs for this service, use them
  if (configs && configs.length > 0) {
    return configs.flatMap((config) => {
      // Find matching portals from registry
      const portals = findPortalsForService(serviceSlug).filter((p) =>
        config.portalIds.includes(p.id)
      );

      // If no matching portal found in registry, still generate from config
      if (portals.length === 0) {
        // Build a synthetic entry from the config
        return [buildDeepLinkFromConfig(config, null, formData)];
      }

      // Deduplicate: use the first matching portal (they typically point to the same place)
      const portal = portals[0];
      return [buildDeepLinkFromConfig(config, portal, formData)];
    });
  }

  // Fallback: generate basic deep-links from portal registry entries
  const portals = findPortalsForService(serviceSlug);
  if (portals.length === 0) return [];

  return portals
    .filter((p) => p.has_online_application || p.action_url)
    .map((portal) => buildFallbackDeepLink(portal, serviceSlug));
}

function buildDeepLinkFromConfig(
  config: DeepLinkConfig,
  portal: PortalEntry | null,
  formData?: Record<string, any>
): PortalDeepLink {
  const baseUrl = config.actionUrl || portal?.action_url || portal?.url || '';
  let preFilledUrl: string | undefined;

  if (config.canPreFill && config.buildPreFilledUrl && formData) {
    const built = config.buildPreFilledUrl(formData);
    if (built) preFilledUrl = built;
  }

  return {
    url: baseUrl,
    portalName: portal?.name_en || extractDomain(baseUrl),
    portalNameNe: portal?.name_ne || '',
    action: config.action,
    instructions: config.instructions,
    instructionsNe: config.instructionsNe,
    requiresLogin: config.requiresLogin,
    canPreFill: config.canPreFill,
    preFilledUrl,
    portalId: portal?.id || config.portalIds[0] || '',
    contact: portal?.contact,
  };
}

function buildFallbackDeepLink(
  portal: PortalEntry,
  serviceSlug: string
): PortalDeepLink {
  const url = portal.action_url || portal.url;
  const isBill = serviceSlug.includes('bill') || serviceSlug.includes('payment');
  const isComplaint = serviceSlug.includes('complaint');
  const action: PortalDeepLink['action'] = isBill
    ? 'pay'
    : isComplaint
      ? 'apply'
      : portal.has_online_application
        ? 'apply'
        : 'lookup';

  return {
    url,
    portalName: portal.name_en,
    portalNameNe: portal.name_ne,
    action,
    instructions: `Continue on ${portal.name_en}. ${portal.description}`,
    instructionsNe: `${portal.name_ne} मा जानुहोस्।`,
    requiresLogin: action !== 'lookup',
    canPreFill: false,
    portalId: portal.id,
    contact: portal.contact,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Check if a service has any portal deep-links available.
 */
export function hasPortalDeepLinks(serviceSlug: string): boolean {
  if (SERVICE_DEEP_LINKS[serviceSlug]) return true;
  const portals = findPortalsForService(serviceSlug);
  return portals.some((p) => p.has_online_application || p.action_url);
}
