import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServiceBySlug } from '@/lib/services/catalog';
import { getTaskStatus, mapTaskRow } from '@/lib/services/task-engine';
import type { ServiceTaskStatus } from '@/lib/services/task-types';
import type { VaultDoc } from '@/lib/vault/types';
import { getWorkflowDefinition } from '@/lib/services/workflow-definitions';

const MUTABLE_STATUSES: ServiceTaskStatus[] = [
  'intake',
  'collecting_docs',
  'ready',
  'in_progress',
  'booked',
  'submitted',
  'completed',
  'blocked',
];

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function listVaultDocs(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<VaultDoc[]> {
  const { data } = await supabase.from('vault_documents').select('*').order('created_at', { ascending: false });
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

async function getTargetMember(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  targetMemberId: string | undefined,
) {
  if (!targetMemberId) return null;
  const { data } = await supabase
    .from('household_members')
    .select('*')
    .eq('id', targetMemberId)
    .is('archived_at', null)
    .maybeSingle();
  return data || null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await getAuthedContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: existing, error: loadError } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const service = await getServiceBySlug(existing.service_slug);
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const vaultDocs = await listVaultDocs(supabase);
  const derived = getTaskStatus(service, vaultDocs);
  const workflow = getWorkflowDefinition(service);
  const requestedTargetMemberId =
    typeof body.targetMemberId === 'string' && body.targetMemberId.trim()
      ? body.targetMemberId.trim()
      : undefined;
  const targetMember = await getTargetMember(supabase, requestedTargetMemberId);

  const nextStatus =
    typeof body.status === 'string' && MUTABLE_STATUSES.includes(body.status as ServiceTaskStatus)
      ? (body.status as ServiceTaskStatus)
      : (derived.status as ServiceTaskStatus);

  const requestedStep =
    typeof body.currentStep === 'number'
      ? Math.max(1, Math.min(service.steps.length || 1, Math.floor(body.currentStep)))
      : existing.current_step;

  const computedProgress =
    nextStatus === 'completed'
      ? 100
      : Math.max(derived.progress, Math.round((requestedStep / Math.max(service.steps.length, 1)) * 100));

  const nextAction =
    nextStatus === 'completed'
      ? 'Completed'
      : service.steps[requestedStep - 1]?.title.en || derived.nextAction;

  const updates = {
    status: nextStatus,
    current_step: requestedStep,
    progress: computedProgress,
    next_action: typeof body.nextAction === 'string' ? body.nextAction.slice(0, 500) : nextAction,
    summary: typeof body.summary === 'string' ? body.summary.slice(0, 1000) : derived.summary,
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : existing.notes,
    workflow_mode: workflow.mode,
    target_member_id: targetMember?.id ?? existing.target_member_id ?? null,
    target_member_name: targetMember?.display_name ?? existing.target_member_name ?? null,
    requires_appointment: workflow.requiresAppointment ?? false,
    supports_online_payment: workflow.supportsOnlinePayment ?? false,
    office_visit_required: workflow.officeVisitRequired ?? false,
    milestones: workflow.milestones,
    actions: workflow.actions || [],
    missing_docs: derived.missingDocs,
    ready_docs: derived.readyDocs,
    completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('service_tasks')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('service_task_events').insert({
    task_id: params.id,
    owner_id: user.id,
    event_type: 'task_updated',
    note: targetMember?.display_name
      ? `Moved to ${nextStatus} for ${targetMember.display_name}`
      : `Moved to ${nextStatus}`,
    meta: {
      current_step: requestedStep,
      progress: computedProgress,
      target_member_id: targetMember?.id ?? existing.target_member_id ?? null,
    },
  });

  return NextResponse.json({ task: mapTaskRow(data) });
}
