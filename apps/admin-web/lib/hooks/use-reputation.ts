'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/use-auth';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export interface ReputationData {
  karma: number;
  level: number;
  evidenceKarma: number;
  verificationKarma: number;
  communityKarma: number;
}

/* ═══════════════════════════════════════════
   LEVEL THRESHOLDS
   ═══════════════════════════════════════════ */
export const LEVEL_THRESHOLDS = [
  { level: 1, karma: 0 },
  { level: 2, karma: 20 },
  { level: 3, karma: 50 },
  { level: 4, karma: 100 },
  { level: 5, karma: 200 },
  { level: 6, karma: 350 },
  { level: 7, karma: 500 },
  { level: 8, karma: 800 },
  { level: 9, karma: 1200 },
  { level: 10, karma: 2000 },
] as const;

export function getNextLevelThreshold(currentLevel: number): number | null {
  const next = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1);
  return next?.karma ?? null;
}

export function getCurrentLevelThreshold(currentLevel: number): number {
  const current = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel);
  return current?.karma ?? 0;
}

/* ═══════════════════════════════════════════
   HOOK: useReputation — fetch user karma & level
   ═══════════════════════════════════════════ */
export function useReputation(userId?: string) {
  const { isAuthenticated, user } = useAuth();
  const targetId = userId || user?.id;

  const query = useQuery<ReputationData>({
    queryKey: ['reputation', targetId],
    queryFn: async () => {
      const params = targetId ? `?user_id=${targetId}` : '';
      const res = await fetch(`/api/reputation${params}`);
      if (!res.ok) throw new Error('Failed to load reputation');
      return res.json();
    },
    enabled: !!targetId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  return {
    karma: query.data?.karma ?? 0,
    level: query.data?.level ?? 1,
    evidenceKarma: query.data?.evidenceKarma ?? 0,
    verificationKarma: query.data?.verificationKarma ?? 0,
    communityKarma: query.data?.communityKarma ?? 0,
    isLoading: query.isLoading,
  };
}
