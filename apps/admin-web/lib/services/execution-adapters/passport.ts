/**
 * Passport execution adapters — new passport and renewal.
 */
import type {
  ServiceAdapter,
  ExecutionContext,
  ExecutionResult,
  ExecutionStep,
  AdapterCapabilities,
} from './index';

const PASSPORT_CAPABILITIES: AdapterCapabilities = {
  canPrefill: true,
  canSubmitDigitally: false,
  canBookAppointment: false,
  canProcessPayment: false,
  canTrackStatus: true,
  canEscalate: false,
};

const IDENTITY_KEYS = [
  'full_name_en',
  'full_name_ne',
  'father_name_en',
  'father_name_ne',
  'mother_name_en',
  'mother_name_ne',
  'grandfather_name_en',
  'spouse_name_en',
  'date_of_birth',
  'gender',
  'nationality',
  'marital_status',
  'citizenship_no',
  'citizenship_issue_date',
  'citizenship_issue_district',
  'permanent_province',
  'permanent_district',
  'permanent_municipality',
  'permanent_ward',
  'permanent_tole',
  'mobile',
  'email',
  'blood_group',
  'occupation',
];

function normalizePassportIntake(
  values: Record<string, string>,
): Record<string, string> {
  // Pass through — passport forms match our profile keys
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v) out[k] = v;
  }
  return out;
}

function mapPassportProfile(
  profile: Record<string, string | null>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of IDENTITY_KEYS) {
    if (profile[k]) out[k] = profile[k]!;
  }
  return out;
}

// ---------------------------------------------------------------------------
// New Passport
// ---------------------------------------------------------------------------

const NEW_PASSPORT_STEPS: ExecutionStep[] = [
  {
    order: 1,
    action: 'gather_documents',
    description: 'Collect citizenship certificate (original + copy), 2 passport photos (white background), and ward recommendation if applicable',
    requiresUser: true,
    automatable: false,
  },
  {
    order: 2,
    action: 'fill_online_form',
    description: 'Fill the online application form at nepalpassport.gov.np/newpassport with your personal details',
    requiresUser: true,
    automatable: true,
  },
  {
    order: 3,
    action: 'book_appointment',
    description: 'Book an appointment slot through the online portal',
    requiresUser: true,
    automatable: false,
  },
  {
    order: 4,
    action: 'visit_office',
    description: 'Visit the Department of Passports, Tripureshwor, Kathmandu on your appointment date with all original documents',
    requiresUser: true,
    automatable: false,
  },
  {
    order: 5,
    action: 'biometrics',
    description: 'Provide biometric data (fingerprints, photo) at the passport office',
    requiresUser: true,
    automatable: false,
  },
  {
    order: 6,
    action: 'pay_fee',
    description: 'Pay NPR 5,000 (regular) or NPR 10,000 (express) at the counter',
    requiresUser: true,
    automatable: false,
  },
  {
    order: 7,
    action: 'collect_passport',
    description: 'Collect passport after 5-7 working days (regular) or 2-3 days (express)',
    requiresUser: true,
    automatable: false,
  },
];

const newPassportAdapter: ServiceAdapter = {
  slug: 'new-passport',
  family: 'passport',
  mode: 'assisted',
  executionLevel: 'guided',
  capabilities: PASSPORT_CAPABILITIES,

  normalizeIntake: normalizePassportIntake,
  mapProfileToForm: mapPassportProfile,

  canExecute() {
    return false; // In-person visit required
  },

  getExecutionSteps() {
    return NEW_PASSPORT_STEPS;
  },

  getRequiredDocuments() {
    return [
      { type: 'citizenship', label: 'Citizenship certificate (original + copy)', required: true },
      { type: 'photos', label: 'Passport-size photos (2 copies, white background)', required: true },
      { type: 'birth_certificate', label: 'Birth certificate (for minors)', required: false },
      { type: 'recommendation', label: 'Ward recommendation letter', required: false },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'new-passport',
      applicant: normalizePassportIntake(context.draftValues),
      documents: context.documents,
      type: 'new',
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const name = context.draftValues.full_name_en || 'Applicant';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Fill the online form at https://nepalpassport.gov.np/newpassport`,
        `Book an appointment through the online portal.`,
        `Visit the Department of Passports, Tripureshwor, Kathmandu on your appointment date.`,
        `Bring original citizenship, 2 passport photos (white background), and NPR 5,000 fee.`,
        `Processing time: Regular 5-7 working days, Express 2-3 working days (NPR 10,000).`,
        `Application pre-filled for ${name}. Review all fields before submitting online.`,
      ],
      estimatedWait: '5-7 working days (regular)',
      trackingUrl: 'https://nepalpassport.gov.np/track',
    };
  },
};

