import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import type { ComplaintCase, ComplaintStatus } from '@/lib/complaints/types';
import {
  canTransitionComplaintStatus,
  getComplaintAuthContext,
} from '@/lib/complaints/access';
import { notifyComplaintUsers } from '@/lib/complaints/notifications';
import { refreshComplaintSla } from '@/lib/complaints/sla';
import { rebuildComplaintAuthorityChain } from '@/lib/complaints/authority-chain';

type RouteContext = { params: Promise<{ id: string }> };

interface AssignBody {
  department_key?: string;
  assigned_user_id?: string | null;
  note?: string;
  status?: ComplaintStatus;
}

interface DepartmentMemberRow {
  user_id: string;
  member_role: 'owner' | 'agent' | 'viewer';
}

async function getDepartmentAssignableMembers(
  departmentKey: string,
): Promise<DepartmentMemberRow[]> {
  const db = getSupabase();
  const { data } = await db
    .from('complaint_department_members')
    .select('user_id, member_role')
    .eq('department_key', departmentKey)
    .eq('is_active', true)
    .in('member_role', ['owner', 'agent']);

  return ((data || []) as DepartmentMemberRow[]).filter((row) => Boolean(row.user_id));
}

async function chooseLeastLoadedAssignee(candidateUserIds: string[]): Promise<string | null> {
  if (candidateUserIds.length === 0) return null;
  const db = getSupabase();
  const { data } = await db
    .from('complaint_assignments')
    .select('assignee_user_id')
    .eq('is_active', true)
    .in('assignee_user_id', candidateUserIds);

  const loadMap = new Map<string, number>();
  for (const userId of candidateUserIds) loadMap.set(userId, 0);
  for (const row of data || []) {
    const userId = row.assignee_user_id as string | null;
    if (!userId || !loadMap.has(userId)) continue;
    loadMap.set(userId, (loadMap.get(userId) || 0) + 1);
  }

  let bestUserId: string | null = null;
  let bestLoad = Number.POSITIVE_INFINITY;
  for (const userId of candidateUserIds) {
    const load = loadMap.get(userId) || 0;
    if (load < bestLoad) {
      bestLoad = load;
      bestUserId = userId;
    }
  }
  return bestUserId;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!auth.isElevated) {
    return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
  }

  let body: AssignBody;
  try {
    body = (await request.json()) as AssignBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const departmentKey = body.department_key?.trim();
  if (!departmentKey) {
    return NextResponse.json({ error: 'department_key is required' }, { status: 400 });
  }

  const db = getSupabase();
  const { data: complaintRow, error: complaintError } = await db
    .from('civic_complaints')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (complaintError) {
    return NextResponse.json({ error: complaintError.message }, { status: 500 });
  }
  if (!complaintRow) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }
  const complaint = complaintRow as ComplaintCase;

  const { data: department } = await db
    .from('complaint_departments')
    .select('key, is_active')
    .eq('key', departmentKey)
    .maybeSingle();
  if (!department || department.is_active !== true) {
    return NextResponse.json({ error: 'Department not found or inactive' }, { status: 400 });
  }

  const departmentMembers = await getDepartmentAssignableMembers(departmentKey);
  const departmentMemberSet = new Set(departmentMembers.map((member) => member.user_id));

  if (body.assigned_user_id) {
    const { data: assigneeProfile } = await db
      .from('profiles')
      .select('id')
      .eq('id', body.assigned_user_id)
      .maybeSingle();
    if (!assigneeProfile) {
      return NextResponse.json({ error: 'assigned_user_id not found' }, { status: 400 });
    }
    if (!departmentMemberSet.has(body.assigned_user_id)) {
      return NextResponse.json(
        { error: 'assigned_user_id must be an active owner/agent member of the target department' },
        { status: 400 },
      );
    }
  }

  let assignedUserId = body.assigned_user_id || null;
  let autoAssigned = false;
  if (!assignedUserId && departmentMembers.length > 0) {
    assignedUserId = await chooseLeastLoadedAssignee(Array.from(departmentMemberSet));
    autoAssigned = Boolean(assignedUserId);
  }

  const nextStatus: ComplaintStatus =
    body.status ||
    ((['submitted', 'triaged', 'needs_info', 'reopened'] as ComplaintStatus[]).includes(complaint.status)
      ? 'routed'
      : complaint.status);

  if (!canTransitionComplaintStatus(complaint.status, nextStatus)) {
    return NextResponse.json(
      { error: `Cannot transition status from ${complaint.status} to ${nextStatus}` },
      { status: 400 },
    );
  }

  await db
    .from('complaint_assignments')
    .update({
      is_active: false,
      released_at: new Date().toISOString(),
    })
    .eq('complaint_id', id)
    .eq('is_active', true);

  const { data: assignment, error: assignmentError } = await db
    .from('complaint_assignments')
    .insert({
      complaint_id: id,
      department_key: departmentKey,
      assignee_user_id: assignedUserId,
      assigned_by: auth.user.id,
      assignment_note: body.note?.trim() || null,
      is_active: true,
    })
    .select('*')
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: assignmentError?.message || 'Failed to create assignment' }, { status: 500 });
  }

  const { data: updatedComplaintRaw, error: updateError } = await db
    .from('civic_complaints')
    .update({
      assigned_department_key: departmentKey,
      assigned_user_id: assignedUserId,
      department_key: complaint.department_key || departmentKey,
      status: nextStatus,
      last_activity_at: new Date().toISOString(),
      sla_breached_at: null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError || !updatedComplaintRaw) {
    return NextResponse.json({ error: updateError?.message || 'Failed to update complaint' }, { status: 500 });
  }

  const updatedComplaint = await refreshComplaintSla(db, updatedComplaintRaw as ComplaintCase);
  let authorityChain: unknown[] = [];
  try {
    authorityChain = await rebuildComplaintAuthorityChain(db, updatedComplaint as ComplaintCase);
  } catch (chainError) {
    console.warn(
      '[complaints] authority chain rebuild failed on assign:',
      chainError instanceof Error ? chainError.message : 'unknown',
    );
  }

  await db.from('complaint_events').insert({
    complaint_id: id,
    actor_id: auth.user.id,
    actor_type: 'admin',
    event_type: 'routed',
    visibility: 'public',
    message: body.note?.trim()
      ? `Assigned to ${departmentKey}${assignedUserId ? ` (${autoAssigned ? 'auto-assigned' : 'assignee set'})` : ''}. ${body.note.trim()}`
      : `Assigned to ${departmentKey}${assignedUserId ? ` (${autoAssigned ? 'auto-assigned' : 'assignee set'})` : ''}.`,
    metadata: {
      department_key: departmentKey,
      assigned_user_id: assignedUserId,
      auto_assigned: autoAssigned,
      status: nextStatus,
    },
  });

  const extraRecipients = assignedUserId ? [assignedUserId] : [];
  await notifyComplaintUsers({
    complaintId: id,
    actorUserId: auth.user.id,
    type: 'complaint_assigned',
    title: 'Complaint assigned',
    body: assignedUserId
      ? `Your complaint has been routed to ${departmentKey} and assigned for follow-up.`
      : `Your complaint has been routed to ${departmentKey}.`,
    metadata: {
      department_key: departmentKey,
      assigned_user_id: assignedUserId,
      auto_assigned: autoAssigned,
    },
    extraRecipients,
  });

  return NextResponse.json({
    success: true,
    assignment,
    complaint: updatedComplaint,
    authority_chain: authorityChain,
    auto_assigned: autoAssigned,
    assigned_user_id: assignedUserId,
  });
}
