'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, TrendingUp, TrendingDown, Minus, ArrowRight, BarChart3 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/stores/preferences';
import { getScoreForRegion, getNationalAverage, type RegionScore } from '@/lib/data/ward-scores';
import { formatNPR } from '@/lib/data/promises';

export function MeroWardCard() {
  const { t, locale } = useI18n();
  const isNe = locale === 'ne';
  const [hydrated, setHydrated] = useState(false);

  const { province, district, hasSetHometown, setShowPicker } = usePreferencesStore();

  useEffect(() => { setHydrated(true); }, []);

  const regionScore = useMemo<RegionScore | undefined>(() => {
    if (!province) return undefined;
    return getScoreForRegion(province, district ?? undefined);
  }, [province, district]);

  const nationalAvg = useMemo(() => getNationalAverage(), []);

  if (!hydrated) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-20 bg-white/[0.03] rounded-xl" />
      </div>
    );
  }

  // Not set — show CTA
  if (!hasSetHometown || !province || !regionScore) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {t('meroWard.title')}
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-3">{t('meroWard.setLocation')}</p>
        <button
          onClick={() => setShowPicker(true)}
          className="w-full px-4 py-2 rounded-xl text-sm font-medium text-primary-300 bg-primary-500/15 border border-primary-500/30 hover:bg-primary-500/25 transition-all"
        >
          {t('hometown.setLocation')}
        </button>
      </div>
    );
  }

  const TrendIcon = regionScore.trend === 'up' ? TrendingUp : regionScore.trend === 'down' ? TrendingDown : Minus;
  const trendColor = regionScore.trend === 'up' ? 'text-emerald-400' : regionScore.trend === 'down' ? 'text-red-400' : 'text-gray-400';
  const scoreColor = regionScore.score >= 60 ? 'text-emerald-400' : regionScore.score >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {t('meroWard.title')}
          </span>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
        >
          {t('meroWard.changeLocation')}
        </button>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <div className={`text-3xl font-bold ${scoreColor}`}>{regionScore.score}</div>
          <div className="text-[9px] text-gray-600 uppercase">/100</div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">
            {isNe ? regionScore.province_ne : regionScore.province}
            {district && <span className="text-gray-500"> / {district}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">
              #{regionScore.rank} {t('meroWard.outOf')} {district ? `${regionScore.rank + 5}` : '7'}
            </span>
            <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar vs national average */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-gray-500">{t('meroWard.yourScore')}</span>
          <span className="text-gray-500">{t('meroWard.nationalAverage')}: {nationalAvg}</span>
        </div>
        <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="absolute h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-700"
            style={{ width: `${regionScore.score}%` }}
          />
          {/* National average marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-400"
            style={{ left: `${nationalAvg}%` }}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <div className="text-xs font-bold text-white">{regionScore.projectCount}</div>
          <div className="text-[9px] text-gray-600">{t('meroWard.projects')}</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <div className="text-xs font-bold text-red-400">{regionScore.delayedCount}</div>
          <div className="text-[9px] text-gray-600">{t('meroWard.delayed')}</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <div className="text-xs font-bold text-amber-400">{formatNPR(regionScore.budgetAllocated)}</div>
          <div className="text-[9px] text-gray-600">{t('budget.estimated')}</div>
        </div>
      </div>

      {/* Link to full page */}
      <Link
        href="/mero-ward"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-medium text-primary-300 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all"
      >
        <BarChart3 className="w-3 h-3" />
        {t('meroWard.provinceLeaderboard')}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
