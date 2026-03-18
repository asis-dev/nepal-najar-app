'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Flame, CheckCircle2, ArrowRight, Trophy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEngagementStore } from '@/lib/stores/engagement';
import { getDailyPromise } from '@/lib/data/daily-promise';

const statusColors: Record<string, string> = {
  not_started: 'text-gray-400',
  in_progress: 'text-blue-400',
  delivered: 'text-emerald-400',
  stalled: 'text-red-400',
};

export function DailyStreak() {
  const { t, locale } = useI18n();
  const isNe = locale === 'ne';
  const [hydrated, setHydrated] = useState(false);

  const { currentStreak, longestStreak, todayInteracted, recordVisit } = useEngagementStore();
  const dailyPromise = useMemo(() => getDailyPromise(), []);

  // Record visit on mount + handle hydration
  useEffect(() => {
    setHydrated(true);
    recordVisit();
  }, [recordVisit]);

  // Don't render streak numbers during SSR (prevents hydration mismatch)
  const streakDisplay = hydrated ? currentStreak : 0;
  const longestDisplay = hydrated ? longestStreak : 0;

  return (
    <div className="glass-card p-4">
      {/* Streak header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className={`w-5 h-5 ${streakDisplay > 0 ? 'text-orange-400' : 'text-gray-600'}`} />
          <div>
            <span className="text-lg font-bold text-white tabular-nums">{streakDisplay}</span>
            <span className="text-xs text-gray-500 ml-1.5">{t('dailyStreak.streakCount')}</span>
          </div>
        </div>

        {longestDisplay > 3 && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400/70">
            <Trophy className="w-3 h-3" />
            <span>{t('dailyStreak.longestStreak')}: {longestDisplay} {t('dailyStreak.days')}</span>
          </div>
        )}
      </div>

      {/* Today's promise */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
          {t('dailyStreak.todaysPromise')}
        </div>
        <h4 className="text-sm font-medium text-white mb-1 line-clamp-1">
          {isNe ? dailyPromise.title_ne : dailyPromise.title}
        </h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs ${statusColors[dailyPromise.status] ?? 'text-gray-400'}`}>
              {dailyPromise.progress}%
            </span>
            <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                style={{ width: `${dailyPromise.progress}%` }}
              />
            </div>
          </div>

          {hydrated && todayInteracted ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              {t('dailyStreak.doneForToday')}
            </span>
          ) : (
            <Link
              href={`/explore/first-100-days/${dailyPromise.slug}`}
              className="flex items-center gap-1 text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
            >
              {t('dailyStreak.voteOnIt')}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
