import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import { ask } from '@/lib/services/ai';
import { resolveServiceRouting } from '@/lib/services/service-routing';
import { getTaskStatus, mapTaskRow } from '@/lib/services/task-engine';
import { getWorkflowDefinition } from '@/lib/services/workflow-definitions';
import { buildOpsDeadlines, getServiceWorkflowPolicy } from '@/lib/service-ops/queue';
import { listOwnerVaultDocs } from '@/lib/services/vault-docs';
import {
  buildAssistantTaskAnswers,
  getHouseholdMemberBestEffort,
  insertServiceTaskWithCompatibility,
  insertTaskEventBestEffort,
  updateServiceTaskWithCompatibility,
} from '@/lib/services/task-store';

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthedContext();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 120) : null;
  const targetMemberId =
    typeof body.targetMemberId === 'string' && body.targetMemberId.trim()
      ? body.targetMemberId.trim()
      : undefined;
  const locale = body.locale === 'ne' ? 'ne' : 'en';
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });

  const result = await ask(question, locale, sessionId);
  const service = result.topService;
  if (!service) {
    return NextResponse.json({
      ambiguous: true,
      error: 'No confident service match found',
      routeReason: result.routeReason,
      followUpPrompt: result.followUpPrompt,
      followUpOptions: result.followUpOptions,
      intakeState: result.intakeState,
      intakeSlots: result.intakeSlots,
      serviceOptions: result.cited.slice(0, 5).map((candidate) => ({
        slug: candidate.slug,
        category: candidate.category,
        title: candidate.title,
        providerName: candidate.providerName,
      })),
    });
  }

  if (!user) {
    return NextResponse.json({
      requiresAuth: true,
      service: {
        slug: service.slug,
        category: service.category,
        title: service.title,
        providerName: service.providerName,
      },
    });
  }

  const { data: existing } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('owner_id', user.id)
    .eq('service_slug', service.slug)
    .eq('target_member_id', targetMemberId || null)
    .neq('status', 'completed')
    .maybeSingle();

  if (existing) {
    const assistantAnswers = buildAssistantTaskAnswers({
      sourceQuery: question,
      intakeState: result.intakeState,
      intakeSlots: result.intakeSlots,
      sessionId,
    });

    const { data: refreshed } = await updateServiceTaskWithCompatibility(supabase, existing.id, {
      answers: {
        ...(existing.answers || {}),
        ...assistantAnswers,
      },
    });

    await insertTaskEventBestEffort(supabase, {
      task_id: existing.id,
      owner_id: user.id,
      event_type: 'task_updated',
      note: 'Resumed from assistant request',
      meta: { ...assistantAnswers, reused: true },
    });

    return NextResponse.json({
      task: mapTaskRow(refreshed || existing),
      service: {
        slug: service.slug,
        category: service.category,
        title: service.title,
      },
      reused: true,
    });
  }

  const vaultDocs = await listOwnerVaultDocs(supabase, user.id);
  const state = getTaskStatus(service, vaultDocs);
  const workflow = getWorkflowDefinition(service);
  const routing = resolveServiceRouting(service);
  const policy = await getServiceWorkflowPolicy(routing.departmentKey, service.slug);
  const deadlines = buildOpsDeadlines(policy || {});
  const targetMember = await getHouseholdMemberBestEffort(supabase, targetMemberId);

  const { data, error } = await insertServiceTaskWithCompatibility(supabase, {
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
    answers: buildAssistantTaskAnswers({
      sourceQuery: question,
      intakeState: result.intakeState,
      intakeSlots: result.intakeSlots,
      sessionId,
    }),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await insertTaskEventBestEffort(supabase, {
    task_id: data.id,
    owner_id: user.id,
    event_type: 'task_started',
    note: `Started ${service.title.en} from assistant request`,
    meta: {
      service_slug: service.slug,
      status: state.status,
      ...buildAssistantTaskAnswers({
        sourceQuery: question,
        intakeState: result.intakeState,
        intakeSlots: result.intakeSlots,
        sessionId,
      }),
    },
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
      ...buildAssistantTaskAnswers({
        sourceQuery: question,
        intakeState: result.intakeState,
        intakeSlots: result.intakeSlots,
        sessionId,
      }),
    },
  });

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'service_task_started_from_assistant',
    entity_type: 'service_task',
    entity_id: data.id,
    title: `Started ${service.title.en} from assistant`,
    summary: state.nextAction,
    meta: {
      service_slug: service.slug,
      service_category: service.category,
      ...buildAssistantTaskAnswers({
        sourceQuery: question,
        intakeState: result.intakeState,
        intakeSlots: result.intakeSlots,
        sessionId,
      }),
      target_member_name: targetMember?.display_name || null,
      assigned_department_name: routing.departmentName,
      assigned_office_name: routing.officeName,
    },
  });

  return NextResponse.json({
    task: mapTaskRow(data),
    service: {
      slug: service.slug,
      category: service.category,
      title: service.title,
    },
    reused: false,
  });
}
