import { DOC_TYPE_META, type VaultDoc, type VaultDocType } from '@/lib/vault/types';
import type { Service } from './types';
import type { ServiceTaskDocStatus, ServiceTaskRecord, ServiceTaskStatus } from './task-types';
import { getWorkflowDefinition } from './workflow-definitions';

const DOC_KEYWORDS: Array<{ type: VaultDocType; patterns: RegExp[] }> = [
  { type: 'citizenship', patterns: [/citizenship/i, /नागरिकता/] },
  { type: 'passport', patterns: [/passport/i, /राहदानी/] },
  { type: 'drivers_license', patterns: [/license/i, /licence/i, /अनुमतिपत्र/, /लाइसेन्स/] },
  { type: 'national_id', patterns: [/national id/i, /परिचयपत्र/] },
  { type: 'pan', patterns: [/\bpan\b/i] },
  { type: 'voter_id', patterns: [/voter/i, /मतदाता/] },
  { type: 'bluebook', patterns: [/bluebook/i, /billbook/i, /बिलबुक/] },
  { type: 'insurance', patterns: [/insurance/i, /बीमा/] },
  { type: 'academic_certificate', patterns: [/academic/i, /certificate/i, /शैक्षिक प्रमाणपत्र/] },
  { type: 'birth_certificate', patterns: [/birth certificate/i, /जन्मदर्ता/] },
  { type: 'marriage_certificate', patterns: [/marriage/i, /विवाहदर्ता/] },
  { type: 'land_dhani_purja', patterns: [/dhani purja/i, /land/i, /धनी पुर्जा/] },
];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function inferRequiredDocTypes(service: Service): VaultDocType[] {
  const hits: VaultDocType[] = [];

  for (const doc of service.documents) {
    const haystack = [doc.title.en, doc.title.ne, doc.notes?.en, doc.notes?.ne].filter(Boolean).join(' ');
    for (const candidate of DOC_KEYWORDS) {
      if (candidate.patterns.some((pattern) => pattern.test(haystack))) {
        hits.push(candidate.type);
      }
    }
  }

  if (service.slug.includes('license')) hits.push('drivers_license');
  if (service.slug.includes('passport')) hits.push('passport');
  if (service.slug.includes('citizenship')) hits.push('citizenship');
  if (service.slug.includes('pan')) hits.push('pan');
  if (service.slug.includes('bluebook')) hits.push('bluebook');

  return unique(hits);
}

export function getDocStatus(service: Service, vaultDocs: VaultDoc[]): {
  missingDocs: ServiceTaskDocStatus[];
  readyDocs: ServiceTaskDocStatus[];
} {
  const required = inferRequiredDocTypes(service);
  const availableTypes = new Set(vaultDocs.map((doc) => doc.docType));

  const missingDocs: ServiceTaskDocStatus[] = [];
  const readyDocs: ServiceTaskDocStatus[] = [];

  for (const type of required) {
    const entry: ServiceTaskDocStatus = {
      docType: type,
      label: DOC_TYPE_META[type].title.en,
      haveIt: availableTypes.has(type),
    };
    if (entry.haveIt) readyDocs.push(entry);
    else missingDocs.push(entry);
  }

  return { missingDocs, readyDocs };
}

export function getTaskStatus(service: Service, vaultDocs: VaultDoc[]): {
  status: ServiceTaskStatus;
  progress: number;
  currentStep: number;
  totalSteps: number;
  nextAction: string;
  summary: string;
  missingDocs: ServiceTaskDocStatus[];
  readyDocs: ServiceTaskDocStatus[];
} {
  const totalSteps = Math.max(service.steps.length, 1);
  const { missingDocs, readyDocs } = getDocStatus(service, vaultDocs);
  const readyFraction = totalSteps <= 1 ? 0 : 1 / totalSteps;
  const workflow = getWorkflowDefinition(service);

  if (missingDocs.length > 0) {
    return {
      status: 'collecting_docs',
      progress: Math.max(10, Math.round(readyFraction * 100)),
      currentStep: 1,
      totalSteps,
      nextAction: `Add ${missingDocs[0].label} to your vault before starting.`,
      summary: `${workflow.statusHint}. Collect ${missingDocs.length} required document${missingDocs.length === 1 ? '' : 's'} and then continue.`,
      missingDocs,
      readyDocs,
    };
  }

  return {
    status: 'ready',
    progress: Math.max(35, Math.round((2 / (totalSteps + 1)) * 100)),
    currentStep: 1,
    totalSteps,
    nextAction: workflow.nextActionReady,
    summary: `Your documents are in place. ${workflow.statusHint} for ${service.title.en}.`,
    missingDocs,
    readyDocs,
  };
}

export function mapTaskRow(row: any): ServiceTaskRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    serviceSlug: row.service_slug,
    serviceTitle: row.service_title,
    serviceCategory: row.service_category,
    locale: row.locale,
    status: row.status,
    progress: row.progress,
    currentStep: row.current_step,
    totalSteps: row.total_steps,
    summary: row.summary || undefined,
    nextAction: row.next_action || undefined,
    missingDocs: row.missing_docs || [],
    readyDocs: row.ready_docs || [],
    notes: row.notes || undefined,
    workflowMode: row.workflow_mode || 'guide_only',
    requiresAppointment: !!row.requires_appointment,
    supportsOnlinePayment: !!row.supports_online_payment,
    officeVisitRequired: !!row.office_visit_required,
    milestones: row.milestones || [],
    actions: row.actions || [],
    actionState: row.action_state || {},
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
