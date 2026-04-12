/**
 * Health domain triage policy.
 *
 * Pure keyword-based triage — no external dependencies.
 * Covers emergency, urgent, same-day, and routine health scenarios
 * with safety flags for high-risk conditions.
 */

export interface HealthTriageInput {
  message: string;
  targetMember: string;
}

export interface HealthTriageOutput {
  subdomain: string;
  urgency: 'emergency' | 'urgent' | 'same_day' | 'routine';
  severity: 'critical' | 'high' | 'medium' | 'low';
  requiresEmergency: boolean;
  safetyFlags: string[];
  suggestedSlugs: string[];
  safeAction: string;
  triageReason: string;
}

// ── Keyword sets ──────────────────────────────────────────────

const EMERGENCY_KEYWORDS = [
  'labor', 'labour', 'delivery', 'delivering', 'contractions',
  'give birth', 'giving birth', 'about to deliver', 'water broke',
  'water breaking', 'in labor', 'janma dina', 'baccha aaudai',
  'prasuti', 'sutkeri',
  'chest pain', 'heart attack', 'cardiac',
  'cannot breathe', 'cant breathe', 'breathing difficulty',
  'sas ferna', 'sas aaudaina',
  'unconscious', 'behosh', 'fainted', 'unresponsive',
  'severe bleeding', 'heavy bleeding', 'ragat bahiraako',
  'accident', 'durghatana', 'trauma', 'fracture',
  'seizure', 'convulsion', 'khadkane',
  'stroke', 'paralysis',
  'poisoning', 'bikh',
  'suicide', 'aatmahatya',
  'drowning',
];

const URGENT_KEYWORDS = [
  '3 days fever', 'three days fever', 'tin din jwaro',
  'fever for 3', 'fever for three', 'fever for 2 days', 'fever for two',
  'fever since', 'jwaro bhayeko',
  'high fever', 'dherai jwaro', '104', '105', '103',
  'severe pain', 'tivra dukhi', 'dherai dukhi',
  'pregnancy complication', 'garbhama samasya',
  'bleeding during pregnancy', 'garbhavati ragat',
  'broken bone', 'haddi bhachiyeko',
  'deep cut', 'wound infection',
  'dehydration', 'pani na khaeko',
  'child not eating', 'baccha khanna',
  'rash spreading', 'allergic reaction',
  'vomiting blood', 'blood in stool',
  'not getting better', 'getting worse', 'bigriraako',
];

const CHILD_KEYWORDS = [
  'child', 'baby', 'infant', 'newborn', 'toddler',
  'baccha', 'chhora', 'chhori', 'sisu', 'balak',
  'son', 'daughter', 'kid',
];

const PREGNANCY_KEYWORDS = [
  'pregnant', 'pregnancy', 'garbhavati', 'garbha',
  'maternity', 'antenatal', 'anc', 'prenatal',
  'miscarriage', 'garbhpatan',
];

const ROUTINE_KEYWORDS = [
  'checkup', 'check-up', 'check up', 'health check',
  'follow-up', 'follow up', 'followup',
  'vaccination', 'vaccine', 'khop',
  'anc visit', 'anc appointment',
  'routine', 'regular',
  'report collect', 'lab report',
  'dental', 'eye', 'aankha', 'daat',
];

// ── Helpers ───────────────────────────────────────────────────

function lower(s: string): string {
  return s.toLowerCase();
}

function matchesAny(text: string, keywords: string[]): boolean {
  const t = lower(text);
  return keywords.some((kw) => t.includes(lower(kw)));
}

function isChildRelated(message: string, targetMember: string): boolean {
  return (
    targetMember === 'child' || matchesAny(message, CHILD_KEYWORDS)
  );
}

function isPregnancyRelated(message: string): boolean {
  return matchesAny(message, PREGNANCY_KEYWORDS);
}

function detectSpecialtySlugs(
  message: string,
  targetMember: string,
): string[] {
  if (isChildRelated(message, targetMember)) {
    return ['kanti-hospital-opd'];
  }
  if (isPregnancyRelated(message)) {
    return ['maternity-hospital-opd'];
  }
  return ['bir-hospital-opd', 'tuth-opd', 'patan-hospital-opd'];
}

