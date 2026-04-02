'use client';

import { useState, useMemo } from 'react';
import { Users, Activity, Search, ChevronDown, ChevronUp, VolumeX } from 'lucide-react';
import { useMinistersWeekly } from '@/lib/hooks/use-ministers';
import { MinisterCard } from '@/components/public/ministers/minister-card';
import { useI18n } from '@/lib/i18n';

/* ═══════════════════════════════════════════════
   CABINET MINISTERS — WEEKLY ACTIVITY
   ═══════════════════════════════════════════════ */

type SortOption = 'most-active' | 'least-active' | 'alpha';

const SORT_LABELS: Record<SortOption, { en: string; ne: string }> = {
  'most-active': { en: 'Most Active', ne: 'सबैभन्दा सक्रिय' },
  'least-active': { en: 'Least Active', ne: 'कम सक्रिय' },
  alpha: { en: 'A-Z', ne: 'क-ज्ञ' },
};

export default function MinistersPage() {
  const { locale, localizeField } = useI18n();
  const isNe = locale === 'ne';

  const { ministers, period, isLoading } = useMinistersWeekly();

  const [sort, setSort] = useState<SortOption>('most-active');
  const [search, setSearch] = useState('');
  const [showQuiet, setShowQuiet] = useState(false);

  // Split into active and quiet ministers
  const { activeMinisters, quietMinisters, totalSignals, mostActive } = useMemo(() => {
    let filtered = ministers;

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.nameNe && m.nameNe.includes(q)) ||
          m.ministry.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q),
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'most-active':
          return b.weeklyActivity.totalSignals - a.weeklyActivity.totalSignals;
        case 'least-active':
          return a.weeklyActivity.totalSignals - b.weeklyActivity.totalSignals;
        case 'alpha':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    const active = sorted.filter((m) => m.weeklyActivity.totalSignals > 0);
    const quiet = sorted.filter((m) => m.weeklyActivity.totalSignals === 0);

    const total = ministers.reduce((s, m) => s + m.weeklyActivity.totalSignals, 0);
    const top =
      ministers.length > 0
        ? [...ministers].sort((a, b) => b.weeklyActivity.totalSignals - a.weeklyActivity.totalSignals)[0]
        : null;

    return {
      activeMinisters: active,
      quietMinisters: quiet,
      totalSignals: total,
      mostActive: top,
    };
  }, [ministers, search, sort]);

  return (
    <div className="min-h-screen bg-np-void pb-24">
      {/* Hero */}
      <div className="border-b border-gray-800/50 bg-gradient-to-b from-gray-900/80 to-transparent px-4 pb-6 pt-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary-400">
            <Users className="h-3.5 w-3.5" />
            {isNe ? 'क्याबिनेट' : 'Cabinet'}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-100">
            {isNe ? 'मन्त्रीपरिषद्' : 'Cabinet Ministers'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {isNe ? 'यस हप्ता उनीहरूले के गरे?' : 'What did they do this week?'}
          </p>

          {/* Stats row */}
          {!isLoading && ministers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <StatPill label={isNe ? 'मन्त्रीहरू' : 'Ministers'} value={String(ministers.length)} />
              <StatPill label={isNe ? 'सिग्नलहरू' : 'Signals'} value={String(totalSignals)} />
              {mostActive && mostActive.weeklyActivity.totalSignals > 0 && (
                <StatPill
                  label={isNe ? 'सबैभन्दा सक्रिय' : 'Most Active'}
                  value={localizeField(mostActive.name, mostActive.nameNe)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sort / Filter bar */}
      <div className="sticky top-0 z-20 border-b border-gray-800/50 bg-np-void/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={isNe ? 'खोज्नुहोस्...' : 'Search ministers...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900/60 py-2 pl-8 pr-3 text-xs text-gray-200 placeholder-gray-500 outline-none transition-colors focus:border-gray-700"
            />
          </div>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-xs text-gray-300 outline-none transition-colors focus:border-gray-700"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {isNe ? SORT_LABELS[key].ne : SORT_LABELS[key].en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 pt-4">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-800 bg-gray-900/80 p-4"
              >
                <div className="h-4 w-3/4 rounded bg-gray-800" />
                <div className="mt-2 h-3 w-1/2 rounded bg-gray-800" />
                <div className="mt-3 h-3 w-full rounded bg-gray-800" />
                <div className="mt-2 h-3 w-2/3 rounded bg-gray-800" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && ministers.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <Users className="h-10 w-10 text-gray-600" />
            <p className="mt-3 text-sm text-gray-400">
              {isNe ? 'मन्त्री डाटा उपलब्ध छैन।' : 'No minister roster data available.'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {isNe
                ? 'कृपया पछि पुनः प्रयास गर्नुहोस्।'
                : 'Please check back later.'}
            </p>
          </div>
        )}

        {/* Active ministers grid */}
        {!isLoading && activeMinisters.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeMinisters.map((m) => (
              <MinisterCard key={m.slug} minister={m} locale={locale} />
            ))}
          </div>
        )}

        {/* Quiet ministers section */}
        {!isLoading && quietMinisters.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowQuiet(!showQuiet)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3 text-left transition-colors hover:border-gray-700"
            >
              <div className="flex items-center gap-2">
                <VolumeX className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-400">
                  {isNe ? 'शान्त मन्त्रीहरू' : 'Quiet Ministers'}
                </span>
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-400">
                  {quietMinisters.length}
                </span>
              </div>
              {showQuiet ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {showQuiet && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {quietMinisters.map((m) => (
                  <MinisterCard key={m.slug} minister={m} locale={locale} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stat Pill ─── */

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-200">{value}</span>
    </div>
  );
}
