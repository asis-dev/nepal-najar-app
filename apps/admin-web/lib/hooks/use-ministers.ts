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
}

export interface MinistersResponse {
  ministers: Minister[];
  period: { days: number; from: string; to: string };
}

export function useMinistersWeekly(days = 7) {
  const { data, isLoading, error } = useQuery<MinistersResponse>({
    queryKey: ['ministers-weekly', days],
    queryFn: async () => {
      const res = await fetch(`/api/ministers?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch ministers');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  return {
    ministers: data?.ministers || [],
    period: data?.period,
    isLoading,
    error,
  };
}
