'use client';

import { useQuery } from '@tanstack/react-query';

export function useCommentCounts(promiseIds: string[]) {
  const { data } = useQuery<Record<string, number>>({
    queryKey: ['comment-counts', promiseIds.sort().join(',')],
    queryFn: async () => {
      if (promiseIds.length === 0) return {};
      const res = await fetch(`/api/comments/counts?ids=${promiseIds.join(',')}`);
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60 * 1000, // 1 min
    enabled: promiseIds.length > 0,
  });
  return data || {};
}
