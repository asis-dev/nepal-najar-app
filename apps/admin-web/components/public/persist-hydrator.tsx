'use client';

import { useEffect } from 'react';
import { usePreferencesStore, useWatchlistStore, useUserPreferencesStore } from '@/lib/stores/preferences';
import { useEngagementStore } from '@/lib/stores/engagement';
import { useVotingStore } from '@/lib/stores/voting';
import { useComparisonStore } from '@/lib/stores/comparison';

export function PersistHydrator() {
  useEffect(() => {
    void usePreferencesStore.persist.rehydrate();
    void useUserPreferencesStore.persist.rehydrate();
    void useWatchlistStore.persist.rehydrate();
    void useEngagementStore.persist.rehydrate();
    void useVotingStore.persist.rehydrate();
    void useComparisonStore.persist.rehydrate();
  }, []);

  return null;
}
