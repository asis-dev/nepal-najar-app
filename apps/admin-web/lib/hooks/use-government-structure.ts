'use client';

import { useQuery } from '@tanstack/react-query';
import { publicGovUnits } from '@/lib/data/government-accountability';
import type { PublicGovSnapshotUnit } from '@/lib/org-structure/engine';

interface GovernmentStructureResponse {
  checkedAt: string;
  units: PublicGovSnapshotUnit[];
}

const fallbackUnits: PublicGovSnapshotUnit[] = publicGovUnits.map((unit) => ({
  ...unit,
  sourceMeta: {
    pageTitle: null,
    snippet: null,
    matchedTerms: [],
    fetchedFrom: unit.sourceUrl,
    sourceStatus: 'fallback',
    checkedAt: new Date(0).toISOString(),
  },
}));

export function useGovernmentStructure() {
  return useQuery({
    queryKey: ['government-structure'],
    queryFn: async (): Promise<GovernmentStructureResponse> => {
      const response = await fetch('/api/public/government-structure', {
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        throw new Error('Failed to load government structure');
      }

      return response.json() as Promise<GovernmentStructureResponse>;
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: {
      checkedAt: new Date(0).toISOString(),
      units: fallbackUnits,
    },
  });
}