// ---------------------------------------------------------------------------
// Passport Renewal
// ---------------------------------------------------------------------------

const passportRenewalAdapter: ServiceAdapter = {
  slug: 'passport-renewal',
  family: 'passport',
  mode: 'assisted',
  executionLevel: 'guided',
  capabilities: PASSPORT_CAPABILITIES,

  normalizeIntake: normalizePassportIntake,
  mapProfileToForm: mapPassportProfile,

  canExecute() {
    return false; // In-person visit required
  },

  getExecutionSteps() {
    return [
      { order: 1, action: 'gather_documents', description: 'Collect citizenship certificate, old passport, 2 passport photos, and police report if lost/stolen', requiresUser: true, automatable: false },
      { order: 2, action: 'fill_online_form', description: 'Fill the renewal form at nepalpassport.gov.np/passportrenew', requiresUser: true, automatable: true },
      { order: 3, action: 'book_appointment', description: 'Book an appointment through the online portal', requiresUser: true, automatable: false },
      { order: 4, action: 'visit_office', description: 'Visit the Department of Passports with all original documents on appointment date', requiresUser: true, automatable: false },
      { order: 5, action: 'biometrics', description: 'Provide biometric data at the passport office', requiresUser: true, automatable: false },
      { order: 6, action: 'pay_fee', description: 'Pay NPR 5,000 (regular) or NPR 10,000 (express)', requiresUser: true, automatable: false },
      { order: 7, action: 'collect_passport', description: 'Collect passport after 5-7 working days (regular) or 2-3 days (express)', requiresUser: true, automatable: false },
    ];
  },

  getRequiredDocuments() {
    return [
      { type: 'citizenship', label: 'Citizenship certificate (original + copy)', required: true },
      { type: 'photos', label: 'Passport-size photos (2 copies, white background)', required: true },
      { type: 'old_passport', label: 'Expired/old passport (original)', required: true },
      { type: 'old_passport_copy', label: 'Photocopy of old passport (data page)', required: true },
      { type: 'police_report', label: 'Police report (if passport lost/stolen)', required: false },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'passport-renewal',
      applicant: normalizePassportIntake(context.draftValues),
      documents: context.documents,
      type: 'renewal',
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const name = context.draftValues.full_name_en || 'Applicant';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Fill the renewal form at https://nepalpassport.gov.np/passportrenew`,
        `Book an appointment through the online portal.`,
        `Visit the Department of Passports, Tripureshwor, Kathmandu on your appointment date.`,
        `Bring original citizenship, old passport, 2 passport photos, and NPR 5,000 fee.`,
        `If passport was lost/stolen, bring a police report from the local police station.`,
        `Processing time: Regular 5-7 working days, Express 2-3 working days (NPR 10,000).`,
        `Application pre-filled for ${name}. Review all fields before submitting online.`,
      ],
      estimatedWait: '5-7 working days (regular)',
      trackingUrl: 'https://nepalpassport.gov.np/track',
    };
  },
};

export const passportAdapters: ServiceAdapter[] = [
  newPassportAdapter,
  passportRenewalAdapter,
];