function detectSubdomain(message: string, targetMember: string): string {
  const t = lower(message);
  if (matchesAny(t, ['opd', 'appointment', 'booking'])) return 'opd-booking';
  if (isPregnancyRelated(message)) return 'maternity';
  if (isChildRelated(message, targetMember)) return 'pediatric';
  if (matchesAny(t, ['emergency', 'ambulance', 'accident'])) return 'emergency';
  if (matchesAny(t, ['dental', 'daat'])) return 'dental';
  if (matchesAny(t, ['eye', 'aankha', 'vision'])) return 'ophthalmology';
  if (matchesAny(t, ['vaccination', 'vaccine', 'khop'])) return 'vaccination';
  return 'general-health';
}

// ── Main triage ───────────────────────────────────────────────

export function triageHealth(input: HealthTriageInput): HealthTriageOutput {
  const { message, targetMember } = input;

  // ── Emergency check ──
  if (matchesAny(message, EMERGENCY_KEYWORDS)) {
    const flags: string[] = [];
    const t = lower(message);
    if (matchesAny(t, ['labor', 'labour', 'delivery', 'prasuti', 'sutkeri', 'contractions', 'give birth', 'giving birth', 'water broke']))
      flags.push('labor_emergency');
    if (matchesAny(t, ['chest pain', 'heart attack', 'cardiac']))
      flags.push('chest_pain');
    if (matchesAny(t, ['cannot breathe', 'cant breathe', 'breathing difficulty', 'sas']))
      flags.push('breathing_difficulty');
    if (matchesAny(t, ['unconscious', 'behosh', 'fainted']))
      flags.push('unconscious');
    if (matchesAny(t, ['bleeding', 'ragat']))
      flags.push('severe_bleeding');
    if (matchesAny(t, ['accident', 'durghatana', 'trauma', 'fracture']))
      flags.push('trauma_injury');
    if (matchesAny(t, ['seizure', 'convulsion']))
      flags.push('seizure');
    if (matchesAny(t, ['poisoning', 'bikh']))
      flags.push('poisoning');
    if (matchesAny(t, ['suicide', 'aatmahatya']))
      flags.push('suicide_risk');
    if (isChildRelated(message, targetMember))
      flags.push('child_emergency');
    if (isPregnancyRelated(message))
      flags.push('pregnancy_risk');

    return {
      subdomain: 'emergency',
      urgency: 'emergency',
      severity: 'critical',
      requiresEmergency: true,
      safetyFlags: flags,
      suggestedSlugs: ['emergency-ambulance'],
      safeAction:
        'Call 102 (ambulance) immediately or go to nearest emergency room',
      triageReason: `Emergency keywords detected: ${flags.join(', ')}`,
    };
  }

  // ── Urgent check ──
  if (matchesAny(message, URGENT_KEYWORDS)) {
    const flags: string[] = [];
    if (isChildRelated(message, targetMember)) flags.push('child_fever');
    if (isPregnancyRelated(message)) flags.push('pregnancy_risk');
    if (matchesAny(message, ['high fever', 'dherai jwaro', '104', '105']))
      flags.push('high_fever');
    if (matchesAny(message, ['severe pain', 'tivra dukhi']))
      flags.push('severe_pain');

    return {
      subdomain: detectSubdomain(message, targetMember),
      urgency: 'urgent',
      severity: 'high',
      requiresEmergency: false,
      safetyFlags: flags,
      suggestedSlugs: detectSpecialtySlugs(message, targetMember),
      safeAction: 'Visit the nearest hospital OPD today',
      triageReason: `Urgent health concern: ${flags.length ? flags.join(', ') : 'symptoms suggest prompt evaluation needed'}`,
    };
  }

  // ── Routine check ──
  if (matchesAny(message, ROUTINE_KEYWORDS)) {
    return {
      subdomain: detectSubdomain(message, targetMember),
      urgency: 'routine',
      severity: 'low',
      requiresEmergency: false,
      safetyFlags: [],
      suggestedSlugs: detectSpecialtySlugs(message, targetMember),
      safeAction: 'Book an appointment at your preferred hospital',
      triageReason: 'Routine health visit — no urgency indicators found',
    };
  }

  // ── Same-day (default for health-domain messages) ──
  const flags: string[] = [];
  if (isChildRelated(message, targetMember)) flags.push('child_sick');
  if (isPregnancyRelated(message)) flags.push('pregnancy_risk');

  return {
    subdomain: detectSubdomain(message, targetMember),
    urgency: 'same_day',
    severity: 'medium',
    requiresEmergency: false,
    safetyFlags: flags,
    suggestedSlugs: detectSpecialtySlugs(message, targetMember),
    safeAction: 'Book an OPD appointment for today',
    triageReason:
      'General health concern — same-day OPD recommended as precaution',
  };
}
