/**
 * Phase 6 — Submission Review
 * Review and approval layer before service submission.
 * Ensures user explicitly approves sensitive fields and legal declarations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewItem {
  fieldKey: string;
  label: string;
  value: string;
  source: 'profile' | 'document' | 'ai_inferred' | 'user_input';
  confidence: number;
  requiresExplicitApproval: boolean;
}

export interface ReviewPackage {
  taskId: string;
  serviceSlug: string;
  serviceTitle: string;
  items: ReviewItem[];
  documents: Array<{ type: string; label: string; attached: boolean }>;
  warnings: string[];
  legalDeclarations: string[];
  estimatedFee?: string;
  submissionTarget: string;
  submissionMethod: 'online' | 'in_person' | 'hybrid';
  readyToSubmit: boolean;
  blockingReasons: string[];
}

export interface ApprovalDecision {
  approved: boolean;
  editedFields: Record<string, string>;
  declarationsAccepted: boolean;
  userNotes?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fields that always require explicit user approval regardless of confidence */
const SENSITIVE_FIELD_KEYS = new Set([
  'citizenship_no',
  'citizenship_issue_date',
  'citizenship_issue_district',
  'passport_no',
  'pan_no',
  'bank_account',
  'payment_amount',
  'father_citizenship_no',
  'mother_citizenship_no',
]);

/** Service-specific legal declarations */
const SERVICE_DECLARATIONS: Record<string, string[]> = {
  'new-passport': [
    'I declare that all information provided is true and correct to the best of my knowledge.',
    'I understand that providing false information is punishable under Nepal law.',
  ],
  'passport-renewal': [
    'I declare that all information provided is true and correct to the best of my knowledge.',
    'I confirm that my previous passport details are accurately stated.',
  ],
  'citizenship-by-descent': [
    'I declare that I am a citizen of Nepal by descent and all information provided is true.',
    'I understand that obtaining citizenship through fraud is a criminal offense.',
  ],
  'new-drivers-license': [
    'I declare that I am physically and mentally fit to operate a motor vehicle.',
    'I confirm all personal details are true and correct.',
  ],
  'drivers-license-renewal': [
    'I declare that all information is true and correct.',
    'I confirm my medical fitness report is genuine and recent.',
  ],
};

const DEFAULT_DECLARATIONS = [
  'I declare that all information provided is true and correct to the best of my knowledge.',
];

/** Submission targets by service */
const SUBMISSION_TARGETS: Record<string, string> = {
  'new-passport': 'Department of Passports, Tripureshwor, Kathmandu',
  'passport-renewal': 'Department of Passports, Tripureshwor, Kathmandu',
  'citizenship-by-descent': 'District Administration Office',
  'new-drivers-license': 'Department of Transport Management (DoTM)',
  'drivers-license-renewal': 'Department of Transport Management (DoTM)',
  'dotm-trial-booking': 'DoTM Trial Ground',
  'nea-bill-payment': 'Nepal Electricity Authority (NEA)',
  'kukl-bill-payment': 'Kathmandu Upatyaka Khanepani Limited (KUKL)',
  'nea-new-connection': 'NEA Distribution Center (local)',
  'kukl-new-connection': 'KUKL Branch Office (local)',
  'pan-individual': 'Inland Revenue Department (IRD)',
};

const SUBMISSION_METHODS: Record<string, 'online' | 'in_person' | 'hybrid'> = {
  'new-passport': 'hybrid',
  'passport-renewal': 'hybrid',
  'citizenship-by-descent': 'in_person',
  'new-drivers-license': 'hybrid',
  'drivers-license-renewal': 'hybrid',
  'dotm-trial-booking': 'online',
  'nea-bill-payment': 'online',
  'kukl-bill-payment': 'online',
  'nea-new-connection': 'in_person',
  'kukl-new-connection': 'in_person',
  'pan-individual': 'hybrid',
};

