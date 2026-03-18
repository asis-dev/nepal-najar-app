'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Eye, EyeOff, Trash2, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { promises, type GovernmentPromise } from '@/lib/data/promises';

interface WatchlistPanelProps {
  open: boolean;
  onClose: () => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  not_started: { bg: 'bg-gray-500/15', text: 'text-gray-400' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  delivered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  stalled: { bg: 'bg-red-500/15', text: 'text-red-400' },
};

export function WatchlistPanel({ open, onClose }: WatchlistPanelProps) {
  const { t, locale } = useI18n();
  const isNe = locale === 'ne';
  const { watchedProjectIds, toggleWatch, clearWatchlist } = useWatchlistStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  const watchedPromises = useMemo(() => {
    if (!hydrated) return [];
    return watchedProjectIds
      .map((id) => promises.find((p) => p.id === id))
      .filter(Boolean) as GovernmentPromise[];
  }, [watchedProjectIds, hydrated]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-np-base border-l border-white/[0.06] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-np-base/95 backdrop-blur-xl border-b border-white/[0.06] px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary-400" />
              {t('watchlist.title')}
            </h2>
            {watchedPromises.length > 0 && (
              <span className="text-xs text-gray-500">
                {watchedPromises.length} {t('watchlist.promisesWatched')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {watchedPromises.length > 0 && (
              <button
                onClick={clearWatchlist}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                {t('watchlist.clearAll')}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {watchedPromises.length === 0 ? (
            <div className="text-center py-12">
              <EyeOff className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
                {t('watchlist.empty')}
              </p>
              <Link
                href="/explore/first-100-days"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-primary-300 bg-primary-500/15 border border-primary-500/30 hover:bg-primary-500/25 transition-all"
              >
                {isNe ? 'वचन हेर्नुहोस्' : 'Browse Promises'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {watchedPromises.map((promise) => {
                const style = statusColors[promise.status] ?? statusColors.not_started;
                return (
                  <div
                    key={promise.id}
                    className="glass-card-hover p-4 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/explore/first-100-days/${promise.slug}`}
                        onClick={onClose}
                        className="flex-1 min-w-0"
                      >
                        <h4 className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                          {isNe ? promise.title_ne : promise.title}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                          {isNe ? promise.title : promise.title_ne}
                        </p>
                      </Link>
                      <button
                        onClick={() => toggleWatch(promise.id)}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                        title={t('watchlist.unwatch')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Status + progress */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.text.replace('text-', 'bg-')}`} />
                        {promise.status.replace('_', ' ')}
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${promise.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums">{promise.progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
