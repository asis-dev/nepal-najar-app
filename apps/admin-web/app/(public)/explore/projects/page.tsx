'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Eye, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAllPromises } from '@/lib/hooks/use-promises';
import { PublicPageHero } from '@/components/public/page-hero';
import { SignalBadge } from '@/components/public/signal-badge';
import { formatNPR } from '@/lib/data/promises';
import type { GovernmentPromise, PromiseStatus } from '@/lib/data/promises';

const STATUS_FILTERS = ['all', 'in_progress', 'delivered', 'stalled', 'not_started'] as const;

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  delivered: 'Delivered',
  stalled: 'Stalled',
  not_started: 'Not Started',
};

const STATUS_STYLES: Record<string, { pill: string; bar: string }> = {
  in_progress: {
    pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    bar: 'bg-emerald-500',
  },
  delivered: {
    pill: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    bar: 'bg-blue-500',
  },
  stalled: {
    pill: 'bg-red-500/15 text-red-400 border-red-500/30',
    bar: 'bg-red-500',
  },
  not_started: {
    pill: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    bar: 'bg-gray-500',
  },
};

const CATEGORY_FILTERS = [
  'all',
  'infrastructure',
  'transport',
  'technology',
  'health',
  'energy',
  'education',
  'environment',
  'governance',
  'anti_corruption',
  'economy',
  'social',
] as const;

function PromiseCard({ promise, locale }: { promise: GovernmentPromise; locale: string }) {
  const style = STATUS_STYLES[promise.status] ?? STATUS_STYLES.not_started;
  const progress = Math.round(promise.progress ?? 0);

  return (
    <Link
      href={`/explore/first-100-days/${promise.slug}`}
      className="glass-card-hover group block rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-primary-500/30 hover:bg-white/[0.08]"
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-2">
          {locale === 'ne' && promise.title_ne ? promise.title_ne : promise.title}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${style.pill}`}
        >
          {STATUS_LABELS[promise.status] ?? promise.status}
        </span>
      </div>

      {/* Signal + category */}
      <div className="flex items-center gap-2 mb-4">
        <SignalBadge type={promise.signalType} compact />
        <span className="text-xs text-gray-500 capitalize">{promise.category.replace(/_/g, ' ')}</span>
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-white/50">Progress</span>
            <span className="font-mono font-semibold text-white">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
        {locale === 'ne' && promise.description_ne ? promise.description_ne : promise.description}
      </p>

      {/* Meta info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {promise.evidenceCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {promise.evidenceCount} evidence
            </span>
          )}
          {promise.estimatedBudgetNPR && promise.estimatedBudgetNPR > 0 && (
            <span>₹{formatNPR(promise.estimatedBudgetNPR)}</span>
          )}
        </div>
        <span className="text-gray-600">{promise.lastUpdate}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 text-sm font-medium text-primary-400 group-hover:text-primary-300 transition-colors flex items-center gap-1">
        View details <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}

export default function ExploreProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { locale, t } = useI18n();

  const { data: promises, isLoading, isError } = useAllPromises();

  // Filter promises
  const filtered = useMemo(() => {
    if (!promises) return [];
    return promises.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.title_ne?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [promises, statusFilter, categoryFilter, search]);

  return (
    <div className="public-page">
      <PublicPageHero
        eyebrow={
          <>
            <Eye className="h-4 w-4" />
            Tracked delivery
          </>
        }
        title="Government promises and linked delivery"
        description={`${promises?.length ?? '--'} tracked promises from PM Balen's government. Filter by status or sector, then open a promise to see linked evidence, progress, and who owns delivery.`}
        aside={
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">How to use this page</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Start broad, then narrow by status or sector. The strongest cards are the ones with evidence, recent updates, and accountable institutions attached.
            </p>
          </div>
        }
      />

      <div className="public-shell">
        <div className="glass-card mb-6 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search promises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/30 backdrop-blur-md transition-colors focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
          />
            </div>

            <p className="text-sm leading-6 text-gray-400">
              Search by sector, keyword, or promise title. Filters below update the grid immediately.
            </p>
          </div>
        </div>

        <div className="mb-4 public-filter-row justify-center lg:justify-start">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                statusFilter === s
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                  : 'border border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>

        <div className="mb-8 public-filter-row justify-center lg:justify-start">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 capitalize ${
                categoryFilter === c
                  ? 'bg-nepal-red/20 text-nepal-red border border-nepal-red/40'
                  : 'border border-white/8 text-gray-500 hover:text-gray-300'
              }`}
            >
              {c === 'all' ? 'All Sectors' : c.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-400" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300">
            Failed to load promises. Check your Supabase configuration.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="py-20 text-center text-white/40">
            No promises match your filters.
          </div>
        )}

        {/* Promise grid */}
        {!isLoading && filtered.length > 0 && (
          <>
            <p className="text-xs text-gray-500 mb-4 text-center">
              Showing {filtered.length} of {promises?.length ?? 0} promises
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((promise) => (
                <PromiseCard key={promise.id} promise={promise} locale={locale} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
