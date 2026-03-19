'use client';

import { useQuery } from '@tanstack/react-query';

/* ═══════════════════════════════════════
   Types for Accountability Report Card
   ═══════════════════════════════════════ */

export interface WorkingPromise {
  id: string;
  title: string;
  title_ne: string;
  category: string;
  status: string;
  progress: number;
  articleCount: number;
  latestHeadline: string | null;
  latestDate: string | null;
  confidence: string | null;
}

export interface DownSource {
  name: string;
  url: string;
  type: 'government_portal' | 'data_source';
  status: 'down' | 'blocked' | 'stale' | 'unreachable';
  lastChecked: string | null;
}

export interface SilentPromise {
  id: string;
  title: string;
  title_ne: string;
  category: string;
}

export interface TransparencyScore {
  overall: number;
  sourceHealth: number;
  govPortalStatus: number;
  dataFreshness: number;
  promiseCoverage: number;
}

export interface VoteAggregate {
  topicId: string;
  up: number;
  down: number;
  net: number;
}

export interface AccountabilityData {
  whatsWorking: WorkingPromise[];
  whatsNotWorking: {
    downSources: DownSource[];
    silentPromises: SilentPromise[];
  };
  transparencyScore: TransparencyScore;
  voteAggregates: VoteAggregate[];
}

export function useAccountability() {
  return useQuery({
    queryKey: ['accountability'],
    queryFn: async (): Promise<AccountabilityData> => {
      const response = await fetch('/api/accountability');
      if (!response.ok) throw new Error('Failed to load accountability data');
      return response.json() as Promise<AccountabilityData>;
    },
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
    placeholderData: {
      whatsWorking: [],
      whatsNotWorking: { downSources: [], silentPromises: [] },
      transparencyScore: { overall: 0, sourceHealth: 0, govPortalStatus: 0, dataFreshness: 0, promiseCoverage: 0 },
      voteAggregates: [],
    },
  });
}
