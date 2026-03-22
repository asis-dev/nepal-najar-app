'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Flame,
  Trophy,
  Share2,
  Calendar,
  Target,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEngagementStore } from '@/lib/stores/engagement';
import { getDailyPromise, getDailyPromiseHistory } from '@/lib/data/daily-promise';
import { VoteWidget } from '@/components/public/vote-widget';
import { PublicPageHero } from '@/components/public/page-hero';
import { useDailyActivity } from '@/lib/hooks/use-promises';
import type { DailyActivityPromise, DailyActivityInactive } from '@/lib/hooks/use-promises';

/* ===================================================
   STATUS CONFIG (mirrors first-100-days)
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

/* ===================================================
   DAY NAME HELPERS
   =================================================== */
const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayNamesNe = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

function formatDateLabel(dateStr: string, isNe: boolean): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayIdx = d.getDay();
  return isNe ? dayNamesNe[dayIdx] : dayNamesEn[dayIdx];
}

/* ===================================================
   CONSTANTS
   =================================================== */
const TOTAL_PROMISES = 109;
const INACTIVE_INITIAL_SHOW = 10;

/* ===================================================
   MAIN PAGE COMPONENT
   =================================================== */
export default function DailyPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const [hydrated, setHydrated] = useState(false);
  const [showAllInactive, setShowAllInactive] = useState(false);

  const {
    currentStreak,
    longestStreak,
    lastVisitDate,
    recordVisit,
  } = useEngagementStore();

  // Daily activity data
  const { data: activity, isLoading: activityLoading } = useDailyActivity();

  // Hydration guard
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Record visit on mount
  useEffect(() => {
    if (hydrated) {
      recordVisit();
    }
  }, [hydrated, recordVisit]);

  // Get today's promise and history
  const todayPromise = useMemo(() => getDailyPromise(), []);
  const weekHistory = useMemo(() => getDailyPromiseHistory(7), []);

  // Get today's date string for comparison
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const nepalOffset = 5 * 60 + 45;
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const nepalDate = new Date(utcMs + nepalOffset * 60000);
    return `${nepalDate.getFullYear()}-${nepalDate.getMonth() + 1}-${nepalDate.getDate()}`;
  }, []);

  const style = statusStyles[todayPromise.status] ?? statusStyles.not_started;

  const totalActive = activity?.summary?.activeCount ?? 0;
  const totalInactive = activity?.summary?.inactiveCount ?? 0;
  const totalSignals = activity?.summary?.totalSignals ?? 0;

  const visibleInactive = showAllInactive
    ? (activity?.inactivePromises ?? [])
    : (activity?.inactivePromises ?? []).slice(0, INACTIVE_INITIAL_SHOW);

  // Share streak handler
  function handleShareStreak() {
    const text = isNe
      ? `Nepal Najar ma mero streak ${currentStreak} din! Join me: ${typeof window !== 'undefined' ? window.location.href : ''}`
      : `My Nepal Najar streak is ${currentStreak} days! Join me: ${typeof window !== 'undefined' ? window.location.href : ''}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Nepal Najar Streak',
        text,
        url: typeof window !== 'undefined' ? window.location.href : '',
      }).catch(() => {});
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  }

  // Skeleton while hydrating
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-np-base">
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-3xl mx-auto">
            <div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-8" />
            <div className="glass-card p-8 mb-6">
              <div className="h-24 w-24 bg-white/5 rounded-full mx-auto animate-pulse mb-4" />
              <div className="h-6 w-48 bg-white/5 rounded mx-auto animate-pulse" />
            </div>
            <div className="glass-card p-6 mb-6">
              <div className="h-4 w-32 bg-white/5 rounded animate-pulse mb-4" />
              <div className="h-20 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10">
        <div className="public-shell pt-6">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Link>
          </div>
        </div>

        <PublicPageHero
          eyebrow={t('dailyStreak.activityDashboard')}
          title={t('dailyStreak.heroSubtitle')}
          centered
        />

        {/* ═══════════════════════════════════════════
            HERO STAT: X of 109 promises had activity
            ═══════════════════════════════════════════ */}
        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="glass-card public-gradient-panel relative overflow-hidden p-7 text-center sm:p-10">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.04] via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10">
                  {activityLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-20 w-28 bg-white/5 rounded-xl animate-pulse" />
                      <div className="h-5 w-56 bg-white/5 rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex items-baseline justify-center gap-3">
                        <span className="bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-7xl font-bold text-transparent tabular-nums sm:text-8xl">
                          {totalActive}
                        </span>
                        <span className="text-xl text-gray-400 sm:text-2xl">
                          {t('dailyStreak.of')} {TOTAL_PROMISES}
                        </span>
                      </div>
                      <p className="text-base text-gray-400 sm:text-lg">
                        {t('dailyStreak.heroTitle')}
                      </p>
                      {totalSignals > 0 && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-1.5">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-emerald-300 font-medium">
                            {totalSignals} {totalSignals === 1 ? t('dailyStreak.signal') : t('dailyStreak.signals')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            ACTIVE TODAY (green section)
            ═══════════════════════════════════════════ */}
        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {t('dailyStreak.activeToday')}
                </h2>
                <span className="text-sm text-gray-500">
                  ({totalActive})
                </span>
              </div>

              {activityLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-card p-4">
                      <div className="h-5 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
                      <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : totalActive === 0 ? (
                <div className="glass-card p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {isNe ? 'आज कुनै गतिविधि छैन' : 'No activity detected today'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(activity?.activePromises ?? []).map((ap: DailyActivityPromise) => (
                    <Link
                      key={ap.promiseId}
                      href={`/promises/${ap.slug || ap.promiseId}`}
                      className="glass-card block p-4 sm:p-5 hover:border-emerald-500/30 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Pulsing green dot */}
                        <div className="relative mt-1.5 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors truncate sm:text-base">
                            {isNe ? ap.title_ne : ap.title}
                          </h3>

                          {/* Signal count badge */}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                              <Activity className="w-3 h-3" />
                              {ap.signalCount} {ap.signalCount === 1 ? t('dailyStreak.signal') : t('dailyStreak.signals')}
                            </span>

                            {/* Breakdown badges */}
                            {ap.confirmsCount > 0 && (
                              <span className="text-[10px] text-emerald-400/70">
                                +{ap.confirmsCount} {isNe ? 'पुष्टि' : 'confirms'}
                              </span>
                            )}
                            {ap.contradictsCount > 0 && (
                              <span className="text-[10px] text-red-400/70">
                                -{ap.contradictsCount} {isNe ? 'विरोध' : 'contradicts'}
                              </span>
                            )}
                          </div>

                          {/* Top headline */}
                          {ap.topHeadline && (
                            <p className="mt-2 text-xs text-gray-500 line-clamp-1">
                              {ap.topHeadline}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            NO ACTIVITY (gray section)
            ═══════════════════════════════════════════ */}
        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                <h2 className="text-lg font-semibold text-gray-400">
                  {t('dailyStreak.noActivity')}
                </h2>
                <span className="text-sm text-gray-600">
                  ({totalInactive})
                </span>
              </div>

              {activityLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-card p-3">
                      <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {visibleInactive.map((ip: DailyActivityInactive) => (
                      <Link
                        key={ip.promiseId}
                        href={`/promises/${ip.slug || ip.promiseId}`}
                        className="glass-card block px-4 py-3 hover:border-gray-500/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Gray dot */}
                          <div className="w-2 h-2 rounded-full bg-gray-600 shrink-0" />

                          {/* Title */}
                          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors truncate flex-1">
                            {isNe ? ip.title_ne : ip.title}
                          </span>

                          {/* Staleness label */}
                          <span className="text-xs text-gray-600 shrink-0 whitespace-nowrap">
                            {ip.daysSinceLastActivity === null
                              ? t('dailyStreak.neverActive')
                              : ip.daysSinceLastActivity === 1
                                ? `1 ${t('dailyStreak.daySince')}`
                                : `${ip.daysSinceLastActivity} ${t('dailyStreak.daysSince')}`}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Show more / less toggle */}
                  {totalInactive > INACTIVE_INITIAL_SHOW && (
                    <button
                      onClick={() => setShowAllInactive(!showAllInactive)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-300 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all duration-200"
                    >
                      {showAllInactive ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          {isNe ? 'कम देखाउनुहोस्' : 'Show less'}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          {isNe
                            ? `सबै ${totalInactive} देखाउनुहोस्`
                            : `Show all ${totalInactive}`}
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            DIVIDER — secondary content below
            ═══════════════════════════════════════════ */}
        <div className="public-shell">
          <div className="mx-auto max-w-3xl">
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
            <div className="flex items-center justify-center gap-2 mb-6">
              <Flame className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600 uppercase tracking-wider font-medium">
                {t('dailyStreak.streakAndDaily')}
              </span>
              <Flame className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            STREAK CARD (secondary)
            ═══════════════════════════════════════════ */}
        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <div className="glass-card public-gradient-panel relative overflow-hidden p-7 text-center sm:p-10">
                {currentStreak >= 3 && (
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.06] via-transparent to-transparent pointer-events-none" />
                )}

                <div className="relative z-10">
                  <div className="mb-3 flex items-center justify-center gap-3">
                    <Flame
                      className={`w-10 h-10 sm:w-12 sm:h-12 ${
                        currentStreak >= 7
                          ? 'text-orange-400'
                          : currentStreak >= 3
                            ? 'text-amber-400'
                            : 'text-gray-500'
                      }`}
                    />
                    <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-6xl font-bold text-transparent tabular-nums sm:text-7xl">
                      {currentStreak}
                    </span>
                  </div>

                  <p className="mb-4 text-sm text-gray-400 sm:text-base">
                    {t('dailyStreak.streakCount')}
                  </p>

                  {longestStreak > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-gray-400">
                        {t('dailyStreak.longest')}{' '}
                        <span className="font-semibold text-white">{longestStreak}</span>{' '}
                        {t('dailyStreak.days')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            TODAY'S PROMISE (secondary)
            ═══════════════════════════════════════════ */}
        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <div className="glass-card p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <Target className="w-5 h-5 text-primary-400" />
                <h2 className="text-lg font-semibold text-white">
                  {t('dailyStreak.todaysPromise')}
                </h2>
              </div>

              {/* Status + Category */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {t(statusLabelKeys[todayPromise.status] ?? 'commitment.notStarted')}
                </span>
                <span className="text-xs text-gray-500">
                  {isNe
                    ? `${todayPromise.category_ne} / ${todayPromise.category}`
                    : `${todayPromise.category} / ${todayPromise.category_ne}`}
                </span>
              </div>

              {/* Title (bilingual) */}
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {isNe ? todayPromise.title_ne : todayPromise.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {isNe ? todayPromise.title : todayPromise.title_ne}
              </p>

              {/* Description */}
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                {isNe ? todayPromise.description_ne : todayPromise.description}
              </p>

              {/* Progress — honest display */}
              <div className="mb-5">
                {todayPromise.progress > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500">{t('commitment.progress')}</span>
                      <span className="text-gray-300 font-medium">{todayPromise.progress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${todayPromise.progress}%`,
                          background: 'linear-gradient(90deg, #2563eb, #06b6d4)',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-gray-500">
                      {t('dailyStreak.noProgress')}
                    </p>
                    {todayPromise.evidenceCount > 0 && (
                      <p className="text-[10px] text-cyan-500/60 mt-1">
                        {todayPromise.evidenceCount} {t('dailyStreak.articlesMention')}
                      </p>
                    )}
                  </div>
                )}
              </div>

                <VoteWidget promiseId={todayPromise.id} variant="full" />
              </div>
            </div>
          </div>
        </section>

        {/* 7-Day Calendar */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">
                  {t('dailyStreak.sevenDayCalendar')}
                </h2>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {weekHistory.reverse().map((entry, idx) => {
                  const dayLabel = formatDateLabel(entry.date, isNe);
                  const isToday = entry.date === todayDateStr;
                  const isVisited = entry.date === lastVisitDate || isToday;
                  // Format date for URL: ensure YYYY-MM-DD with zero-padded values
                  const parts = entry.date.split('-').map(Number);
                  const linkDate = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;

                  return (
                    <Link
                      key={idx}
                      href={isToday ? '/daily' : `/daily/${linkDate}`}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group"
                    >
                      <span className="text-[10px] text-gray-500">{dayLabel}</span>
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:border-primary-400 ${
                          isVisited
                            ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'bg-white/[0.04] border-2 border-white/[0.08]'
                        }`}
                      >
                        {isVisited ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-600" />
                        )}
                      </div>
                      {isToday && (
                        <span className="text-[9px] text-primary-400 font-medium">
                          {t('dailyStreak.today')}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Share Streak */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-2xl mx-auto text-center">
            <button
              onClick={handleShareStreak}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all duration-200 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)]"
            >
              <Share2 className="w-4 h-4" />
              {t('dailyStreak.shareStreak')}
            </button>
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
