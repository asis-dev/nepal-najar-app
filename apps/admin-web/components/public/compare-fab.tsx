'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, GitCompareArrows } from 'lucide-react';
import { useComparisonStore } from '@/lib/stores/comparison';

/**
 * Floating Action Button for promise comparison.
 * Shows when at least one promise is selected for comparison.
 * Positioned bottom-right, above the bottom nav bar.
 */
export function CompareFab() {
  const router = useRouter();
  const comparisonIds = useComparisonStore((s) => s.comparisonIds);
  const clearComparison = useComparisonStore((s) => s.clearComparison);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the persisted store on mount
  useEffect(() => {
    useComparisonStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  if (!hydrated || comparisonIds.length === 0) return null;

  const handleCompare = () => {
    router.push(`/explore/compare?ids=${comparisonIds.join(',')}`);
  };

  return (
    <div
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 transition-transform duration-300 ease-out animate-in fade-in zoom-in-95"
    >
      {/* Clear button */}
      <button
        onClick={clearComparison}
        className="glass-card flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-red-400 transition-colors"
        aria-label="Clear comparison"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Compare button */}
      <button
        onClick={handleCompare}
        className="glass-card glass-card-hover relative flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/10 transition-all hover:shadow-blue-500/20"
      >
        <GitCompareArrows className="h-4 w-4" />
        <span>Compare</span>
        {/* Count badge */}
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
          {comparisonIds.length}
        </span>
      </button>
    </div>
  );
}
