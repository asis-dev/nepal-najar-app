'use client';

import { Bookmark, ChevronRight, Newspaper } from 'lucide-react';
import { TruthMeter } from '@/components/public/truth-meter';
import { VoteWidget } from '@/components/public/vote-widget';
import type { GovernmentPromise, PromiseStatus } from '@/lib/data/promises';

// ── Types ────────────────────────────────────────────────────────────────────

type ExtendedStatus = PromiseStatus | 'partially_delivered';

export interface CommitmentCardProps {
  commitment: GovernmentPromise;
  summary?: string;
  signalCount?: number;
  truthScore?: number;
  truthLabel?: 'unverified' | 'low' | 'moderate' | 'high' | 'verified';
  isTrending?: boolean;
  isNew?: boolean;
  hasEvidence?: boolean;
  statusChanged?: boolean;
  hasBudget?: boolean;
  hasVideo?: boolean;
  hasOfficialStatement?: boolean;
  isContradicted?: boolean;
  isWatched?: boolean;
  blocker?: string;
  assignedTo?: string;
  department?: string;
  onWatch?: () => void;
  onClick?: () => void;
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ExtendedStatus,
  { label: string; dotColor: string; barColor: string; barGlow: string }
> = {
  not_started: {
    label: 'Not Started',
    dotColor: 'bg-gray-400',
    barColor: 'bg-gray-400/60',
    barGlow: '',
  },
  in_progress: {
    label: 'In Progress',
    dotColor: 'bg-emerald-400',
    barColor: 'bg-emerald-400',
    barGlow: 'shadow-[0_0_6px_rgba(16,185,129,0.4)]',
  },
  stalled: {
    label: 'Stalled',
    dotColor: 'bg-red-400',
    barColor: 'bg-red-400',
    barGlow: 'shadow-[0_0_6px_rgba(239,68,68,0.4)]',
  },
  delivered: {
    label: 'Delivered',
    dotColor: 'bg-blue-400',
    barColor: 'bg-blue-400',
    barGlow: 'shadow-[0_0_6px_rgba(59,130,246,0.4)]',
  },
  partially_delivered: {
    label: 'Partial',
    dotColor: 'bg-yellow-400',
    barColor: 'bg-yellow-400',
    barGlow: 'shadow-[0_0_6px_rgba(234,179,8,0.4)]',
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export function CommitmentCard({
  commitment,
  summary,
  signalCount = 0,
  truthScore = 0,
  truthLabel = 'unverified',
  isTrending = false,
  isNew = false,
  hasEvidence = false,
  statusChanged = false,
  hasBudget = false,
  hasVideo = false,
  hasOfficialStatement = false,
  isContradicted = false,
  isWatched = false,
  blocker,
  assignedTo,
  department,
  onWatch,
  onClick,
}: CommitmentCardProps) {
  const status = (commitment.status as ExtendedStatus) ?? 'not_started';
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
  const progress = Math.min(100, Math.max(0, commitment.progress ?? 0));

  return (
    <div
      role="article"
      onClick={onClick}
      className="glass-card-interactive p-4 sm:p-5 flex flex-col gap-3 group"
    >
      {/* ── Row 1: Status ── */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {cfg.label}
        </span>
      </div>

      {/* ── Row 2: Title ── */}
      <h3 className="text-[15px] sm:text-base font-semibold text-white leading-snug line-clamp-2 group-hover:text-primary-300 transition-colors">
        {commitment.title}
      </h3>

      {/* ── Row 3: Category + Department ── */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span>{commitment.category}</span>
        {department && (
          <>
            <span className="text-gray-600">&middot;</span>
            <span className="text-gray-500 truncate">{department}</span>
          </>
        )}
      </div>

      {/* ── Row 4: Assigned to ── */}
      {assignedTo && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span>{'\uD83D\uDC64'}</span>
          <span className="truncate">{assignedTo}</span>
        </div>
      )}

      {/* ── Row 5: Progress bar ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.barColor} ${cfg.barGlow}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-gray-300 w-8 text-right">
          {progress}%
        </span>
      </div>

      {/* ── Row 6: AI Summary ── */}
      {summary && (
        <p className="text-[13px] leading-relaxed text-gray-400 italic line-clamp-2">
          &ldquo;{summary}&rdquo;
        </p>
      )}

      {/* ── Row 7: Blocker (stalled only) ── */}
      {status === 'stalled' && blocker && (
        <div className="flex items-start gap-1.5 text-[11px] text-red-400/90 leading-snug">
          <span className="flex-shrink-0 mt-px">{'\u26D4'}</span>
          <span className="line-clamp-2">{blocker}</span>
        </div>
      )}

      {/* ── Row 8: Icon strip + Actions ── */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {/* Signal icons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Truth score — always show */}
          <TruthMeter score={truthScore} label={truthLabel} size="sm" />

          {/* Source count — always show */}
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
            <Newspaper className="w-3.5 h-3.5" />
            <span className="tabular-nums">{signalCount}</span>
          </span>

          {/* Conditional signal icons */}
          {isTrending && (
            <span className="text-sm leading-none" title="Trending">{'\uD83D\uDD25'}</span>
          )}
          {isNew && (
            <span className="text-sm leading-none" title="New activity">{'\u26A1'}</span>
          )}
          {statusChanged && !isNew && (
            <span className="text-sm leading-none" title="Status changed">{'\u26A1'}</span>
          )}
          {hasBudget && (
            <span className="text-sm leading-none" title="Budget allocated">{'\uD83D\uDCB0'}</span>
          )}
          {hasEvidence && (
            <span className="text-sm leading-none" title="Community evidence">{'\uD83D\uDCF8'}</span>
          )}
          {hasVideo && (
            <span className="text-sm leading-none" title="Video evidence">{'\uD83D\uDCFA'}</span>
          )}
          {hasOfficialStatement && (
            <span className="text-sm leading-none" title="Official statement">{'\uD83C\uDFDB\uFE0F'}</span>
          )}
          {isContradicted && (
            <span className="text-sm leading-none" title="Sources disagree">{'\u26A0\uFE0F'}</span>
          )}

          {/* Citizen pulse vote — subtle, secondary weight */}
          <div className="border-l border-white/[0.06] pl-2 ml-0.5">
            <VoteWidget promiseId={commitment.id} variant="compact" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Watch button */}
          {onWatch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWatch();
              }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                isWatched
                  ? 'text-primary-400 bg-primary-500/15'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }`}
              title={isWatched ? 'Watching' : 'Watch'}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${isWatched ? 'fill-current' : ''}`}
              />
              <span className="hidden sm:inline">
                {isWatched ? 'Watching' : 'Watch'}
              </span>
              {isWatched && (
                <span className="text-[10px] leading-none">{'\uD83D\uDC41\uFE0F'}</span>
              )}
            </button>
          )}

          {/* Navigate arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label="View details"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
