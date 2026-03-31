'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAllPromises } from './use-promises';
import {
  buildGovernmentBodies,
  overlayRosterNames,
  sortBodies,
  type GovernmentBody,
  type BodySortOption,
} from '@/lib/data/government-bodies';

/** Fetch live government roster (current officials) */
function useRoster() {
  return useQuery({
    queryKey: ['government-roster'],
    queryFn: async () => {
      const res = await fetch('/api/roster');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * All government bodies with scores, sorted.
 * Overlays real minister names from live roster.
 */
export function useGovernmentBodies(sort: BodySortOption = 'worst') {
  const { data: promises, isLoading } = useAllPromises({ publicOnly: true });
  const { data: roster } = useRoster();

  const bodies = useMemo(() => {
    if (!promises) return [];
    let all = buildGovernmentBodies(promises);
    if (roster && roster.length > 0) {
      all = overlayRosterNames(all, roster);
    }
    return sortBodies(all, sort);
  }, [promises, roster, sort]);

  return { bodies, isLoading };
}

/**
 * Single government body by slug, with its commitments.
 * Overlays real minister names from live roster.
 */
export function useGovernmentBody(slug: string) {
  const { data: promises, isLoading } = useAllPromises({ publicOnly: true });
  const { data: roster } = useRoster();

  const result = useMemo(() => {
    if (!promises) return { body: null, bodyPromises: [] };
    let all = buildGovernmentBodies(promises);
    if (roster && roster.length > 0) {
      all = overlayRosterNames(all, roster);
    }
    const body = all.find((b) => b.slug === slug) ?? null;
    const promiseMap = new Map(promises.map((p) => [p.id, p]));
    const bodyPromises = body
      ? body.commitmentIds.map((id) => promiseMap.get(id)).filter(Boolean)
      : [];
    return { body, bodyPromises };
  }, [promises, roster, slug]);

  return { ...result, isLoading };
}
