'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  ComplaintAuthorityChainNode,
  ComplaintCase,
  ComplaintEvent,
  ComplaintEvidence,
} from '@/lib/complaints/types';
import type { ComplaintCluster } from '@/lib/complaints/clusters';

export interface ComplaintListItem extends ComplaintCase {
  reporter_name?: string;
  is_following?: boolean;
  authority_chain?: ComplaintAuthorityChainNode[];
}

export interface ComplaintFilters {
  mine?: boolean;
  followed?: boolean;
  status?: string;
  issue_type?: string;
  department_key?: string;
  province?: string;
  district?: string;
  municipality?: string;
  q?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
}

export interface ComplaintInboxFilters {
  status?: string;
  department_key?: string;
  sla_state?: 'on_track' | 'due_soon' | 'breached' | 'not_applicable' | 'paused';
  assigned_to_me?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

function toSearchParams(filters?: ComplaintFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(filters)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    params.set(key, String(rawValue));
  }
  return params.toString();
}

export function useComplaints(filters?: ComplaintFilters) {
  const queryKey = ['complaints', filters || {}];
  return useQuery<{
    complaints: ComplaintListItem[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey,
    queryFn: async () => {
      const query = toSearchParams(filters);
      const res = await fetch(`/api/complaints${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.error as string) || `Failed to load complaints (${res.status})`);
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useComplaint(complaintId: string | null) {
  return useQuery<{ complaint: ComplaintListItem }>({
    queryKey: ['complaint', complaintId],
    queryFn: async () => {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.error as string) || `Failed to load complaint (${res.status})`);
      }
      return res.json();
    },
    enabled: Boolean(complaintId),
    staleTime: 30_000,
  });
}

export function useComplaintEvents(complaintId: string | null) {
  return useQuery<{ events: Array<ComplaintEvent & { actor_name?: string }> }>({
    queryKey: ['complaint-events', complaintId],
    queryFn: async () => {
      const res = await fetch(`/api/complaints/${complaintId}/events`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.error as string) || `Failed to load complaint events (${res.status})`);
      }
      return res.json();
    },
    enabled: Boolean(complaintId),
    staleTime: 20_000,
  });
}

export function useComplaintEvidence(
  complaintId: string | null,
  options?: { verification_status?: 'approved' | 'pending' | 'rejected' },
) {
  return useQuery<{ evidence: Array<ComplaintEvidence & { submitter_name?: string }> }>({
    queryKey: ['complaint-evidence', complaintId, options?.verification_status || 'public'],
    queryFn: async () => {
      const query = options?.verification_status
        ? `?verification_status=${encodeURIComponent(options.verification_status)}`
        : '';
      const res = await fetch(`/api/complaints/${complaintId}/evidence${query}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.error as string) || `Failed to load complaint evidence (${res.status})`);
      }
      return res.json();
    },
    enabled: Boolean(complaintId),
    staleTime: 20_000,
  });
}

export function useComplaintDepartments() {
  return useQuery<{
    departments: Array<{
      key: string;
      name: string;
      name_ne: string;
      description: string | null;
      level: string;
      is_active: boolean;
      ministry_slug?: string | null;
      ministry_name?: string | null;
      ministry_name_ne?: string | null;
      department_head_title?: string | null;
      department_head_title_ne?: string | null;
      facebook_page_url?: string | null;
    }>;
  }>({
    queryKey: ['complaint-departments'],
    queryFn: async () => {
      const res = await fetch('/api/complaints/departments', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.error as string) || `Failed to load departments (${res.status})`);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useComplaintInbox(filters?: ComplaintInboxFilters) {
  const query = toSearchParams(filters as ComplaintFilters | undefined);
  return useQuery<{
    complaints: Array<ComplaintListItem & { sla_state?: string; minutes_to_due?: number | null }>;
    total: number;
    limit: number;
    offset: number;
    summary: {
      total_open: number;
      breached_open: number;
      due_soon_open: number;
      unassigned_open: number;
    };
    queue_breakdown: {
      needs_triage: number;
      unassigned: number;
      awaiting_citizen: number;
      escalated: number;
      reopened: number;
      due_soon: number;
      breached: number;
      assigned_to_me: number;
    };
    departments_scope: 'all' | string[];
  }>({
    queryKey: ['complaint-inbox', filters || {}],
    queryFn: async () => {
      const res = await fetch(`/api/complaints/inbox${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.error as string) || `Failed to load complaint inbox (${res.status})`);
      }
      return res.json();
    },
    staleTime: 20_000,
  });
}

export function useComplaintDashboard(days = 30) {
  return useQuery<{
    period_days: number;
    generated_at: string;
    totals: {
      complaints: number;
      open: number;
      resolved_or_closed: number;
      breached_open: number;
      resolution_rate: number;
      avg_ack_hours: number | null;
      avg_resolution_hours: number | null;
      avg_satisfaction: number | null;
      satisfaction_samples: number;
    };
    by_department: Array<{
      department_key: string;
      total: number;
      open: number;
      resolved: number;
      breached_open: number;
      avg_resolution_hours: number | null;
    }>;
  }>({
    queryKey: ['complaint-dashboard', days],
    queryFn: async () => {
      const res = await fetch(`/api/complaints/dashboard?days=${days}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.error as string) || `Failed to load complaint dashboard (${res.status})`);
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}

/* ─── Cluster Hooks ─── */

export interface ClusterFilters {
  status?: string;
  issue_type?: string;
  municipality?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export function useClusters(filters?: ClusterFilters) {
  return useQuery<{
    clusters: ComplaintCluster[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ['complaint-clusters', filters || {}],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
        }
      }
      const q = params.toString();
      const res = await fetch(`/api/complaints/clusters${q ? `?${q}` : ''}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load clusters');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useCluster(clusterId: string | null) {
  return useQuery<{
    cluster: ComplaintCluster;
    complaints: Array<ComplaintListItem & { sla_state?: string }>;
    events: Array<{ id: string; event_type: string; message: string; actor_type: string; created_at: string; metadata?: Record<string, unknown> }>;
    evidence: Array<ComplaintEvidence>;
    report_count: number;
    total_evidence: number;
  }>({
    queryKey: ['complaint-cluster', clusterId],
    queryFn: async () => {
      const res = await fetch(`/api/complaints/clusters/${clusterId}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load cluster');
      return res.json();
    },
    enabled: Boolean(clusterId),
    staleTime: 30_000,
  });
}
