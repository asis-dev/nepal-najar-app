'use client';

import { useQuery } from '@tanstack/react-query';

export interface ConflictSignal {
  id: string;
  title: string;
  url: string;
  source_name: string;
  confidence: number;
  discovered_at: string;
}

export interface ConflictActor {
  name: string;
  title?: string;
  statement?: string;
}

export interface Conflict {
  promise_id: number;
  promise_title: string;
  promise_title_ne: string;
  category: string;
  status: string;
  heat: number;
  confirms_count: number;
  contradicts_count: number;
  latest_signal_at: string;
  confirms_actors: ConflictActor[];
  contradicts_actors: ConflictActor[];
  confirms_signals: ConflictSignal[];
  contradicts_signals: ConflictSignal[];
}

interface ConflictsResponse {
  conflicts: Conflict[];
  total_disputed: number;
  updated_at: string;
}

export function useConflicts(days = 30) {
  return useQuery<ConflictsResponse>({
    queryKey: ['conflicts', days],
    queryFn: async () => {
      const res = await fetch(`/api/conflicts?days=${days}`);
      if (!res.ok) return { conflicts: [], total_disputed: 0, updated_at: '' };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Lightweight hook — just the count for badges/summaries */
export function useConflictCount(days = 30) {
  const { data, isLoading } = useConflicts(days);
  return { count: data?.total_disputed ?? 0, isLoading };
}
