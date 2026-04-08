'use client';

import Link from 'next/link';
import { Activity, MessageSquare, Target, ThumbsUp, ThumbsDown, ChevronRight } from 'lucide-react';
import { ShareMenu } from '@/components/public/share-menu';
import type { Minister } from '@/lib/hooks/use-ministers';
import { useI18n } from '@/lib/i18n';

interface MinisterCardProps {
  minister: Minister;
  locale: string;
}

interface PulseLevel {
  emoji: string;
  label: string;
  labelNe: string;
  color: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  pulseValue: number;
}

function getActivityPulse(stats: {
  totalSignals: number;
  confirming: number;
  contradicting: number;
  directMentions: number;
}): PulseLevel {
  const pulse = Math.min(100,
    stats.confirming * 3 +
    stats.contradicting * 2 +
    stats.directMentions * 1.5 +
    Math.max(0, stats.totalSignals - stats.confirming - stats.contradicting) * 1
  );
  if (pulse >= 25) return {
    emoji: '🔥', label: 'On Fire', labelNe: 'कर्मठ', color: '#f97316',
    textClass: 'text-orange-400', bgClass: 'bg-orange-400/10', borderClass: 'border-orange-400/30',
    pulseValue: Math.min(100, Math.round(pulse)),
  };
  if (pulse >= 12) return {
    emoji: '⚡', label: 'Active', labelNe: 'सक्रिय', color: '#22c55e',
    textClass: 'text-emerald-400', bgClass: 'bg-emerald-400/10', borderClass: 'border-emerald-400/30',
    pulseValue: Math.round(pulse),
  };
  if (pulse >= 4) return {
    emoji: '📡', label: 'Moderate', labelNe: 'सामान्य', color: '#eab308',
    textClass: 'text-yellow-400', bgClass: 'bg-yellow-400/10', borderClass: 'border-yellow-400/30',
    pulseValue: Math.round(pulse),
  };
  if (pulse >= 1) return {
    emoji: '💤', label: 'Quiet', labelNe: 'शान्त', color: '#6b7280',
    textClass: 'text-gray-400', bgClass: 'bg-gray-400/10', borderClass: 'border-gray-500/30',
    pulseValue: Math.round(pulse),
  };
  return {
    emoji: '👻', label: 'Ghost', labelNe: 'लापता', color: '#374151',
    textClass: 'text-gray-500', bgClass: 'bg-gray-500/10', borderClass: 'border-gray-600/30',
    pulseValue: 0,
  };
}

export function MinisterCard({ minister, locale }: MinisterCardProps) {
  const { localizeField } = useI18n();
  const isNe = locale === 'ne';
  const { weeklyActivity } = minister;
  const pulse = getActivityPulse({
    totalSignals: weeklyActivity.totalSignals,
    confirming: weeklyActivity.confirming,
    contradicting: weeklyActivity.contradicting,
    directMentions: weeklyActivity.directMentions,
  });
  const topSignal = weeklyActivity.topSignals?.[0];

  return (
    <Link
      href={`/ministers/${minister.slug}`}
      className="group block rounded-xl border border-gray-800 bg-gray-900/80 p-4 transition-colors hover:border-gray-700"
    >
      {/* Header: name + activity badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-100">
            {localizeField(minister.name, minister.nameNe)}
          </h3>
          <p className="mt-0.5 truncate text-xs text-gray-400">
            {localizeField(minister.title, minister.titleNe)}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {minister.ministry}
          </p>
        </div>
        <div className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 ${pulse.bgClass} border ${pulse.borderClass}`}>
          <span className="text-sm">{pulse.emoji}</span>
          <span className={`text-xs font-bold ${pulse.textClass}`}>{pulse.pulseValue}</span>
        </div>
      </div>

      {/* Signal stats */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {weeklyActivity.totalSignals} signals
        </span>
        {weeklyActivity.directMentions > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {weeklyActivity.directMentions} mentions
          </span>
        )}
        {weeklyActivity.confirming > 0 && (
          <span className="flex items-center gap-1 text-emerald-400">
            <ThumbsUp className="h-3 w-3" />
            {weeklyActivity.confirming}
          </span>
        )}
        {weeklyActivity.contradicting > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <ThumbsDown className="h-3 w-3" />
            {weeklyActivity.contradicting}
          </span>
        )}
      </div>

      {/* Top signal headline */}
      {topSignal && (
        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-gray-300">
          {localizeField(topSignal.title, topSignal.titleNe, 'Signal detected')}
        </p>
      )}

      {/* Footer: commitments count + chevron */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-2.5">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Target className="h-3 w-3" />
          {minister.ownedCommitmentIds.length} commitment{minister.ownedCommitmentIds.length !== 1 ? 's' : ''}
          {typeof minister.complaintCount === 'number' && minister.complaintCount > 0 ? (
            <span className="text-amber-400">
              {' '}· {minister.complaintCount} civic case{minister.complaintCount !== 1 ? 's' : ''}
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-1">
          <ShareMenu
            shareUrl={`/ministers/${minister.slug}`}
            shareTitle={locale === 'ne' && minister.nameNe ? minister.nameNe : minister.name}
            shareText={locale === 'ne'
              ? `${minister.nameNe || minister.name} — ${minister.titleNe || minister.title} · ${minister.ownedCommitmentIds.length} प्रतिबद्धता · ${weeklyActivity.totalSignals} यो हप्ता संकेत`
              : `${minister.name} — ${minister.title} · ${minister.ownedCommitmentIds.length} commitments · ${weeklyActivity.totalSignals} signals this week`}
            ogParams={{
              ogType: 'minister',
              ogSlug: minister.slug,
              ogLocale: locale,
            }}
            size="sm"
          />
          <ChevronRight className="h-3.5 w-3.5 text-gray-600 transition-colors group-hover:text-gray-400" />
        </div>
      </div>
    </Link>
  );
}
