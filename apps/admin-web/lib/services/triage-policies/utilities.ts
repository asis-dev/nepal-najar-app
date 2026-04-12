/**
 * Utilities domain triage policy (electricity, water).
 *
 * Pure keyword-based triage — no external dependencies.
 */

export interface UtilitiesTriageInput {
  message: string;
  targetMember: string;
}

export interface UtilitiesTriageOutput {
  subdomain: string;
  urgency: 'emergency' | 'urgent' | 'same_day' | 'routine';
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedSlugs: string[];
  safeAction: string;
  triageReason: string;
  provider: 'nea' | 'kukl' | 'unknown';
}

// ── Keyword sets ──────────────────────────────────────────────

const BILL_KEYWORDS = [
  'bill', 'payment', 'pay', 'tirne', 'mahsul',
  'bill pay', 'invoice', 'amount due',
];

const OVERDUE_KEYWORDS = [
  'overdue', 'late', 'disconnection', 'disconnect', 'cut off',
  'katyo', 'bandha', 'fine', 'penalty', 'jurimana',
  'unpaid', 'due date passed',
];

const OUTAGE_KEYWORDS = [
  'no electricity', 'no water', 'power cut', 'outage',
  'bijuli chhaina', 'pani aaudaina', 'load shedding',
  'not working', 'broken pipe', 'pipe phutiyo',
  'transformer', 'meter problem',
];

const PROLONGED_OUTAGE_KEYWORDS = [
  'days', 'din', 'week', 'hapta', 'long time', 'dherai din',
  'still no', 'ajhai', 'since yesterday',
];

const NEW_CONNECTION_KEYWORDS = [
  'new connection', 'new meter', 'naya connection',
  'naya meter', 'apply connection', 'install meter',
];

const COMPLAINT_KEYWORDS = [
  'complaint', 'complain', 'report', 'ujuri',
  'wrong bill', 'galat bill', 'overcharge', 'dispute',
  'meter reading wrong', 'meter galat',
];

const NEA_KEYWORDS = [
  'nea', 'electricity', 'bijuli', 'electric', 'power',
  'nepal electricity', 'vidyut',
];

const KUKL_KEYWORDS = [
  'kukl', 'water', 'pani', 'kathmandu upatyaka',
  'khanepani', 'drinking water', 'dhara',
];

// ── Helpers ───────────────────────────────────────────────────

function lower(s: string): string {
  return s.toLowerCase();
}

function matchesAny(text: string, keywords: string[]): boolean {
  const t = lower(text);
  return keywords.some((kw) => t.includes(lower(kw)));
}

function detectProvider(message: string): 'nea' | 'kukl' | 'unknown' {
  if (matchesAny(message, NEA_KEYWORDS)) return 'nea';
  if (matchesAny(message, KUKL_KEYWORDS)) return 'kukl';
  return 'unknown';
}

function providerSlugPrefix(provider: 'nea' | 'kukl' | 'unknown'): string {
  if (provider === 'nea') return 'nea';
  if (provider === 'kukl') return 'kukl';
  return 'utility';
}

// ── Main triage ───────────────────────────────────────────────

export function triageUtilities(input: UtilitiesTriageInput): UtilitiesTriageOutput {
  const { message } = input;
  const provider = detectProvider(message);
  const prefix = providerSlugPrefix(provider);

  // ── Complaint / outage ──
  if (matchesAny(message, OUTAGE_KEYWORDS) || matchesAny(message, COMPLAINT_KEYWORDS)) {
    const prolonged = matchesAny(message, PROLONGED_OUTAGE_KEYWORDS);

    return {
      subdomain: 'complaint',
      urgency: prolonged ? 'urgent' : 'same_day',
      severity: prolonged ? 'high' : 'medium',
      suggestedSlugs: [`${prefix}-complaint`],
      safeAction: prolonged
        ? `Contact ${provider === 'kukl' ? 'KUKL' : provider === 'nea' ? 'NEA' : 'your utility provider'} immediately — prolonged outage requires escalation`
        : `Report the issue to ${provider === 'kukl' ? 'KUKL' : provider === 'nea' ? 'NEA' : 'your utility provider'} customer service`,
      triageReason: prolonged
        ? 'Prolonged outage or service disruption — escalation needed'
        : 'Service complaint or outage — same-day resolution recommended',
      provider,
    };
  }

  // ── Overdue bill / disconnection risk ──
  if (matchesAny(message, OVERDUE_KEYWORDS)) {
    return {
      subdomain: 'bill-payment',
      urgency: 'urgent',
      severity: 'high',
      suggestedSlugs: [`${prefix}-bill-payment`],
      safeAction:
        'Pay the overdue bill immediately to avoid disconnection — visit the nearest payment counter or pay online',
      triageReason:
        'Overdue utility bill with disconnection risk — urgent payment needed',
      provider,
    };
  }

  // ── New connection ──
  if (matchesAny(message, NEW_CONNECTION_KEYWORDS)) {
    return {
      subdomain: 'new-connection',
      urgency: 'routine',
      severity: 'low',
      suggestedSlugs: [`${prefix}-new-connection`],
      safeAction:
        `Apply for a new ${provider === 'kukl' ? 'water' : provider === 'nea' ? 'electricity' : 'utility'} connection at your local office with required documents`,
      triageReason: 'New utility connection request',
      provider,
    };
  }

  // ── Bill payment (standard) ──
  if (matchesAny(message, BILL_KEYWORDS)) {
    return {
      subdomain: 'bill-payment',
      urgency: 'routine',
      severity: 'low',
      suggestedSlugs: [`${prefix}-bill-payment`],
      safeAction:
        'Pay your utility bill online or at the nearest payment counter',
      triageReason: 'Standard utility bill payment — no urgency indicators',
      provider,
    };
  }

  // ── General utilities (fallback) ──
  return {
    subdomain: 'general-utilities',
    urgency: 'routine',
    severity: 'low',
    suggestedSlugs: [],
    safeAction:
      'Contact your utility provider for assistance',
    triageReason: 'General utility inquiry — no specific action detected',
    provider,
  };
}
