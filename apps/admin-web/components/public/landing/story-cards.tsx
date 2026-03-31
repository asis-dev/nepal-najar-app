'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { CardActions } from '@/components/public/card-actions';
import type { DailyBriefStory } from '@/lib/data/landing-types';
import type { GovernmentPromise } from '@/lib/data/promises';

const SENTIMENT_STYLES = {
  positive: { dot: 'bg-emerald-400', label: 'text-emerald-400', text: 'Positive' },
  negative: { dot: 'bg-red-400', label: 'text-red-400', text: 'Negative' },
  neutral: { dot: 'bg-amber-400', label: 'text-amber-400', text: 'Neutral' },
  mixed: { dot: 'bg-purple-400', label: 'text-purple-400', text: 'Mixed' },
} as const;

export function StoryCards({
  stories,
  allPromises,
  locale,
  isMobile,
  briefExpanded,
  setBriefExpanded,
  highlightedIndex = -1,
}: {
  stories: DailyBriefStory[];
  allPromises: GovernmentPromise[];
  locale: string;
  isMobile: boolean;
  briefExpanded: boolean;
  setBriefExpanded: (v: boolean) => void;
  highlightedIndex?: number;
}) {
  const { t } = useI18n();
  const [expandedStories, setExpandedStories] = useState<Set<number>>(new Set());

  const toggleStoryExpand = useCallback((idx: number) => {
    setExpandedStories((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const visibleStories = isMobile && !briefExpanded ? stories.slice(0, 2) : stories.slice(0, 5);
  const hasMoreStories = isMobile && !briefExpanded && stories.length > 2;

  return (
    <div className="space-y-2">
      {visibleStories.map((story, idx) => {
        const sentiment = SENTIMENT_STYLES[story.sentiment] ?? SENTIMENT_STYLES.neutral;
        const firstCommitmentId = story.relatedCommitments?.[0];
        const firstCommitmentIdStr = firstCommitmentId != null ? String(firstCommitmentId) : null;

        return (
          <div
            key={idx}
            className={`rounded-xl border p-3 transition-all duration-500 ${
              highlightedIndex === idx
                ? 'border-[#D9A441]/40 bg-[#D9A441]/[0.06] ring-1 ring-[#D9A441]/20'
                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            {/* Sentiment + signal count */}
            <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1.5">
              <span className={`inline-flex h-1.5 w-1.5 rounded-full ${sentiment.dot}`} />
              <span className={sentiment.label}>{story.sentiment}</span>
              <span className="text-gray-600">&middot;</span>
              <span>{story.signalCount} {t('home.signals')}</span>
            </div>

            {/* Title */}
            <h4 className="text-sm font-semibold text-gray-200 leading-snug">
              {locale === 'ne' && story.titleNe ? story.titleNe : story.title}
            </h4>

            {/* Summary */}
            <p className={`mt-1 text-xs text-gray-400 leading-relaxed ${expandedStories.has(idx) ? '' : 'line-clamp-2'}`}>
              {story.summary}
            </p>
            {story.summary && story.summary.length > 120 && (
              <button
                onClick={() => toggleStoryExpand(idx)}
                className="mt-0.5 text-[10px] text-cyan-400/80 hover:text-cyan-300 transition-colors"
              >
                {expandedStories.has(idx) ? (locale === 'ne' ? 'कम पढ्नुहोस् ▲' : 'Read less ▲') : (locale === 'ne' ? 'थप पढ्नुहोस् ▼' : 'Read more ▼')}
              </button>
            )}

            {/* Commitment chips + follow */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {story.relatedCommitments?.slice(0, 3).map((cId) => {
                const promise = allPromises.find((p) => p.id === String(cId) || p.id === cId as unknown as string);
                const chipTitle = promise
                  ? (locale === 'ne' && promise.title_ne ? promise.title_ne : promise.title).slice(0, 30)
                  : `#${cId}`;
                const slug = promise?.slug ?? String(cId);
                return (
                  <Link
                    key={cId}
                    href={`/explore/first-100-days/${slug}`}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 hover:bg-cyan-500/20 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {'\uD83D\uDD17'} {chipTitle}{chipTitle.length >= 30 ? '...' : ''}
                  </Link>
                );
              })}

              {/* Follow + Share for first related commitment */}
              <div className="ml-auto">
                <CardActions
                  commitmentId={firstCommitmentIdStr ?? undefined}
                  shareTitle={locale === 'ne' && story.titleNe ? story.titleNe : story.title}
                  shareUrl={firstCommitmentIdStr ? `/explore/first-100-days/${allPromises.find((p) => p.id === firstCommitmentIdStr)?.slug ?? firstCommitmentIdStr}` : '/'}
                  size="sm"
                />
              </div>
            </div>
          </div>
        );
      })}

      {hasMoreStories && (
        <button
          onClick={() => setBriefExpanded(true)}
          className="text-[10px] text-cyan-400/80 hover:text-cyan-300 transition-colors"
        >
          {t('home.showMoreStories').replace('{count}', String(stories.length - 2))}
        </button>
      )}
      {isMobile && briefExpanded && stories.length > 2 && (
        <button
          onClick={() => setBriefExpanded(false)}
          className="text-[10px] text-cyan-400/80 hover:text-cyan-300 transition-colors"
        >
          {t('home.readLess')}
        </button>
      )}
    </div>
  );
}
