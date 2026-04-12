/**
 * Passport domain triage policy.
 *
 * Pure keyword-based triage — no external dependencies.
 */

export interface PassportTriageInput {
  message: string;
  targetMember: string;
}

export interface PassportTriageOutput {
  subdomain: string;
  urgency: 'emergency' | 'urgent' | 'same_day' | 'routine';
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedSlugs: string[];
  safeAction: string;
  triageReason: string;
}

// ── Keyword sets ──────────────────────────────────────────────

const LOST_STOLEN_KEYWORDS = [
  'lost', 'stolen', 'missing', 'harayo', 'chori',
  'damaged', 'destroyed',
];

const RENEWAL_KEYWORDS = [
  'renew', 'renewal', 'expired', 'expire', 'extend',
  'nawikaran', 'sakiyeko',
];

const TRACKING_KEYWORDS = [
  'track', 'tracking', 'status', 'where is my', 'check',
  'kaha pugyo', 'awastha',
];

const URGENCY_BUMP_KEYWORDS = [
  'urgent', 'jaldi', 'chhito', 'travel soon', 'flight',
  'udaan', 'visa deadline', 'emergency travel',
  'tomorrow', 'bholi', 'next week',
];

// ── Helpers ───────────────────────────────────────────────────

function lower(s: string): string {
  return s.toLowerCase();
}

function matchesAny(text: string, keywords: string[]): boolean {
  const t = lower(text);
  return keywords.some((kw) => t.includes(lower(kw)));
}

// ── Main triage ───────────────────────────────────────────────

export function triagePassport(input: PassportTriageInput): PassportTriageOutput {
  const { message } = input;
  const isUrgent = matchesAny(message, URGENCY_BUMP_KEYWORDS);

  // ── Lost / stolen ──
  if (matchesAny(message, LOST_STOLEN_KEYWORDS)) {
    return {
      subdomain: 'lost-passport',
      urgency: 'urgent',
      severity: 'high',
      suggestedSlugs: ['new-passport'],
      safeAction:
        'File a police report first, then apply for a new passport',
      triageReason:
        'Lost or stolen passport requires immediate police report and reapplication',
    };
  }

  // ── Renewal / expired ──
  if (matchesAny(message, RENEWAL_KEYWORDS)) {
    return {
      subdomain: 'renewal',
      urgency: isUrgent ? 'urgent' : 'routine',
      severity: isUrgent ? 'medium' : 'low',
      suggestedSlugs: ['passport-renewal'],
      safeAction: isUrgent
        ? 'Apply for express passport renewal — bring proof of travel date'
        : 'Apply for passport renewal at your nearest passport office',
      triageReason: isUrgent
        ? 'Passport renewal with time pressure — express processing recommended'
        : 'Standard passport renewal — no urgency indicators',
    };
  }

  // ── Tracking ──
  if (matchesAny(message, TRACKING_KEYWORDS)) {
    return {
      subdomain: 'tracking',
      urgency: 'routine',
      severity: 'low',
      suggestedSlugs: [],
      safeAction:
        'Check your application status online at the Department of Passports website',
      triageReason: 'Passport status inquiry — can be resolved online',
    };
  }

  // ── New passport (default) ──
  return {
    subdomain: 'new-application',
    urgency: isUrgent ? 'urgent' : 'routine',
    severity: isUrgent ? 'medium' : 'low',
    suggestedSlugs: ['new-passport'],
    safeAction: isUrgent
      ? 'Visit the Department of Passports with required documents — request express processing'
      : 'Apply for a new passport at the Department of Passports',
    triageReason: isUrgent
      ? 'New passport application with time pressure'
      : 'Standard new passport application',
  };
}
