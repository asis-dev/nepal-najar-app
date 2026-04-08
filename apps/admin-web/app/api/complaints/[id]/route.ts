import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import type { ComplaintCase, ComplaintStatus } from '@/lib/complaints/types';
import {
  canTransitionComplaintStatus,
  canViewComplaint,
  getComplaintAuthContext,
  isComplaintOwner,
} from '@/lib/complaints/access';
import { refreshComplaintSla } from '@/lib/complaints/sla';
import { notifyComplaintUsers } from '@/lib/complaints/notifications';
import { sanitizeComplaintForViewer, sanitizeReporterNameForViewer } from '@/lib/complaints/privacy';
import { rebuildComplaintAuthorityChain } from '@/lib/complaints/authority-chain';

type RouteContext = { params: Promise<{ id: string }> };

interface ComplaintPatchBody {
  title?: string;
  description?: string;
  province?: string | null;
  district?: string | null;
  municipality?: string | null;
  ward_number?: string | null;
  location_text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_public?: boolean;
  is_anonymous?: boolean;
  status?: ComplaintStatus;
  trust_level?: 'unverified' | 'partial' | 'verified' | 'disputed';
  department_key?: string | null;
  duplicate_of?: string | null;
  update_message?: string;
}

async function loadComplaintOr404(id: string) {
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
  const complaint = await loadComplaintOr404(id);
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const auth = await getComplaintAuthContext();
  if (!canViewComplaint(complaint, auth)) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }
  const isOwner = isComplaintOwner(complaint, auth.user?.id ?? null);

  const db = getSupabase();
  let reporterName = 'Citizen';
  if (complaint.is_anonymous) {
    reporterName = 'Anonymous';
  } else {
    const { data: profile } = await db
      .from('profiles')
      .select('display_name')
      .eq('id', complaint.user_id)
      .maybeSingle();
    reporterName = (profile?.display_name as string | undefined) || 'Citizen';
  }

  let isFollowing = false;
  if (auth.user?.id) {
    const { data: follow } = await db
      .from('complaint_followers')
      .select('complaint_id')
      .eq('complaint_id', complaint.id)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    isFollowing = Boolean(follow);
  }

  const { data: department } = complaint.department_key
    ? await db
        .from('complaint_departments')
        .select('key, name, name_ne, level')
        .eq('key', complaint.department_key)
        .maybeSingle()
    : { data: null };

  const { data: authorityChain } = await db
    .from('complaint_authority_chain')
    .select('*')
    .eq('complaint_id', complaint.id)
    .eq('is_active', true)
    .order('node_order', { ascending: true });

  return NextResponse.json({
    complaint: {
      ...sanitizeComplaintForViewer(complaint, auth),
      reporter_name: sanitizeReporterNameForViewer(complaint, auth, reporterName),
      is_following: isFollowing,
      department: department || null,
      authority_chain: authorityChain || [],
      viewer_is_owner: isOwner,
    },
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const complaint = await loadComplaintOr404(id);
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const isOwner = isComplaintOwner(complaint, auth.user.id);
  if (!isOwner && !auth.isElevated) {
    return NextResponse.json({ error: 'Not authorized. Only the case creator or admin can delete.' }, { status: 403 });
  }

  const db = getSupabase();

  // Delete related records first (cascade), then the complaint
  await db.from('complaint_authority_chain').delete().eq('complaint_id', id);
  await db.from('complaint_escalations').delete().eq('complaint_id', id);
  await db.from('complaint_assignments').delete().eq('complaint_id', id);
  await db.from('complaint_followers').delete().eq('complaint_id', id);
  await db.from('complaint_evidence').delete().eq('complaint_id', id);
  await db.from('complaint_events').delete().eq('complaint_id', id);

  const { error } = await db.from('civic_complaints').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete complaint' }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: id });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const complaint = await loadComplaintOr404(id);
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const isOwner = isComplaintOwner(complaint, auth.user.id);
  if (!isOwner && !auth.isElevated) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let body: ComplaintPatchBody;
  try {
    body = (await request.json()) as ComplaintPatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const ownerEditable: Array<keyof ComplaintPatchBody> = [
    'title',
    'description',
    'province',
    'district',
    'municipality',
    'ward_number',
    'location_text',
    'latitude',
    'longitude',
    'is_anonymous',
    'is_public',
  ];

  for (const field of ownerEditable) {
    if (body[field] !== undefined && (isOwner || auth.isElevated)) {
      updates[field] = body[field];
    }
  }

  if (typeof updates.title === 'string') {
    const title = updates.title.trim();
    if (title.length < 5 || title.length > 220) {
      return NextResponse.json({ error: 'title must be 5-220 characters' }, { status: 400 });
    }
    updates.title = title;
  }

  if (typeof updates.description === 'string') {
    const description = updates.description.trim();
    if (description.length < 10 || description.length > 5000) {
      return NextResponse.json({ error: 'description must be 10-5000 characters' }, { status: 400 });
    }
    updates.description = description;
  }

  // Owner can mark their own case as "resolved" or "reopened"; all other status/trust/routing changes require elevated role
  const ownerResolvingOwnCase =
    isOwner && body.status === 'resolved' && !body.trust_level && !body.department_key && !body.duplicate_of;
  const ownerReopeningOwnCase =
    isOwner && body.status === 'reopened' && !body.trust_level && !body.department_key && !body.duplicate_of &&
    ['resolved', 'closed', 'rejected'].includes(complaint.status);

  if (body.status !== undefined || body.trust_level !== undefined || body.department_key !== undefined || body.duplicate_of !== undefined) {
    if (!auth.isElevated && !ownerResolvingOwnCase && !ownerReopeningOwnCase) {
      return NextResponse.json(
        { error: 'Only reviewers can change status, trust, routing, or duplicates' },
        { status: 403 },
      );
    }
  }

  if (body.status !== undefined) {
    const nextStatus = body.status;
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

    if (!validStatuses.includes(nextStatus)) {
      return NextResponse.json({ error: `Invalid status: ${nextStatus}` }, { status: 400 });
    }
    if (!canTransitionComplaintStatus(complaint.status, nextStatus)) {
      return NextResponse.json(
        { error: `Cannot transition status from ${complaint.status} to ${nextStatus}` },
        { status: 400 },
      );
    }
    updates.status = nextStatus;
  }

  if (body.trust_level !== undefined) {
    const validTrust = ['unverified', 'partial', 'verified', 'disputed'];
    if (!validTrust.includes(body.trust_level)) {
      return NextResponse.json({ error: 'Invalid trust_level' }, { status: 400 });
    }
    updates.trust_level = body.trust_level;
  }

  if (body.department_key !== undefined) {
    updates.department_key = body.department_key;
  }

  if (body.duplicate_of !== undefined) {
    updates.duplicate_of = body.duplicate_of;
  }

  const hasAnyUpdate = Object.keys(updates).length > 0;
  const updateMessage = body.update_message?.trim();
  if (!hasAnyUpdate && !updateMessage) {
    return NextResponse.json({ error: 'No valid updates submitted' }, { status: 400 });
  }

  const db = getSupabase();
  let updatedComplaint = complaint;

  if (hasAnyUpdate) {
    const { data, error } = await db
      .from('civic_complaints')
      .update({
        ...updates,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to update complaint' }, { status: 500 });
    }
    updatedComplaint = data as ComplaintCase;
  }

  const eventsToInsert: Array<Record<string, unknown>> = [];
  const actorType = auth.isElevated ? 'admin' : 'citizen';

  if (body.status && body.status !== complaint.status) {
    eventsToInsert.push({
      complaint_id: id,
      actor_id: auth.user.id,
      actor_type: actorType,
      event_type: 'status_change',
      visibility: 'public',
      message: updateMessage || `Status changed from ${complaint.status} to ${body.status}.`,
      metadata: {
        from: complaint.status,
        to: body.status,
      },
    });
  } else if (updateMessage) {
    eventsToInsert.push({
      complaint_id: id,
      actor_id: auth.user.id,
      actor_type: actorType,
      event_type: auth.isElevated ? 'official_update' : 'citizen_update',
      visibility: 'public',
      message: updateMessage,
      metadata: {},
    });
  }

  if (body.department_key && body.department_key !== complaint.department_key && auth.isElevated) {
    eventsToInsert.push({
      complaint_id: id,
      actor_id: auth.user.id,
      actor_type: 'admin',
      event_type: 'routed',
      visibility: 'public',
      message: `Complaint routed to ${body.department_key}.`,
      metadata: {
        department_key: body.department_key,
      },
    });
  }

  if (eventsToInsert.length > 0) {
    await db.from('complaint_events').insert(eventsToInsert);
  }

  const statusChanged = body.status && body.status !== complaint.status;
  const finalComplaint = await refreshComplaintSla(db, updatedComplaint);
  let authorityChain: unknown[] = [];
  try {
    authorityChain = await rebuildComplaintAuthorityChain(db, finalComplaint as ComplaintCase);
  } catch (chainError) {
    console.warn(
      '[complaints] authority chain rebuild failed on patch:',
      chainError instanceof Error ? chainError.message : 'unknown',
    );
  }

  if (statusChanged) {
    await notifyComplaintUsers({
      complaintId: id,
      actorUserId: auth.user.id,
      type: body.status === 'resolved' || body.status === 'closed' ? 'complaint_resolved' : 'complaint_status',
      title:
        body.status === 'resolved' || body.status === 'closed'
          ? 'Complaint resolved'
          : `Complaint status updated: ${body.status}`,
      body:
        body.status === 'resolved' || body.status === 'closed'
          ? 'A complaint you follow has been marked resolved.'
          : `Status changed from ${complaint.status} to ${body.status}.`,
      metadata: {
        from_status: complaint.status,
        to_status: body.status,
      },
    });
  } else if (updateMessage) {
    await notifyComplaintUsers({
      complaintId: id,
      actorUserId: auth.user.id,
      type: 'complaint_update',
      title: 'Complaint update posted',
      body: updateMessage,
      metadata: {
        actor_type: actorType,
      },
    });
  }

  return NextResponse.json({
    success: true,
    complaint: finalComplaint,
    authority_chain: authorityChain,
  });
}
