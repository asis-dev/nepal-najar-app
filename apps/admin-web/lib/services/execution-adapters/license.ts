/**
 * License / transport execution adapters — driving license and DoTM services.
 */
import type {
  ServiceAdapter,
  ExecutionContext,
  ExecutionResult,
  AdapterCapabilities,
} from './index';

const LICENSE_CAPABILITIES: AdapterCapabilities = {
  canPrefill: true,
  canSubmitDigitally: false,
  canBookAppointment: false,
  canProcessPayment: false,
  canTrackStatus: true,
  canEscalate: false,
};

const LICENSE_PROFILE_KEYS = [
  'full_name_en',
  'full_name_ne',
  'father_name_en',
  'date_of_birth',
  'gender',
  'citizenship_no',
  'citizenship_issue_date',
  'citizenship_issue_district',
  'permanent_province',
  'permanent_district',
  'permanent_municipality',
  'permanent_ward',
  'mobile',
  'email',
  'blood_group',
];

function normalizeLicenseIntake(
  values: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v) out[k] = v;
  }
  return out;
}

function mapLicenseProfile(
  profile: Record<string, string | null>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of LICENSE_PROFILE_KEYS) {
    if (profile[k]) out[k] = profile[k]!;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Driver's License Renewal
// ---------------------------------------------------------------------------

const driversLicenseRenewal: ServiceAdapter = {
  slug: 'drivers-license-renewal',
  family: 'license',
  mode: 'assisted',
  capabilities: LICENSE_CAPABILITIES,

  normalizeIntake: normalizeLicenseIntake,
  mapProfileToForm: mapLicenseProfile,

  getRequiredDocuments() {
    return [
      { type: 'citizenship', label: 'Citizenship certificate (copy)', required: true },
      { type: 'old_license', label: 'Expired/old driving license', required: true },
      { type: 'medical_report', label: 'Medical fitness report', required: true },
      { type: 'photos', label: 'Passport-size photos (2 copies)', required: true },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'drivers-license-renewal',
      applicant: normalizeLicenseIntake(context.draftValues),
      documents: context.documents,
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const name = context.draftValues.full_name_en || 'Applicant';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Apply online at https://dotm.gov.np/ (Online Service Portal).`,
        `Fill the renewal application form and upload required documents.`,
        `Get a medical fitness report from a government hospital or authorized clinic.`,
        `Visit the nearest DoTM office with original documents on the scheduled date.`,
        `Fee: NPR 1,800 (motorcycle) / NPR 2,500 (car/jeep). Bring exact change or eSewa.`,
        `Processing: Smart card license printed and mailed within 30-45 days.`,
        `Application pre-filled for ${name}.`,
      ],
      estimatedWait: '30-45 days for smart card',
      trackingUrl: 'https://dotm.gov.np/license-status',
    };
  },
};

// ---------------------------------------------------------------------------
// New Driver's License
// ---------------------------------------------------------------------------

const newDriversLicense: ServiceAdapter = {
  slug: 'new-drivers-license',
  family: 'license',
  mode: 'assisted',
  capabilities: LICENSE_CAPABILITIES,

  normalizeIntake: normalizeLicenseIntake,
  mapProfileToForm: mapLicenseProfile,

  getRequiredDocuments() {
    return [
      { type: 'citizenship', label: 'Citizenship certificate (original + copy)', required: true },
      { type: 'medical_report', label: 'Medical fitness report', required: true },
      { type: 'photos', label: 'Passport-size photos (4 copies)', required: true },
      { type: 'blood_group_report', label: 'Blood group report', required: true },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'new-drivers-license',
      applicant: normalizeLicenseIntake(context.draftValues),
      documents: context.documents,
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const name = context.draftValues.full_name_en || 'Applicant';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Register online at https://dotm.gov.np/ and fill the application form.`,
        `Book a written exam date through the portal.`,
        `Get a medical fitness report and blood group report from a government hospital.`,
        `Pass the written exam (multiple choice, 60% required).`,
        `Pass the trial (practical driving) exam on the scheduled date.`,
        `Fee: NPR 500 (application) + NPR 1,800-2,500 (license fee by category).`,
        `Visit your designated DoTM office: Ekantakuna (Lalitpur), Chabahil, or regional.`,
        `Application pre-filled for ${name}.`,
      ],
      estimatedWait: '2-4 months (exam scheduling)',
      trackingUrl: 'https://dotm.gov.np/license-status',
    };
  },
};

// ---------------------------------------------------------------------------
// DoTM Trial Booking
// ---------------------------------------------------------------------------

const dotmTrialBooking: ServiceAdapter = {
  slug: 'dotm-trial-booking',
  family: 'license',
  mode: 'assisted',
  capabilities: {
    ...LICENSE_CAPABILITIES,
    canBookAppointment: false, // external portal
  },

  normalizeIntake: normalizeLicenseIntake,
  mapProfileToForm: mapLicenseProfile,

  getRequiredDocuments() {
    return [
      { type: 'citizenship', label: 'Citizenship certificate (copy)', required: true },
      { type: 'medical_report', label: 'Medical fitness report', required: true },
      { type: 'written_exam_pass', label: 'Written exam pass certificate', required: true },
      { type: 'photos', label: 'Passport-size photos (2 copies)', required: true },
    ];
  },

  generatePayload(context: ExecutionContext): Record<string, unknown> {
    return {
      service: 'dotm-trial-booking',
      applicant: normalizeLicenseIntake(context.draftValues),
      documents: context.documents,
    };
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const name = context.draftValues.full_name_en || 'Applicant';

    return {
      success: true,
      mode: 'assisted',
      nextSteps: [
        `Log in to your DoTM account at https://dotm.gov.np/.`,
        `Navigate to "Trial Booking" and select your vehicle category.`,
        `Choose an available trial date (typically 1-3 months out).`,
        `Arrive at the trial ground (Ekantakuna or designated center) by 7:00 AM on the scheduled date.`,
        `Bring original citizenship, medical report, and written exam pass certificate.`,
        `Trial fee is included in the initial application fee.`,
        `Application pre-filled for ${name}.`,
      ],
      estimatedWait: '1-3 months for trial date',
      trackingUrl: 'https://dotm.gov.np/license-status',
    };
  },
};

export const licenseAdapters: ServiceAdapter[] = [
  driversLicenseRenewal,
  newDriversLicense,
  dotmTrialBooking,
];
