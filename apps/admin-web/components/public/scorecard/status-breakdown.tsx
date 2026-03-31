'use client';

import { useI18n } from '@/lib/i18n';
import type { StatusBreakdown } from '@/lib/data/government-bodies';

const STATUS_COLORS: Record<keyof StatusBreakdown, string> = {
  delivered: 'bg-blue-400',
  in_progress: 'bg-emerald-400',
  stalled: 'bg-red-400',
  not_started: 'bg-gray-500',
};

export function StatusBar({ breakdown, total }: { breakdown: StatusBreakdown; total: number }) {
  if (total === 0) return null;

  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
      {(['delivered', 'in_progress', 'stalled', 'not_started'] as const).map((status) => {
        const count = breakdown[status];
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={status}
            className={`${STATUS_COLORS[status]} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  in_progress: 'commitment.inProgress',
  not_started: 'commitment.notStarted',
  stalled: 'commitment.stalled',
  delivered: 'commitment.delivered',
};

export function StatusLegend({
  breakdown,
  compact = false,
}: {
  breakdown: StatusBreakdown;
  compact?: boolean;
}) {
  const { t } = useI18n();

  const items = [
    { key: 'in_progress' as const, color: 'bg-emerald-400' },
    { key: 'not_started' as const, color: 'bg-gray-500' },
    { key: 'stalled' as const, color: 'bg-red-400' },
    { key: 'delivered' as const, color: 'bg-blue-400' },
  ];

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 ${compact ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
      {items.map(({ key, color }) => {
        const count = breakdown[key];
        if (count === 0) return null;
        return (
          <span key={key} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
            {count} {t(STATUS_LABEL_KEYS[key])}
          </span>
        );
      })}
    </div>
  );
}
