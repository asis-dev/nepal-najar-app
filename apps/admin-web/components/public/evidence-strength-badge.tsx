'use client';

import { Activity } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type Tier = 'strong' | 'moderate' | 'weak';

const tierConfig: Record<Tier, { labelKey: string; bg: string; text: string; border: string; dot: string }> = {
  strong: {
    labelKey: 'evidence.strong',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  moderate: {
    labelKey: 'evidence.moderate',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  weak: {
    labelKey: 'evidence.weak',
    bg: 'bg-gray-500/15',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    dot: 'bg-gray-400',
  },
};

function getTier(scores: number[]): Tier {
  if (scores.length === 0) return 'weak';
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  if (avg >= 0.7) return 'strong';
  if (avg >= 0.4) return 'moderate';
  return 'weak';
}

/** Small colored dot for per-article confidence */
export function ConfidenceDot({ confidence }: { confidence: number }) {
  const color = confidence >= 0.7 ? 'bg-emerald-400' : confidence >= 0.4 ? 'bg-amber-400' : 'bg-gray-400';
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${color}`}
      title={`${Math.round(confidence * 100)}%`}
    />
  );
}

interface EvidenceStrengthBadgeProps {
  /** Array of per-article confidence scores (0-1) */
  confidences: number[];
  /** Show article count alongside tier label */
  showCount?: boolean;
}

export function EvidenceStrengthBadge({ confidences, showCount = false }: EvidenceStrengthBadgeProps) {
  const { t } = useI18n();

  if (confidences.length === 0) return null;

  const tier = getTier(confidences);
  const config = tierConfig[tier];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${config.bg} ${config.text} ${config.border}`}
    >
      <Activity className="w-3 h-3" />
      {t(config.labelKey)}
      {showCount && (
        <span className="text-[9px] opacity-70 normal-case tracking-normal font-normal">
          ({confidences.length})
        </span>
      )}
    </span>
  );
}
