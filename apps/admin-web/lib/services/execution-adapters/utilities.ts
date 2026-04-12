/**
 * Utilities execution adapters — NEA, KUKL bill payment and new connections.
 */
import type {
  ServiceAdapter,
  ExecutionContext,
  ExecutionResult,
  AdapterCapabilities,
} from './index';

const BILL_CAPABILITIES: AdapterCapabilities = {
  canPrefill: true,
  canSubmitDigitally: false,
  canBookAppointment: false,
  canProcessPayment: false, // external via eSewa/Khalti
  canTrackStatus: false,
  canEscalate: false,
};

const CONNECTION_CAPABILITIES: AdapterCapabilities = {
  canPrefill: true,
  canSubmitDigitally: false,
  canBookAppointment: false,
  canProcessPayment: false,
  canTrackStatus: false,
  canEscalate: false,
};

const UTILITY_PROFILE_KEYS = [
  'full_name_en',
  'full_name_ne',
  'citizenship_no',
  'permanent_district',
  'permanent_municipality',
  'permanent_ward',
  'permanent_tole',
  'mobile',
  'email',
];

function normalizeUtilityIntake(
  values: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v) out[k] = v;
  }
  return out;
}

function mapUtilityProfile(
  profile: Record<string, string | null>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of UTILITY_PROFILE_KEYS) {
    if (profile[k]) out[k] = profile[k]!;
  }
  return out;
}

// ---------------------------------------------------------------------------
// NEA Bill Payment
// ---------------------------------------------------------------------------

const neaBillPayment: ServiceAdapter = {
  slug: 'nea-bill-payment',
  family: 'utilities',
  mode: 'assisted',
  capabilities: BILL_CAPABILITIES,

  normalizeIntake: normalizeUtilityIntake,
  mapProfileToForm: mapUtilityProfile,

  getRequiredDocuments() {
    return [
      { type: 'electricity_bill', label: 'Latest electricity bill / customer ID', required: true },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'nea-bill-payment',
      customer: normalizeUtilityIntake(context.draftValues),
      documents: context.documents,
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const customerId = context.draftValues.customer_id || context.draftValues.nea_customer_id || '';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Find your NEA Customer ID on your electricity bill (SC No. / Customer ID).`,
        ...(customerId ? [`Your customer ID: ${customerId}`] : []),
        `Pay online via eSewa (https://esewa.com.np) or Khalti (https://khalti.com).`,
        `Or visit https://nea.org.np/onlinepayment for NEA's own portal.`,
        `Or pay at any NEA counter with your bill copy during office hours (Sun-Fri 10:00-15:00).`,
        `For billing disputes, call NEA helpline: 1150.`,
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// KUKL Bill Payment
// ---------------------------------------------------------------------------

const kuklBillPayment: ServiceAdapter = {
  slug: 'kukl-bill-payment',
  family: 'utilities',
  mode: 'assisted',
  capabilities: BILL_CAPABILITIES,

  normalizeIntake: normalizeUtilityIntake,
  mapProfileToForm: mapUtilityProfile,

  getRequiredDocuments() {
    return [
      { type: 'water_bill', label: 'Latest water bill / customer ID', required: true },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'kukl-bill-payment',
      customer: normalizeUtilityIntake(context.draftValues),
      documents: context.documents,
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const customerId = context.draftValues.customer_id || context.draftValues.kukl_customer_id || '';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Find your KUKL Customer ID on your water bill.`,
        ...(customerId ? [`Your customer ID: ${customerId}`] : []),
        `Pay online via eSewa or Khalti using your customer ID.`,
        `Or visit the nearest KUKL office counter (Sun-Fri 10:00-15:00).`,
        `KUKL head office: Tripureshwor, Kathmandu. Phone: 01-4261088.`,
        `For leakage or meter issues, file a complaint at the local KUKL branch.`,
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// NEA New Connection
// ---------------------------------------------------------------------------

const neaNewConnection: ServiceAdapter = {
  slug: 'nea-new-connection',
  family: 'utilities',
  mode: 'assisted',
  capabilities: CONNECTION_CAPABILITIES,

  normalizeIntake: normalizeUtilityIntake,
  mapProfileToForm: mapUtilityProfile,

  getRequiredDocuments() {
    return [
      { type: 'citizenship', label: 'Citizenship certificate (copy)', required: true },
      { type: 'land_ownership', label: 'Land ownership certificate / rent agreement', required: true },
      { type: 'house_map', label: 'Building construction approval', required: false },
      { type: 'photos', label: 'Passport-size photo (1 copy)', required: true },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'nea-new-connection',
      applicant: normalizeUtilityIntake(context.draftValues),
      documents: context.documents,
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const name = context.draftValues.full_name_en || 'Applicant';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Visit your local NEA distribution center with all documents.`,
        `Submit the application form with citizenship copy, land ownership proof, and photo.`,
        `Pay the connection fee (varies by load: NPR 2,500 - 15,000 for domestic).`,
        `NEA will schedule an inspection within 7-15 days.`,
        `After inspection approval, meter will be installed within 15-30 days.`,
        `For inquiries, call NEA helpline: 1150 or visit https://nea.org.np.`,
        `Application pre-filled for ${name}.`,
      ],
      estimatedWait: '15-30 days after inspection',
    };
  },
};

// ---------------------------------------------------------------------------
// KUKL New Connection
// ---------------------------------------------------------------------------

const kuklNewConnection: ServiceAdapter = {
  slug: 'kukl-new-connection',
  family: 'utilities',
  mode: 'assisted',
  capabilities: CONNECTION_CAPABILITIES,

  normalizeIntake: normalizeUtilityIntake,
  mapProfileToForm: mapUtilityProfile,

  getRequiredDocuments() {
    return [
      { type: 'citizenship', label: 'Citizenship certificate (copy)', required: true },
      { type: 'land_ownership', label: 'Land ownership certificate / rent agreement', required: true },
      { type: 'photos', label: 'Passport-size photo (1 copy)', required: true },
      { type: 'ward_recommendation', label: 'Ward office recommendation', required: true },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'kukl-new-connection',
      applicant: normalizeUtilityIntake(context.draftValues),
      documents: context.documents,
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const name = context.draftValues.full_name_en || 'Applicant';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Visit the nearest KUKL branch office with required documents.`,
        `Submit application with citizenship copy, land ownership proof, ward recommendation, and photo.`,
        `Pay the connection deposit (varies: NPR 3,000 - 10,000 depending on pipe size).`,
        `KUKL will schedule a site survey within 7-15 days.`,
        `Connection installed within 30-60 days after approval.`,
        `KUKL head office: Tripureshwor, Kathmandu. Phone: 01-4261088.`,
        `Application pre-filled for ${name}.`,
      ],
      estimatedWait: '30-60 days',
    };
  },
};

export const utilityAdapters: ServiceAdapter[] = [
  neaBillPayment,
  kuklBillPayment,
  neaNewConnection,
  kuklNewConnection,
];
