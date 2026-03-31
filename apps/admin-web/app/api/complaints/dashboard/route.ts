import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import type { ComplaintCase } from '@/lib/complaints/types';
import {
  getAccessibleDepartmentKeysForUser,
  getComplaintAuthContext,
} from '@/lib/complaints/access';
import { getComplaintSlaState, isTerminalComplaintStatus } from '@/lib/complaints/sla';

function hoursBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;
  return (endMs - startMs) / (1000 * 60 * 60);
}

export async function GET(request: NextRequest) {
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const allowedDepartments = await getAccessibleDepartmentKeysForUser(auth.user.id, auth.isElevated);
  if (!auth.isElevated && (!allowedDepartments || allowedDepartments.length === 0)) {
    return NextResponse.json({ error: 'Dashboard access requires department membership' }, { status: 403 });
  }

  const days = Math.min(120, Math.max(7, parseInt(request.nextUrl.searchParams.get('days') || '30', 10)));
  const fromIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const db = getSupabase();
  const { data, error } = await db
    .from('civic_complaints')
    .select('*')
    .gte('created_at', fromIso)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = (data || []) as ComplaintCase[];
  if (!auth.isElevated && allowedDepartments) {
    rows = rows.filter((row) => {
      const dept = row.assigned_department_key || row.department_key;
      return dept ? allowedDepartments.includes(dept) : false;
    });
  }

  const nowMs = Date.now();
  let ackSamples = 0;
  let ackHoursTotal = 0;
  let resolutionSamples = 0;
  let resolutionHoursTotal = 0;
  let satisfactionSamples = 0;
  let satisfactionTotal = 0;

  const byDepartmentMap = new Map<
    string,
    { total: number; open: number; resolved: number; breached_open: number; avg_resolution_hours: number | null; _resSamples: number; _resTotal: number }
  >();

  for (const row of rows) {
    const ackHours = hoursBetween(row.created_at, row.first_acknowledged_at);
    if (ackHours != null) {
      ackSamples += 1;
      ackHoursTotal += ackHours;
    }

    const resolutionHours = hoursBetween(row.created_at, row.resolved_at || row.closed_at);
    if (resolutionHours != null) {
      resolutionSamples += 1;
      resolutionHoursTotal += resolutionHours;
    }

    if (typeof row.citizen_satisfaction === 'number') {
      satisfactionSamples += 1;
      satisfactionTotal += row.citizen_satisfaction;
    }

    const dept = row.assigned_department_key || row.department_key || 'unassigned';
    if (!byDepartmentMap.has(dept)) {
      byDepartmentMap.set(dept, {
        total: 0,
        open: 0,
        resolved: 0,
        breached_open: 0,
        avg_resolution_hours: null,
        _resSamples: 0,
        _resTotal: 0,
      });
    }
    const bucket = byDepartmentMap.get(dept)!;
    bucket.total += 1;

    const open = !isTerminalComplaintStatus(row.status);
    if (open) bucket.open += 1;
    if (row.status === 'resolved' || row.status === 'closed') bucket.resolved += 1;

    const sla = getComplaintSlaState(row, nowMs);
    if (open && sla.state === 'breached') bucket.breached_open += 1;

    if (resolutionHours != null) {
      bucket._resSamples += 1;
      bucket._resTotal += resolutionHours;
    }
  }

  const byDepartment = Array.from(byDepartmentMap.entries()).map(([department_key, bucket]) => ({
    department_key,
    total: bucket.total,
    open: bucket.open,
    resolved: bucket.resolved,
    breached_open: bucket.breached_open,
    avg_resolution_hours: bucket._resSamples > 0
      ? Math.round((bucket._resTotal / bucket._resSamples) * 10) / 10
      : null,
  })).sort((a, b) => b.total - a.total);

  const openCount = rows.filter((row) => !isTerminalComplaintStatus(row.status)).length;
  const resolvedCount = rows.filter((row) => row.status === 'resolved' || row.status === 'closed').length;
  const breachedOpen = rows.filter((row) => {
    const sla = getComplaintSlaState(row, nowMs);
    return !isTerminalComplaintStatus(row.status) && sla.state === 'breached';
  }).length;

  return NextResponse.json({
    period_days: days,
    generated_at: new Date().toISOString(),
    totals: {
      complaints: rows.length,
      open: openCount,
      resolved_or_closed: resolvedCount,
      breached_open: breachedOpen,
      resolution_rate: rows.length > 0 ? Math.round((resolvedCount / rows.length) * 1000) / 10 : 0,
      avg_ack_hours: ackSamples > 0 ? Math.round((ackHoursTotal / ackSamples) * 10) / 10 : null,
      avg_resolution_hours: resolutionSamples > 0 ? Math.round((resolutionHoursTotal / resolutionSamples) * 10) / 10 : null,
      avg_satisfaction: satisfactionSamples > 0 ? Math.round((satisfactionTotal / satisfactionSamples) * 100) / 100 : null,
      satisfaction_samples: satisfactionSamples,
    },
    by_department: byDepartment,
  });
}
