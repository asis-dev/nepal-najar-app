/**
 * Nepal Republic — AI-Backed Triage Engine (with keyword fallback)
 *
 * Sits BEFORE task creation. Analyzes citizen input and determines:
 *   domain, subdomain, urgency, severity, target person, safe next action.
 *
 * Strategy:
 *   1. Try AI classification (via ai-router) for richer understanding
 *   2. Run domain-specific policy for detailed routing (steps, documents, etc.)
 *   3. Fall back to pure keyword matching if AI call fails or returns low confidence
 */

import type { IntakeState } from './ai';
import { aiComplete } from '../intelligence/ai-router';
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

export interface ClarificationInfo {
  needed: boolean;
  question?: string;        // The one question to ask
  reason?: string;          // Why we need this
  autoRouteIfSkipped?: string;  // Default route if user skips
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
  clarification?: ClarificationInfo;
  suggestedServiceSlugs: string[];
  confidence: number;
  triageReason: string;
  safetyFlags: string[];
  triageMethod: 'ai' | 'keyword';
}

// ── AI triage types ──────────────────────────────────────────

interface AITriageClassification {
  domain: 'health' | 'passport' | 'license' | 'utilities' | 'citizenship' | 'general';
  intent: string;
  urgency: 'emergency' | 'urgent' | 'same_day' | 'routine';
  severity: 1 | 2 | 3 | 4 | 5;
  safetyFlags: string[];
  reasoning: string;
  confidence: number;
}

// ── AI confidence threshold ─────────────────────────────────

const AI_CONFIDENCE_THRESHOLD = 0.6;

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

// ── Severity mapping helpers ─────────────────────────────────

function severityFromNumber(n: number): 'critical' | 'high' | 'medium' | 'low' {
  if (n >= 5) return 'critical';
  if (n >= 4) return 'high';
  if (n >= 3) return 'medium';
  return 'low';
}

// ── Clarification policy ─────────────────────────────────────
// One-question max: never ask more than one clarifying question.
// Emergency = never ask, just route immediately.

const DOMAIN_CLARIFICATION_QUESTIONS: Record<string, { question: string; reason: string; autoRoute: string }> = {
  health: {
    question: 'Is this an emergency requiring immediate medical attention?',
    reason: 'Determines urgency level and whether to route to emergency services',
    autoRoute: 'health-opd-general',
  },
  passport: {
    question: 'Is this for a new passport or renewal?',
    reason: 'Different document requirements and processes for new vs renewal',
    autoRoute: 'new-passport',
  },
  license: {
    question: 'Is this for a new license, renewal, or trial booking?',
    reason: 'Each license service has different steps and requirements',
    autoRoute: 'new-drivers-license',
  },
  utilities: {
    question: 'Which utility service? (electricity/water)',
    reason: 'Routes to the correct provider (NEA for electricity, KUKL for water)',
    autoRoute: 'nea-bill-payment',
  },
  citizenship: {
    question: 'Is this for a new citizenship certificate or a copy/update?',
    reason: 'Determines which DAO process and documents are needed',
    autoRoute: 'citizenship-application',
  },
};

/**
 * Generate a single clarification question based on domain.
 * Returns null if no clarification is needed (high confidence or emergency).
 */
export function generateClarificationQuestion(result: TriageResult): string | null {
  // Never ask clarifying questions during emergencies
  if (result.requiresEmergencyHandling || result.safetyFlags.length > 0) {
    return null;
  }

  // High confidence — no clarification needed, auto-route
  if (result.confidence > 0.85) {
    return null;
  }

  // Unknown domain — ask the general question
  if (result.domain === 'general') {
    return 'Could you tell us more about what you need? For example: health/hospital, passport, driving license, or utility bills.';
  }

  // Medium or low confidence — pick the domain-specific question
  const domainQ = DOMAIN_CLARIFICATION_QUESTIONS[result.domain];
  return domainQ?.question ?? null;
}

