'use client';

import { useQuery } from '@tanstack/react-query';

export interface MinisterSignal {
  id: string;
  title: string;
  titleNe?: string;
  classification: string;
  discoveredAt: string;
  url: string;
  type: string;
}

export interface MinisterWeeklyActivity {
  totalSignals: number;
  directMentions: number;
  commitmentSignals: number;
  confirming: number;
  contradicting: number;
  topSignals: MinisterSignal[];
}

export interface Minister {
  slug: string;
  name: string;
  nameNe?: string;
  title: string;
  titleNe?: string;
  ministry: string;
  ministrySlug: string;
  appointedDate?: string;
  confidence?: string;
  weeklyActivity: MinisterWeeklyActivity;
  ownedCommitmentIds: number[];
  complaintCount?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: any;
}

export interface MinistersResponse {
  ministers: Minister[];
  period: { days: number; from: string; to: string };
}

export interface MinisterComplaint {
  id: string;
  title: string;
  title_ne?: string | null;
  issue_type: string;
  status: string;
  municipality?: string | null;
  ward_number?: string | null;
  assigned_department_key?: string | null;
  department_key?: string | null;
  last_activity_at: string;
  authority_name?: string | null;
  authority_name_ne?: string | null;
  ministry_slug?: string | null;
  minister_slug?: string | null;
  minister_name?: string | null;
  minister_title?: string | null;
  routing_confidence?: number | null;
}

export function useMinistersWeekly(days = 7) {
  const { data, isLoading, error } = useQuery<MinistersResponse>({
    queryKey: ['ministers-weekly', days],
    queryFn: async () => {
      const res = await fetch(`/api/ministers?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch ministers');
      return res.json();
    },
    staleTime: 24 * 60 * 60 * 1000, // 24h — data only changes on sweep (2x/day)
    gcTime: 48 * 60 * 60 * 1000, // 48h
  });

  return {
    ministers: data?.ministers || [],
    period: data?.period,
    isLoading,
    error,
  };
}

export function useMinisterComplaints(slug: string | null, limit = 30) {
  const { data, isLoading, error } = useQuery<{
    complaints: MinisterComplaint[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ['minister-complaints', slug, limit],
    queryFn: async () => {
      const res = await fetch(`/api/ministers/${slug}/complaints?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch minister complaints');
      return res.json();
    },
    enabled: Boolean(slug),
    staleTime: 24 * 60 * 60 * 1000, // 24h — complaints don't change often
  });

  return {
    complaints: data?.complaints || [],
    total: data?.total || 0,
    isLoading,
    error,
  };
}
