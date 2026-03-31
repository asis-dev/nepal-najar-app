import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import type { ComplaintCase } from '@/lib/complaints/types';
import { getComplaintAuthContext } from '@/lib/complaints/access';
import { isTerminalComplaintStatus, refreshComplaintSla } from '@/lib/complaints/sla';
import { notifyComplaintUsers } from '@/lib/complaints/notifications';

interface SlaScanBody {
  auto_escalate?: boolean;
  escalate_to_department?: string;
}

export async function POST(request: NextRequest) {
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!auth.isElevated) {
    return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
  }

  let body: SlaScanBody = {};
  try {
    body = (await request.json().catch(() => ({}))) as SlaScanBody;
  } catch {
    body = {};
  }

  const db = getSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from('civic_complaints')
    .select('*')
    .not('sla_due_at', 'is', null)
    .is('sla_breached_at', null)
    .lt('sla_due_at', nowIso)
    .order('sla_due_at', { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data || []) as ComplaintCase[]).filter((row) => !isTerminalComplaintStatus(row.status));
  let markedBreached = 0;
  let escalated = 0;

  for (const complaint of rows) {
    const { data: updatedRaw, error: updateError } = await db
      .from('civic_complaints')
      .update({
        sla_breached_at: nowIso,
        last_activity_at: nowIso,
      })
      .eq('id', complaint.id)
      .select('*')
      .single();

    if (updateError || !updatedRaw) {
      continue;
    }
    markedBreached += 1;

    const refreshed = await refreshComplaintSla(db, updatedRaw as ComplaintCase);

    await db.from('complaint_events').insert({
      complaint_id: complaint.id,
      actor_id: auth.user.id,
      actor_type: 'admin',
      event_type: 'official_update',
      visibility: 'public',
      message: 'SLA breach detected. Complaint marked for priority follow-up.',
      metadata: {
        sla_due_at: refreshed.sla_due_at,
        breached_at: nowIso,
      },
    });

    await notifyComplaintUsers({
      complaintId: complaint.id,
      actorUserId: auth.user.id,
      type: 'complaint_sla_breach',
      title: 'Complaint SLA breached',
      body: 'This case exceeded its SLA and has been flagged for priority action.',
      metadata: {
        breached_at: nowIso,
      },
    });

    if (body.auto_escalate && body.escalate_to_department) {
      const toDepartment = body.escalate_to_department.trim();
      if (toDepartment && toDepartment !== (refreshed.assigned_department_key || refreshed.department_key)) {
        const fromDepartment = refreshed.assigned_department_key || refreshed.department_key || null;

        const { data: escalation } = await db
          .from('complaint_escalations')
          .insert({
            complaint_id: refreshed.id,
            from_department_key: fromDepartment,
            to_department_key: toDepartment,
            trigger_type: 'sla_breach',
            reason: 'Automatic escalation due to SLA breach.',
            created_by: auth.user.id,
            metadata: {
              auto_escalated: true,
            },
          })
          .select('*')
          .single();

        await db
          .from('complaint_assignments')
          .update({
            is_active: false,
            released_at: nowIso,
          })
          .eq('complaint_id', refreshed.id)
          .eq('is_active', true);

        await db.from('complaint_assignments').insert({
          complaint_id: refreshed.id,
          department_key: toDepartment,
          assignee_user_id: null,
          assigned_by: auth.user.id,
          assignment_note: 'Auto escalation after SLA breach.',
          is_active: true,
        });

        const { data: escalatedRow } = await db
          .from('civic_complaints')
          .update({
            assigned_department_key: toDepartment,
            assigned_user_id: null,
            escalation_level: (refreshed.escalation_level || 0) + 1,
            status: 'routed',
            last_activity_at: nowIso,
          })
          .eq('id', refreshed.id)
          .select('*')
          .single();

        if (escalatedRow) {
          await refreshComplaintSla(db, escalatedRow as ComplaintCase);
          escalated += 1;

          await db.from('complaint_events').insert({
            complaint_id: refreshed.id,
            actor_id: auth.user.id,
            actor_type: 'admin',
            event_type: 'routed',
            visibility: 'public',
            message: `Automatically escalated to ${toDepartment} after SLA breach.`,
            metadata: {
              escalation_id: escalation?.id || null,
              from_department_key: fromDepartment,
              to_department_key: toDepartment,
              trigger_type: 'sla_breach',
            },
          });
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    scanned: rows.length,
    breached_marked: markedBreached,
    escalated,
  });
}
