'use client';

import { Banknote, TrendingUp, PieChart, Building2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { formatNPR, formatNPRtoUSD, type GovernmentPromise } from '@/lib/data/promises';

interface BudgetOverviewStripProps {
  promises: GovernmentPromise[];
}

export function BudgetOverviewStrip({ promises }: BudgetOverviewStripProps) {
  const { locale } = useI18n();
  const isNe = locale === 'ne';

  // Compute aggregates from promises with budget data
  const withBudget = promises.filter((p) => p.estimatedBudgetNPR != null && p.estimatedBudgetNPR > 0);
  const totalEstimated = withBudget.reduce((sum, p) => sum + (p.estimatedBudgetNPR ?? 0), 0);
  const totalSpent = withBudget.reduce((sum, p) => sum + (p.spentNPR ?? 0), 0);
  const utilizationRate = totalEstimated > 0 ? Math.round((totalSpent / totalEstimated) * 100) : 0;

  // Count unique funding sources
  const fundingSources = new Set(
    withBudget.filter((p) => p.fundingSource).map((p) => p.fundingSource)
  );

  if (withBudget.length === 0) return null;

  const stats = [
    {
      label: isNe ? 'कुल विनियोजन' : 'Total Allocated',
      value: formatNPR(totalEstimated),
      sub: formatNPRtoUSD(totalEstimated),
      icon: Banknote,
      color: 'text-primary-400',
    },
    {
      label: isNe ? 'कुल खर्च' : 'Total Spent',
      value: formatNPR(totalSpent),
      sub: formatNPRtoUSD(totalSpent),
      icon: TrendingUp,
      color: 'text-amber-400',
    },
    {
      label: isNe ? 'खर्च दर' : 'Utilization',
      value: `${utilizationRate}%`,
      sub: `${withBudget.length} ${isNe ? 'वचनबद्धता' : 'commitments'}`,
      icon: PieChart,
      color: utilizationRate >= 60 ? 'text-emerald-400' : utilizationRate >= 30 ? 'text-amber-400' : 'text-orange-400',
    },
    {
      label: isNe ? 'कोष स्रोत' : 'Funding Sources',
      value: `${fundingSources.size}`,
      sub: isNe ? 'विभिन्न स्रोतहरू' : 'distinct sources',
      icon: Building2,
      color: 'text-cyan-400',
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Banknote className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-gray-300">
          {isNe ? 'बजेट सारांश' : 'Budget Overview'}
        </h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="glass-card p-4 group hover:border-white/[0.12] transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  {stat.label}
                </span>
              </div>
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{stat.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
