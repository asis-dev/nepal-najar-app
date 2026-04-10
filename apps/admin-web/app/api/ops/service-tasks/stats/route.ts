import { NextRequest, NextResponse } from 'next/server';
import {
  canAccessServiceDepartment,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';
import { getSupabase } from '@/lib/supabase/server';

const TERMINAL_QUEUE_STATES = new Set(['approved', 'rejected', 'resolved', 'closed']);

export async function GET(request: NextRequest) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!ctx.isElevated && (!ctx.departmentsScope || ctx.departmentsScope.length === 0)) {
    return NextResponse.json({ error: 'Department inbox access required' }, { status: 403 });
  }

  const departmentKey = request.nextUrl.searchParams.get('department_key')?.trim() || null;
  if (departmentKey && !canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const db = getSupabase();
  let query = db.from('service_tasks').select('*').order('updated_at', { ascending: false }).limit(1000);
  if (departmentKey) query = query.eq('assigned_department_key', departmentKey);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data || [];
  if (!ctx.isElevated && ctx.departmentsScope) {
    rows = rows.filter((row: any) => row.assigned_department_key && ctx.departmentsScope?.includes(row.assigned_department_key));
  }

  const now = Date.now();
  const nonTerminal = rows.filter((row: any) => !TERMINAL_QUEUE_STATES.has(row.queue_state));
  const overdue = nonTerminal.filter((row: any) => row.resolution_due_at && new Date(row.resolution_due_at).getTime() < now);
  const dueSoon = nonTerminal.filter((row: any) => {
    if (!row.resolution_due_at) return false;
    const diffMs = new Date(row.resolution_due_at).getTime() - now;
    return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
  });

  const byDepartment = Object.values(
    rows.reduce<Record<string, any>>((acc, row: any) => {
      const key = row.assigned_department_key || 'unassigned';
      if (!acc[key]) {
        acc[key] = {
          department_key: key,
          department_name: row.assigned_department_name || 'Unassigned',
          total: 0,
          open: 0,
          overdue: 0,
          waiting_on_citizen: 0,
          escalated: 0,
        };
      }
      acc[key].total += 1;
      if (!TERMINAL_QUEUE_STATES.has(row.queue_state)) acc[key].open += 1;
      if (row.queue_state === 'waiting_on_citizen') acc[key].waiting_on_citizen += 1;
      if (row.queue_state === 'escalated') acc[key].escalated += 1;
      if (row.resolution_due_at && !TERMINAL_QUEUE_STATES.has(row.queue_state) && new Date(row.resolution_due_at).getTime() < now) {
        acc[key].overdue += 1;
      }
      return acc;
    }, {}),
  ).sort((a: any, b: any) => b.overdue - a.overdue || b.open - a.open);

  return NextResponse.json({
    totals: {
      total: rows.length,
      open: nonTerminal.length,
      overdue: overdue.length,
      due_soon: dueSoon.length,
      waiting_on_citizen: nonTerminal.filter((row: any) => row.queue_state === 'waiting_on_citizen').length,
      escalated: nonTerminal.filter((row: any) => row.queue_state === 'escalated').length,
    },
    by_department: byDepartment,
    overdue_cases: overdue.slice(0, 25),
  });
}
