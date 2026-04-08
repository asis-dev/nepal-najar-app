import type { Service } from './types';

export type WorkflowMode = 'guide_only' | 'appointment' | 'payment' | 'mixed';

export interface WorkflowAction {
  id: string;
  label: string;
  kind: 'official_site' | 'payment' | 'appointment' | 'call' | 'directions';
  href?: string;
  completionLabel?: string;
  placeholder?: string;
  statusOnComplete?: 'ready' | 'in_progress' | 'booked' | 'submitted' | 'completed';
  stepOnComplete?: number;
  progressOnComplete?: number;
  nextActionOnComplete?: string;
}

export interface WorkflowDefinition {
  mode: WorkflowMode;
  requiresAppointment?: boolean;
  supportsOnlinePayment?: boolean;
  officeVisitRequired?: boolean;
  statusHint: string;
  nextActionReady: string;
  milestones: string[];
  actions?: WorkflowAction[];
}

const WORKFLOW_OVERRIDES: Record<string, WorkflowDefinition> = {
  'drivers-license-renewal': {
    mode: 'mixed',
    requiresAppointment: true,
    supportsOnlinePayment: true,
    officeVisitRequired: true,
    statusHint: 'Appointment + payment + office visit workflow',
    nextActionReady: 'Book the DoTM appointment and pay the renewal fee.',
    milestones: [
      'Collect required documents',
      'Book appointment',
      'Pay renewal fee',
      'Visit office for biometrics',
      'Track card delivery',
    ],
    actions: [
      { id: 'open_dotm', label: 'Open DoTM site', kind: 'official_site', href: 'https://www.dotm.gov.np' },
      {
        id: 'appointment_booked',
        label: 'Book appointment',
        kind: 'appointment',
        href: 'https://www.dotm.gov.np',
        completionLabel: 'Mark appointment booked',
        placeholder: 'Appointment date / reference',
        statusOnComplete: 'booked',
        stepOnComplete: 2,
        progressOnComplete: 45,
        nextActionOnComplete: 'Pay the renewal fee and keep the receipt.',
      },
      {
        id: 'renewal_fee_paid',
        label: 'Pay renewal fee',
        kind: 'payment',
        completionLabel: 'Mark fee paid',
        placeholder: 'Payment receipt / wallet reference',
        statusOnComplete: 'in_progress',
        stepOnComplete: 3,
        progressOnComplete: 65,
        nextActionOnComplete: 'Visit the transport office for biometrics on your appointment day.',
      },
      {
        id: 'office_visit_done',
        label: 'Complete office visit',
        kind: 'directions',
        completionLabel: 'Mark office visit done',
        placeholder: 'Office visited / visit note',
        statusOnComplete: 'submitted',
        stepOnComplete: 4,
        progressOnComplete: 85,
        nextActionOnComplete: 'Wait for smart card delivery / pickup update.',
      },
    ],
  },
  'new-passport': {
    mode: 'mixed',
    requiresAppointment: false,
    supportsOnlinePayment: true,
    officeVisitRequired: true,
    statusHint: 'Application + payment + biometric visit workflow',
    nextActionReady: 'Complete the online passport form and pay the voucher.',
    milestones: [
      'Collect required documents',
      'Fill online form',
      'Pay voucher',
      'Visit office for biometrics',
      'Collect passport',
    ],
    actions: [
      { id: 'passport_portal', label: 'Open passport portal', kind: 'official_site', href: 'https://nepalpassport.gov.np' },
    ],
  },
  'citizenship-by-descent': {
    mode: 'guide_only',
    supportsOnlinePayment: false,
    officeVisitRequired: true,
    statusHint: 'Document-heavy in-person government workflow',
    nextActionReady: 'Get the ward recommendation letter and prepare your originals.',
    milestones: [
      'Get ward recommendation',
      'Prepare all originals and copies',
      'Visit DAO',
      'Review issued certificate',
    ],
    actions: [
      { id: 'moha_info', label: 'Open MoHA info', kind: 'official_site', href: 'https://www.moha.gov.np' },
    ],
  },
  'pan-individual': {
    mode: 'mixed',
    supportsOnlinePayment: false,
    officeVisitRequired: true,
    statusHint: 'Online registration with in-person issuance',
    nextActionReady: 'Register on the IRD portal and print the submission form.',
    milestones: [
      'Prepare documents',
      'Register online',
      'Visit IRD office',
      'Receive PAN card',
    ],
    actions: [
      { id: 'ird_portal', label: 'Open IRD portal', kind: 'official_site', href: 'https://taxpayerportal.ird.gov.np' },
    ],
  },
  'nea-electricity-bill': {
    mode: 'payment',
    supportsOnlinePayment: true,
    officeVisitRequired: false,
    statusHint: 'Fast payment workflow',
    nextActionReady: 'Open your preferred wallet app and enter the SC number.',
    milestones: [
      'Find customer ID',
      'Open payment app',
      'Pay bill',
      'Save receipt',
    ],
    actions: [
      { id: 'open_nea', label: 'Open NEA site', kind: 'official_site', href: 'https://www.nea.org.np' },
      { id: 'pay_esewa', label: 'Pay with eSewa', kind: 'payment', href: 'https://esewa.com.np' },
      { id: 'pay_khalti', label: 'Pay with Khalti', kind: 'payment', href: 'https://khalti.com' },
      {
        id: 'nea_bill_paid',
        label: 'Confirm NEA bill payment',
        kind: 'payment',
        completionLabel: 'Mark bill paid',
        placeholder: 'Receipt / transaction reference',
        statusOnComplete: 'completed',
        stepOnComplete: 4,
        progressOnComplete: 100,
        nextActionOnComplete: 'Payment recorded. Save the receipt in case NEA asks for proof.',
      },
    ],
  },
  'kukl-water-bill': {
    mode: 'payment',
    supportsOnlinePayment: true,
    officeVisitRequired: false,
    statusHint: 'Fast payment workflow',
    nextActionReady: 'Open your payment app and enter the KUKL customer ID.',
    milestones: [
      'Find customer ID',
      'Open payment app',
      'Pay bill',
      'Save receipt',
    ],
    actions: [
      { id: 'open_kukl', label: 'Open KUKL site', kind: 'official_site', href: 'https://kathmanduwater.org' },
      { id: 'pay_esewa', label: 'Pay with eSewa', kind: 'payment', href: 'https://esewa.com.np' },
      { id: 'pay_khalti', label: 'Pay with Khalti', kind: 'payment', href: 'https://khalti.com' },
    ],
  },
};

export function getWorkflowDefinition(service: Service): WorkflowDefinition {
  return (
    WORKFLOW_OVERRIDES[service.slug] || {
      mode: 'guide_only',
      supportsOnlinePayment: false,
      officeVisitRequired: service.offices.length > 0,
      statusHint: 'Guided service workflow',
      nextActionReady: service.steps[0]?.title.en || `Start ${service.title.en}.`,
      milestones: service.steps.map((step) => step.title.en),
    }
  );
}