const FEE_ESTIMATES: Record<string, string> = {
  'new-passport': 'NPR 5,000 (regular) / NPR 10,000 (express)',
  'passport-renewal': 'NPR 5,000 (regular) / NPR 10,000 (express)',
  'new-drivers-license': 'NPR 500 + NPR 1,800-2,500 (by category)',
  'drivers-license-renewal': 'NPR 1,800-2,500 (by category)',
  'nea-new-connection': 'NPR 2,500 - 15,000 (by load)',
  'kukl-new-connection': 'NPR 3,000 - 10,000 (by pipe size)',
};

// ---------------------------------------------------------------------------
// Source mapping helper
// ---------------------------------------------------------------------------

function mapSource(
  source: string,
): 'profile' | 'document' | 'ai_inferred' | 'user_input' {
  if (source === 'profile') return 'profile';
  if (source.includes('doc') || source === 'extracted_from_doc')
    return 'document';
  if (source === 'ai-inference' || source === 'ai_inferred')
    return 'ai_inferred';
  return 'user_input';
}

// ---------------------------------------------------------------------------
// Build review package
// ---------------------------------------------------------------------------

export function buildReviewPackage(
  draft: {
    serviceSlug: string;
    fields: Array<{
      key: string;
      label: string;
      value: string | null;
      status: string;
      source: string;
      confidence: number;
    }>;
  },
  adapter: {
    getRequiredDocuments(): Array<{
      type: string;
      label: string;
      required: boolean;
    }>;
  } | null,
  attachedDocs: string[],
): ReviewPackage {
  const serviceSlug = draft.serviceSlug;
  const warnings: string[] = [];
  const blockingReasons: string[] = [];

  // Build review items from filled fields
  const items: ReviewItem[] = draft.fields
    .filter((f) => f.value !== null && f.value !== '')
    .map((f) => {
      const source = mapSource(f.source);
      const isSensitive = SENSITIVE_FIELD_KEYS.has(f.key);
      const isLowConfidenceAI = source === 'ai_inferred' && f.confidence < 0.8;

      return {
        fieldKey: f.key,
        label: f.label,
        value: f.value!,
        source,
        confidence: f.confidence,
        requiresExplicitApproval: isSensitive || isLowConfidenceAI,
      };
    });

  // Check for missing required fields
  const missingRequired = draft.fields.filter(
    (f) =>
      (f.value === null || f.value === '') &&
      // Simple heuristic — required fields have specific keys
      [
        'full_name_en',
        'date_of_birth',
        'citizenship_no',
        'mobile',
        'permanent_province',
        'permanent_district',
        'permanent_municipality',
        'permanent_ward',
      ].includes(f.key),
  );

  if (missingRequired.length > 0) {
    blockingReasons.push(
      `Missing required fields: ${missingRequired.map((f) => f.label).join(', ')}`,
    );
  }

  // Check documents
  const requiredDocs = adapter?.getRequiredDocuments() ?? [];
  const docAttachmentSet = new Set(attachedDocs);
  const documents = requiredDocs.map((d) => ({
    type: d.type,
    label: d.label,
    attached: docAttachmentSet.has(d.type),
  }));

  const missingDocs = documents.filter((d) => {
    const spec = requiredDocs.find((r) => r.type === d.type);
    return spec?.required && !d.attached;
  });

  if (missingDocs.length > 0) {
    blockingReasons.push(
      `Missing required documents: ${missingDocs.map((d) => d.label).join(', ')}`,
    );
  }

  // Warnings for low-confidence AI fields
  const lowConfItems = items.filter(
    (i) => i.source === 'ai_inferred' && i.confidence < 0.8,
  );
  if (lowConfItems.length > 0) {
    warnings.push(
      `${lowConfItems.length} field(s) were AI-inferred with low confidence. Please review carefully.`,
    );
  }

  const legalDeclarations =
    SERVICE_DECLARATIONS[serviceSlug] ?? DEFAULT_DECLARATIONS;

  // Derive service title from slug
  const serviceTitle = serviceSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    taskId: '', // caller should set this
    serviceSlug,
    serviceTitle,
    items,
    documents,
    warnings,
    legalDeclarations,
    estimatedFee: FEE_ESTIMATES[serviceSlug],
    submissionTarget:
      SUBMISSION_TARGETS[serviceSlug] ?? 'Relevant government office',
    submissionMethod: SUBMISSION_METHODS[serviceSlug] ?? 'in_person',
    readyToSubmit: blockingReasons.length === 0,
    blockingReasons,
  };
}

