'use client';

import { useQuery } from '@tanstack/react-query';

export function useContradictions() {
  const { data: count = 0 } = useQuery<number>({
    queryKey: ['contradictions-count'],
    queryFn: async () => {
      const res = await fetch('/api/signals?classification=contradicts&days=7');
      if (!res.ok) return 0;
      const data = await res.json();
      if (data && typeof data.commitmentCount === 'number') {
        return data.commitmentCount;
      }
      if (data && Array.isArray(data.signals)) {
        const commitmentIds = new Set<string>();
        for (const s of data.signals) {
          if (s.commitment_id) commitmentIds.add(s.commitment_id);
          if (s.promise_id) commitmentIds.add(s.promise_id);
        }
        return commitmentIds.size;
      }
      return 0;
    },
    staleTime: 10 * 60 * 1000, // 10 min — contradiction signals don't change often
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return count;
}
