import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';

function canRunAI(
  ctx: NonNullable<Awaited<ReturnType<typeof getServiceOpsAuthContext>>>,
  membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null,
) {
  if (ctx.isElevated) return true;
  if (!membership) return false;
  return ['owner', 'manager', 'case_worker', 'reviewer', 'approver'].includes(membership.member_role);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const db = getSupabase();
  const { data: task, error: taskError } = await db
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!canAccessServiceDepartment(ctx, task.assigned_department_key)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated && task.assigned_department_key
    ? await getDepartmentMembership(ctx.userId, task.assigned_department_key)
    : null;
  if (!canRunAI(ctx, membership)) {
    return NextResponse.json({ error: 'AI execution permission required' }, { status: 403 });
  }

  const playbookId = typeof body.playbook_id === 'string' ? body.playbook_id.trim() : '';
  if (!playbookId) return NextResponse.json({ error: 'playbook_id is required' }, { status: 400 });

  const { data: playbook, error: playbookError } = await db
    .from('service_ai_playbooks')
    .select('*')
    .eq('id', playbookId)
    .eq('is_active', true)
    .maybeSingle();

  if (playbookError) return NextResponse.json({ error: playbookError.message }, { status: 500 });
  if (!playbook) return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
  if (playbook.department_key !== task.assigned_department_key) {
    return NextResponse.json({ error: 'Playbook does not belong to this department' }, { status: 400 });
  }

  const inputContext = {
    task_id: task.id,
    service_slug: task.service_slug,
    service_title: task.service_title,
    queue_state: task.queue_state,
    status: task.status,
    next_action: task.next_action,
    summary: task.summary,
    assistant_intake: task.answers?.assistant_intake || null,
    service_form: task.answers?.service_form || null,
    utility_lookup: task.answers?.utility_lookup || null,
  };

  const { data, error } = await db
    .from('service_task_ai_runs')
    .insert({
      task_id: task.id,
      department_key: task.assigned_department_key,
      playbook_id: playbook.id,
      requested_by: ctx.userId,
      status: 'queued',
      summary: `Queued ${playbook.name}`,
      input_context: inputContext,
      metadata: {
        trigger_mode: playbook.trigger_mode,
        requires_human_approval: playbook.requires_human_approval,
      },
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ run: data });
}
