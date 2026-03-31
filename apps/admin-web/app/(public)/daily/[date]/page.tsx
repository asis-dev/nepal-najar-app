'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDailyActivity } from '@/lib/hooks/use-promises';
import { Breadcrumb } from '@/components/public/breadcrumb';

/* ===================================================
   STATUS CONFIG (mirrors daily page)
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
   DATE HELPERS
   =================================================== */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNepalToday(): string {
  const now = new Date();
  const nepalOffset = 5 * 60 + 45;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalDate = new Date(utcMs + nepalOffset * 60000);
  return formatDateParam(nepalDate);
}

/* ===================================================
   MAIN PAGE COMPONENT
   =================================================== */
export default function DailyDatePage() {
  const params = useParams();
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const dateParam = params.date as string;

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const targetDate = useMemo(() => parseDate(dateParam), [dateParam]);
  const { data: activity, isLoading: activityLoading } = useDailyActivity(dateParam);
  const spotlight = activity?.activePromises?.[0];
  const relatedActivity = (activity?.activePromises ?? []).slice(1, 5);

  // Previous and next day
  const prevDate = useMemo(() => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - 1);
    return formatDateParam(d);
  }, [targetDate]);

  const nextDate = useMemo(() => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + 1);
    return formatDateParam(d);
  }, [targetDate]);

  const todayStr = useMemo(() => getNepalToday(), []);
  const isToday = dateParam === todayStr;
  const isFuture = dateParam > todayStr;

  const displayDate = useMemo(() => {
    return targetDate.toLocaleDateString(isNe ? 'ne-NP' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [targetDate, isNe]);

  // Skeleton while hydrating
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-np-base">
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-2xl mx-auto">
            <div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-8" />
            <div className="glass-card p-8 mb-6">
              <div className="h-6 w-48 bg-white/5 rounded mx-auto animate-pulse mb-4" />
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
          <div className="mx-auto max-w-2xl">
            <Breadcrumb
              items={[
                { label: t('breadcrumb.daily'), href: '/daily' },
                { label: displayDate },
              ]}
            />

            <Link
              href="/daily"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Link>
          </div>
        </div>

        {/* Day navigation */}
        <section className="public-section pt-4 pb-0">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <Link
                  href={`/daily/${prevDate}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('dailyPage.previous')}
                </Link>

                <div className="text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white">{displayDate}</span>
                  </div>
                  {isToday && (
                    <span className="text-[10px] text-primary-400 font-medium">
                      {t('dailyStreak.today')}
                    </span>
                  )}
                </div>

                {!isFuture && (
                  <Link
                    href={`/daily/${nextDate}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                  >
                    {t('dailyPage.next')}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
                {isFuture && <div className="w-[90px]" />}
              </div>
            </div>
          </div>
        </section>

        {/* Daily activity card */}
        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <div className="glass-card p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <h2 className="text-lg font-semibold text-white">
                    {t('dailyPage.topActivity')}
                  </h2>
                </div>

                {activityLoading ? (
                  <div className="space-y-3">
                    <div className="h-5 w-32 rounded bg-white/[0.06] animate-pulse" />
                    <div className="h-6 w-3/4 rounded bg-white/[0.06] animate-pulse" />
                    <div className="h-16 rounded bg-white/[0.04] animate-pulse" />
                  </div>
                ) : spotlight ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                        <Activity className="w-3 h-3" />
                        {spotlight.signalCount} {spotlight.signalCount === 1 ? t('dailyStreak.signal') : t('dailyStreak.signals')}
                      </span>
                      {spotlight.status ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[spotlight.status]?.bg ?? statusStyles.not_started.bg} ${statusStyles[spotlight.status]?.text ?? statusStyles.not_started.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[spotlight.status]?.dot ?? statusStyles.not_started.dot}`} />
                          {t(statusLabelKeys[spotlight.status] ?? 'commitment.notStarted')}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                      {isNe ? spotlight.title_ne : spotlight.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {isNe ? spotlight.title : spotlight.title_ne}
                    </p>
                    <p className="text-sm text-gray-400 leading-relaxed mb-5">
                      {spotlight.topHeadline || t('dailyPage.strongestSignalDate')}
                    </p>

                    <div className="mt-5 pt-4 border-t border-white/[0.06]">
                      <Link
                        href={`/explore/first-100-days/${spotlight.slug || spotlight.promiseId}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary-300 hover:text-primary-200 transition-colors"
                      >
                        {t('dailyPage.viewFullDetails')}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    {relatedActivity.length > 0 ? (
                      <div className="mt-6 space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                          {t('dailyPage.moreActivity')}
                        </p>
                        {relatedActivity.map((item) => (
                          <Link
                            key={item.promiseId}
                            href={`/explore/first-100-days/${item.slug || item.promiseId}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-gray-300 transition-colors hover:bg-white/[0.05]"
                          >
                            <span className="truncate">{isNe ? item.title_ne : item.title}</span>
                            <span className="shrink-0 text-xs text-emerald-400">
                              {item.signalCount} {item.signalCount === 1 ? t('dailyStreak.signal') : t('dailyStreak.signals')}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                      <span>{t('dailyPage.noActivityFound')}</span>
                    </div>
                    <p>
                      {t('dailyPage.noActivityFoundDesc')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Back to Today link */}
        {!isToday && (
          <section className="px-4 sm:px-6 lg:px-8 pb-16">
            <div className="max-w-2xl mx-auto text-center">
              <Link
                href="/daily"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all duration-200 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)]"
              >
                <Calendar className="w-4 h-4" />
                {t('dailyPage.backToToday')}
              </Link>
            </div>
          </section>
        )}

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