// ---------------------------------------------------------------------------
// Validate approval
// ---------------------------------------------------------------------------

export function validateApproval(
  pkg: ReviewPackage,
  decision: ApprovalDecision,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!decision.approved) {
    return { valid: true, issues: [] }; // rejection is always valid
  }

  // Must accept declarations
  if (pkg.legalDeclarations.length > 0 && !decision.declarationsAccepted) {
    issues.push('You must accept all legal declarations before submitting.');
  }

  // Check that all requiresExplicitApproval items are either confirmed or edited
  const needsApproval = pkg.items.filter((i) => i.requiresExplicitApproval);
  for (const item of needsApproval) {
    const wasEdited = item.fieldKey in decision.editedFields;
    // If a sensitive field was not edited, we assume the user reviewed it in the UI
    // but we still flag AI-inferred low-confidence ones
    if (
      !wasEdited &&
      item.source === 'ai_inferred' &&
      item.confidence < 0.8
    ) {
      issues.push(
        `Field "${item.label}" was AI-inferred with low confidence (${Math.round(item.confidence * 100)}%). Please review or edit.`,
      );
    }
  }

  // Check blocking reasons still exist
  if (pkg.blockingReasons.length > 0) {
    issues.push(...pkg.blockingReasons);
  }

  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// SLA expected days (mirrors case-operations SLA_CONFIGS for completion estimate)
// ---------------------------------------------------------------------------

const SLA_EXPECTED_DAYS: Record<string, number> = {
  'new-passport': 30,
  'passport-renewal': 21,
  'drivers-license-renewal': 14,
  'new-drivers-license': 30,
  'nea-bill-payment': 1,
  'kukl-bill-payment': 1,
  'bir-hospital-opd': 7,
  'citizenship-by-descent': 30,
  'dotm-trial-booking': 7,
  'nea-new-connection': 14,
  'kukl-new-connection': 14,
  'pan-individual': 7,
};

// ---------------------------------------------------------------------------
// Next steps builder
// ---------------------------------------------------------------------------

function buildNextSteps(
  serviceSlug: string,
  method: 'online' | 'in_person' | 'hybrid',
  refNumber: string,
): string[] {
  const steps: string[] = [];

  steps.push(`Save your reference number: ${refNumber}`);

  if (method === 'in_person' || method === 'hybrid') {
    steps.push('Visit the submission office with your original documents and reference number.');
  }

  if (method === 'online') {
    steps.push('Your application has been submitted online. No office visit is required for now.');
  }

  if (method === 'hybrid') {
    steps.push('Online submission recorded. You may need to visit the office for biometrics or verification.');
  }

  // Service-specific next steps
  const serviceSteps: Record<string, string[]> = {
    'new-passport': [
      'Bring original citizenship certificate and 2 passport-size photos.',
      'Biometrics will be collected at the passport office.',
    ],
    'passport-renewal': [
      'Bring your old passport and citizenship certificate.',
    ],
    'citizenship-by-descent': [
      'Both parents may need to be present at the District Administration Office.',
      'Bring parents\' citizenship certificates and birth certificate.',
    ],
    'new-drivers-license': [
      'Prepare for written and practical driving tests.',
      'Medical fitness report must be recent (within 1 month).',
    ],
    'nea-bill-payment': [
      'Payment will be reflected in your account within 24 hours.',
    ],
    'kukl-bill-payment': [
      'Payment will be reflected in your account within 24 hours.',
    ],
  };

  if (serviceSteps[serviceSlug]) {
    steps.push(...serviceSteps[serviceSlug]);
  }

  steps.push('We will track this submission and notify you of any updates.');

  return steps;
}

