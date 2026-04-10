import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceBySlug } from './catalog';
import { getTaskStatus } from './task-engine';
import { getWorkflowDefinition } from './workflow-definitions';
import { resolveServiceRouting } from './service-routing';
import { buildOpsDeadlines, getServiceWorkflowPolicy } from '@/lib/service-ops/queue';
import {
  insertServiceTaskWithCompatibility,
  insertTaskEventBestEffort,
  updateServiceTaskWithCompatibility,
} from './task-store';
import type { VaultDoc } from '@/lib/vault/types';

type ApplicationRow = {
  id: string;
  owner_id: string;
  service_slug: string;
  service_title: string;
  service_category?: string | null;
  reference_no?: string | null;
  office_name?: string | null;
  portal_url?: string | null;
  amount_npr?: number | null;
  paid?: boolean | null;
  paid_on?: string | null;
  receipt_no?: string | null;
  submitted_on?: string | null;
  expected_on?: string | null;
  completed_on?: string | null;
  status: string;
  last_status_note?: string | null;
  reminder_on?: string | null;
  notes?: string | null;
};

async function listOwnerVaultDocs(supabase: SupabaseClient, ownerId: string): Promise<VaultDoc[]> {
  const { data } = await supabase
    .from('vault_documents')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  return (data || []).map((row: any) => ({
    id: row.id,
    ownerId: row.owner_id,
    docType: row.doc_type,
    title: row.title,
    number: row.number || undefined,
    issuedOn: row.issued_on || undefined,
    expiresOn: row.expires_on || undefined,
    storagePath: row.storage_path || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size || undefined,
    mimeType: row.mime_type || undefined,
    notes: row.notes || undefined,
    tags: row.tags || [],
    linkedServiceSlugs: row.linked_service_slugs || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function mapApplicationStatus(status: string) {
  switch (status) {
    case 'completed':
      return { taskStatus: 'completed', progress: 100 };
    case 'submitted':
    case 'ready_pickup':
      return { taskStatus: 'submitted', progress: 85 };
    case 'pending_visit':
      return { taskStatus: 'booked', progress: 70 };
    case 'pending_payment':
      return { taskStatus: 'ready', progress: 55 };
    case 'rejected':
    case 'cancelled':
      return { taskStatus: 'blocked', progress: 100 };
    case 'in_progress':
      return { taskStatus: 'in_progress', progress: 60 };
    case 'started':
    default:
      return { taskStatus: 'intake', progress: 20 };
  }
}

function buildApplicationSummary(app: ApplicationRow, derivedSummary: string) {
  const bits = [
    app.reference_no ? `Reference ${app.reference_no}` : null,
    app.office_name ? `Office: ${app.office_name}` : null,
    app.last_status_note || null,
  ].filter(Boolean);
  return bits.length > 0 ? `${derivedSummary} ${bits.join(' · ')}` : derivedSummary;
}

function buildApplicationNotes(app: ApplicationRow) {
  return [
    app.notes || null,
    app.portal_url ? `Portal: ${app.portal_url}` : null,
    app.amount_npr ? `Amount NPR ${app.amount_npr}` : null,
    app.paid ? `Paid${app.receipt_no ? ` · Receipt ${app.receipt_no}` : ''}` : null,
    app.expected_on ? `Expected: ${app.expected_on}` : null,
    app.reminder_on ? `Reminder: ${app.reminder_on}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildSyncSignature(app: ApplicationRow) {
  return JSON.stringify({
    status: app.status,
    reference_no: app.reference_no || null,
    office_name: app.office_name || null,
    portal_url: app.portal_url || null,
    amount_npr: app.amount_npr ?? null,
    paid: app.paid ?? false,
    paid_on: app.paid_on || null,
    receipt_no: app.receipt_no || null,
    submitted_on: app.submitted_on || null,
    expected_on: app.expected_on || null,
    completed_on: app.completed_on || null,
    reminder_on: app.reminder_on || null,
    notes: app.notes || null,
    last_status_note: app.last_status_note || null,
  });
}

async function findExistingSyncedTask(
  supabase: SupabaseClient,
  ownerId: string,
  serviceSlug: string,
  applicationId: string,
) {
  const { data, error } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('service_slug', serviceSlug)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[application-task-bridge] lookup failed:', error.message);
    return null;
  }

  return (data || []).find((task: any) => task.answers?.application_id === applicationId) || null;
}

export async function syncApplicationToServiceTaskBestEffort(
  supabase: SupabaseClient,
  app: ApplicationRow,
) {
  const service = await getServiceBySlug(app.service_slug);
  if (!service) return null;

  const vaultDocs = await listOwnerVaultDocs(supabase, app.owner_id);
  const derived = getTaskStatus(service, vaultDocs);
  const workflow = getWorkflowDefinition(service);
  const routing = resolveServiceRouting(service);
  const policy = await getServiceWorkflowPolicy(routing.departmentKey, service.slug);
  const deadlines = buildOpsDeadlines(policy || {});
  const mapped = mapApplicationStatus(app.status);
  const syncSignature = buildSyncSignature(app);
  const existing = await findExistingSyncedTask(supabase, app.owner_id, service.slug, app.id);

  const answers = {
    synced_from_application: true,
    application_id: app.id,
    application_sync_signature: syncSignature,
    reference_no: app.reference_no || null,
    portal_url: app.portal_url || null,
    office_name: app.office_name || null,
    paid: app.paid || false,
    receipt_no: app.receipt_no || null,
    reminder_on: app.reminder_on || null,
  };

  const payload = {
    owner_id: app.owner_id,
    service_slug: service.slug,
    service_title: service.title.en,
    service_category: service.category,
    locale: 'en',
    status: mapped.taskStatus,
    progress: Math.max(derived.progress, mapped.progress),
    current_step: mapped.taskStatus === 'completed' ? Math.max(service.steps.length, 1) : 1,
    total_steps: Math.max(service.steps.length, 1),
    summary: buildApplicationSummary(app, derived.summary),
    next_action:
      app.portal_url
        ? 'Review the tracked application and continue through the linked portal if needed.'
        : derived.nextAction,
    workflow_mode: workflow.mode,
    requires_appointment: workflow.requiresAppointment ?? false,
    supports_online_payment: workflow.supportsOnlinePayment ?? false,
    office_visit_required: workflow.officeVisitRequired ?? false,
    milestones: workflow.milestones,
    actions: workflow.actions || [],
    notes: buildApplicationNotes(app),
    assigned_department_key: routing.departmentKey,
    assigned_department_name: routing.departmentName,
    assigned_office_name: app.office_name || routing.officeName,
    assigned_authority_level: routing.authorityLevel,
    assigned_role_title: routing.roleTitle,
    routing_reason: routing.routingReason,
    routing_confidence: routing.confidence,
    queue_state: policy?.queue_entry_state || 'new',
    first_response_due_at: existing?.first_response_due_at || deadlines.firstResponseDueAt,
    resolution_due_at: existing?.resolution_due_at || deadlines.resolutionDueAt,
    escalation_level: existing?.escalation_level || 0,
    missing_docs: derived.missingDocs,
    ready_docs: derived.readyDocs,
    answers,
    completed_at: mapped.taskStatus === 'completed' ? (app.completed_on || new Date().toISOString()) : null,
  };
  if (existing) {
    const { data, error } = await updateServiceTaskWithCompatibility(supabase, existing.id, payload);
    if (error) {
      console.warn('[application-task-bridge] update failed:', error.message);
      return null;
    }

    if (existing.answers?.application_sync_signature !== syncSignature) {
      await insertTaskEventBestEffort(supabase, {
        task_id: existing.id,
        owner_id: app.owner_id,
        event_type: 'application_synced',
        note: `Synced from tracked application ${app.service_title}`,
        meta: { application_id: app.id, application_status: app.status, reference_no: app.reference_no || null },
      });
    }
    return data;
  }

  const { data, error } = await insertServiceTaskWithCompatibility(supabase, payload);
  if (error) {
    console.warn('[application-task-bridge] insert failed:', error.message);
    return null;
  }

  await insertTaskEventBestEffort(supabase, {
    task_id: data.id,
    owner_id: app.owner_id,
    event_type: 'task_started',
    note: `Created from tracked application ${app.service_title}`,
    meta: { application_id: app.id, application_status: app.status, reference_no: app.reference_no || null },
  });

  return data;
}
