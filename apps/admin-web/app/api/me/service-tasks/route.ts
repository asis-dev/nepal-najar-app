import { NextRequest, NextResponse } from 'next/server';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import { getServiceBySlug } from '@/lib/services/catalog';
import { resolveServiceRouting } from '@/lib/services/service-routing';
import { getTaskStatus, mapTaskRow } from '@/lib/services/task-engine';
import { getWorkflowDefinition } from '@/lib/services/workflow-definitions';
import { buildOpsDeadlines, getServiceWorkflowPolicy } from '@/lib/service-ops/queue';
import { autoAssignAndNotify } from '@/lib/service-ops/auto-assign';
import { listOwnerVaultDocs } from '@/lib/services/vault-docs';
import {
  getHouseholdMemberBestEffort,
  insertServiceTaskWithCompatibility,
  insertTaskEventBestEffort,
} from '@/lib/services/task-store';
import { sendTaskEmailToGovt, canSendEmailBridge } from '@/lib/integrations/email-bridge';
import { notifyTaskCreated, notifyGovtSent } from '@/lib/integrations/sms-notify';
import { canSendSMS } from '@/lib/integrations/sms';
import { getRequestUser } from '@/lib/auth/request-user';

async function getAuthedContext(request: Request) {
  return getRequestUser(request);
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthedContext(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[service-tasks] list error:', error.message);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }

  return NextResponse.json({
    tasks: (data || []).map(mapTaskRow),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthedContext(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const serviceSlug = typeof body.serviceSlug === 'string' ? body.serviceSlug.trim() : '';
  const targetMemberId =
    typeof body.targetMemberId === 'string' && body.targetMemberId.trim()
      ? body.targetMemberId.trim()
      : undefined;
  const locale = body.locale === 'ne' ? 'ne' : 'en';
  if (!serviceSlug) return NextResponse.json({ error: 'serviceSlug required' }, { status: 400 });

  const service = await getServiceBySlug(serviceSlug);
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const { data: existing } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('owner_id', user.id)
    .eq('service_slug', serviceSlug)
    .eq('target_member_id', targetMemberId || null)
    .neq('status', 'completed')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ task: mapTaskRow(existing), reused: true });
  }

  const vaultDocs = await listOwnerVaultDocs(supabase, user.id);
  const state = getTaskStatus(service, vaultDocs);
  const workflow = getWorkflowDefinition(service);
  const routing = resolveServiceRouting(service);
  const policy = await getServiceWorkflowPolicy(routing.departmentKey, service.slug);
  const deadlines = buildOpsDeadlines(policy || {});
  const targetMember = await getHouseholdMemberBestEffort(supabase, targetMemberId);

  const insertPayload = {
    owner_id: user.id,
    service_slug: service.slug,
    service_title: service.title.en,
    service_category: service.category,
    locale,
    status: state.status,
    progress: state.progress,
    current_step: state.currentStep,
    total_steps: state.totalSteps,
    summary: state.summary,
    next_action: state.nextAction,
    workflow_mode: workflow.mode,
    target_member_id: targetMember?.id || null,
    target_member_name: targetMember?.display_name || null,
    requires_appointment: workflow.requiresAppointment ?? false,
    supports_online_payment: workflow.supportsOnlinePayment ?? false,
    office_visit_required: workflow.officeVisitRequired ?? false,
    milestones: workflow.milestones,
    actions: workflow.actions || [],
    action_state: {},
    assigned_department_key: routing.departmentKey,
    assigned_department_name: routing.departmentName,
    assigned_office_name: routing.officeName,
    assigned_authority_level: routing.authorityLevel,
    assigned_role_title: routing.roleTitle,
    routing_reason: routing.routingReason,
    routing_confidence: routing.confidence,
    queue_state: policy?.queue_entry_state || 'new',
    first_response_due_at: deadlines.firstResponseDueAt,
    resolution_due_at: deadlines.resolutionDueAt,
    escalation_level: 0,
    missing_docs: state.missingDocs,
    ready_docs: state.readyDocs,
    answers: {},
  };

  const { data, error } = await insertServiceTaskWithCompatibility(supabase, insertPayload);
  if (error) {
    console.error('[service-tasks] create error:', error.message);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }

  await insertTaskEventBestEffort(supabase, {
    task_id: data.id,
    owner_id: user.id,
    event_type: 'task_started',
    note: `Started ${service.title.en}`,
    meta: { service_slug: service.slug, status: state.status },
  });

  await insertTaskEventBestEffort(supabase, {
    task_id: data.id,
    owner_id: user.id,
    event_type: 'task_routed',
    note: `Routed to ${routing.departmentName}`,
    meta: {
      department_key: routing.departmentKey,
      authority_level: routing.authorityLevel,
      office_name: routing.officeName,
      role_title: routing.roleTitle,
      confidence: routing.confidence,
    },
  });

  // Fire-and-forget: auto-assign to staff + notify department
  autoAssignAndNotify(supabase, {
    taskId: data.id,
    ownerId: user.id,
    departmentKey: routing.departmentKey,
    departmentName: routing.departmentName,
    serviceSlug: service.slug,
    serviceTitle: service.title.en,
  });

  // Fire-and-forget: email bridge — send to government office if email target exists
  if (canSendEmailBridge(service.slug).canSend) {
    sendTaskEmailToGovt(supabase, {
      ...data,
      service_slug: service.slug,
      service_title: service.title.en,
      owner_id: user.id,
      assigned_department_key: routing.departmentKey,
      assigned_department_name: routing.departmentName,
      assigned_office_name: routing.officeName,
      assigned_role_title: routing.roleTitle,
      missing_docs: state.missingDocs,
      ready_docs: state.readyDocs,
    }).catch((err) => {
      console.error('[service-tasks] email bridge error (non-blocking):', err);
    });
  }

  // Fire-and-forget: SMS notification to citizen
  if (canSendSMS()) {
    (async () => {
      try {
        // Look up user's phone from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        const phone = profile?.phone as string | null;
        const taskInfo = {
          id: data.id,
          owner_id: user.id,
          service_slug: service.slug,
          service_title: service.title.en,
        };

        await notifyTaskCreated(supabase, taskInfo, phone, locale);

        // If email bridge sent to govt, also SMS the citizen about that
        if (canSendEmailBridge(service.slug).canSend) {
          const officeName = routing.officeName || routing.departmentName;
          await notifyGovtSent(supabase, taskInfo, phone, officeName, locale);
        }
      } catch (err) {
        console.error('[service-tasks] SMS notify error (non-blocking):', err);
      }
    })();
  }

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'service_task_started',
    entity_type: 'service_task',
    entity_id: data.id,
    title: `Started ${service.title.en}`,
    summary: state.nextAction,
    meta: {
      service_slug: service.slug,
      service_category: service.category,
      status: state.status,
      target_member_name: targetMember?.display_name || null,
      assigned_department_name: routing.departmentName,
      assigned_office_name: routing.officeName,
    },
  });

  return NextResponse.json({ task: mapTaskRow(data), reused: false });
}
