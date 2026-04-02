'use client';

import { useQuery } from '@tanstack/react-query';
import type { DailyBrief } from '@/lib/data/landing-types';

export function useDailyBrief() {
  const { data: brief = null, isLoading } = useQuery<DailyBrief | null>({
    queryKey: ['daily-brief'],
    queryFn: async () => {
      const res = await fetch('/api/daily-brief');
      if (!res.ok) return null;
      const data = await res.json();
      if (data && !data.error) return data as DailyBrief;
      return null;
    },
    staleTime: 30 * 60 * 1000, // 30 min — brief only changes 2x/day via cron
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return { brief, isLoading };
}
