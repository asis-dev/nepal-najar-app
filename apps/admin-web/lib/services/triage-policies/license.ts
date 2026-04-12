/**
 * License / vehicle domain triage policy.
 *
 * Pure keyword-based triage — no external dependencies.
 */

export interface LicenseTriageInput {
  message: string;
  targetMember: string;
}

export interface LicenseTriageOutput {
  subdomain: string;
  urgency: 'emergency' | 'urgent' | 'same_day' | 'routine';
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedSlugs: string[];
  safeAction: string;
  triageReason: string;
}

// ── Keyword sets ──────────────────────────────────────────────

const EXPIRED_KEYWORDS = [
  'expired', 'expire', 'sakiyeko', 'renew', 'renewal', 'nawikaran',
];

const DRIVING_EXPIRED_KEYWORDS = [
  'driving with expired', 'expired license driving',
  'still driving', 'chalairako', 'pakrayo',
  'police', 'fine', 'penalty', 'jurimana',
];

const TRIAL_KEYWORDS = [
  'trial', 'test', 'exam', 'pariksha', 'written test',
  'practical test', 'namonit',
];

const VEHICLE_REG_KEYWORDS = [
  'vehicle registration', 'register vehicle', 'gaadi dartaa',
  'sawari dartaa', 'new vehicle',
];

const BLUEBOOK_KEYWORDS = [
  'bluebook', 'blue book', 'blue-book',
  'nilpustika', 'nil pustika',
];

const NEW_LICENSE_KEYWORDS = [
  'new license', 'apply license', 'get license',
  'naya license', 'license banaaune', 'license chahincha',
  'first license', 'learner',
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

export function triageLicense(input: LicenseTriageInput): LicenseTriageOutput {
  const { message } = input;

  // ── Driving with expired license (legal risk) ──
  if (matchesAny(message, DRIVING_EXPIRED_KEYWORDS)) {
    return {
      subdomain: 'renewal',
      urgency: 'urgent',
      severity: 'high',
      suggestedSlugs: ['drivers-license-renewal'],
      safeAction:
        'Stop driving immediately and apply for license renewal at DOTM to avoid legal penalties',
      triageReason:
        'Driving with expired license carries legal penalties — urgent renewal needed',
    };
  }

  // ── Expired license (not actively driving) ──
  if (matchesAny(message, EXPIRED_KEYWORDS)) {
    return {
      subdomain: 'renewal',
      urgency: 'routine',
      severity: 'low',
      suggestedSlugs: ['drivers-license-renewal'],
      safeAction:
        'Apply for license renewal at your nearest DOTM office',
      triageReason: 'Standard license renewal — no urgency indicators',
    };
  }

  // ── Bluebook renewal ──
  if (matchesAny(message, BLUEBOOK_KEYWORDS)) {
    return {
      subdomain: 'bluebook-renewal',
      urgency: 'routine',
      severity: 'low',
      suggestedSlugs: ['bluebook-renewal'],
      safeAction:
        'Apply for bluebook renewal at your nearest DOTM office with required vehicle documents',
      triageReason: 'Bluebook renewal request',
    };
  }

  // ── Vehicle registration ──
  if (matchesAny(message, VEHICLE_REG_KEYWORDS)) {
    return {
      subdomain: 'vehicle-registration',
      urgency: 'routine',
      severity: 'low',
      suggestedSlugs: ['vehicle-registration'],
      safeAction:
        'Visit DOTM with vehicle purchase documents for registration',
      triageReason: 'New vehicle registration request',
    };
  }

  // ── Trial / test booking ──
  if (matchesAny(message, TRIAL_KEYWORDS)) {
    return {
      subdomain: 'trial-booking',
      urgency: 'routine',
      severity: 'low',
      suggestedSlugs: ['dotm-trial-booking'],
      safeAction:
        'Book your driving trial online at DOTM or visit the nearest office',
      triageReason: 'Driving trial/test booking request',
    };
  }

  // ── New license (default) ──
  return {
    subdomain: 'new-application',
    urgency: 'routine',
    severity: 'low',
    suggestedSlugs: ['new-drivers-license'],
    safeAction:
      'Apply for a new driving license at DOTM — you will need medical certificate and written test',
    triageReason: matchesAny(message, NEW_LICENSE_KEYWORDS)
      ? 'New driving license application'
      : 'General license inquiry — defaulting to new application flow',
  };
}
