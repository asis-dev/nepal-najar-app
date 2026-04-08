import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import type { ComplaintCase, ComplaintEvent, ComplaintStatus } from '@/lib/complaints/types';
import {
  canTransitionComplaintStatus,
  canViewComplaint,
  getComplaintAuthContext,
  isComplaintOwner,
} from '@/lib/complaints/access';
import { notifyComplaintUsers } from '@/lib/complaints/notifications';
import { refreshComplaintSla } from '@/lib/complaints/sla';
import { sanitizeEventActorForViewer } from '@/lib/complaints/privacy';

type RouteContext = { params: Promise<{ id: string }> };

interface CreateEventBody {
  event_type?: ComplaintEvent['event_type'];
  visibility?: ComplaintEvent['visibility'];
  message?: string;
  metadata?: Record<string, unknown>;
  new_status?: ComplaintStatus;
}

async function getComplaint(id: string): Promise<ComplaintCase | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('civic_complaints')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ComplaintCase;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const complaint = await getComplaint(id);
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const auth = await getComplaintAuthContext();
  if (!canViewComplaint(complaint, auth)) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const isOwner = isComplaintOwner(complaint, auth.user?.id ?? null);
  const db = getSupabase();

  let query = db
    .from('complaint_events')
    .select('*')
    .eq('complaint_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!auth.isElevated && !isOwner) {
    query = query.eq('visibility', 'public');
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (data || []) as ComplaintEvent[];
  const actorIds = Array.from(
    new Set(events.map((event) => event.actor_id).filter((value): value is string => Boolean(value))),
  );

  const actorNameMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, display_name')
      .in('id', actorIds);
    for (const profile of profiles || []) {
      actorNameMap.set(profile.id as string, (profile.display_name as string) || 'User');
    }
  }

  return NextResponse.json({
    events: events.map((event) => {
      const actorName = event.actor_id
        ? actorNameMap.get(event.actor_id) || 'Citizen'
        : event.actor_type === 'ai'
          ? 'AI Engine'
          : 'System';

      return sanitizeEventActorForViewer(
        {
          ...event,
          actor_name: actorName,
        },
        complaint,
        auth,
      );
    }),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const complaint = await getComplaint(id);
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const isOwner = isComplaintOwner(complaint, auth.user.id);
  if (!isOwner && !auth.isElevated) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let body: CreateEventBody;
  try {
    body = (await request.json()) as CreateEventBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message || message.length < 2 || message.length > 2000) {
    return NextResponse.json({ error: 'message must be between 2 and 2000 characters' }, { status: 400 });
  }

  const citizenAllowedTypes: ComplaintEvent['event_type'][] = ['citizen_update'];
  const reviewerAllowedTypes: ComplaintEvent['event_type'][] = [
    'status_change',
    'official_update',
    'acknowledged',
    'needs_info',
    'resolved',
    'closed',
    'reopened',
    'duplicate_marked',
    'routed',
    'citizen_update',
  ];

  const requestedType = body.event_type || (auth.isElevated ? 'official_update' : 'citizen_update');
  if (!auth.isElevated && !citizenAllowedTypes.includes(requestedType)) {
    return NextResponse.json({ error: 'Citizens can only add citizen_update events' }, { status: 403 });
  }
  if (auth.isElevated && !reviewerAllowedTypes.includes(requestedType)) {
    return NextResponse.json({ error: `Invalid reviewer event_type: ${requestedType}` }, { status: 400 });
  }

  const visibility = body.visibility || 'public';
  if (visibility !== 'public' && visibility !== 'internal') {
    return NextResponse.json({ error: 'visibility must be public or internal' }, { status: 400 });
  }

  if (body.new_status && !auth.isElevated) {
    return NextResponse.json(
      { error: 'Public status can only change through reviewer actions' },
      { status: 403 },
    );
  }

  const db = getSupabase();
  let newStatus = body.new_status;
  let complaintAfterStatus = complaint;
  if (newStatus) {
    const validStatuses: ComplaintStatus[] = [
      'submitted',
      'triaged',
      'routed',
      'acknowledged',
      'in_progress',
      'resolved',
      'closed',
      'needs_info',
      'rejected',
      'duplicate',
      'reopened',
    ];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status: ${newStatus}` }, { status: 400 });
    }
    if (!canTransitionComplaintStatus(complaint.status, newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition status from ${complaint.status} to ${newStatus}` },
        { status: 400 },
      );
    }

    const { data: statusUpdated, error: statusError } = await db
      .from('civic_complaints')
      .update({
        status: newStatus,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (statusError || !statusUpdated) {
      return NextResponse.json(
        { error: statusError?.message || 'Failed to update complaint status' },
        { status: 500 },
      );
    }
    complaintAfterStatus = await refreshComplaintSla(db, statusUpdated as ComplaintCase);
  }

  const eventType: ComplaintEvent['event_type'] =
    newStatus ? 'status_change' : requestedType;

  const { data, error } = await db
    .from('complaint_events')
    .insert({
      complaint_id: id,
      actor_id: auth.user.id,
      actor_type: auth.isElevated ? 'admin' : 'citizen',
      event_type: eventType,
      visibility,
      message,
      metadata: {
        ...(body.metadata || {}),
        ...(newStatus
          ? {
              status_from: complaint.status,
              status_to: newStatus,
            }
          : {}),
      },
    })
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to create event' }, { status: 500 });
  }

  if (newStatus) {
    await notifyComplaintUsers({
      complaintId: id,
      actorUserId: auth.user.id,
      type: newStatus === 'resolved' || newStatus === 'closed' ? 'complaint_resolved' : 'complaint_status',
      title:
        newStatus === 'resolved' || newStatus === 'closed'
          ? 'Complaint resolved'
          : `Complaint status updated: ${newStatus}`,
      body: `Status changed from ${complaint.status} to ${newStatus}.`,
      metadata: {
        from_status: complaint.status,
        to_status: newStatus,
      },
    });
  } else {
    await notifyComplaintUsers({
      complaintId: id,
      actorUserId: auth.user.id,
      type: 'complaint_update',
      title: 'Complaint update posted',
      body: message,
      metadata: {
        event_type: eventType,
      },
    });
  }

  return NextResponse.json(
    { success: true, event: data, complaint: complaintAfterStatus },
    { status: 201 },
  );
}
