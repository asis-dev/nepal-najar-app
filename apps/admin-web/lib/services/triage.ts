/**
 * Nepal Republic — Phase 1 AI Triage Engine
 *
 * Sits BEFORE task creation. Analyzes citizen input and determines:
 *   domain, subdomain, urgency, severity, target person, safe next action.
 *
 * Pure keyword-based — no LLM calls, no external dependencies.
 * Uses domain-specific triage policies for detailed assessment.
 */

import type { IntakeState } from './ai';
import { triageHealth } from './triage-policies/health';
import { triagePassport } from './triage-policies/passport';
import { triageLicense } from './triage-policies/license';
import { triageUtilities } from './triage-policies/utilities';

// ── Public types ──────────────────────────────────────────────

export interface TriageInput {
  userMessage: string;
  locale: 'en' | 'ne';
  userId?: string;
  existingIntake?: IntakeState | null;
  conversationHistory?: string[];
}

export interface TriageResult {
  domain: IntakeState['domain'];
  subdomain: string;
  urgency: 'emergency' | 'urgent' | 'same_day' | 'routine';
  severity: 'critical' | 'high' | 'medium' | 'low';
  targetMemberType:
    | 'self'
    | 'child'
    | 'spouse'
    | 'parent'
    | 'family_member'
    | 'unknown';
  safeNextAction: string;
  requiresEmergencyHandling: boolean;
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
  clarificationQuestion_ne?: string;
  suggestedServiceSlugs: string[];
  confidence: number;
  triageReason: string;
  safetyFlags: string[];
}

// ── Domain detection keywords ─────────────────────────────────

const HEALTH_KEYWORDS = [
  'hospital', 'doctor', 'opd', 'appointment', 'fever', 'pain',
  'sick', 'pregnant', 'birth', 'labor', 'labour', 'delivery',
  'ambulance', 'emergency room',
  'birami', 'biramī', 'aspatal', 'daktar', 'jwaro', 'dukhi',
  'garbhavati', 'prasuti', 'sutkeri',
  'headache', 'stomach', 'vomit', 'diarrhea', 'cough', 'cold',
  'injury', 'wound', 'fracture', 'bleeding', 'ragat',
  'medicine', 'ausadhi', 'tablet', 'injection',
  'checkup', 'check-up', 'vaccination', 'vaccine', 'khop',
  'surgery', 'operation', 'anc', 'maternity',
  'chest pain', 'breathing', 'sas', 'unconscious', 'behosh',
  'dental', 'daat', 'eye', 'aankha',
];

const PASSPORT_KEYWORDS = [
  'passport', 'rahadani', 'rahādānī', 'travel document',
  'rahadānī',
];

const LICENSE_KEYWORDS = [
  'license', 'licence', 'driving', 'driver', 'vehicle',
  'gaadi', 'gadi', 'sawari', 'dotm', 'bluebook', 'blue book',
  'trial test', 'driving test', 'learner',
];

const UTILITIES_KEYWORDS = [
  'bill', 'electricity', 'water', 'bijuli', 'pani',
  'nea', 'kukl', 'meter', 'load shedding', 'power cut',
  'disconnection', 'khanepani', 'vidyut',
];

const CITIZENSHIP_KEYWORDS = [
  'citizenship', 'nagarikta', 'nagrikta', 'nagarikta',
  'citizen card', 'citizen certificate',
];

// ── Target person detection ───────────────────────────────────

type TargetMember =
  | 'self'
  | 'child'
  | 'spouse'
  | 'parent'
  | 'family_member'
  | 'unknown';

const TARGET_PATTERNS: Array<{ keywords: string[]; target: TargetMember }> = [
  {
    keywords: [
      'my child', 'my son', 'my daughter', 'my baby', 'my infant',
      'mero chhora', 'mero chhori', 'mero baccha', 'mero sisu',
      'hamro baccha', "child's", "son's", "daughter's",
    ],
    target: 'child',
  },
  {
    keywords: [
      'my wife', 'my husband', 'my spouse',
      'mero shreemati', 'mero shriman', 'mero buhari',
      "wife's", "husband's",
    ],
    target: 'spouse',
  },
  {
    keywords: [
      'my mother', 'my father', 'my parent', 'my mom', 'my dad',
      'mero aama', 'mero baba', 'mero buwa', 'mero ama',
      "mother's", "father's",
    ],
    target: 'parent',
  },
  {
    keywords: [
      'my family', 'mero pariwar', 'mero ghar',
      'family member', 'relative',
    ],
    target: 'family_member',
  },
];

// ── Helpers ───────────────────────────────────────────────────

function lower(s: string): string {
  return s.toLowerCase();
}

function matchesAny(text: string, keywords: string[]): boolean {
  const t = lower(text);
  return keywords.some((kw) => t.includes(lower(kw)));
}

function countMatches(text: string, keywords: string[]): number {
  const t = lower(text);
  return keywords.filter((kw) => t.includes(lower(kw))).length;
}

function detectDomain(message: string): IntakeState['domain'] {
  const scores: Array<{ domain: IntakeState['domain']; score: number }> = [
    { domain: 'health', score: countMatches(message, HEALTH_KEYWORDS) },
    { domain: 'passport', score: countMatches(message, PASSPORT_KEYWORDS) },
    { domain: 'license', score: countMatches(message, LICENSE_KEYWORDS) },
    { domain: 'utilities', score: countMatches(message, UTILITIES_KEYWORDS) },
    { domain: 'citizenship', score: countMatches(message, CITIZENSHIP_KEYWORDS) },
  ];

  scores.sort((a, b) => b.score - a.score);
  if (scores[0].score === 0) return 'general';
  return scores[0].domain;
}

