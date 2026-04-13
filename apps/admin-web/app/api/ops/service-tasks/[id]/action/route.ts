import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';
import {
  insertServiceTaskMessageBestEffort,
  notifyServiceTaskUsers,
} from '@/lib/service-ops/notifications';
import {
  buildOpsDeadlines,
  chooseLeastLoadedServiceAssignee,
  getAssignableMembers,
  getServiceWorkflowPolicy,
  mapDecisionToQueueState,
} from '@/lib/service-ops/queue';
import type { ServiceTaskDecisionType, ServiceTaskQueueState } from '@/lib/service-ops/types';
import {
  insertTaskEventBestEffort,
  updateServiceTaskWithCompatibility,
} from '@/lib/services/task-store';

type ActionBody = {
  action?:
    | ServiceTaskDecisionType
    | 'assign'
    | 'transfer'
    | 'public_update'
    | 'accept'
    | 'request_info'
    | 'approve'
    | 'reject'
    | 'escalate'
    | 'resolve'
    | 'close';
  note?: string;
  public_note?: string;
  department_key?: string;
  assigned_user_id?: string | null;
};

function canAssign(membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null) {
  if (!membership) return false;
  return membership.can_assign || ['owner', 'manager'].includes(membership.member_role);
}

function canApprove(membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null) {
  if (!membership) return false;
  return membership.can_approve || ['owner', 'manager', 'approver'].includes(membership.member_role);
}

function canEscalate(membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null) {
  if (!membership) return false;
  return membership.can_escalate || ['owner', 'manager'].includes(membership.member_role);
}

