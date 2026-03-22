'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/use-auth';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export type WardReportTopic =
  | 'roads'
  | 'water'
  | 'electricity'
  | 'health'
  | 'education'
  | 'sanitation'
  | 'internet'
  | 'safety'
  | 'employment'
  | 'other';

export interface WardReport {
  id: string;
  user_id: string;
  author_name?: string;
  province: string;
  district: string;
  municipality?: string;
  ward_number?: string;
  topic: WardReportTopic;
  rating: number;
  description?: string;
  description_ne?: string;
  media_urls: string[];
  agree_count: number;
  disagree_count: number;
  is_approved: boolean;
  is_flagged: boolean;
  created_at: string;
}

export interface TopicScorecard {
  topic: WardReportTopic;
  averageRating: number;
  reportCount: number;
}

/* ═══════════════════════════════════════════
   HOOK: useWardReports — reports for an area
   ═══════════════════════════════════════════ */
export function useWardReports(province?: string | null, district?: string | null) {
  return useQuery<WardReport[]>({
    queryKey: ['ward-reports', province, district],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (province) params.set('province', province);
      if (district) params.set('district', district);
      params.set('limit', '50');

      const res = await fetch(`/api/ward-reports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load ward reports');
      const data = await res.json();
      return data.reports ?? [];
    },
    enabled: !!province,
    staleTime: 2 * 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useWardScorecard — aggregated ratings
   ═══════════════════════════════════════════ */
export function useWardScorecard(province?: string | null, district?: string | null) {
  return useQuery<TopicScorecard[]>({
    queryKey: ['ward-scorecard', province, district],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('scorecard', 'true');
      if (province) params.set('province', province);
      if (district) params.set('district', district);

      const res = await fetch(`/api/ward-reports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load ward scorecard');
      const data = await res.json();
      return data.scorecard ?? [];
    },
    enabled: !!province,
    staleTime: 2 * 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useSubmitWardReport — mutation
   ═══════════════════════════════════════════ */
export function useSubmitWardReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      province: string;
      district: string;
      municipality?: string;
      ward_number?: string;
      topic: WardReportTopic;
      rating: number;
      description?: string;
      description_ne?: string;
      media_urls?: string[];
    }) => {
      const res = await fetch('/api/ward-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit report');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward-reports'] });
      queryClient.invalidateQueries({ queryKey: ['ward-scorecard'] });
    },
  });
}

/* ═══════════════════════════════════════════
   HOOK: useWardReportVote — agree/disagree
   ═══════════════════════════════════════════ */
export function useWardReportVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, voteType }: { reportId: string; voteType: 'agree' | 'disagree' }) => {
      const res = await fetch(`/api/ward-reports/${reportId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to vote');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward-reports'] });
    },
  });
}
