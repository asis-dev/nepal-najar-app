'use client';

import Link from 'next/link';
import { ChevronRight, User2, Quote } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { HeatBadge } from './heat-badge';
import type { Conflict, ConflictSignal, ConflictActor } from '@/lib/hooks/use-conflicts';

/** Decode common HTML entities from scraped titles */
function decodeEntities(text: string): string {
  return text
    .replace(/&#038;/g, '&')
    .replace(/&#124;/g, '|')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════
   ACTOR POSITION — the core of the new card
   ═══════════════════════════════════════════ */

function ActorPosition({
  actors,
  signals,
  totalCount,
  side,
  t,
}: {
  actors: ConflictActor[];
  signals: ConflictSignal[];
  totalCount: number;
  side: 'for' | 'against';
  t: (key: string) => string;
}) {
  const borderColor = side === 'for' ? 'border-emerald-500/15' : 'border-red-500/15';
  const bgColor = side === 'for' ? 'bg-emerald-500/[0.03]' : 'bg-red-500/[0.03]';
  const accentColor = side === 'for' ? 'text-emerald-400' : 'text-red-400';
  const quoteColor = side === 'for' ? 'text-emerald-500/30' : 'text-red-500/30';

  // Find the lead actor — the one with the best statement
  const actorsWithStatements = actors.filter((a) => a.statement && a.statement.length > 10);
  const leadActor = actorsWithStatements[0] || actors[0];
  const otherActorCount = actors.length - 1;

  // Unique source names from signals
  const sourceNames = [...new Set(signals.map((s) => s.source_name))].slice(0, 3);

  // If no actors at all, fall back to signal headlines
  const hasActors = actors.length > 0;

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
      {hasActors && leadActor ? (
        <>
          {/* Lead actor name + title */}
          <div className="flex items-start gap-2 mb-1.5">
            <User2 className={`w-3.5 h-3.5 mt-0.5 ${accentColor} flex-shrink-0`} />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-gray-200">{leadActor.name}</span>
              {leadActor.title && (
                <span className="text-[10px] text-gray-500 ml-1.5">{leadActor.title}</span>
              )}
            </div>
          </div>

          {/* Statement as a quote */}
          {leadActor.statement && (
            <div className="relative pl-3 mb-2">
              <Quote className={`absolute left-0 top-0 w-2.5 h-2.5 ${quoteColor}`} />
              <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-3 italic">
                {decodeEntities(leadActor.statement)}
              </p>
            </div>
          )}

          {/* If no statement, show top signal headline as context */}
          {!leadActor.statement && signals[0] && (
            <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 mb-2 pl-3">
              {decodeEntities(signals[0].title)}
            </p>
          )}

          {/* Other actors + signal count */}
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-600">
            {otherActorCount > 0 && (
              <span>+{otherActorCount} {t('disputes.moreVoices')}</span>
            )}
            <span>{totalCount} {t('disputes.signals')}</span>
          </div>

          {/* Source attribution */}
          {sourceNames.length > 0 && (
            <div className="text-[9px] text-gray-700 mt-1">
              {t('disputes.sources')}: {sourceNames.join(', ')}
            </div>
          )}
        </>
      ) : (
        /* Fallback: no actors, show signal headlines */
        <>
          <div className="divide-y divide-white/[0.04]">
            {signals.slice(0, 2).map((s) => (
              <div key={s.id} className="py-1.5">
                <p className="text-[11px] text-gray-300 line-clamp-2 leading-tight">
                  {decodeEntities(s.title)}
                </p>
                <span className="text-[10px] text-gray-600">{s.source_name} · {formatRelativeTime(s.discovered_at)}</span>
              </div>
            ))}
          </div>
          {totalCount > 2 && (
            <p className="text-[10px] text-gray-600 mt-1">
              +{totalCount - 2} {t('disputes.more')}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONFLICT CARD — debate-style
   ═══════════════════════════════════════════ */

export function ConflictCard({ conflict }: { conflict: Conflict }) {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';
  const totalSignals = conflict.confirms_count + conflict.contradicts_count;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 uppercase tracking-wider">
            {t('disputes.dispute')}
          </span>
          {conflict.category && (
            <span className="text-[10px] text-gray-600">{t(`categoryName.${conflict.category}`)}</span>
          )}
          <div className="ml-auto">
            <HeatBadge count={totalSignals} />
          </div>
        </div>

        {/* Commitment title */}
        <Link
          href={`/explore/first-100-days/${conflict.promise_id}`}
          className="group block"
        >
          <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors line-clamp-2">
            {isNe && conflict.promise_title_ne ? conflict.promise_title_ne : conflict.promise_title}
          </h3>
        </Link>
      </div>

      {/* Debate: FOR → vs → AGAINST */}
      <div className="px-4 pb-3 space-y-2">
        {/* FOR side */}
        <ActorPosition
          actors={conflict.confirms_actors}
          signals={conflict.confirms_signals}
          totalCount={conflict.confirms_count}
          side="for"
          t={t}
        />

        {/* VS divider */}
        <div className="flex items-center gap-3 py-0.5">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{t('disputes.vs')}</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* AGAINST side */}
        <ActorPosition
          actors={conflict.contradicts_actors}
          signals={conflict.contradicts_signals}
          totalCount={conflict.contradicts_count}
          side="against"
          t={t}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-gray-600">
          {t('disputes.lastActivity')}: {formatRelativeTime(conflict.latest_signal_at)}
        </span>
        <Link
          href={`/explore/first-100-days/${conflict.promise_id}`}
          className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          {t('disputes.viewCommitment')}
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
