import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import { getServiceBySlug } from '@/lib/services/catalog';
import { resolveServiceRouting } from '@/lib/services/service-routing';
import { getTaskStatus, mapTaskRow } from '@/lib/services/task-engine';
import type { ServiceTaskStatus } from '@/lib/services/task-types';
import { getWorkflowDefinition } from '@/lib/services/workflow-definitions';
import { listOwnerVaultDocs } from '@/lib/services/vault-docs';
import {
  getHouseholdMemberBestEffort,
  insertTaskEventBestEffort,
  updateServiceTaskWithCompatibility,
} from '@/lib/services/task-store';

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
    .eq('owner_id', user.id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const service = await getServiceBySlug(existing.service_slug);
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const vaultDocs = await listOwnerVaultDocs(supabase, user.id);
  const derived = getTaskStatus(service, vaultDocs);
  const workflow = getWorkflowDefinition(service);
  const routing = resolveServiceRouting(service);
  const requestedTargetMemberId =
    typeof body.targetMemberId === 'string' && body.targetMemberId.trim()
      ? body.targetMemberId.trim()
      : undefined;
  const targetMember = await getHouseholdMemberBestEffort(supabase, requestedTargetMemberId);

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
    assigned_department_key: routing.departmentKey,
    assigned_department_name: routing.departmentName,
    assigned_office_name: routing.officeName,
    assigned_authority_level: routing.authorityLevel,
    assigned_role_title: routing.roleTitle,
    routing_reason: routing.routingReason,
    routing_confidence: routing.confidence,
    missing_docs: derived.missingDocs,
    ready_docs: derived.readyDocs,
    completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
  };

  const { data, error } = await updateServiceTaskWithCompatibility(supabase, params.id, updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await insertTaskEventBestEffort(supabase, {
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
      assigned_department_name: routing.departmentName,
      assigned_office_name: routing.officeName,
    },
  });

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'service_task_updated',
    entity_type: 'service_task',
    entity_id: params.id,
    title: `Updated ${service.title.en}`,
    summary: `Status: ${nextStatus}`,
    meta: {
      service_slug: service.slug,
      status: nextStatus,
      current_step: requestedStep,
      progress: computedProgress,
      target_member_name: targetMember?.display_name ?? existing.target_member_name ?? null,
    },
  });

  return NextResponse.json({ task: mapTaskRow(data) });
}
