'use client';

import Link from 'next/link';
import { Activity, MessageSquare, Target, ThumbsUp, ThumbsDown, ChevronRight } from 'lucide-react';
import type { Minister } from '@/lib/hooks/use-ministers';

interface MinisterCardProps {
  minister: Minister;
  locale: string;
}

function activityLevel(totalSignals: number): { label: string; color: string; dotColor: string } {
  if (totalSignals >= 5) return { label: 'Active', color: 'text-emerald-400', dotColor: 'bg-emerald-400' };
  if (totalSignals >= 1) return { label: 'Moderate', color: 'text-yellow-400', dotColor: 'bg-yellow-400' };
  return { label: 'Quiet', color: 'text-gray-500', dotColor: 'bg-gray-500' };
}

export function MinisterCard({ minister, locale }: MinisterCardProps) {
  const isNe = locale === 'ne';
  const { weeklyActivity } = minister;
  const activity = activityLevel(weeklyActivity.totalSignals);
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
            {isNe && minister.nameNe ? minister.nameNe : minister.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-gray-400">
            {isNe && minister.titleNe ? minister.titleNe : minister.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {minister.ministry}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${activity.dotColor}`} />
          <span className={`text-xs font-medium ${activity.color}`}>{activity.label}</span>
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
          {isNe && topSignal.titleNe ? topSignal.titleNe : topSignal.title}
        </p>
      )}

      {/* Footer: commitments count + chevron */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-2.5">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Target className="h-3 w-3" />
          {minister.ownedCommitmentIds.length} commitment{minister.ownedCommitmentIds.length !== 1 ? 's' : ''}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-600 transition-colors group-hover:text-gray-400" />
      </div>
    </Link>
  );
}
