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
  Activity,
  Bell,
  MapPin,
  ArrowUpRight,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePreferencesStore, useWatchlistStore } from '@/lib/stores/preferences';
import { useAllPromises, useDailyActivity } from '@/lib/hooks/use-promises';
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

function formatRelativeDate(dateString: string | null | undefined, t: (key: string) => string): string {
  if (!dateString) return t('dates.freshnessUnavailable');
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return t('dates.freshnessUnavailable');

  const diffDays = Math.floor((Date.now() - value.getTime()) / 86400000);
  if (diffDays <= 0) return t('dates.today');
  if (diffDays === 1) return t('dates.yesterday');
  if (diffDays < 7) return t('dates.daysAgo').replace('{days}', String(diffDays));
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return t('dates.weeksAgo').replace('{weeks}', String(diffWeeks));
  const diffMonths = Math.floor(diffDays / 30);
  return t('dates.monthsAgo').replace('{months}', String(diffMonths));
}

/* ===================================================
   MAIN PAGE COMPONENT
   =================================================== */
export default function WatchlistPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const [hydrated, setHydrated] = useState(false);

  const { watchedProjectIds, toggleWatch, clearWatchlist } = useWatchlistStore();
  const { province, hasSetHometown } = usePreferencesStore();
  const { data: livePromises } = useAllPromises();
  const { data: dailyActivity } = useDailyActivity();

  // Hydration guard
  useEffect(() => {
    setHydrated(true);
  }, []);

  const sourcePromises = livePromises?.length ? livePromises : promises;

  // Get watched promises
  const watchedPromises = useMemo(() => {
    if (!hydrated) return [];
    return sourcePromises.filter((p) => watchedProjectIds.includes(p.id));
  }, [hydrated, watchedProjectIds, sourcePromises]);

  const activePromiseMap = useMemo(
    () => new Map((dailyActivity?.activePromises ?? []).map((promise) => [promise.promiseId, promise])),
    [dailyActivity],
  );

  const activeWatchedPromises = useMemo(
    () => watchedPromises.filter((promise) => activePromiseMap.has(promise.id)),
    [activePromiseMap, watchedPromises],
  );

  const totalWatchedSignals = useMemo(
    () => activeWatchedPromises.reduce((sum, promise) => sum + (activePromiseMap.get(promise.id)?.signalCount ?? 0), 0),
    [activePromiseMap, activeWatchedPromises],
  );

  const leadWatchedPromise = activeWatchedPromises[0] ?? watchedPromises[0];

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
                  {t('watchlist.title')}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {watchedPromises.length}{' '}
                  {t('watchlist.promisesWatched')}
                </p>
              </div>

              {watchedPromises.length > 0 && (
                <button
                  onClick={clearWatchlist}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-red-400/80 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('watchlist.clearAll')}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-3xl mx-auto">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(13,34,64,0.92),rgba(8,47,73,0.35))] shadow-[0_18px_70px_rgba(2,6,23,0.3)]">
              <div className="grid gap-4 p-6 sm:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    <Eye className="h-3.5 w-3.5" />
                    Return here
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                    {watchedPromises.length > 0
                      ? `Your watchlist is tracking ${watchedPromises.length} commitments`
                      : 'Your watchlist becomes the easiest reason to come back'}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-gray-300 sm:text-base">
                    {watchedPromises.length > 0
                      ? `${activeWatchedPromises.length} watched commitments moved today with ${totalWatchedSignals} tracked signals. ${leadWatchedPromise ? `Lead watch: ${leadWatchedPromise.title}.` : ''}`
                      : 'Save the commitments you care about and Nepal Republic starts feeling personal instead of generic.'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/daily"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
                    >
                      Open daily changes
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/notifications"
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-500/15"
                    >
                      Notifications
                      <Bell className="h-4 w-4" />
                    </Link>
                    <Link
                      href={hasSetHometown ? '/affects-me' : '/explore/first-100-days'}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.08]"
                    >
                      {hasSetHometown && province ? `${province} lens` : 'Browse tracker'}
                      <MapPin className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">Active today</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{activeWatchedPromises.length}</p>
                    <p className="mt-1 text-xs text-gray-400">watched commitments moved</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">Signals</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{totalWatchedSignals}</p>
                    <p className="mt-1 text-xs text-gray-400">today across your watchlist</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300">Saved</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{watchedPromises.length}</p>
                    <p className="mt-1 text-xs text-gray-400">commitments you are following</p>
                  </div>
                </div>
              </div>
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
                  {t('watchlist.isEmpty')}
                </h2>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                  {t('watchlist.emptyDesc')}
                </p>
                <Link
                  href="/explore/first-100-days"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all duration-200"
                >
                  {t('watchlist.browseTracker')}
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
                      className="glass-card-hover p-5 sm:p-6 relative group overflow-hidden"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-[2px] opacity-70"
                        style={{
                          background:
                            promise.status === 'delivered'
                              ? 'linear-gradient(90deg, rgba(16,185,129,0.05), rgba(16,185,129,0.8), rgba(52,211,153,0.1))'
                              : promise.status === 'stalled'
                                ? 'linear-gradient(90deg, rgba(239,68,68,0.05), rgba(248,113,113,0.8), rgba(239,68,68,0.1))'
                                : 'linear-gradient(90deg, rgba(37,99,235,0.05), rgba(34,211,238,0.8), rgba(59,130,246,0.1))',
                        }}
                      />
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

                          <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-gray-300">
                              <Activity className="h-3 w-3 text-cyan-300" />
                              {activePromiseMap.has(promise.id)
                                ? `${activePromiseMap.get(promise.id)?.signalCount ?? 0} signals today`
                                : formatRelativeDate(promise.lastActivityDate || promise.lastSignalAt || promise.lastUpdate, t)}
                            </span>
                            {promise.actors?.[0] ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-gray-300">
                                <Building2 className="h-3 w-3 text-emerald-300" />
                                {promise.actors[0]}
                              </span>
                            ) : null}
                          </div>

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
                              {formatRelativeDate(promise.lastActivityDate || promise.lastSignalAt || promise.lastUpdate, t)}
                            </span>
                          </div>
                        </Link>

                        {/* Unwatch toggle */}
                        <button
                          onClick={() => toggleWatch(promise.id)}
                          className="flex-shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-gray-400 transition-all duration-200 group/btn"
                          title={t('watchlist.unwatch')}
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
