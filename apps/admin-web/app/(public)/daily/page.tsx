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
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEngagementStore } from '@/lib/stores/engagement';
import { getDailyPromise, getDailyPromiseHistory } from '@/lib/data/daily-promise';
import { VoteWidget } from '@/components/public/vote-widget';

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

function getDayOfWeek(dateStr: string): number {
  // dateStr can be "2026-3-18" format
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.getDay();
}

function formatDateLabel(dateStr: string, isNe: boolean): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayIdx = d.getDay();
  return isNe ? dayNamesNe[dayIdx] : dayNamesEn[dayIdx];
}

/* ===================================================
   MAIN PAGE COMPONENT
   =================================================== */
export default function DailyPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const [hydrated, setHydrated] = useState(false);

  const {
    currentStreak,
    longestStreak,
    lastVisitDate,
    recordVisit,
  } = useEngagementStore();

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
          <div className="max-w-2xl mx-auto">
            <div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-8" />
            <div className="glass-card p-8 mb-6">
              <div className="h-24 w-24 bg-white/5 rounded-full mx-auto animate-pulse mb-4" />
              <div className="h-6 w-48 bg-white/5 rounded mx-auto animate-pulse" />
            </div>
            <div className="glass-card p-6 mb-6">
              <div className="h-4 w-32 bg-white/5 rounded animate-pulse mb-4" />
              <div className="h-20 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="flex gap-3 justify-center">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-10 h-14 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-np-base">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10">
        <div className="public-shell pt-6">
          <div className="mx-auto max-w-2xl">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Link>
          </div>
        </div>

        <section className="public-section pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 text-center sm:text-left">
                <div className="section-kicker">{isNe ? 'दैनिक ट्रयाकर' : 'Daily tracker'}</div>
                <h1 className="mt-4 text-3xl font-display font-bold text-white sm:text-4xl">
                  {isNe ? 'हरेक दिन एउटा सार्वजनिक वचन' : 'One public promise, every day'}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-400 sm:text-base">
                  {isNe
                    ? 'आजको मुख्य वाचा, यसको प्रगति, र तपाईँले निरन्तर पछ्याइरहनुभएको छ कि छैन हेर्नुहोस्।'
                    : 'Check one important promise each day, see its progress, and build a habit around staying informed.'}
                </p>
              </div>

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
                    {isNe ? 'दिनको लगातार' : 'day streak'}
                  </p>

                  {longestStreak > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-gray-400">
                        {isNe ? 'सबैभन्दा लामो:' : 'Longest:'}{' '}
                        <span className="font-semibold text-white">{longestStreak}</span>{' '}
                        {isNe ? 'दिन' : 'days'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <div className="glass-card p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <Target className="w-5 h-5 text-primary-400" />
                <h2 className="text-lg font-semibold text-white">
                  {isNe ? "आजको वचन" : "Today's Promise"}
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
                      {isNe ? 'प्रगति अझै प्रमाणित गरिएको छैन।' : 'No verified progress data yet.'}
                    </p>
                    {todayPromise.evidenceCount > 0 && (
                      <p className="text-[10px] text-cyan-500/60 mt-1">
                        {todayPromise.evidenceCount} article{todayPromise.evidenceCount !== 1 ? 's' : ''} mention this promise
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
                  {isNe ? '७ दिनको क्यालेन्डर' : '7-Day Calendar'}
                </h2>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {weekHistory.reverse().map((entry, idx) => {
                  const dayLabel = formatDateLabel(entry.date, isNe);
                  const isToday = entry.date === todayDateStr;
                  const isVisited = entry.date === lastVisitDate || isToday;

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-gray-500">{dayLabel}</span>
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
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
                          {isNe ? 'आज' : 'Today'}
                        </span>
                      )}
                    </div>
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
              {isNe ? 'आफ्नो स्ट्रीक साझा गर्नुहोस्' : 'Share your streak'}
            </button>
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
