/**
 * Unified Service Advisor API — POST { query: string, locale?: 'en' | 'ne', targetMemberId?: string }
 *
 * Merges three previous routes into one:
 *   1. /api/advisor         — rules-based INTENT_RULES with multi-step journeys + AI fallback
 *   2. /api/me/service-tasks/from-query — authenticated task creation, vault doc checking, routing
 *   3. /api/services/ask    — rate limiting + AI ask() call
 *
 * HYBRID approach:
 *   1. Rate-limit by IP
 *   2. Try the AI-powered service routing (ask()) first
 *   3. Try rules-based keyword matching (matchIntent)
 *   4. If user is authenticated + topService found → create or reuse a service task
 *   5. If not authenticated but topService found → set requiresAuth flag
 *
 * Response is backwards-compatible with advisor page (steps, summary, matched, source,
 * followUpPrompt, followUpOptions, intakeState, serviceOptions) plus new fields
 * (task, taskReused, requiresAuth, missingDocs, readyDocs, routing, targetMember).
 */

import { NextRequest, NextResponse } from 'next/server';
import { SEED_SERVICES as CORE } from '@/lib/services/seed-data';
import { EXTRA_SERVICES } from '@/lib/services/seed-data-extra';
import { EXTRA_SERVICES_2 } from '@/lib/services/seed-data-extra-2';
import { findPortalsForService } from '@/lib/portals/registry';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import { resolveServiceRouting } from '@/lib/services/service-routing';
import { getTaskStatus, mapTaskRow } from '@/lib/services/task-engine';
import { getWorkflowDefinition } from '@/lib/services/workflow-definitions';
import { getServiceWorkflowPolicy, buildOpsDeadlines } from '@/lib/service-ops/queue';
import { autoAssignAndNotify } from '@/lib/service-ops/auto-assign';
import {
  buildAssistantTaskAnswers,
  getHouseholdMemberBestEffort,
  insertServiceTaskWithCompatibility,
  insertTaskEventBestEffort,
  updateServiceTaskWithCompatibility,
} from '@/lib/services/task-store';
import { listOwnerVaultDocs } from '@/lib/services/vault-docs';
import type { Service } from '@/lib/services/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Normalize doc status items to plain strings (API may return {label,haveIt,docType} objects) */
function normalizeDocList(docs: unknown[]): string[] {
  if (!Array.isArray(docs)) return [];
  return docs.map((d) => {
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const obj = d as Record<string, unknown>;
      return String(obj.label || obj.docType || JSON.stringify(d));
    }
    return String(d);
  });
}

// ── AI import ────────────────────────────────────────────────────
import { ask as askAIFn, generateGeneralAnswer as generateGeneralAnswerFn } from '@/lib/services/ai';
import type { UserContext, ActiveTaskContext } from '@/lib/services/ai';
const askAI = askAIFn;
const generateGeneralAnswerAI = generateGeneralAnswerFn;

// ── Supabase import (graceful) ───────────────────────────────────
let createSupabaseServerClient: (() => Promise<any>) | null = null;
try {
  const mod = require('@/lib/supabase/server');
  createSupabaseServerClient = mod.createSupabaseServerClient;
} catch {
  // Supabase server module not available
}

const ALL_SERVICES = [...CORE, ...EXTRA_SERVICES, ...EXTRA_SERVICES_2];

// ── Rate limiting (per IP, in-memory, resets per cold-start) ─────
const RATE: Map<string, { count: number; reset: number }> = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function rateKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  );
}

