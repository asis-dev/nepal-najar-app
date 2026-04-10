import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';
import { resolveServiceCounterpartyRoute } from '@/lib/service-ops/counterparty-routing';
import { buildTaskResolutionPlan } from '@/lib/services/resolution-plan';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = getSupabase();
  const { data: task, error } = await db
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  if (!ctx.isElevated && !canAccessServiceDepartment(ctx, task.assigned_department_key)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const [{ data: assignments }, { data: messages }, { data: decisions }, { data: events }, { data: aiRuns }, { data: partnerReplies }, counterpartyRoute] = await Promise.all([
    db
      .from('service_task_assignments')
      .select('*')
      .eq('task_id', params.id)
      .order('created_at', { ascending: false }),
    db
      .from('service_task_messages')
      .select('*')
      .eq('task_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
    db
      .from('service_task_decisions')
      .select('*')
      .eq('task_id', params.id)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('service_task_events')
      .select('*')
      .eq('task_id', params.id)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('service_task_ai_runs')
      .select('*, playbook:service_ai_playbooks(id, playbook_key, name, ai_role, trigger_mode)')
      .eq('task_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('service_partner_replies')
      .select(`
        *,
        counterparty:service_counterparties(id, key, name, department_key)
      `)
      .eq('task_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
    resolveServiceCounterpartyRoute(task.service_slug, task.assigned_department_key),
  ]);

  return NextResponse.json({
    task: {
      ...task,
      resolution_plan: buildTaskResolutionPlan(task),
      counterparty_route: counterpartyRoute,
    },
    assignments: assignments || [],
    messages: messages || [],
    decisions: decisions || [],
    events: events || [],
    ai_runs: aiRuns || [],
    partner_replies: partnerReplies || [],
  });
}
