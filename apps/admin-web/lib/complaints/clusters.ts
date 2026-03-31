/**
 * Complaint Cluster Logic
 *
 * One pothole reported 50 times = one cluster with 50 supporting reports,
 * one map point, one SLA, one public status, one evidence rollup.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComplaintCase } from './types';
import { routeToAuthority } from './authority-router';

export interface ComplaintCluster {
  id: string;
  title: string;
  title_ne: string | null;
  summary: string | null;
  summary_ne: string | null;
  issue_type: string;
  severity: string;
  department_key: string | null;
  authority_name: string | null;
  authority_name_ne: string | null;
  authority_level: string | null;
  authority_office: string | null;
  routing_reason: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward_number: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  sla_policy_key: string | null;
  sla_due_at: string | null;
  sla_breached_at: string | null;
  first_acknowledged_at: string | null;
  resolved_at: string | null;
  report_count: number;
  evidence_count: number;
  follower_count: number;
  merge_method: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClusterWithComplaints extends ComplaintCluster {
  complaints: ComplaintCase[];
}

/**
 * Create a new cluster from a primary complaint and optional additional complaints.
 * The primary complaint sets the cluster's location, category, and routing.
 */
export async function createCluster(
  db: SupabaseClient,
  opts: {
    primaryComplaintId: string;
    additionalComplaintIds?: string[];
    title?: string;
    titleNe?: string;
    createdBy: string;
    mergeMethod?: 'ai' | 'manual' | 'auto';
  },
): Promise<ComplaintCluster | null> {
  // Fetch primary complaint
  const { data: primary } = await db
    .from('civic_complaints')
    .select('*')
    .eq('id', opts.primaryComplaintId)
    .single();

  if (!primary) return null;

  const complaint = primary as ComplaintCase;

  // Route via rules engine
  const route = routeToAuthority({
    issueType: complaint.issue_type,
    severity: complaint.severity,
    province: complaint.province,
    district: complaint.district,
    municipality: complaint.municipality,
    wardNumber: complaint.ward_number,
    description: complaint.description,
  });

  const clusterTitle = opts.title || complaint.title;
  const clusterTitleNe = opts.titleNe || complaint.title_ne;

  // Create cluster
  const { data: cluster, error } = await db
    .from('complaint_clusters')
    .insert({
      title: clusterTitle,
      title_ne: clusterTitleNe,
      summary: (complaint.ai_triage as Record<string, unknown>)?.summary as string || null,
      issue_type: complaint.issue_type,
      severity: complaint.severity,
      department_key: route.departmentKey,
      authority_name: route.authority,
      authority_name_ne: route.authorityNe,
      authority_level: route.level,
      authority_office: route.office,
      routing_reason: route.routingReason,
      province: complaint.province,
      district: complaint.district,
      municipality: complaint.municipality,
      ward_number: complaint.ward_number,
      latitude: complaint.latitude,
      longitude: complaint.longitude,
      created_by: opts.createdBy,
      merge_method: opts.mergeMethod || 'manual',
    })
    .select('*')
    .single();

  if (error || !cluster) return null;

  const clusterId = cluster.id as string;

  // Add primary complaint to cluster
  const allIds = [opts.primaryComplaintId, ...(opts.additionalComplaintIds || [])];
  await db
    .from('civic_complaints')
    .update({ cluster_id: clusterId })
    .in('id', allIds);

  // Create events
  const events = [
    {
      cluster_id: clusterId,
      actor_id: opts.createdBy,
      actor_type: 'admin' as const,
      event_type: 'created' as const,
      visibility: 'public' as const,
      message: `Cluster created with ${allIds.length} report${allIds.length > 1 ? 's' : ''}.`,
      metadata: { complaint_ids: allIds, merge_method: opts.mergeMethod || 'manual' },
    },
  ];

  await db.from('complaint_cluster_events').insert(events);

  return cluster as unknown as ComplaintCluster;
}

/**
 * Add a complaint to an existing cluster.
 */
export async function addToCluster(
  db: SupabaseClient,
  clusterId: string,
  complaintId: string,
  actorId: string,
): Promise<boolean> {
  const { error } = await db
    .from('civic_complaints')
    .update({ cluster_id: clusterId })
    .eq('id', complaintId);

  if (error) return false;

  await db.from('complaint_cluster_events').insert({
    cluster_id: clusterId,
    actor_id: actorId,
    actor_type: 'admin',
    event_type: 'complaint_added',
    visibility: 'public',
    message: 'New supporting report added to this cluster.',
    metadata: { complaint_id: complaintId },
  });

  return true;
}

/**
 * Remove a complaint from a cluster (moderation override).
 */
export async function removeFromCluster(
  db: SupabaseClient,
  clusterId: string,
  complaintId: string,
  actorId: string,
): Promise<boolean> {
  const { error } = await db
    .from('civic_complaints')
    .update({ cluster_id: null })
    .eq('id', complaintId)
    .eq('cluster_id', clusterId);

  if (error) return false;

  await db.from('complaint_cluster_events').insert({
    cluster_id: clusterId,
    actor_id: actorId,
    actor_type: 'admin',
    event_type: 'complaint_removed',
    visibility: 'internal',
    message: 'Report removed from cluster by moderator.',
    metadata: { complaint_id: complaintId },
  });

  return true;
}

/**
 * Auto-cluster: when a new complaint is flagged as duplicate,
 * check if the original already has a cluster — if so add to it,
 * otherwise create a new cluster.
 */
export async function autoClusterDuplicate(
  db: SupabaseClient,
  newComplaintId: string,
  duplicateOfId: string,
): Promise<string | null> {
  // Check if original complaint has a cluster
  const { data: original } = await db
    .from('civic_complaints')
    .select('cluster_id')
    .eq('id', duplicateOfId)
    .single();

  if (!original) return null;

  const existingClusterId = original.cluster_id as string | null;

  if (existingClusterId) {
    // Add to existing cluster
    await db
      .from('civic_complaints')
      .update({ cluster_id: existingClusterId })
      .eq('id', newComplaintId);

    await db.from('complaint_cluster_events').insert({
      cluster_id: existingClusterId,
      actor_id: null,
      actor_type: 'ai',
      event_type: 'complaint_added',
      visibility: 'public',
      message: 'AI duplicate check: new supporting report added automatically.',
      metadata: { complaint_id: newComplaintId, method: 'auto_dedup' },
    });

    return existingClusterId;
  }

  // Create new cluster from original + new
  const cluster = await createCluster(db, {
    primaryComplaintId: duplicateOfId,
    additionalComplaintIds: [newComplaintId],
    createdBy: 'system',
    mergeMethod: 'auto',
  });

  return cluster?.id || null;
}