function detectTarget(message: string): TargetMember {
  for (const pattern of TARGET_PATTERNS) {
    if (matchesAny(message, pattern.keywords)) {
      return pattern.target;
    }
  }
  return 'self';
}

function computeConfidence(
  domain: IntakeState['domain'],
  message: string,
): number {
  if (domain === 'general') return 0.3;

  const keywordMap: Record<string, string[]> = {
    health: HEALTH_KEYWORDS,
    passport: PASSPORT_KEYWORDS,
    license: LICENSE_KEYWORDS,
    utilities: UTILITIES_KEYWORDS,
    citizenship: CITIZENSHIP_KEYWORDS,
  };

  const matches = countMatches(message, keywordMap[domain] || []);
  // 1 match = 0.6, 2 = 0.75, 3+ = 0.85, 5+ = 0.95
  if (matches >= 5) return 0.95;
  if (matches >= 3) return 0.85;
  if (matches >= 2) return 0.75;
  return 0.6;
}

// ── Main triage function ──────────────────────────────────────

export async function triageRequest(input: TriageInput): Promise<TriageResult> {
  const { userMessage, existingIntake } = input;
  const message = userMessage.trim();

  if (!message) {
    return {
      domain: 'general',
      subdomain: 'empty-input',
      urgency: 'routine',
      severity: 'low',
      targetMemberType: 'unknown',
      safeNextAction: 'Please describe what you need help with',
      requiresEmergencyHandling: false,
      clarificationNeeded: true,
      clarificationQuestion: 'What do you need help with today?',
      clarificationQuestion_ne: 'Tapailai aaja ke sahayog chahiyo?',
      suggestedServiceSlugs: [],
      confidence: 0,
      triageReason: 'Empty input received',
      safetyFlags: [],
    };
  }

  // Use existing intake domain if available, otherwise detect
  const domain = existingIntake?.domain && existingIntake.domain !== 'general'
    ? existingIntake.domain
    : detectDomain(message);

  const targetMemberType = detectTarget(message);
  const confidence = computeConfidence(domain, message);

  // ── Dispatch to domain-specific policy ──

  if (domain === 'health') {
    const result = triageHealth({
      message,
      targetMember: targetMemberType,
    });

    return {
      domain: 'health',
      subdomain: result.subdomain,
      urgency: result.urgency,
      severity: result.severity,
      targetMemberType,
      safeNextAction: result.safeAction,
      requiresEmergencyHandling: result.requiresEmergency,
      clarificationNeeded: false,
      suggestedServiceSlugs: result.suggestedSlugs,
      confidence,
      triageReason: result.triageReason,
      safetyFlags: result.safetyFlags,
    };
  }

  if (domain === 'passport') {
    const result = triagePassport({
      message,
      targetMember: targetMemberType,
    });

    return {
      domain: 'passport',
      subdomain: result.subdomain,
      urgency: result.urgency,
      severity: result.severity,
      targetMemberType,
      safeNextAction: result.safeAction,
      requiresEmergencyHandling: false,
      clarificationNeeded: false,
      suggestedServiceSlugs: result.suggestedSlugs,
      confidence,
      triageReason: result.triageReason,
      safetyFlags: [],
    };
  }

  if (domain === 'license') {
    const result = triageLicense({
      message,
      targetMember: targetMemberType,
    });

    return {
      domain: 'license',
      subdomain: result.subdomain,
      urgency: result.urgency,
      severity: result.severity,
      targetMemberType,
      safeNextAction: result.safeAction,
      requiresEmergencyHandling: false,
      clarificationNeeded: false,
      suggestedServiceSlugs: result.suggestedSlugs,
      confidence,
      triageReason: result.triageReason,
      safetyFlags: [],
    };
  }

  if (domain === 'utilities') {
    const result = triageUtilities({
      message,
      targetMember: targetMemberType,
    });

    return {
      domain: 'utilities',
      subdomain: result.subdomain,
      urgency: result.urgency,
      severity: result.severity,
      targetMemberType,
      safeNextAction: result.safeAction,
      requiresEmergencyHandling: false,
      clarificationNeeded: false,
      suggestedServiceSlugs: result.suggestedSlugs,
      confidence,
      triageReason: result.triageReason,
      safetyFlags: [],
    };
  }

  if (domain === 'citizenship') {
    return {
      domain: 'citizenship',
      subdomain: 'general-citizenship',
      urgency: 'routine',
      severity: 'low',
      targetMemberType,
      safeNextAction:
        'Visit your local District Administration Office (DAO) with required documents',
      requiresEmergencyHandling: false,
      clarificationNeeded: false,
      suggestedServiceSlugs: ['citizenship-application'],
      confidence,
      triageReason: 'Citizenship-related inquiry — DAO visit required',
      safetyFlags: [],
    };
  }

  // ── General / unknown domain — ask for clarification ──
  return {
    domain: 'general',
    subdomain: 'unclassified',
    urgency: 'routine',
    severity: 'low',
    targetMemberType,
    safeNextAction: 'Please provide more details so we can help you',
    requiresEmergencyHandling: false,
    clarificationNeeded: true,
    clarificationQuestion:
      'Could you tell us more about what you need? For example: health/hospital, passport, driving license, or utility bills.',
    clarificationQuestion_ne:
      'Tapailai ke chahiyo bhanera ali bataunu hos — jastai: swasthya/aspatal, rahadani, license, wa bijuli/pani bil.',
    suggestedServiceSlugs: [],
    confidence: 0.3,
    triageReason:
      'Could not determine domain from message — clarification requested',
    safetyFlags: [],
  };
}
