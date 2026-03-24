'use client';

import { Heart, ChevronRight, Newspaper } from 'lucide-react';
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
  compact?: boolean; // mobile compact mode
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
  compact = false,
  onWatch,
  onClick,
}: CommitmentCardProps) {
  const status = (commitment.status as ExtendedStatus) ?? 'not_started';
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
  const progress = Math.min(100, Math.max(0, commitment.progress ?? 0));

  /* ── COMPACT MODE (mobile) ── */
  if (compact) {
    return (
      <div
        role="article"
        onClick={onClick}
        className="glass-card-interactive p-3 flex flex-col gap-1.5 group"
      >
        {/* Row 1: Status + Category */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {cfg.label}
          </span>
          <span className="text-gray-600">&middot;</span>
          <span className="text-[10px] text-gray-500 truncate">{commitment.category}</span>
        </div>

        {/* Row 2: Title (1 line) */}
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-1 group-hover:text-primary-300 transition-colors">
          {commitment.title}
        </h3>

        {/* Row 3: Summary (1 line) */}
        {summary && (
          <p className="text-xs leading-relaxed text-gray-400 italic line-clamp-1">
            &ldquo;{summary}&rdquo;
          </p>
        )}

        {/* Row 4: Progress bar (2px) + % + icons inline */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ease-out ${cfg.barColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold tabular-nums text-gray-300">
            {progress}%
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
            <Newspaper className="w-3 h-3" />
            <span className="tabular-nums">{signalCount}</span>
          </span>
          {isTrending && (
            <span className="text-xs leading-none">{'\uD83D\uDD25'}</span>
          )}
          {/* Truth meter: just the colored dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            truthLabel === 'verified' ? 'bg-emerald-400' :
            truthLabel === 'high' ? 'bg-blue-400' :
            truthLabel === 'moderate' ? 'bg-amber-400' :
            truthLabel === 'low' ? 'bg-red-400' : 'bg-gray-500'
          }`} title={`Truth: ${truthLabel}`} />
        </div>

        {/* Row 5: Blocker (1 line, stalled only) */}
        {status === 'stalled' && blocker && (
          <div className="flex items-center gap-1 text-[10px] text-red-400/90 leading-snug">
            <span className="flex-shrink-0">{'\u26D4'}</span>
            <span className="line-clamp-1">{blocker}</span>
          </div>
        )}

        {/* Row 6: Vote + Watch + Arrow (same row, smaller) */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <VoteWidget promiseId={commitment.id} variant="compact" />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onWatch && (
              <button
                onClick={(e) => { e.stopPropagation(); onWatch(); }}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                  isWatched ? 'text-rose-400 bg-rose-500/15' : 'text-gray-500'
                }`}
              >
                <Heart className={`w-3 h-3 ${isWatched ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="p-1 rounded text-gray-500 hover:text-white transition-all"
              aria-label="View details"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── FULL MODE (desktop) ── */
  return (
    <div
      role="article"
      onClick={onClick}
      className="glass-card-interactive p-4 sm:p-5 flex flex-col gap-3 group md:hover:translate-y-[-1px]"
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
            className={`h-full rounded-full transition-all duration-200 ease-out ${cfg.barColor} ${cfg.barGlow}`}
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
          {/* Follow button */}
          {onWatch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWatch();
              }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                isWatched
                  ? 'text-rose-400 bg-rose-500/15'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }`}
              title={isWatched ? 'Following' : 'Follow'}
            >
              <Heart
                className={`w-3.5 h-3.5 ${isWatched ? 'fill-current' : ''}`}
              />
              <span className="hidden sm:inline">
                {isWatched ? 'Following' : 'Follow'}
              </span>
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
