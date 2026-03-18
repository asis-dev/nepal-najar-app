'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  ArrowRight,
  FileText,
  Link2,
  Calendar,
  Building2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { promises, type GovernmentPromise } from '@/lib/data/promises';

/* ===================================================
   STATUS CONFIG
   =================================================== */
const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  not_started: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  delivered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  stalled: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
};

const statusLabelKeys: Record<string, string> = {
  not_started: 'commitment.notStarted',
  in_progress: 'commitment.inProgress',
  delivered: 'commitment.delivered',
  stalled: 'commitment.stalled',
};

const categoryColors: Record<string, string> = {
  Infrastructure: 'text-blue-400',
  Transport: 'text-amber-400',
  Technology: 'text-cyan-400',
  Health: 'text-rose-400',
  Environment: 'text-emerald-400',
  Energy: 'text-yellow-400',
  Education: 'text-purple-400',
  'Anti-Corruption': 'text-orange-400',
  Governance: 'text-indigo-400',
  Economy: 'text-teal-400',
  Social: 'text-pink-400',
};

/* ===================================================
   MAIN PAGE COMPONENT
   =================================================== */
export default function WatchlistPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const [hydrated, setHydrated] = useState(false);

  const { watchedProjectIds, toggleWatch, clearWatchlist } = useWatchlistStore();

  // Hydration guard
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Get watched promises
  const watchedPromises = useMemo(() => {
    if (!hydrated) return [];
    return promises.filter((p) => watchedProjectIds.includes(p.id));
  }, [hydrated, watchedProjectIds]);

  // Skeleton while hydrating
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-np-base">
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-3xl mx-auto">
            <div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-8" />
            <div className="h-10 w-48 bg-white/5 rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-white/5 rounded w-1/2 mb-3" />
                  <div className="h-2 bg-white/5 rounded w-full mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-np-base">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Back link */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Link>
          </div>
        </div>

        {/* Header */}
        <section className="px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                  <Eye className="w-7 h-7 sm:w-8 sm:h-8 text-primary-400" />
                  {isNe ? 'मेरो वाचलिस्ट' : 'My Watchlist'}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {watchedPromises.length}{' '}
                  {isNe ? 'वचनहरू हेरिरहेको' : 'promises watched'}
                </p>
              </div>

              {watchedPromises.length > 0 && (
                <button
                  onClick={clearWatchlist}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-red-400/80 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isNe ? 'सबै हटाउनुहोस्' : 'Clear all'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Watchlist Content */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-3xl mx-auto">
            {watchedPromises.length === 0 ? (
              /* Empty State */
              <div className="glass-card p-12 sm:p-16 text-center">
                <EyeOff className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">
                  {isNe ? 'वाचलिस्ट खाली छ' : 'Watchlist is empty'}
                </h2>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                  {isNe
                    ? 'तपाईंले अझै कुनै वचन हेर्न थाल्नुभएको छैन। पहिले 100 दिनको ट्र्याकरमा जानुहोस्।'
                    : 'You haven\'t added any promises to watch yet. Head to the commitment tracker to start watching.'}
                </p>
                <Link
                  href="/explore/first-100-days"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all duration-200"
                >
                  {isNe ? 'वचन ट्र्याकर हेर्नुहोस्' : 'Browse Commitment Tracker'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              /* Promise Cards */
              <div className="space-y-4">
                {watchedPromises.map((promise, idx) => {
                  const style = statusStyles[promise.status] ?? statusStyles.not_started;
                  const catColor = categoryColors[promise.category] ?? 'text-gray-400';

                  return (
                    <div
                      key={promise.id}
                      className="glass-card-hover p-5 sm:p-6 relative group"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Main content (clickable link) */}
                        <Link
                          href={`/explore/first-100-days/${promise.slug}`}
                          className="flex-1 min-w-0"
                        >
                          {/* Status + Category row */}
                          <div className="flex items-center gap-3 mb-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                              {t(statusLabelKeys[promise.status] ?? 'commitment.notStarted')}
                            </span>
                            <span className={`text-xs ${catColor}`}>
                              {isNe
                                ? `${promise.category_ne} / ${promise.category}`
                                : `${promise.category} / ${promise.category_ne}`}
                            </span>
                          </div>

                          {/* Title (bilingual) */}
                          <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-primary-300 transition-colors mb-0.5">
                            {isNe ? promise.title_ne : promise.title}
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {isNe ? promise.title : promise.title_ne}
                          </p>

                          {/* Progress bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-gray-500">{t('commitment.progress')}</span>
                              <span className="text-gray-300 font-medium">{promise.progress}%</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden bg-white/[0.06]">
                              <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                  width: `${promise.progress}%`,
                                  background:
                                    promise.status === 'delivered'
                                      ? 'linear-gradient(90deg, #059669, #10b981, #34d399)'
                                      : promise.status === 'stalled'
                                        ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                                        : 'linear-gradient(90deg, #2563eb, #06b6d4)',
                                }}
                              />
                            </div>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              {promise.linkedProjects}{' '}
                              {promise.linkedProjects !== 1
                                ? t('commitment.projectsPlural')
                                : t('commitment.projects')}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {promise.evidenceCount} {t('commitment.evidence')}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {promise.lastUpdate}
                            </span>
                          </div>
                        </Link>

                        {/* Unwatch toggle */}
                        <button
                          onClick={() => toggleWatch(promise.id)}
                          className="flex-shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-gray-400 transition-all duration-200 group/btn"
                          title={isNe ? 'हेर्न बन्द गर्नुहोस्' : 'Unwatch'}
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