/**
 * Build a ClarificationInfo object from a triage result.
 * Enforces the one-question-max policy.
 */
function buildClarification(result: TriageResult): ClarificationInfo {
  // Emergency — never clarify, route immediately
  if (result.requiresEmergencyHandling || result.safetyFlags.length > 0) {
    return { needed: false };
  }

  // High confidence (>0.85) — auto-route, no question
  if (result.confidence > 0.85) {
    return { needed: false };
  }

  const domainQ = result.domain !== 'general'
    ? DOMAIN_CLARIFICATION_QUESTIONS[result.domain]
    : null;

  const question = generateClarificationQuestion(result);

  if (!question) {
    return { needed: false };
  }

  // Confidence 0.5-0.85 — ask one question
  // Confidence < 0.5 — ask one question AND suggest most likely route
  return {
    needed: true,
    question,
    reason: domainQ?.reason ?? 'Need more information to route your request',
    autoRouteIfSkipped: domainQ?.autoRoute ?? result.suggestedServiceSlugs[0],
  };
}

// ── AI Triage ────────────────────────────────────────────────

const AI_TRIAGE_SYSTEM_PROMPT = `You are a citizen service triage classifier for Nepal Republic, a Nepali government services platform.

Given a citizen's message (in English or Nepali), classify it into structured fields. The citizen may be asking about health/hospital services, passport, driving license, utility bills, citizenship, or something else.

Respond with ONLY a JSON object (no markdown, no explanation) with these fields:
{
  "domain": "health" | "passport" | "license" | "utilities" | "citizenship" | "general",
  "intent": "<specific action like 'renew_passport', 'pay_bill', 'get_opd', 'book_appointment', 'report_outage', 'new_license', 'emergency_care', 'track_status', etc.>",
  "urgency": "emergency" | "urgent" | "same_day" | "routine",
  "severity": <1-5 where 5=life-threatening, 4=serious, 3=moderate, 2=minor, 1=informational>,
  "safetyFlags": ["<flag1>", ...],
  "reasoning": "<one-line explanation of classification>",
  "confidence": <0.0-1.0>
}

Safety flags to consider:
- "labor_emergency" — active labor/delivery
- "chest_pain" — cardiac symptoms
- "breathing_difficulty" — respiratory distress
- "unconscious" — loss of consciousness
- "severe_bleeding" — significant hemorrhage
- "trauma_injury" — accident/fracture/trauma
- "seizure" — convulsions
- "poisoning" — toxic ingestion
- "suicide_risk" — self-harm indicators
- "child_emergency" — pediatric emergency
- "pregnancy_risk" — pregnancy complications
- "high_fever" — dangerous fever (103+)
- "severe_pain" — intense pain requiring attention
- "legal_risk" — expired license while driving, etc.

Important rules:
- ALWAYS flag emergencies with severity 5 and urgency "emergency"
- For Nepali language input, understand common health/service terms
- If the message is ambiguous, set confidence lower (0.3-0.5)
- An empty or nonsensical message should get domain "general" with confidence 0.1`;

function buildAITriageUserPrompt(input: TriageInput): string {
  const parts = [`Citizen message: "${input.userMessage}"`];

  if (input.existingIntake?.domain && input.existingIntake.domain !== 'general') {
    parts.push(`Context: The conversation is already in the "${input.existingIntake.domain}" domain.`);
  }

  if (input.conversationHistory && input.conversationHistory.length > 0) {
    const recent = input.conversationHistory.slice(-3);
    parts.push(`Recent conversation:\n${recent.map((m, i) => `  ${i + 1}. ${m}`).join('\n')}`);
  }

  parts.push(`Locale: ${input.locale}`);
  return parts.join('\n');
}

