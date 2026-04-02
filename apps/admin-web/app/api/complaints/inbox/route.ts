import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { buildOrIlikeClause, sanitizeEqToken } from '@/lib/supabase/filter-utils';
import type { ComplaintCase } from '@/lib/complaints/types';
import {
  getAccessibleDepartmentKeysForUser,
  getComplaintAuthContext,
} from '@/lib/complaints/access';
import { getComplaintSlaState, isTerminalComplaintStatus } from '@/lib/complaints/sla';

export async function GET(request: NextRequest) {
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const allowedDepartments = await getAccessibleDepartmentKeysForUser(auth.user.id, auth.isElevated);
  if (!auth.isElevated && (!allowedDepartments || allowedDepartments.length === 0)) {
    return NextResponse.json({ error: 'Department inbox access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || null;
  const department = searchParams.get('department_key') || null;
  const slaStateFilter = searchParams.get('sla_state') || null;
  const assignedToMe = searchParams.get('assigned_to_me') === 'true';
  const q = searchParams.get('q')?.trim() || '';
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  const db = getSupabase();
  let query = db
    .from('civic_complaints')
    .select('*')
    .order('last_activity_at', { ascending: false })
    .limit(500);

  if (status) query = query.eq('status', status);
  if (department) {
    const departmentToken = sanitizeEqToken(department);
    if (departmentToken) {
      query = query.or(
        `assigned_department_key.eq.${departmentToken},department_key.eq.${departmentToken}`,
      );
    }
  }
  if (q.length > 0) {
    const searchClause = buildOrIlikeClause(['title', 'description'], q);
    if (searchClause) {
      query = query.or(searchClause);
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = (data || []) as ComplaintCase[];
  if (!auth.isElevated && allowedDepartments) {
    rows = rows.filter((row) => {
      const effectiveDepartment = row.assigned_department_key || row.department_key;
      return effectiveDepartment ? allowedDepartments.includes(effectiveDepartment) : false;
    });
  }

  if (assignedToMe) {
    rows = rows.filter((row) => row.assigned_user_id === auth.user?.id);
  }

  const nowMs = Date.now();
  const enriched = rows.map((row) => {
    const sla = getComplaintSlaState(row, nowMs);
    return {
      ...row,
      sla_state: sla.state,
      minutes_to_due: sla.minutesToDue,
    };
  });

  const filtered = slaStateFilter
    ? enriched.filter((row) => row.sla_state === slaStateFilter)
    : enriched;

  const total = filtered.length;
  const paged = filtered.slice(offset, offset + limit);

  const summary = {
    total_open: filtered.filter((row) => !isTerminalComplaintStatus(row.status)).length,
    breached_open: filtered.filter((row) => !isTerminalComplaintStatus(row.status) && row.sla_state === 'breached').length,
    due_soon_open: filtered.filter((row) => !isTerminalComplaintStatus(row.status) && row.sla_state === 'due_soon').length,
    unassigned_open: filtered.filter((row) => !isTerminalComplaintStatus(row.status) && !row.assigned_user_id).length,
  };

  return NextResponse.json({
    complaints: paged,
    total,
    limit,
    offset,
    summary,
    departments_scope: auth.isElevated ? 'all' : allowedDepartments,
  });
}
