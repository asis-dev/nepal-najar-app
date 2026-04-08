import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { getComplaintAuthContext } from '@/lib/complaints/access';
import type { ComplaintCase } from '@/lib/complaints/types';
import { notifyComplaintUsers } from '@/lib/complaints/notifications';
import { refreshComplaintSla } from '@/lib/complaints/sla';
import { rebuildComplaintAuthorityChain } from '@/lib/complaints/authority-chain';

type RouteContext = { params: Promise<{ id: string }> };

interface EscalateBody {
  to_department_key?: string;
  reason?: string;
  trigger_type?: 'manual' | 'sla_breach' | 'stale' | 'review';
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

  let body: EscalateBody;
  try {
    body = (await request.json()) as EscalateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const toDepartmentKey = body.to_department_key?.trim();
  const reason = body.reason?.trim();
  if (!toDepartmentKey || !reason || reason.length < 3) {
    return NextResponse.json(
      { error: 'to_department_key and reason (>=3 chars) are required' },
      { status: 400 },
    );
  }

  const db = getSupabase();
  const { data: complaintData, error: complaintError } = await db
    .from('civic_complaints')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (complaintError) {
    return NextResponse.json({ error: complaintError.message }, { status: 500 });
  }
  if (!complaintData) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }
  const complaint = complaintData as ComplaintCase;

  const fromDepartment = complaint.assigned_department_key || complaint.department_key || null;
  if (fromDepartment === toDepartmentKey) {
    return NextResponse.json({ error: 'Escalation target must be different department' }, { status: 400 });
  }

  const { data: department } = await db
    .from('complaint_departments')
    .select('key, is_active')
    .eq('key', toDepartmentKey)
    .maybeSingle();
  if (!department || department.is_active !== true) {
    return NextResponse.json({ error: 'Target department not found or inactive' }, { status: 400 });
  }

  const { data: escalation, error: escalationError } = await db
    .from('complaint_escalations')
    .insert({
      complaint_id: id,
      from_department_key: fromDepartment,
      to_department_key: toDepartmentKey,
      trigger_type: body.trigger_type || 'manual',
      reason,
      created_by: auth.user.id,
      metadata: {
        previous_status: complaint.status,
      },
    })
    .select('*')
    .single();

  if (escalationError || !escalation) {
    return NextResponse.json({ error: escalationError?.message || 'Failed to escalate complaint' }, { status: 500 });
  }

  await db
    .from('complaint_assignments')
    .update({
      is_active: false,
      released_at: new Date().toISOString(),
    })
    .eq('complaint_id', id)
    .eq('is_active', true);

  await db.from('complaint_assignments').insert({
    complaint_id: id,
    department_key: toDepartmentKey,
    assignee_user_id: null,
    assigned_by: auth.user.id,
    assignment_note: `Escalated: ${reason}`,
    is_active: true,
  });

  const { data: updatedComplaintRaw, error: updateError } = await db
    .from('civic_complaints')
    .update({
      assigned_department_key: toDepartmentKey,
      assigned_user_id: null,
      escalation_level: (complaint.escalation_level || 0) + 1,
      status: 'routed',
      last_activity_at: new Date().toISOString(),
      sla_breached_at: complaint.sla_breached_at || new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError || !updatedComplaintRaw) {
    return NextResponse.json({ error: updateError?.message || 'Failed to update escalated complaint' }, { status: 500 });
  }

  const updatedComplaint = await refreshComplaintSla(db, updatedComplaintRaw as ComplaintCase);
  let authorityChain: unknown[] = [];
  try {
    authorityChain = await rebuildComplaintAuthorityChain(db, updatedComplaint as ComplaintCase);
  } catch (chainError) {
    console.warn(
      '[complaints] authority chain rebuild failed on escalate:',
      chainError instanceof Error ? chainError.message : 'unknown',
    );
  }

  await db.from('complaint_events').insert({
    complaint_id: id,
    actor_id: auth.user.id,
    actor_type: 'admin',
    event_type: 'routed',
    visibility: 'public',
    message: `Escalated from ${fromDepartment || 'unassigned'} to ${toDepartmentKey}: ${reason}`,
    metadata: {
      escalation_id: escalation.id,
      from_department_key: fromDepartment,
      to_department_key: toDepartmentKey,
      trigger_type: body.trigger_type || 'manual',
    },
  });

  await notifyComplaintUsers({
    complaintId: id,
    actorUserId: auth.user.id,
    type: 'complaint_escalated',
    title: 'Complaint escalated',
    body: `Complaint escalated to ${toDepartmentKey}.`,
    metadata: {
      escalation_id: escalation.id,
      to_department_key: toDepartmentKey,
      from_department_key: fromDepartment,
      reason,
    },
  });

  return NextResponse.json({
    success: true,
    escalation,
    complaint: updatedComplaint,
    authority_chain: authorityChain,
  });
}
