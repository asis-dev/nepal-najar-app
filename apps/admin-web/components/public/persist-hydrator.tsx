'use client';

import { useEffect } from 'react';
import { usePreferencesStore, useWatchlistStore } from '@/lib/stores/preferences';
import { useEngagementStore } from '@/lib/stores/engagement';
import { useVotingStore } from '@/lib/stores/voting';

export function PersistHydrator() {
  useEffect(() => {
    void usePreferencesStore.persist.rehydrate();
    void useWatchlistStore.persist.rehydrate();
    void useEngagementStore.persist.rehydrate();
    void useVotingStore.persist.rehydrate();
  }, []);

  return null;
}
