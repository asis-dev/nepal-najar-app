import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';
import { buildTaskResolutionPlan } from '@/lib/services/resolution-plan';

export async function GET(request: NextRequest) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!ctx.isElevated && (!ctx.departmentsScope || ctx.departmentsScope.length === 0)) {
    return NextResponse.json({ error: 'Department inbox access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const queueState = searchParams.get('queue_state') || null;
  const departmentKey = searchParams.get('department_key') || null;
  const assignedToMe = searchParams.get('assigned_to_me') === 'true';
  const q = searchParams.get('q')?.trim() || '';
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  if (departmentKey && !canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const db = getSupabase();
  let query = db
    .from('service_tasks')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(500);

  if (queueState) query = query.eq('queue_state', queueState);
  if (departmentKey) query = query.eq('assigned_department_key', departmentKey);
  if (assignedToMe) query = query.eq('assigned_staff_user_id', ctx.userId);
  if (q) {
    const escaped = q.replace(/[%_]/g, '').slice(0, 120);
    query = query.or(
      `service_title.ilike.%${escaped}%,summary.ilike.%${escaped}%,service_slug.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data || [];
  if (!ctx.isElevated && ctx.departmentsScope) {
    rows = rows.filter((row: any) => row.assigned_department_key && ctx.departmentsScope?.includes(row.assigned_department_key));
  }

  const total = rows.length;
  const paged = rows.slice(offset, offset + limit);

  const summary = {
    total_open: rows.filter((row: any) => !['approved', 'rejected', 'resolved', 'closed'].includes(row.queue_state)).length,
    unassigned_open: rows.filter((row: any) => !['approved', 'rejected', 'resolved', 'closed'].includes(row.queue_state) && !row.assigned_staff_user_id).length,
    waiting_on_citizen: rows.filter((row: any) => row.queue_state === 'waiting_on_citizen').length,
    escalated: rows.filter((row: any) => row.queue_state === 'escalated').length,
    assigned_to_me: rows.filter((row: any) => row.assigned_staff_user_id === ctx.userId).length,
  };

  return NextResponse.json({
    tasks: paged.map((task: any) => ({
      ...task,
      resolution_plan: buildTaskResolutionPlan(task),
    })),
    total,
    limit,
    offset,
    summary,
    departments_scope: ctx.isElevated ? 'all' : ctx.departmentsScope,
  });
}