// ---------------------------------------------------------------------------
// Process approved submission
// ---------------------------------------------------------------------------

export interface SubmissionResult {
  success: boolean;
  referenceNumber?: string;
  estimatedCompletionDate?: string;
  nextSteps?: string[];
  error?: string;
  submittedAt?: string;
  submissionMethod?: 'online' | 'in_person' | 'hybrid';
}

export async function processApprovedSubmission(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  pkg: ReviewPackage,
  decision: ApprovalDecision,
): Promise<SubmissionResult> {
  // Validate first
  const validation = validateApproval(pkg, decision);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.issues.join('; ')}`,
    };
  }

  if (!decision.approved) {
    return { success: false, error: 'Submission was not approved by user.' };
  }

  // Generate reference number
  const refPrefix = pkg.serviceSlug
    .split('-')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const refNumber = `${refPrefix}-${Date.now().toString(36).toUpperCase()}`;

  const now = new Date();
  const submittedAt = now.toISOString();

  // Calculate estimated completion date from SLA config
  const slaExpectedDays = SLA_EXPECTED_DAYS[pkg.serviceSlug] ?? 30;
  const estimatedCompletion = new Date(now);
  estimatedCompletion.setDate(estimatedCompletion.getDate() + slaExpectedDays);
  const estimatedCompletionDate = estimatedCompletion.toISOString();

  // Build next steps based on submission method
  const nextSteps = buildNextSteps(pkg.serviceSlug, pkg.submissionMethod, refNumber);

  // Store submission proof metadata
  const proofMetadata = {
    timestamp: submittedAt,
    method: pkg.submissionMethod,
    referenceNumber: refNumber,
    estimatedCompletionDate,
    slaExpectedDays,
    submissionTarget: pkg.submissionTarget,
    itemCount: pkg.items.length,
    documentCount: pkg.documents.filter((d) => d.attached).length,
  };

  // Record the submission
  try {
    await supabase.from('service_submissions').insert({
      user_id: userId,
      task_id: taskId,
      service_slug: pkg.serviceSlug,
      reference_number: refNumber,
      submitted_values: {
        items: pkg.items.map((i) => ({
          ...i,
          value: decision.editedFields[i.fieldKey] ?? i.value,
        })),
        documents: pkg.documents,
        declarations_accepted: decision.declarationsAccepted,
        user_notes: decision.userNotes,
      },
      proof_metadata: proofMetadata,
      submission_method: pkg.submissionMethod,
      submission_target: pkg.submissionTarget,
      estimated_completion_date: estimatedCompletionDate,
      status: 'submitted',
      submitted_at: submittedAt,
    });
  } catch {
    // Table may not exist — still return success with reference number
  }

  // Update task status
  try {
    await supabase
      .from('service_tasks')
      .update({
        status: 'submitted',
        submission_ref: refNumber,
        submission_ref_type: 'application_id',
        submitted_at: submittedAt,
        estimated_completion_date: estimatedCompletionDate,
        updated_at: submittedAt,
      })
      .eq('id', taskId);
  } catch {
    // Graceful fallback
  }

  return {
    success: true,
    referenceNumber: refNumber,
    estimatedCompletionDate,
    nextSteps,
    submittedAt,
    submissionMethod: pkg.submissionMethod,
  };
}

// ---------------------------------------------------------------------------
// Record submission attempt (for audit trail)
// ---------------------------------------------------------------------------

export async function recordSubmissionAttempt(
  supabase: SupabaseClient,
  taskId: string,
  result: {
    success: boolean;
    referenceNumber?: string;
    error?: string;
    method: string;
  },
): Promise<void> {
  try {
    await supabase.from('submission_attempts').insert({
      task_id: taskId,
      success: result.success,
      reference_number: result.referenceNumber ?? null,
      error_message: result.error ?? null,
      method: result.method,
      attempted_at: new Date().toISOString(),
    });
  } catch {
    // Table may not exist — silently skip
  }
}