function checkRate(key: string): boolean {
  const now = Date.now();
  const e = RATE.get(key);
  if (!e || e.reset < now) {
    RATE.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (e.count >= RATE_LIMIT) return false;
  e.count++;
  return true;
}

// ── Intent definitions (rules-based) ─────────────────────────────

interface IntentRule {
  id: string;
  keywords: string[];
  keywordsNe: string[];
  chain: Array<{
    slug: string;
    why: string;
    whyNe?: string;
  }>;
  summary: string;
  summaryNe?: string;
}

const INTENT_RULES: IntentRule[] = [
  {
    id: 'foreign-work',
    keywords: ['abroad', 'work abroad', 'foreign employment', 'labor', 'labour', 'gulf', 'malaysia', 'qatar', 'saudi', 'dubai', 'korea', 'ems', 'manpower', 'foreign job', 'go abroad for work', 'bidesh kaam'],
    keywordsNe: ['विदेश', 'रोजगार', 'वैदेशिक', 'खाडी', 'मलेसिया', 'कतार', 'साउदी', 'दुबई', 'कोरिया', 'विदेश जान', 'काम गर्न'],
    chain: [
      { slug: 'citizenship-by-descent', why: 'Citizenship certificate is required for passport and all government services', whyNe: 'पासपोर्ट र सबै सरकारी सेवाका लागि नागरिकता प्रमाणपत्र आवश्यक छ' },
      { slug: 'new-passport', why: 'You need a valid passport to travel abroad', whyNe: 'विदेश यात्राको लागि मान्य पासपोर्ट चाहिन्छ' },
      { slug: 'pan-individual', why: 'PAN is needed for tax clearance before departure', whyNe: 'प्रस्थान अघि कर मिलानका लागि प्यान चाहिन्छ' },
      { slug: 'health-insurance-board', why: 'Medical fitness certificate and health insurance are mandatory', whyNe: 'चिकित्सा फिटनेस प्रमाणपत्र र स्वास्थ्य बीमा अनिवार्य छ' },
      { slug: 'labor-permit', why: 'Labor permit from Department of Foreign Employment (FEIMS) is required', whyNe: 'वैदेशिक रोजगार विभागबाट श्रम अनुमति आवश्यक छ' },
      { slug: 'tax-clearance', why: 'Tax clearance certificate is required before departure', whyNe: 'प्रस्थान अघि कर मिलान प्रमाणपत्र चाहिन्छ' },
      { slug: 'police-report', why: 'Police clearance report may be required by the destination country', whyNe: 'गन्तव्य देशले प्रहरी रिपोर्ट माग गर्न सक्छ' },
    ],
    summary: 'To go abroad for work, you need: citizenship → passport → PAN → medical fitness → labor permit (FEIMS) → tax clearance → police clearance. Start with the documents you are missing. The full process takes 2-4 weeks.',
    summaryNe: 'विदेश काम गर्न जान: नागरिकता → पासपोर्ट → प्यान → चिकित्सा फिटनेस → श्रम अनुमति → कर मिलान → प्रहरी रिपोर्ट चाहिन्छ। छुटेका कागजातबाट सुरु गर्नुहोस्। पुरा प्रक्रिया २-४ हप्ता लाग्छ।',
  },
  {
    id: 'study-abroad',
    keywords: ['study abroad', 'foreign study', 'scholarship', 'university abroad', 'noc', 'no objection', 'go abroad study', 'education abroad', 'masters abroad'],
    keywordsNe: ['विदेश पढ्न', 'छात्रवृत्ति', 'अध्ययन', 'विदेशी विश्वविद्यालय', 'अनापत्ति'],
    chain: [
      { slug: 'citizenship-by-descent', why: 'Citizenship certificate needed for passport and NOC' },
      { slug: 'new-passport', why: 'Valid passport needed for visa application' },
      { slug: 'tu-transcript', why: 'Academic transcripts needed for university application' },
      { slug: 'noc-foreign-study', why: 'No Objection Certificate (NOC) from Ministry of Education is required' },
      { slug: 'bank-account-opening', why: 'Bank statement showing funds is required for visa' },
      { slug: 'forex-card-nrb', why: 'Foreign exchange allowance from NRB for tuition and living expenses' },
      { slug: 'tax-clearance', why: 'Tax clearance may be needed for NOC processing' },
    ],
    summary: 'Studying abroad requires: citizenship → passport → transcripts → NOC (Ministry of Education) → bank statements → forex allowance. Apply to universities first, then start the NOC process which takes 2-3 weeks.',
    summaryNe: 'विदेश पढ्न: नागरिकता → पासपोर्ट → ट्रान्सक्रिप्ट → NOC → बैंक स्टेटमेन्ट → विदेशी मुद्रा चाहिन्छ।',
  },
  {
    id: 'start-business',
    keywords: ['start business', 'business registration', 'company', 'startup', 'register company', 'open business', 'entrepreneur', 'firm', 'proprietorship', 'pvt ltd'],
    keywordsNe: ['व्यापार', 'व्यवसाय', 'कम्पनी', 'दर्ता', 'उद्यम', 'फर्म', 'व्यापार सुरु'],
    chain: [
      { slug: 'pan-individual', why: 'PAN registration is the first step for any business entity' },
      { slug: 'company-registration-ocr', why: 'Register your company at the Office of Company Registrar' },
      { slug: 'vat-registration', why: 'VAT registration is mandatory if turnover exceeds threshold' },
      { slug: 'industry-registration', why: 'Industry registration at Department of Industry for manufacturing/service businesses' },
    ],
    summary: 'Starting a business in Nepal requires PAN registration, company registration at OCR, and possibly VAT registration. The type of business determines additional permits needed.',
    summaryNe: 'नेपालमा व्यापार सुरु गर्न प्यान दर्ता, कम्पनी दर्ता र सम्भवतः भ्याट दर्ता चाहिन्छ।',
  },
  {
    id: 'buy-land',
    keywords: ['buy land', 'land registration', 'property transfer', 'house buy', 'land transfer', 'plot buy', 'jagga', 'ghar kinna', 'land purchase', 'buy plot'],
    keywordsNe: ['जग्गा', 'जमिन', 'घर किन्न', 'सम्पत्ति', 'जग्गा खरिद', 'लालपुर्जा'],
    chain: [
      { slug: 'land-parcha', why: 'Get land search (parcha) to verify ownership and encumbrances' },
      { slug: 'land-valuation', why: 'Get official land valuation for tax calculation' },
      { slug: 'land-registration', why: 'Complete land ownership transfer (rajinama) at land revenue office' },
      { slug: 'house-land-tax', why: 'Pay annual house and land tax at your municipality' },
    ],
    summary: 'Buying land requires verifying ownership via land search (parcha), getting official valuation, completing the transfer (rajinama) at the land revenue office, and paying applicable taxes.',
  },
  {
    id: 'marriage',
    keywords: ['get married', 'marriage', 'wedding', 'vivah', 'marry', 'marriage registration', 'marriage certificate'],
    keywordsNe: ['विवाह', 'बिहे', 'विवाह दर्ता', 'विवाह प्रमाणपत्र'],
    chain: [
      { slug: 'marriage-registration', why: 'Register your marriage at the local ward office' },
      { slug: 'citizenship-by-descent', why: 'Both parties need citizenship certificates for marriage registration' },
      { slug: 'migration-certificate', why: 'Migration certificate needed if spouse is moving to a different ward/municipality' },
    ],
    summary: 'Marriage registration is done at your local ward office. Both parties need citizenship certificates. If the spouse is moving, a migration certificate from the previous ward is needed.',
  },
  {
    id: 'new-baby',
    keywords: ['baby', 'newborn', 'birth', 'child born', 'new baby', 'having a baby', 'pregnant', 'childbirth', 'birth certificate'],
    keywordsNe: ['बच्चा', 'जन्म', 'नवजात', 'जन्म दर्ता', 'जन्म प्रमाणपत्र', 'गर्भवती'],
    chain: [
      { slug: 'birth-registration', why: 'Register the birth within 35 days at your ward office' },
      { slug: 'vaccination-child', why: 'Start the national immunization schedule for your newborn' },
      { slug: 'health-insurance-board', why: 'Enroll your child in health insurance' },
      { slug: 'citizenship-by-descent', why: 'Parents need citizenship to register the birth' },
    ],
    summary: 'After birth, register within 35 days at your ward office. Start vaccinations per the national schedule. You will need both parents\' citizenship certificates for birth registration.',
  },
  {
    id: 'driving-license',
    keywords: ['driving license', 'license', 'licence', 'drive', 'driving', 'driver', 'motorbike license', 'car license', 'trial', 'dotm'],
    keywordsNe: ['लाइसेन्स', 'सवारी चालक', 'ड्राइभिङ', 'अनुमतिपत्र', 'ट्रायल'],
    chain: [
      { slug: 'drivers-license-new', why: 'Apply for new driving license at Department of Transport Management' },
      { slug: 'drivers-license-trial', why: 'Book and pass the driving trial (written + practical)' },
      { slug: 'vehicle-registration', why: 'Register your vehicle after getting your license' },
      { slug: 'pollution-test', why: 'Pollution test certificate is required for vehicle registration' },
    ],
    summary: 'Getting a driving license requires applying at DoTM, passing written and practical trials, then collecting your smart card. If you have a vehicle, register it and get pollution test done.',
  },
  {
    id: 'build-house',
    keywords: ['build house', 'building permit', 'construction', 'ghar banau', 'house construction', 'building design', 'naksaa pass'],
    keywordsNe: ['घर बनाउन', 'भवन निर्माण', 'नक्सा पास', 'निर्माण अनुमति'],
    chain: [
      { slug: 'land-parcha', why: 'Verify your land ownership before applying for building permit' },
      { slug: 'house-land-tax', why: 'Land tax must be current before building permit is issued' },
      { slug: 'nea-new-connection', why: 'Apply for electricity connection to your new house' },
      { slug: 'kukl-new-connection', why: 'Apply for water connection from KUKL' },
    ],
    summary: 'Building a house requires verified land ownership, building permit from your municipality (naksaa pass), and then utility connections (electricity from NEA, water from KUKL).',
  },
  {
    id: 'lost-documents',
    keywords: ['lost', 'stolen', 'missing document', 'lost passport', 'lost citizenship', 'lost license', 'harayo', 'lost documents'],
    keywordsNe: ['हरायो', 'चोरी', 'हराएको', 'कागजात हरायो'],
    chain: [
      { slug: 'police-report', why: 'File a First Information Report (FIR) at the nearest police station' },
      { slug: 'citizenship-duplicate', why: 'Apply for duplicate citizenship certificate if lost' },
      { slug: 'new-passport', why: 'Apply for replacement passport (requires police report)' },
      { slug: 'drivers-license-renewal', why: 'Apply for duplicate driving license at DoTM' },
    ],
    summary: 'If your documents are lost or stolen, first file a police report (FIR). Then apply for replacements: duplicate citizenship at your district office, new passport at Department of Passport, duplicate license at DoTM.',
  },
  {
    id: 'file-taxes',
    keywords: ['file tax', 'income tax', 'tax return', 'tax clearance', 'ird', 'tax filing', 'pay tax', 'tax office'],
    keywordsNe: ['कर', 'आयकर', 'कर विवरण', 'कर फाइल', 'प्यान'],
    chain: [
      { slug: 'pan-individual', why: 'PAN registration is required before filing taxes' },
      { slug: 'ird-taxpayer-portal', why: 'Register on IRD taxpayer portal for e-filing' },
      { slug: 'income-tax-filing', why: 'File your annual income tax return' },
    ],
    summary: 'Filing taxes in Nepal requires a PAN number. Register on the IRD Taxpayer Portal for online filing. Annual returns must be filed within 3 months of fiscal year end (Ashad).',
  },
  {
    id: 'government-job',
    keywords: ['government job', 'lok sewa', 'loksewa', 'civil service', 'psc', 'sarkari jagir', 'govt job', 'public service'],
    keywordsNe: ['सरकारी जागिर', 'लोक सेवा', 'निजामती सेवा', 'सार्वजनिक सेवा'],
    chain: [
      { slug: 'loksewa-application', why: 'Apply for civil service positions through Lok Sewa Aayog' },
      { slug: 'citizenship-by-descent', why: 'Citizenship certificate is mandatory for government jobs' },
      { slug: 'tu-transcript', why: 'Academic transcripts and certificates are required for eligibility' },
    ],
    summary: 'Government jobs are filled through the Public Service Commission (Lok Sewa Aayog). Apply online at psc.gov.np. Citizenship and educational certificates are required.',
  },
  {
    id: 'passport',
    keywords: ['passport', 'rahadani', 'e-passport', 'emrtd', 'travel document', 'get passport', 'new passport', 'first passport'],
    keywordsNe: ['राहदानी', 'पासपोर्ट', 'ई-पासपोर्ट', 'नयाँ राहदानी'],
    chain: [
      { slug: 'citizenship-by-descent', why: 'Citizenship certificate is required for passport application' },
      { slug: 'new-passport', why: 'Apply for e-Passport at Department of Passport' },
    ],
    summary: 'Getting a passport requires a citizenship certificate. Apply online at nepalpassport.gov.np, book an appointment, and visit the Passport Department with your documents.',
  },
  {
    id: 'passport-renewal',
    keywords: ['renew passport', 'passport renewal', 'expired passport', 'passport expire', 'extend passport', 'damaged passport', 'lost passport'],
    keywordsNe: ['राहदानी नवीकरण', 'पासपोर्ट नवीकरण', 'म्याद सकिएको राहदानी'],
    chain: [
      { slug: 'passport-renewal', why: 'Renew your expired or damaged passport at the Department of Passports' },
    ],
    summary: 'Passport renewal is done at the Department of Passports. You need your old passport, citizenship certificate, and recent photos. Apply online at nepalpassport.gov.np.',
  },
  {
    id: 'citizenship',
    keywords: ['citizenship', 'nagarikta', 'nagarikta lina', 'get citizenship', 'citizenship certificate'],
    keywordsNe: ['नागरिकता', 'नागरिकता प्रमाणपत्र', 'नागरिकता लिन'],
    chain: [
      { slug: 'citizenship-by-descent', why: 'Apply for citizenship by descent at your district administration office' },
      { slug: 'national-id-nid', why: 'Get National ID after obtaining citizenship' },
    ],
    summary: 'Citizenship by descent is obtained from your District Administration Office (DAO). You need your parents\' citizenship, birth certificate, and ward recommendation. After citizenship, apply for National ID.',
  },
  {
    id: 'electricity',
    keywords: ['electricity', 'nea', 'bijuli', 'light', 'power', 'meter', 'electricity bill', 'new connection electricity'],
    keywordsNe: ['बिजुली', 'विद्युत', 'मिटर', 'बिजुली बिल', 'नयाँ कनेक्सन'],
    chain: [
      { slug: 'nea-electricity-bill', why: 'Pay your electricity bill online or at NEA office' },
      { slug: 'nea-new-connection', why: 'Apply for new electricity connection at NEA' },
    ],
    summary: 'For electricity services, you can pay bills online via NEA website or eSewa/Khalti. New connections require application at your local NEA office with land ownership documents.',
  },
  {
    id: 'water',
    keywords: ['water', 'kukl', 'khanepani', 'water bill', 'water connection', 'pani'],
    keywordsNe: ['पानी', 'खानेपानी', 'पानी बिल', 'पानी कनेक्सन'],
    chain: [
      { slug: 'kukl-water-bill', why: 'Pay your water bill' },
      { slug: 'kukl-new-connection', why: 'Apply for new water connection' },
    ],
    summary: 'Water services in Kathmandu Valley are managed by KUKL. Pay bills online or at KUKL offices. New connections require application with property ownership documents.',
  },
  {
    id: 'complaints',
    keywords: ['complaint', 'grievance', 'corruption', 'report corruption', 'hello sarkar', 'consumer complaint', 'human rights', 'file complaint'],
    keywordsNe: ['उजुरी', 'भ्रष्टाचार', 'गुनासो', 'उपभोक्ता उजुरी', 'मानव अधिकार'],
    chain: [
      { slug: 'ciaa-complaint', why: 'File anti-corruption complaint at CIAA (hotline 107)' },
      { slug: 'consumer-complaint', why: 'File consumer protection complaint' },
      { slug: 'human-rights-complaint', why: 'Report human rights violations to NHRC' },
      { slug: 'lokpal-complaint', why: 'File government service grievance at Ombudsman' },
    ],
    summary: 'Nepal has multiple complaint mechanisms: CIAA for corruption (dial 107), consumer protection at Dept of Commerce, human rights at NHRC, and Hello Sarkar (dial 1111) for general government grievances.',
  },
  {
    id: 'hospital',
    keywords: ['hospital', 'opd', 'doctor', 'sick', 'health', 'medical', 'appointment', 'checkup', 'clinic', 'not feeling well', 'unwell', 'ill', 'fever', 'pain'],
    keywordsNe: ['अस्पताल', 'ओपीडी', 'डाक्टर', 'बिरामी', 'स्वास्थ्य', 'जाँच', 'सन्चो छैन', 'ज्वरो', 'दुखाइ', 'ठिक छैन'],
    chain: [
      { slug: 'bir-hospital-opd', why: 'Book OPD appointment at government hospitals' },
      { slug: 'health-insurance-board', why: 'Check if you have government health insurance coverage' },
      { slug: 'ambulance-102', why: 'Call 102 for emergency ambulance service' },
    ],
    summary: 'Government hospitals offer OPD services. Bir Hospital and TUTH are major referral centers in Kathmandu. Call 102 for ambulance. Health insurance covers treatment costs at listed facilities.',
    summaryNe: 'सरकारी अस्पतालहरूमा OPD सेवा उपलब्ध छ। बिर अस्पताल र TUTH काठमाडौंका प्रमुख रेफरल केन्द्र हुन्। एम्बुलेन्सको लागि 102 कल गर्नुहोस्।',
  },
  {
    id: 'renew-license',
    keywords: ['renew license', 'license renewal', 'licence renewal', 'expired license', 'smart license', 'smart card'],
    keywordsNe: ['लाइसेन्स नवीकरण', 'म्याद सकियो', 'स्मार्ट लाइसेन्स'],
    chain: [
      { slug: 'drivers-license-renewal', why: 'Renew your driving license before or after expiry at DoTM' },
    ],
    summary: 'License renewal is done at DoTM offices. Book online at dotm.gov.np. Renew before expiry to avoid penalties. If expired over 1 year, you may need a fresh trial.',
  },
  {
    id: 'vehicle',
    keywords: ['vehicle', 'car registration', 'bike registration', 'bluebook', 'number plate', 'vehicle tax'],
    keywordsNe: ['गाडी', 'सवारी दर्ता', 'ब्लुबुक', 'नम्बर प्लेट'],
    chain: [
      { slug: 'vehicle-registration', why: 'Register your vehicle at DoTM' },
      { slug: 'pollution-test', why: 'Get pollution test certificate' },
      { slug: 'bike-bluebook-renewal', why: 'Renew your bluebook' },
      { slug: 'vehicle-tax-payment', why: 'Pay annual vehicle tax' },
    ],
    summary: 'Vehicle ownership requires registration at DoTM, pollution test, and annual tax payment. Bluebook renewal is periodic. Number plates are issued during registration.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────

function findService(slug: string): Service | undefined {
  return ALL_SERVICES.find((s) => s.slug === slug);
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function matchIntent(query: string): IntentRule | null {
  const q = normalize(query);
  if (!q) return null;

  // Helper: check if keyword exists as a whole word/phrase (not partial match)
  function hasWholeMatch(text: string, keyword: string): boolean {
    // For multi-word keywords, check exact phrase
    if (keyword.includes(' ')) return text.includes(keyword);
    // For single words, require word boundary (space/start/end)
    const re = new RegExp(`(?:^|\\s)${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
    return re.test(` ${text} `);
  }

  let bestIntent: IntentRule | null = null;
  let bestScore = 0;

  for (const intent of INTENT_RULES) {
    let score = 0;
    for (const kw of intent.keywords) {
      const nkw = normalize(kw);
      if (hasWholeMatch(q, nkw)) {
        score += nkw.length + 10;
      } else {
        // Only count partial word matches for multi-word keywords
        const words = nkw.split(' ');
        if (words.length > 1) {
          for (const word of words) {
            if (word.length > 3 && hasWholeMatch(q, word)) score += word.length;
          }
        }
      }
    }
    for (const kw of intent.keywordsNe) {
      if (q.includes(kw)) score += kw.length + 15;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Require minimum confidence — prevents weak single-word false matches
  return bestScore >= 10 ? bestIntent : null;
}

function buildSteps(intent: IntentRule, locale: 'en' | 'ne') {
  return intent.chain.map((item, index) => {
    const service = findService(item.slug);
    const portals = findPortalsForService(item.slug);
    const portal = portals[0];

    return {
      order: index + 1,
      serviceSlug: item.slug,
      serviceTitle: service?.title.en || item.slug,
      serviceTitleNe: service?.title.ne || '',
      why: locale === 'ne' && item.whyNe ? item.whyNe : item.why,
      documents: service?.documents.filter((d) => d.required).map((d) => locale === 'ne' ? d.title.ne : d.title.en) || [],
      estimatedTime: locale === 'ne' ? (service?.estimatedTime?.ne || service?.estimatedTime?.en || 'फरक पर्छ') : (service?.estimatedTime?.en || 'Varies'),
      fee: locale === 'ne' ? (service?.feeRange?.ne || service?.feeRange?.en || 'फरक पर्छ') : (service?.feeRange?.en || 'Varies'),
      portalUrl: portal?.action_url || portal?.url || service?.officialUrl || '',
      category: service?.category || 'identity',
    };
  });
}

// ── Convert AI result to advisor response shape ───────────────────

function aiResultToAdvisorResponse(aiResult: any, locale: 'en' | 'ne') {
  // AI returned ambiguous or needs follow-up
  if (aiResult.routeMode === 'ambiguous' || aiResult.routeMode === 'none') {
    return {
      steps: [],
      summary: aiResult.answer || aiResult.followUpPrompt || 'Could not determine the right service.',
      matched: false,
      source: 'ai' as const,
      followUpPrompt: aiResult.followUpPrompt || null,
      followUpOptions: aiResult.followUpOptions || [],
      intakeState: aiResult.intakeState || null,
      serviceOptions: (aiResult.cited || []).slice(0, 5).map((s: any) => ({
        slug: s.slug,
        category: s.category,
        title: locale === 'ne' ? s.title?.ne || s.title?.en : s.title?.en,
        providerName: s.providerName,
      })),
    };
  }

  // AI found a direct match
  if (aiResult.topService) {
    const service = aiResult.topService;
    const portals = findPortalsForService(service.slug);
    const portal = portals[0];

    const steps = [{
      order: 1,
      serviceSlug: service.slug,
      serviceTitle: service.title?.en || service.slug,
      serviceTitleNe: service.title?.ne || '',
      why: aiResult.routeReason || `This is the service you need.`,
      documents: (service.documents || []).filter((d: any) => d.required).map((d: any) => locale === 'ne' ? d.title?.ne : d.title?.en) || [],
      estimatedTime: locale === 'ne' ? (service.estimatedTime?.ne || 'फरक पर्छ') : (service.estimatedTime?.en || 'Varies'),
      fee: locale === 'ne' ? (service.feeRange?.ne || 'फरक पर्छ') : (service.feeRange?.en || 'Varies'),
      portalUrl: portal?.action_url || portal?.url || service.officialUrl || '',
      category: service.category || 'identity',
    }];

    return {
      steps,
      summary: aiResult.answer || aiResult.routeReason || `${service.title?.en} is the service you need.`,
      matched: true,
      intentId: `ai-${service.slug}`,
      source: 'ai' as const,
      followUpPrompt: null,
      followUpOptions: [],
      intakeState: aiResult.intakeState || null,
    };
  }

  return null;
}

// ── Auth helper (non-blocking) ───────────────────────────────────

async function tryGetAuthedContext(): Promise<{ supabase: any; user: any } | null> {
  if (!createSupabaseServerClient) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return { supabase, user };
  } catch {
    return null;
  }
}

async function tryGetUserContext(authCtx: { supabase: any; user: any } | null): Promise<UserContext | null> {
  if (!authCtx) return null;
  try {
    // Try identity profile first (has municipality/ward)
    const { data: identity } = await authCtx.supabase
      .from('user_identity_profile')
      .select('temporary_district, temporary_municipality, temporary_ward, temporary_province, permanent_district, permanent_municipality, permanent_ward, permanent_province')
      .eq('user_id', authCtx.user.id)
      .maybeSingle();

    if (identity) {
      // Prefer temporary address (where they live now), fall back to permanent
      const district = identity.temporary_district || identity.permanent_district;
      if (district) {
        return {
          district,
          municipality: identity.temporary_municipality || identity.permanent_municipality || null,
          ward: identity.temporary_ward || identity.permanent_ward || null,
          province: identity.temporary_province || identity.permanent_province || null,
        };
      }
    }

    // Fallback: basic profile district
    const { data: profile } = await authCtx.supabase
      .from('profiles')
      .select('district, province')
      .eq('id', authCtx.user.id)
      .maybeSingle();

    if (profile?.district) {
      return { district: profile.district, province: profile.province || null };
    }
  } catch {
    // Non-blocking — location is optional
  }
  return null;
}

// ── Task creation / reuse for authenticated users ────────────────

async function handleTaskCreation(
  supabase: any,
  user: any,
  topService: any,
  aiResult: any,
  query: string,
  locale: 'en' | 'ne',
  targetMemberId?: string,
) {
  const assistantAnswers = buildAssistantTaskAnswers({
    sourceQuery: query,
    intakeState: aiResult?.intakeState,
    intakeSlots: aiResult?.intakeSlots,
  });

  // Check for existing active task for this service
  const { data: existing } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('owner_id', user.id)
    .eq('service_slug', topService.slug)
    .neq('status', 'completed')
    .maybeSingle();

  if (existing) {
    const { data: refreshed } = await updateServiceTaskWithCompatibility(supabase, existing.id, {
      answers: {
        ...(existing.answers || {}),
        ...assistantAnswers,
      },
    });

    await insertTaskEventBestEffort(supabase, {
      task_id: existing.id,
      owner_id: user.id,
      event_type: 'task_updated',
      note: 'Resumed from assistant request',
      meta: { ...assistantAnswers, reused: true },
    });

    return {
      task: mapTaskRow(refreshed || existing),
      taskReused: true,
      missingDocs: normalizeDocList(existing.missing_docs || []),
      readyDocs: normalizeDocList(existing.ready_docs || []),
      routing: null,
      targetMember: null,
    };
  }

  // Create new task with vault doc checking, workflow, routing, queue ops
  const vaultDocs = await listOwnerVaultDocs(supabase, user.id);
  const state = getTaskStatus(topService, vaultDocs);
  const workflow = getWorkflowDefinition(topService);
  const routing = resolveServiceRouting(topService);
  const policy = await getServiceWorkflowPolicy(routing.departmentKey, topService.slug);
  const deadlines = buildOpsDeadlines(policy || {});
  const targetMember = await getHouseholdMemberBestEffort(supabase, targetMemberId);

  const { data, error } = await insertServiceTaskWithCompatibility(supabase, {
    owner_id: user.id,
    service_slug: topService.slug,
    service_title: topService.title.en,
    service_category: topService.category,
    locale,
    status: state.status,
    progress: state.progress,
    current_step: state.currentStep,
    total_steps: state.totalSteps,
    summary: state.summary,
    next_action: state.nextAction,
    workflow_mode: workflow.mode,
    target_member_id: targetMember?.id || null,
    target_member_name: targetMember?.display_name || null,
    requires_appointment: workflow.requiresAppointment ?? false,
    supports_online_payment: workflow.supportsOnlinePayment ?? false,
    office_visit_required: workflow.officeVisitRequired ?? false,
    milestones: workflow.milestones,
    actions: workflow.actions || [],
    action_state: {},
    assigned_department_key: routing.departmentKey,
    assigned_department_name: routing.departmentName,
    assigned_office_name: routing.officeName,
    assigned_authority_level: routing.authorityLevel,
    assigned_role_title: routing.roleTitle,
    routing_reason: routing.routingReason,
    routing_confidence: routing.confidence,
    queue_state: policy?.queue_entry_state || 'new',
    first_response_due_at: deadlines.firstResponseDueAt,
    resolution_due_at: deadlines.resolutionDueAt,
    escalation_level: 0,
    missing_docs: state.missingDocs,
    ready_docs: state.readyDocs,
    answers: assistantAnswers,
  });

  if (error) {
    console.warn('[advisor] Task creation failed:', error.message);
    return null;
  }

  // Fire-and-forget event logging
  insertTaskEventBestEffort(supabase, {
    task_id: data.id,
    owner_id: user.id,
    event_type: 'task_started',
    note: `Started ${topService.title.en} from assistant request`,
    meta: { service_slug: topService.slug, status: state.status, ...assistantAnswers },
  });

  insertTaskEventBestEffort(supabase, {
    task_id: data.id,
    owner_id: user.id,
    event_type: 'task_routed',
    note: `Routed to ${routing.departmentName}`,
    meta: {
      department_key: routing.departmentKey,
      authority_level: routing.authorityLevel,
      office_name: routing.officeName,
      role_title: routing.roleTitle,
      confidence: routing.confidence,
      ...assistantAnswers,
    },
  });

  // Fire-and-forget: auto-assign to staff + notify department
  autoAssignAndNotify(supabase, {
    taskId: data.id,
    ownerId: user.id,
    departmentKey: routing.departmentKey,
    departmentName: routing.departmentName,
    serviceSlug: topService.slug,
    serviceTitle: topService.title.en,
  });

  recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'service_task_started_from_assistant',
    entity_type: 'service_task',
    entity_id: data.id,
    title: `Started ${topService.title.en} from assistant`,
    summary: state.nextAction,
    meta: {
      service_slug: topService.slug,
      service_category: topService.category,
      ...assistantAnswers,
      target_member_name: targetMember?.display_name || null,
      assigned_department_name: routing.departmentName,
      assigned_office_name: routing.officeName,
    },
  });

  return {
    task: mapTaskRow(data),
    taskReused: false,
    missingDocs: normalizeDocList(state.missingDocs),
    readyDocs: normalizeDocList(state.readyDocs),
    routing: {
      departmentKey: routing.departmentKey,
      departmentName: routing.departmentName,
      officeName: routing.officeName,
      authorityLevel: routing.authorityLevel,
      roleTitle: routing.roleTitle,
      routingReason: routing.routingReason,
      confidence: routing.confidence,
    },
    targetMember: targetMember
      ? { id: targetMember.id, displayName: targetMember.display_name }
      : null,
  };
}

// ── POST handler ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || body.question || '').toString().trim();
    const locale: 'en' | 'ne' = body.locale === 'ne' ? 'ne' : 'en';
    const targetMemberId =
      typeof body.targetMemberId === 'string' && body.targetMemberId.trim()
        ? body.targetMemberId.trim()
        : undefined;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    if (query.length > 500) {
      return NextResponse.json({ error: 'Query too long (max 500 chars)' }, { status: 400 });
    }

    // ── Rate limit ──
    if (!checkRate(rateKey(req))) {
      return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    // ── Fetch user context for location-aware routing ──
    const earlyAuthCtx = await tryGetAuthedContext();
    const userCtx = await tryGetUserContext(earlyAuthCtx);

    // ── Fetch active task context for step-aware AI guidance ──
    let taskCtx: ActiveTaskContext | null = null;
    if (earlyAuthCtx) {
      try {
        const { data: activeTask } = await earlyAuthCtx.supabase
          .from('service_tasks')
          .select('service_slug, current_step, progress, status, workflow_actions, action_state')
          .eq('owner_id', earlyAuthCtx.user.id)
          .neq('status', 'completed')
          .neq('status', 'cancelled')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeTask) {
          const actions: any[] = activeTask.workflow_actions || [];
          const actionState: Record<string, any> = activeTask.action_state || {};
          // Find the current (first uncompleted) action
          const currentAction = actions.find((a: any) => !actionState[a.id]?.completed);
          const completedActions = actions
            .filter((a: any) => actionState[a.id]?.completed)
            .map((a: any) => a.label || a.id);
          // Get workflow-level AI context from the definition
          const { getWorkflowBySlug } = require('@/lib/services/workflow-definitions');
          const wfDef = getWorkflowBySlug ? getWorkflowBySlug(activeTask.service_slug) : null;
          taskCtx = {
            serviceSlug: activeTask.service_slug,
            currentStep: activeTask.current_step || 1,
            progress: activeTask.progress || 0,
            status: activeTask.status,
            aiWorkflowContext: wfDef?.aiWorkflowContext || undefined,
            currentActionGuidance: currentAction?.aiGuidancePrompt || undefined,
            completedActions,
          };
        }
      } catch { /* non-blocking */ }
    }

    // ── Run AI + rules matching in parallel ──
    let aiResult: any = null;
    let aiConverted: ReturnType<typeof aiResultToAdvisorResponse> = null;
    const rulesIntent = matchIntent(query);

    if (askAI) {
      try {
        aiResult = await askAI(query, locale, null, userCtx, taskCtx);
        if (aiResult) {
          aiConverted = aiResultToAdvisorResponse(aiResult, locale);
        }
      } catch (aiError) {
        console.warn('[advisor] AI routing failed, falling back to rules:', aiError);
      }
    }

    // ── Determine the top matched service (for task creation) ──
    const topService = aiResult?.topService || null;
    // Check if AI service match is actually meaningful (confidence > 40 = probably relevant)
    const aiConfidence = aiResult?.topServiceConfidence || 0;
    const aiIsRelevant = aiConfidence >= 40 || (aiResult?.routeMode === 'direct');

    // ── Decision logic ──
    let response: Record<string, any>;

    if (rulesIntent && aiConverted) {
      // Both matched: return journey steps from rules AND AI answer/follow-ups
      response = {
        steps: buildSteps(rulesIntent, locale),
        summary: locale === 'ne' && rulesIntent.summaryNe ? rulesIntent.summaryNe : rulesIntent.summary,
        matched: true,
        intentId: rulesIntent.id,
        source: 'hybrid',
        followUpPrompt: aiConverted.followUpPrompt || null,
        followUpOptions: aiConverted.followUpOptions || [],
        intakeState: aiConverted.intakeState || null,
        serviceOptions: (aiConverted as any).serviceOptions || [],
        aiAnswer: aiResult?.answer || null,
      };
    } else if (aiConverted?.matched && aiIsRelevant) {
      // AI found topService with good confidence — use it
      response = { ...aiConverted };
    } else if (rulesIntent) {
      // Only rules matched
      response = {
        steps: buildSteps(rulesIntent, locale),
        summary: locale === 'ne' && rulesIntent.summaryNe ? rulesIntent.summaryNe : rulesIntent.summary,
        matched: true,
        intentId: rulesIntent.id,
        source: 'rules',
        followUpPrompt: aiConverted?.followUpPrompt || null,
        followUpOptions: aiConverted?.followUpOptions || [],
        intakeState: aiConverted?.intakeState || null,
      };
    } else if (aiConverted && !aiConverted.matched && aiIsRelevant && aiConverted.serviceOptions && (aiConverted.serviceOptions as any[]).length > 0) {
      // AI returned ambiguous but has relevant service options — pass through follow-ups
      response = { ...aiConverted };
    } else {
      // Nothing relevant from services — use general AI for life advice
      let generalAnswer: string | null = null;
      if (generateGeneralAnswerAI) {
        try {
          const gen = await generateGeneralAnswerAI(query, locale);
          if (gen?.text) generalAnswer = gen.text;
        } catch (genErr) {
          console.warn('[advisor] General AI failed:', genErr);
        }
      }

      if (generalAnswer) {
        response = {
          steps: [],
          summary: generalAnswer,
          matched: true,
          source: 'ai-general',
          followUpPrompt: locale === 'ne'
            ? 'अझ केही थाहा पाउनु छ? सोध्नुहोस्!'
            : 'Need anything else? Just ask!',
          followUpOptions: [],
          aiAnswer: generalAnswer,
        };
      } else {
        response = {
          steps: [],
          summary: locale === 'ne'
            ? 'माफ गर्नुहोस्, मैले तपाईंको प्रश्नको उत्तर दिन सकिनँ। कृपया अर्को तरिकाले सोध्नुहोस् वा विशिष्ट भएर भन्नुहोस्।'
            : 'I wasn\'t able to answer that. Could you try rephrasing or being more specific about what you need?',
          matched: false,
          source: 'none',
          followUpPrompt: locale === 'ne'
            ? 'जस्तै: "मलाई पासपोर्ट चाहिन्छ", "खाना अर्डर गर्ने कसरी?", "नजिकको अस्पताल कुन हो?"'
            : 'Try something like: "I need a passport", "How do I order food?", "Which hospital is closest?"',
          followUpOptions: locale === 'ne'
            ? ['पासपोर्ट बनाउन के चाहिन्छ?', 'नजिकको अस्पताल कुन हो?', 'खाना अर्डर गर्ने कसरी?', 'बिजुली बिल कसरी तिर्ने?']
            : ['How do I get a passport?', 'Which hospital should I go to?', 'How do I order food delivery?', 'How do I pay my electricity bill?'],
        };
      }
    }

    // ── Auth-gated task creation (only for relevant service matches) ──
    if (topService && aiIsRelevant) {
      // Reuse the auth context fetched earlier for location
      const authCtx = earlyAuthCtx;

      if (authCtx) {
        try {
          const taskResult = await handleTaskCreation(
            authCtx.supabase,
            authCtx.user,
            topService,
            aiResult,
            query,
            locale,
            targetMemberId,
          );
          if (taskResult) {
            response.task = taskResult.task;
            response.taskReused = taskResult.taskReused;
            response.missingDocs = taskResult.missingDocs;
            response.readyDocs = taskResult.readyDocs;
            response.routing = taskResult.routing;
            response.targetMember = taskResult.targetMember;
          }
        } catch (taskError) {
          console.warn('[advisor] Task creation failed (non-blocking):', taskError);
        }
      } else {
        // Not authenticated but we have a service match
        response.requiresAuth = true;
      }
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('[advisor] Error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'advisor', runtime: 'nodejs' });
}
