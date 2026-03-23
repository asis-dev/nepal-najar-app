'use client';

import { useQuery } from '@tanstack/react-query';

export interface TrendingItem {
  id: string;
  type: 'commitment' | 'topic' | 'person' | 'event';
  title: string;
  titleNe?: string;
  score: number;
  signalCount: number;
  signalCountPrev: number;
  trend: 'rising' | 'falling' | 'stable' | 'new';
  engagement: number;
  lastActivity: string;
  topSignals: Array<{
    id: string;
    title: string;
    url: string;
    source: string;
  }>;
}

interface TrendingResponse {
  trending: TrendingItem[];
  pulse: number;
  updatedAt: string;
  period: string;
}

type PulseLevel = 'low' | 'moderate' | 'high' | 'very_high';

async function fetchTrending(limit: number): Promise<TrendingResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`/api/trending?limit=${limit}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { trending: [], pulse: 0, updatedAt: '', period: '24h' };
    return res.json();
  } catch {
    clearTimeout(timeout);
    return { trending: [], pulse: 0, updatedAt: '', period: '24h' };
  }
}

export function useTrending(limit = 8) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trending', limit],
    queryFn: () => fetchTrending(limit),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const trendingIds = new Set<string>(
    data?.trending
      ?.filter((item) => item.type === 'commitment')
      .map((item) => item.id) ?? [],
  );

  const pulse = data?.pulse ?? 0;

  const pulseLevel: PulseLevel =
    pulse >= 75 ? 'very_high' :
    pulse >= 50 ? 'high' :
    pulse >= 25 ? 'moderate' :
    'low';

  return {
    trending: data?.trending ?? [],
    trendingIds,
    pulse,
    pulseLevel,
    updatedAt: data?.updatedAt,
    isLoading,
    error,
  };
}
