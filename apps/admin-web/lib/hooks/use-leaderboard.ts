'use client';

import { useQuery } from '@tanstack/react-query';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export interface AreaLeaderboardEntry {
  province: string;
  proposalCount: number;
  reportCount: number;
  voteCount: number;
  engagementScore: number;
}

export interface CitizenLeaderboardEntry {
  displayName: string;
  karma: number;
  proposalsCreated: number;
  proposalsAccepted: number;
}

export type LeaderboardType = 'areas' | 'citizens';

/* ═══════════════════════════════════════════
   HOOK: useLeaderboard
   ═══════════════════════════════════════════ */
export function useLeaderboard(type: LeaderboardType = 'areas', limit = 20) {
  return useQuery<AreaLeaderboardEntry[] | CitizenLeaderboardEntry[]>({
    queryKey: ['leaderboard', type, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('type', type);
      params.set('limit', String(limit));

      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      return data.leaderboard ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