function buildCitizenNotification(action: string, serviceTitle: string, departmentName: string, publicNote: string) {
  switch (action) {
    case 'requested_info':
      return {
        title: `More information needed for ${serviceTitle}`,
        body: publicNote || `${departmentName} asked for more information on your case.`,
      };
    case 'approved':
      return {
        title: `${serviceTitle} approved`,
        body: publicNote || `${departmentName} approved your case.`,
      };
    case 'rejected':
      return {
        title: `${serviceTitle} was not approved`,
        body: publicNote || `${departmentName} rejected your case.`,
      };
    case 'resolved':
      return {
        title: `${serviceTitle} resolved`,
        body: publicNote || `${departmentName} marked your case as resolved.`,
      };
    case 'closed':
      return {
        title: `${serviceTitle} closed`,
        body: publicNote || `${departmentName} closed your case.`,
      };
    case 'escalated':
      return {
        title: `${serviceTitle} escalated`,
        body: publicNote || `${departmentName} escalated your case for further review.`,
      };
    case 'public_update':
      return {
        title: `Update on ${serviceTitle}`,
        body: publicNote || `${departmentName} posted an update on your case.`,
      };
    default:
      return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }
  const normalizedAction =
    action === 'accept'
      ? 'accepted'
      : action === 'request_info'
        ? 'requested_info'
        : action === 'approve'
          ? 'approved'
          : action === 'reject'
            ? 'rejected'
            : action === 'escalate'
              ? 'escalated'
              : action === 'resolve'
                ? 'resolved'
                : action === 'close'
                  ? 'closed'
                  : action;

  const db = getSupabase();
  const { data: task, error: taskError } = await db
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const currentDepartmentKey = (body.department_key?.trim() || task.assigned_department_key || null) as string | null;
  if (!ctx.isElevated && !canAccessServiceDepartment(ctx, currentDepartmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated && currentDepartmentKey
    ? await getDepartmentMembership(ctx.userId, currentDepartmentKey)
    : null;

  if (
    ['assign', 'transfer'].includes(normalizedAction) &&
    !ctx.isElevated &&
    !canAssign(membership)
  ) {
    return NextResponse.json({ error: 'Assignment permission required' }, { status: 403 });
  }

  if (
    ['approved', 'rejected', 'resolved', 'closed'].includes(normalizedAction) &&
    !ctx.isElevated &&
    !canApprove(membership)
  ) {
    return NextResponse.json({ error: 'Approval permission required' }, { status: 403 });
  }

  if (normalizedAction === 'escalated' && !ctx.isElevated && !canEscalate(membership)) {
    return NextResponse.json({ error: 'Escalation permission required' }, { status: 403 });
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
  const publicNote = typeof body.public_note === 'string' ? body.public_note.trim().slice(0, 2000) : '';
  const nextQueueState = mapDecisionToQueueState(normalizedAction, (task.queue_state || 'new') as ServiceTaskQueueState);

  let effectiveDepartmentKey = currentDepartmentKey;
  let assignedUserId = body.assigned_user_id?.trim() || task.assigned_staff_user_id || null;

  if (!effectiveDepartmentKey) {
    return NextResponse.json({ error: 'department_key is required for this action' }, { status: 400 });
  }

  const { data: department } = await db
    .from('service_departments')
    .select('*')
    .eq('key', effectiveDepartmentKey)
    .eq('is_active', true)
    .maybeSingle();

  if (!department) {
    return NextResponse.json({ error: 'Department not found or inactive' }, { status: 400 });
  }

  const assignableMembers = await getAssignableMembers(effectiveDepartmentKey);
  const assignableUserIds = assignableMembers.map((row: any) => row.user_id as string).filter(Boolean);

  if (assignedUserId && !assignableUserIds.includes(assignedUserId)) {
    return NextResponse.json({ error: 'assigned_user_id must belong to the target department' }, { status: 400 });
  }

  if ((normalizedAction === 'assign' || normalizedAction === 'accepted') && !assignedUserId && assignableUserIds.length > 0) {
    assignedUserId =
      normalizedAction === 'accepted' && assignableUserIds.includes(ctx.userId)
        ? ctx.userId
        : await chooseLeastLoadedServiceAssignee(effectiveDepartmentKey, assignableUserIds);
  }

  const policy = await getServiceWorkflowPolicy(effectiveDepartmentKey, task.service_slug);
  const deadlines = buildOpsDeadlines(policy || {});
  const now = new Date().toISOString();

  if (normalizedAction === 'assign' || normalizedAction === 'transfer' || normalizedAction === 'accepted') {
    await db
      .from('service_task_assignments')
      .update({
        is_active: false,
        released_at: now,
      })
      .eq('task_id', task.id)
      .eq('is_active', true);

    await db.from('service_task_assignments').insert({
      task_id: task.id,
      department_key: effectiveDepartmentKey,
      assignee_user_id: assignedUserId,
      assigned_by: ctx.userId,
      assignment_note: note || null,
      is_active: true,
    });
  }

  const updates: Record<string, unknown> = {
    queue_state: nextQueueState,
    assigned_department_key: effectiveDepartmentKey,
    assigned_department_name: department.name,
    assigned_staff_user_id: assignedUserId,
    first_response_due_at: task.first_response_due_at || deadlines.firstResponseDueAt,
    resolution_due_at: task.resolution_due_at || deadlines.resolutionDueAt,
    waiting_on_party:
      normalizedAction === 'requested_info'
        ? 'citizen'
        : normalizedAction === 'escalated'
          ? 'department'
          : normalizedAction === 'assign' || normalizedAction === 'accepted' || normalizedAction === 'approved' || normalizedAction === 'resolved' || normalizedAction === 'closed'
            ? null
            : task.waiting_on_party,
  };

  if (['assign', 'accepted', 'approved', 'rejected', 'resolved', 'closed'].includes(normalizedAction)) {
    updates.first_staff_response_at = task.first_staff_response_at || now;
  }

  if (publicNote) updates.last_public_update_at = now;
  if (normalizedAction === 'escalated') {
    updates.escalated_at = now;
    updates.escalation_level = (task.escalation_level || 0) + 1;
  }

  if (normalizedAction === 'approved' || normalizedAction === 'resolved' || normalizedAction === 'closed') {
    updates.status = 'completed';
    updates.completed_at = task.completed_at || now;
    updates.resolution_summary = publicNote || note || task.resolution_summary || null;
  }

  if (normalizedAction === 'rejected') {
    updates.status = 'blocked';
    updates.resolution_summary = publicNote || note || task.resolution_summary || null;
  }

  const { data: updated, error: updateError } = await updateServiceTaskWithCompatibility(db, task.id, updates);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  if (publicNote) {
    await insertServiceTaskMessageBestEffort(db, {
      taskId: task.id,
      ownerId: task.owner_id,
      actorId: ctx.userId,
      actorType: ctx.isElevated ? 'admin' : 'department',
      visibility: 'public',
      messageType:
        normalizedAction === 'requested_info'
          ? 'request_info'
          : ['approved', 'rejected', 'resolved', 'closed'].includes(normalizedAction)
            ? 'decision'
            : 'status_update',
      body: publicNote,
      metadata: {
        action: normalizedAction,
        department_key: effectiveDepartmentKey,
      },
    });
  }

  if (note) {
    await insertServiceTaskMessageBestEffort(db, {
      taskId: task.id,
      ownerId: task.owner_id,
      actorId: ctx.userId,
      actorType: ctx.isElevated ? 'admin' : 'department',
      visibility: 'internal',
      messageType: 'note',
      body: note,
      metadata: {
        action: normalizedAction,
        department_key: effectiveDepartmentKey,
      },
    });
  }

  const decisionType =
    normalizedAction === 'assign'
      ? 'accepted'
      : normalizedAction === 'transfer'
        ? 'transferred'
        : normalizedAction === 'public_update'
          ? null
          : normalizedAction;

  if (decisionType) {
    await db.from('service_task_decisions').insert({
      task_id: task.id,
      owner_id: task.owner_id,
      actor_id: ctx.userId,
      department_key: effectiveDepartmentKey,
      decision_type: decisionType,
      previous_queue_state: task.queue_state || null,
      next_queue_state: nextQueueState,
      public_note: publicNote || null,
      internal_note: note || null,
      metadata: {
        assigned_user_id: assignedUserId,
        department_key: effectiveDepartmentKey,
      },
    });
  }

  await insertTaskEventBestEffort(db, {
    task_id: task.id,
    owner_id: task.owner_id,
    event_type: `ops_${normalizedAction}`,
    note:
      publicNote ||
      note ||
      `${normalizedAction} by ${effectiveDepartmentKey}${assignedUserId ? ` (${assignedUserId})` : ''}`,
    meta: {
      action: normalizedAction,
      queue_state: nextQueueState,
      assigned_user_id: assignedUserId,
      department_key: effectiveDepartmentKey,
    },
  });

  const citizenNotification = buildCitizenNotification(
    normalizedAction,
    task.service_title,
    department.name,
    publicNote,
  );

  if (citizenNotification) {
    await notifyServiceTaskUsers(db, {
      taskId: task.id,
      actorUserId: ctx.userId,
      ownerId: task.owner_id,
      departmentKey: effectiveDepartmentKey,
      assignedStaffUserId: assignedUserId,
      title: citizenNotification.title,
      body: citizenNotification.body,
      link: '/me/cases',
      action: normalizedAction,
      serviceTitle: task.service_title,
      departmentName: department.name,
      metadata: {
        service_slug: task.service_slug,
        queue_state: nextQueueState,
        action: normalizedAction,
        department_key: effectiveDepartmentKey,
      },
    });
  }

  if (['assign', 'transfer', 'accepted'].includes(normalizedAction) && assignedUserId) {
    await notifyServiceTaskUsers(db, {
      taskId: task.id,
      actorUserId: ctx.userId,
      ownerId: task.owner_id,
      assignedStaffUserId: assignedUserId,
      title: `${task.service_title} assigned`,
      body:
        normalizedAction === 'accepted'
          ? `You are now handling this case for ${department.name}.`
          : `A case was assigned to you in ${department.name}.`,
      link: `/service-ops?task=${task.id}`,
      action: normalizedAction,
      serviceTitle: task.service_title,
      departmentName: department.name,
      metadata: {
        service_slug: task.service_slug,
        queue_state: nextQueueState,
        action: normalizedAction,
        department_key: effectiveDepartmentKey,
      },
      includeOwner: false,
      includeAssignedStaff: true,
    });
  }

  return NextResponse.json({
    success: true,
    task: updated,
    queue_state: nextQueueState,
    assigned_user_id: assignedUserId,
    department_key: effectiveDepartmentKey,
  });
}
