'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ComparisonStore {
  comparisonIds: string[];
  addToComparison: (id: string) => void;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;
  isInComparison: (id: string) => boolean;
}

export const useComparisonStore = create<ComparisonStore>()(
  persist(
    (set, get) => ({
      comparisonIds: [],
      addToComparison: (id) =>
        set((s) => ({
          comparisonIds:
            s.comparisonIds.length < 4
              ? [...s.comparisonIds, id]
              : s.comparisonIds,
        })),
      removeFromComparison: (id) =>
        set((s) => ({
          comparisonIds: s.comparisonIds.filter((x) => x !== id),
        })),
      clearComparison: () => set({ comparisonIds: [] }),
      isInComparison: (id) => get().comparisonIds.includes(id),
    }),
    {
      name: 'np-comparison',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
