/**
 * Health execution adapters — hospital OPD bookings.
 */
import type {
  ServiceAdapter,
  ExecutionContext,
  ExecutionResult,
  ExecutionStep,
  AdapterCapabilities,
} from './index';

// ---------------------------------------------------------------------------
// Shared capabilities and helpers
// ---------------------------------------------------------------------------

const HEALTH_CAPABILITIES: AdapterCapabilities = {
  canPrefill: true,
  canSubmitDigitally: false,
  canBookAppointment: false, // external system
  canTrackStatus: false,
  canEscalate: false,
  canProcessPayment: false,
};

const HEALTH_DOCUMENTS = [
  { type: 'citizenship', label: 'Citizenship copy', required: true },
  { type: 'insurance_card', label: 'Health insurance card', required: false },
  {
    type: 'medical_records',
    label: 'Previous medical records',
    required: false,
  },
];

function normalizeHealthIntake(
  values: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const map: Record<string, string> = {
    full_name_en: 'patient_name',
    date_of_birth: 'dob',
    gender: 'gender',
    mobile: 'contact_phone',
    email: 'contact_email',
    citizenship_no: 'id_number',
    emergency_contact_name: 'emergency_name',
    emergency_contact_phone: 'emergency_phone',
  };
  for (const [src, dst] of Object.entries(map)) {
    if (values[src]) out[dst] = values[src];
  }
  // Pass through anything already normalized
  for (const [k, v] of Object.entries(values)) {
    if (!(k in map)) out[k] = v;
  }
  return out;
}

function mapHealthProfile(
  profile: Record<string, string | null>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const keys = [
    'full_name_en',
    'date_of_birth',
    'gender',
    'mobile',
    'email',
    'citizenship_no',
    'emergency_contact_name',
    'emergency_contact_phone',
  ];
  for (const k of keys) {
    if (profile[k]) out[k] = profile[k]!;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-hospital info
// ---------------------------------------------------------------------------

interface HospitalInfo {
  slug: string;
  name: string;
  phone: string;
  opdHours: string;
  location: string;
  notes: string;
}

const HOSPITALS: HospitalInfo[] = [
  {
    slug: 'bir-hospital-opd',
    name: 'Bir Hospital',
    phone: '01-4221119',
    opdHours: 'Sun-Fri 10:00-14:00',
    location: 'Mahaboudha, Kathmandu',
    notes: 'Bring citizenship copy and NPR 10 registration fee.',
  },
  {
    slug: 'tuth-opd',
    name: 'Tribhuvan University Teaching Hospital (TUTH)',
    phone: '01-4412303',
    opdHours: 'Sun-Fri 09:00-13:00',
    location: 'Maharajgunj, Kathmandu',
    notes: 'Token system — arrive early. OPD ticket counter opens at 08:00.',
  },
  {
    slug: 'patan-hospital-opd',
    name: 'Patan Hospital',
    phone: '01-5522295',
    opdHours: 'Sun-Fri 09:00-13:00',
    location: 'Lagankhel, Lalitpur',
    notes: 'Online appointment available at patanhospital.gov.np.',
  },
  {
    slug: 'kanti-hospital-opd',
    name: 'Kanti Children\'s Hospital',
    phone: '01-4411550',
    opdHours: 'Sun-Fri 10:00-14:00',
    location: 'Maharajgunj, Kathmandu',
    notes: 'Pediatric patients only (under 14). Bring child\'s birth certificate.',
  },
  {
    slug: 'maternity-hospital-opd',
    name: 'Paropakar Maternity & Women\'s Hospital',
    phone: '01-4253045',
    opdHours: 'Sun-Fri 10:00-14:00',
    location: 'Thapathali, Kathmandu',
    notes: 'Gynecology/obstetrics OPD. Bring ANC card if applicable.',
  },
  {
    slug: 'civil-service-hospital-opd',
    name: 'Civil Service Hospital',
    phone: '01-4107000',
    opdHours: 'Sun-Fri 09:00-15:00',
    location: 'Minbhawan, Kathmandu',
    notes: 'Priority for government employees. Bring employee ID.',
  },
];

// ---------------------------------------------------------------------------
// Build adapters
// ---------------------------------------------------------------------------

function buildHealthAdapter(info: HospitalInfo): ServiceAdapter {
  return {
    slug: info.slug,
    family: 'health',
    mode: 'assisted',
    executionLevel: 'assisted',
    capabilities: HEALTH_CAPABILITIES,

    normalizeIntake: normalizeHealthIntake,
    mapProfileToForm: mapHealthProfile,
    getRequiredDocuments: () => [...HEALTH_DOCUMENTS],

    canExecute() {
      // Some hospitals (e.g. Patan) offer online booking
      return info.notes.toLowerCase().includes('online');
    },

    getExecutionSteps(): ExecutionStep[] {
      const steps: ExecutionStep[] = [
        { order: 1, action: 'prepare_documents', description: 'Bring citizenship copy, insurance card (if any), and previous medical records', requiresUser: true, automatable: false },
        { order: 2, action: 'pre_fill_form', description: `Pre-fill OPD registration form for ${info.name}`, requiresUser: false, automatable: true },
      ];
      if (info.notes.toLowerCase().includes('online')) {
        steps.push({ order: 3, action: 'book_online', description: `Book appointment online at ${info.name}'s portal`, requiresUser: true, automatable: true });
      }
      steps.push(
        { order: steps.length + 1, action: 'visit_hospital', description: `Visit ${info.name} OPD at ${info.location} during ${info.opdHours}`, requiresUser: true, automatable: false },
        { order: steps.length + 2, action: 'register_opd', description: `Register at OPD counter and pay registration fee`, requiresUser: true, automatable: false },
        { order: steps.length + 3, action: 'see_doctor', description: 'Wait for your token number and see the doctor', requiresUser: true, automatable: false },
      );
      return steps;
    },

    generatePayload(context: ExecutionContext): Record<string, unknown> {
      return {
        hospital: info.slug,
        patient: normalizeHealthIntake(context.draftValues),
        documents: context.documents,
      };
    },

    async execute(context: ExecutionContext): Promise<ExecutionResult> {
      const patientName =
        context.draftValues.full_name_en ||
        context.draftValues.patient_name ||
        'Patient';

      return {
        success: true,
        mode: 'assisted',
        nextSteps: [
          `Visit ${info.name} OPD at ${info.location}.`,
          `OPD hours: ${info.opdHours}.`,
          `Call ${info.phone} for inquiries.`,
          `Bring your citizenship copy and registration fee.`,
          info.notes,
          `Your form has been pre-filled for ${patientName}. Print it or show on mobile at the counter.`,
        ],
        estimatedWait: '1-3 hours (walk-in OPD)',
      };
    },
  };
}

export const healthAdapters: ServiceAdapter[] = HOSPITALS.map(buildHealthAdapter);
