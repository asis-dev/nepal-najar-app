import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { canViewComplaint, getComplaintAuthContext } from '@/lib/complaints/access';
import { addToCluster, removeFromCluster } from '@/lib/complaints/clusters';
import type { ComplaintCase } from '@/lib/complaints/types';
import { getComplaintSlaState } from '@/lib/complaints/sla';
import { sanitizeComplaintForViewer, sanitizeEvidenceSubmitterForViewer } from '@/lib/complaints/privacy';

/**
 * GET /api/complaints/clusters/[id]
 * Get cluster detail with all supporting complaints, events, and evidence rollup.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = getSupabase();
  const auth = await getComplaintAuthContext();
  const clusterId = params.id;

  // Fetch cluster
  const { data: cluster, error } = await db
    .from('complaint_clusters')
    .select('*')
    .eq('id', clusterId)
    .single();

  if (error || !cluster) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  // Fetch all complaints in this cluster, then apply visibility filtering.
  const { data: complaints } = await db
    .from('civic_complaints')
    .select('*')
    .eq('cluster_id', clusterId)
    .order('created_at', { ascending: false });

  const allComplaints = (complaints || []) as ComplaintCase[];
  const visibleComplaints = auth.isElevated
    ? allComplaints
    : allComplaints.filter((row) => canViewComplaint(row, auth));

  if (!auth.isElevated && visibleComplaints.length === 0) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  let eventQuery = db
    .from('complaint_cluster_events')
    .select('*')
    .eq('cluster_id', clusterId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (!auth.isElevated) {
    eventQuery = eventQuery.eq('visibility', 'public');
  }
  const { data: events } = await eventQuery;

  // Collect all evidence from cluster complaints
  const complaintIds = visibleComplaints.map((c) => c.id);
  let evidence: unknown[] = [];
  if (complaintIds.length > 0) {
    const { data: evidenceRows } = await db
      .from('complaint_evidence')
      .select('*')
      .in('complaint_id', complaintIds)
      .eq('verification_status', 'approved')
      .order('created_at', { ascending: false });
    evidence = evidenceRows || [];
  }

  // Enrich complaints with SLA state
  const complaintMap = new Map<string, ComplaintCase>();
  for (const complaint of visibleComplaints) {
    complaintMap.set(complaint.id, complaint);
  }

  const enrichedComplaints = visibleComplaints.map((c) => {
    const sla = getComplaintSlaState(c);
    return {
      ...sanitizeComplaintForViewer(c, auth),
      sla_state: sla.state,
      minutes_to_due: sla.minutesToDue,
    };
  });

  const safeEvidence = evidence.map((item) => {
    const row = item as { complaint_id?: string; user_id?: string; submitter_name?: string };
    const sourceComplaint = row.complaint_id ? complaintMap.get(row.complaint_id) : null;
    if (!sourceComplaint || !row.user_id) return item;
    return sanitizeEvidenceSubmitterForViewer(
      row as { user_id: string; submitter_name?: string },
      sourceComplaint,
      auth,
    );
  });

  return NextResponse.json({
    cluster,
    complaints: enrichedComplaints,
    events: events || [],
    evidence: safeEvidence,
    report_count: enrichedComplaints.length,
    total_evidence: safeEvidence.length,
  });
}

/**
 * PATCH /api/complaints/clusters/[id]
 * Update cluster (status, title, add/remove complaints).
 * Admin/verifier only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getComplaintAuthContext();
  if (!ctx.isElevated) {
    return NextResponse.json({ error: 'Admin or verifier access required' }, { status: 403 });
  }

  const clusterId = params.id;
  let body: {
    status?: string;
    title?: string;
    title_ne?: string;
    summary?: string;
    add_complaint_id?: string;
    remove_complaint_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const db = getSupabase();

  // Handle add/remove complaint
  if (body.add_complaint_id) {
    const ok = await addToCluster(db, clusterId, body.add_complaint_id, ctx.user!.id);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to add complaint to cluster' }, { status: 500 });
    }
  }

  if (body.remove_complaint_id) {
    const ok = await removeFromCluster(db, clusterId, body.remove_complaint_id, ctx.user!.id);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to remove complaint from cluster' }, { status: 500 });
    }
  }

  // Update cluster fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) updates.status = body.status;
  if (body.title) updates.title = body.title;
  if (body.title_ne) updates.title_ne = body.title_ne;
  if (body.summary) updates.summary = body.summary;

  if (body.status === 'acknowledged' || body.status === 'resolved' || body.status === 'closed') {
    const now = new Date().toISOString();
    if (body.status === 'acknowledged') updates.first_acknowledged_at = now;
    if (body.status === 'resolved') updates.resolved_at = now;

    // Create status change event
    await db.from('complaint_cluster_events').insert({
      cluster_id: clusterId,
      actor_id: ctx.user!.id,
      actor_type: 'admin',
      event_type: 'status_change',
      visibility: 'public',
      message: `Cluster status changed to ${body.status}.`,
      metadata: { new_status: body.status },
    });
  }

  const { data: updated, error } = await db
    .from('complaint_clusters')
    .update(updates)
    .eq('id', clusterId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cluster: updated });
}