function parseAITriageResponse(content: string): AITriageClassification | null {
  try {
    // Strip markdown code fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    const validDomains = ['health', 'passport', 'license', 'utilities', 'citizenship', 'general'];
    const validUrgencies = ['emergency', 'urgent', 'same_day', 'routine'];

    if (!validDomains.includes(parsed.domain)) return null;
    if (!validUrgencies.includes(parsed.urgency)) return null;
    if (typeof parsed.severity !== 'number' || parsed.severity < 1 || parsed.severity > 5) return null;
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) return null;

    return {
      domain: parsed.domain,
      intent: parsed.intent || 'unknown',
      urgency: parsed.urgency,
      severity: parsed.severity,
      safetyFlags: Array.isArray(parsed.safetyFlags) ? parsed.safetyFlags : [],
      reasoning: parsed.reasoning || '',
      confidence: parsed.confidence,
    };
  } catch {
    return null;
  }
}

/**
 * AI-backed triage: calls the AI router to classify the request,
 * then runs the domain-specific policy for detailed routing.
 *
 * Returns null if AI call fails or response is unparseable.
 */
export async function aiTriageRequest(input: TriageInput): Promise<TriageResult | null> {
  try {
    const response = await aiComplete(
      'classify',
      AI_TRIAGE_SYSTEM_PROMPT,
      buildAITriageUserPrompt(input),
    );

    const classification = parseAITriageResponse(response.content);
    if (!classification) {
      console.warn('[Triage] AI response unparseable:', response.content.slice(0, 200));
      return null;
    }

    const message = input.userMessage.trim();
    const targetMemberType = detectTarget(message);

    // Use existing intake domain if set, otherwise use AI's domain
    const domain = input.existingIntake?.domain && input.existingIntake.domain !== 'general'
      ? input.existingIntake.domain
      : classification.domain;

    const baseSeverity = severityFromNumber(classification.severity);
    const isEmergency = classification.urgency === 'emergency' ||
      classification.safetyFlags.some(f =>
        ['labor_emergency', 'chest_pain', 'breathing_difficulty', 'unconscious',
         'severe_bleeding', 'seizure', 'poisoning', 'suicide_risk'].includes(f));

    // ── Run domain-specific policy for detailed routing ──

    if (domain === 'health') {
      const policyResult = triageHealth({ message, targetMember: targetMemberType });

      // Merge: AI provides urgency/severity/flags, policy provides routing details
      // If AI detected emergency but keyword policy didn't, trust AI
      const mergedUrgency = isEmergency ? 'emergency' :
        (classification.urgency === 'urgent' || policyResult.urgency === 'urgent') ? 'urgent' :
        (classification.urgency === 'same_day' || policyResult.urgency === 'same_day') ? 'same_day' :
        classification.urgency;
      const mergedSeverity = isEmergency ? 'critical' :
        (baseSeverity === 'high' || policyResult.severity === 'high') ? 'high' :
        baseSeverity;
      const mergedFlags = [...new Set([...classification.safetyFlags, ...policyResult.safetyFlags])];

      const partial: TriageResult = {
        domain: 'health',
        subdomain: policyResult.subdomain,
        urgency: mergedUrgency,
        severity: mergedSeverity,
        targetMemberType,
        safeNextAction: isEmergency && !policyResult.requiresEmergency
          ? 'Call 102 (ambulance) immediately or go to nearest emergency room'
          : policyResult.safeAction,
        requiresEmergencyHandling: isEmergency || policyResult.requiresEmergency,
        clarificationNeeded: false,
        suggestedServiceSlugs: isEmergency ? ['emergency-ambulance'] : policyResult.suggestedSlugs,
        confidence: classification.confidence,
        triageReason: `[AI] ${classification.reasoning}`,
        safetyFlags: mergedFlags,
        triageMethod: 'ai',
      };
      partial.clarification = buildClarification(partial);
      partial.clarificationNeeded = partial.clarification.needed;
      if (partial.clarification.question) {
        partial.clarificationQuestion = partial.clarification.question;
      }
      return partial;
    }

    if (domain === 'passport') {
      const policyResult = triagePassport({ message, targetMember: targetMemberType });

      const partial: TriageResult = {
        domain: 'passport',
        subdomain: policyResult.subdomain,
        urgency: classification.urgency === 'emergency' ? 'urgent' : classification.urgency,
        severity: baseSeverity,
        targetMemberType,
        safeNextAction: policyResult.safeAction,
        requiresEmergencyHandling: false,
        clarificationNeeded: false,
        suggestedServiceSlugs: policyResult.suggestedSlugs,
        confidence: classification.confidence,
        triageReason: `[AI] ${classification.reasoning}`,
        safetyFlags: classification.safetyFlags,
        triageMethod: 'ai',
      };
      partial.clarification = buildClarification(partial);
      partial.clarificationNeeded = partial.clarification.needed;
      if (partial.clarification.question) {
        partial.clarificationQuestion = partial.clarification.question;
      }
      return partial;
    }

    if (domain === 'license') {
      const policyResult = triageLicense({ message, targetMember: targetMemberType });

      const partial: TriageResult = {
        domain: 'license',
        subdomain: policyResult.subdomain,
        urgency: classification.urgency === 'emergency' ? 'urgent' : classification.urgency,
        severity: baseSeverity,
        targetMemberType,
        safeNextAction: policyResult.safeAction,
        requiresEmergencyHandling: false,
        clarificationNeeded: false,
        suggestedServiceSlugs: policyResult.suggestedSlugs,
        confidence: classification.confidence,
        triageReason: `[AI] ${classification.reasoning}`,
        safetyFlags: classification.safetyFlags,
        triageMethod: 'ai',
      };
      partial.clarification = buildClarification(partial);
      partial.clarificationNeeded = partial.clarification.needed;
      if (partial.clarification.question) {
        partial.clarificationQuestion = partial.clarification.question;
      }
      return partial;
    }

    if (domain === 'utilities') {
      const policyResult = triageUtilities({ message, targetMember: targetMemberType });

      const partial: TriageResult = {
        domain: 'utilities',
        subdomain: policyResult.subdomain,
        urgency: classification.urgency,
        severity: baseSeverity,
        targetMemberType,
        safeNextAction: policyResult.safeAction,
        requiresEmergencyHandling: false,
        clarificationNeeded: false,
        suggestedServiceSlugs: policyResult.suggestedSlugs,
        confidence: classification.confidence,
        triageReason: `[AI] ${classification.reasoning}`,
        safetyFlags: classification.safetyFlags,
        triageMethod: 'ai',
      };
      partial.clarification = buildClarification(partial);
      partial.clarificationNeeded = partial.clarification.needed;
      if (partial.clarification.question) {
        partial.clarificationQuestion = partial.clarification.question;
      }
      return partial;
    }

    if (domain === 'citizenship') {
      const partial: TriageResult = {
        domain: 'citizenship',
        subdomain: classification.intent || 'general-citizenship',
        urgency: classification.urgency === 'emergency' ? 'routine' : classification.urgency,
        severity: baseSeverity,
        targetMemberType,
        safeNextAction:
          'Visit your local District Administration Office (DAO) with required documents',
        requiresEmergencyHandling: false,
        clarificationNeeded: false,
        suggestedServiceSlugs: ['citizenship-application'],
        confidence: classification.confidence,
        triageReason: `[AI] ${classification.reasoning}`,
        safetyFlags: classification.safetyFlags,
        triageMethod: 'ai',
      };
      partial.clarification = buildClarification(partial);
      partial.clarificationNeeded = partial.clarification.needed;
      if (partial.clarification.question) {
        partial.clarificationQuestion = partial.clarification.question;
      }
      return partial;
    }

    // ── General / unknown domain ──
    const generalResult: TriageResult = {
      domain: 'general',
      subdomain: classification.intent || 'unclassified',
      urgency: classification.urgency,
      severity: baseSeverity,
      targetMemberType,
      safeNextAction: 'Please provide more details so we can help you',
      requiresEmergencyHandling: false,
      clarificationNeeded: true,
      clarificationQuestion:
        'Could you tell us more about what you need? For example: health/hospital, passport, driving license, or utility bills.',
      clarificationQuestion_ne:
        'Tapailai ke chahiyo bhanera ali bataunu hos — jastai: swasthya/aspatal, rahadani, license, wa bijuli/pani bil.',
      suggestedServiceSlugs: [],
      confidence: classification.confidence,
      triageReason: `[AI] ${classification.reasoning}`,
      safetyFlags: classification.safetyFlags,
      triageMethod: 'ai',
    };
    generalResult.clarification = buildClarification(generalResult);
    return generalResult;
  } catch (err) {
    console.warn(
      '[Triage] AI triage failed, will fall back to keywords:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ── Keyword-based triage (original, now used as fallback) ────

async function keywordTriageRequest(input: TriageInput): Promise<TriageResult> {
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
      triageMethod: 'keyword',
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

    const partial: TriageResult = {
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
      triageMethod: 'keyword',
    };
    partial.clarification = buildClarification(partial);
    partial.clarificationNeeded = partial.clarification.needed;
    if (partial.clarification.question) {
      partial.clarificationQuestion = partial.clarification.question;
    }
    return partial;
  }

  if (domain === 'passport') {
    const result = triagePassport({
      message,
      targetMember: targetMemberType,
    });

    const partial: TriageResult = {
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
      triageMethod: 'keyword',
    };
    partial.clarification = buildClarification(partial);
    partial.clarificationNeeded = partial.clarification.needed;
    if (partial.clarification.question) {
      partial.clarificationQuestion = partial.clarification.question;
    }
    return partial;
  }

  if (domain === 'license') {
    const result = triageLicense({
      message,
      targetMember: targetMemberType,
    });

    const partial: TriageResult = {
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
      triageMethod: 'keyword',
    };
    partial.clarification = buildClarification(partial);
    partial.clarificationNeeded = partial.clarification.needed;
    if (partial.clarification.question) {
      partial.clarificationQuestion = partial.clarification.question;
    }
    return partial;
  }

  if (domain === 'utilities') {
    const result = triageUtilities({
      message,
      targetMember: targetMemberType,
    });

    const partial: TriageResult = {
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
      triageMethod: 'keyword',
    };
    partial.clarification = buildClarification(partial);
    partial.clarificationNeeded = partial.clarification.needed;
    if (partial.clarification.question) {
      partial.clarificationQuestion = partial.clarification.question;
    }
    return partial;
  }

  if (domain === 'citizenship') {
    const partial: TriageResult = {
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
      triageMethod: 'keyword',
    };
    partial.clarification = buildClarification(partial);
    partial.clarificationNeeded = partial.clarification.needed;
    if (partial.clarification.question) {
      partial.clarificationQuestion = partial.clarification.question;
    }
    return partial;
  }

  // ── General / unknown domain — ask for clarification ──
  const generalResult: TriageResult = {
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
    triageMethod: 'keyword',
  };
  generalResult.clarification = buildClarification(generalResult);
  return generalResult;
}

// ── Main triage function (AI-first with keyword fallback) ────

export async function triageRequest(input: TriageInput): Promise<TriageResult> {
  const message = input.userMessage.trim();

  // Skip AI for empty messages — no point burning tokens
  if (!message) {
    return keywordTriageRequest(input);
  }

  // Try AI triage first
  const aiResult = await aiTriageRequest(input);

  // If AI succeeded and has sufficient confidence, use it
  if (aiResult && aiResult.confidence >= AI_CONFIDENCE_THRESHOLD) {
    return aiResult;
  }

  // If AI returned low confidence, log it and fall back
  if (aiResult && aiResult.confidence < AI_CONFIDENCE_THRESHOLD) {
    console.log(
      `[Triage] AI confidence too low (${aiResult.confidence.toFixed(2)}), falling back to keywords`,
    );
  }

  // Fall back to keyword-based triage
  return keywordTriageRequest(input);
}
