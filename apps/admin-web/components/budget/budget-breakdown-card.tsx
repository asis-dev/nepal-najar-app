'use client';

import { Banknote, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { formatNPR, formatNPRtoUSD } from '@/lib/data/promises';

interface BudgetBreakdownCardProps {
  estimatedNPR: number; // in lakhs
  spentNPR?: number; // in lakhs
  fundingSource?: string;
  fundingSource_ne?: string;
}

function getUtilizationStatus(estimated: number, spent?: number) {
  if (!spent || spent === 0) return { key: 'notStarted', color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-500/20' };
  const rate = (spent / estimated) * 100;
  if (rate > 100) return { key: 'overBudget', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/25' };
  if (rate >= 60) return { key: 'onTrack', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' };
  if (rate >= 30) return { key: 'onTrack', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' };
  return { key: 'underUtilized', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/25' };
}

export function BudgetBreakdownCard({
  estimatedNPR,
  spentNPR,
  fundingSource,
  fundingSource_ne,
}: BudgetBreakdownCardProps) {
  const { t, locale } = useI18n();
  const isNe = locale === 'ne';

  const utilizationRate = spentNPR ? Math.round((spentNPR / estimatedNPR) * 100) : 0;
  const remaining = spentNPR ? estimatedNPR - spentNPR : estimatedNPR;
  const status = getUtilizationStatus(estimatedNPR, spentNPR);

  const statusLabelKeys: Record<string, string> = {
    onTrack: 'budget.onTrack',
    overBudget: 'budget.overBudget',
    underUtilized: 'budget.underUtilized',
    notStarted: 'budget.notStarted',
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Banknote className="w-4 h-4 text-primary-400" />
          {t('promiseDetail.budgetSection')}
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${status.bg} ${status.color} border ${status.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
          {t(statusLabelKeys[status.key] ?? 'budget.notStarted')}
        </span>
      </div>

      {/* Budget metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Estimated */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            <Wallet className="w-3 h-3" />
            {t('budget.estimated')}
          </div>
          <div className="text-lg font-bold text-white">{formatNPR(estimatedNPR)}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">{formatNPRtoUSD(estimatedNPR)}</div>
        </div>

        {/* Spent */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            <TrendingUp className="w-3 h-3" />
            {t('budget.spent')}
          </div>
          <div className={`text-lg font-bold ${spentNPR ? 'text-amber-400' : 'text-gray-600'}`}>
            {spentNPR ? formatNPR(spentNPR) : t('budget.na')}
          </div>
          {spentNPR != null && spentNPR > 0 && (
            <div className="text-[10px] text-gray-600 mt-0.5">{formatNPRtoUSD(spentNPR)}</div>
          )}
        </div>

        {/* Remaining */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            <ArrowUpRight className="w-3 h-3" />
            {t('budget.remaining')}
          </div>
          <div className={`text-lg font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {remaining >= 0 ? formatNPR(remaining) : `-${formatNPR(Math.abs(remaining))}`}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">{formatNPRtoUSD(Math.abs(remaining))}</div>
        </div>
      </div>

      {/* Utilization bar */}
      {spentNPR != null && spentNPR > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500">{t('budget.utilization')}</span>
            <span className={`font-semibold tabular-nums ${status.color}`}>{utilizationRate}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                utilizationRate > 100
                  ? 'bg-gradient-to-r from-red-500 to-red-400'
                  : utilizationRate >= 60
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400'
              }`}
              style={{
                width: `${Math.min(100, utilizationRate)}%`,
                boxShadow:
                  utilizationRate > 100
                    ? '0 0 12px rgba(239, 68, 68, 0.3)'
                    : utilizationRate >= 60
                      ? '0 0 12px rgba(16, 185, 129, 0.3)'
                      : '0 0 10px rgba(245, 158, 11, 0.3)',
              }}
            />
          </div>
        </div>
      )}

      {/* Funding source */}
      {fundingSource && (
        <div className="pt-3 border-t border-white/[0.04]">
          <div className="text-xs text-gray-500 mb-1">{t('budget.fundingSource')}</div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-500/10 text-primary-300 border border-primary-500/20">
            {isNe ? (fundingSource_ne ?? fundingSource) : fundingSource}
          </span>
        </div>
      )}
    </div>
  );
}
