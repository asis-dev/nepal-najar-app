'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DailyBrief, ReaderHighlight } from '@/lib/data/landing-types';

const DIRECTION_ICON: Record<string, string> = {
  confirms: '↗',
  contradicts: '⚠',
  new_activity: '●',
};

const DIRECTION_COLOR: Record<string, string> = {
  confirms: 'text-emerald-400',
  contradicts: 'text-red-400',
  new_activity: 'text-cyan-400',
};

const DIRECTION_BG: Record<string, string> = {
  confirms: 'bg-emerald-500/8 border-emerald-500/15',
  contradicts: 'bg-red-500/8 border-red-500/15',
  new_activity: 'bg-white/[0.03] border-white/[0.08]',
};

/** Detect if text is primarily Devanagari (Nepali) */
function isDevanagari(text: string): boolean {
  const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  return devanagariChars > latinChars * 2 && devanagariChars > 10;
}

export function UnifiedDailyBrief({
  brief,
  highlights,
  locale,
  isMobile,
}: {
  brief: DailyBrief;
  highlights: ReaderHighlight[];
  locale: string;
  isMobile: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [topStoryExpanded, setTopStoryExpanded] = useState(false);

  const totalSignals = brief.stats?.totalSignals24h ?? 0;
  const sourcesActive = brief.stats?.sourcesActive ?? 0;
  const movedCount = highlights.length;
  const pulseLabel = brief.pulseLabel ?? 'calm';

  // Pulse color
  const pulseColor = pulseLabel === 'very active' ? 'text-red-400 bg-red-500/10'
    : pulseLabel === 'active' ? 'text-amber-400 bg-amber-500/10'
    : pulseLabel === 'moderate' ? 'text-cyan-400 bg-cyan-500/10'
    : 'text-gray-400 bg-white/[0.05]';

  // Build narrative body from available data
  const buildNarrative = () => {
    if (locale === 'ne') {
      if (brief.summaryNe) return brief.summaryNe;
      if (brief.summaryEn && isDevanagari(brief.summaryEn)) {
        return brief.summaryEn
          .replace(/^-\s*/gm, '')
          .split('\n')
          .filter(line => line.trim())
          .join(' ');
      }
      return `${totalSignals} सिग्नलहरू ${sourcesActive} स्रोतबाट संकलन गरिएको छ। ${movedCount} प्रतिबद्धताहरूमा नयाँ गतिविधि देखियो।`;
    }

    if (brief.summaryEn && !isDevanagari(brief.summaryEn)) {
      return brief.summaryEn
        .replace(/^-\s*/gm, '')
        .split('\n')
        .filter(line => line.trim())
        .join(' ');
    }

    return `${totalSignals} intelligence signals were collected from ${sourcesActive} sources in the last 24 hours. ${movedCount} government commitments showed new activity.`;
  };

  // Get top story narrative if it exists
  const topStoryNarrative = (() => {
    const stories = brief.topStories;
    if (!stories || stories.length === 0) return null;
    const story = stories[0];

    let displaySummary: string;
    if (locale === 'ne') {
      if (story.summaryNe && isDevanagari(story.summaryNe)) {
        displaySummary = story.summaryNe;
      } else if (isDevanagari(story.summary)) {
        displaySummary = story.summary;
      } else {
        displaySummary = '';
      }
    } else {
      if (story.summary && !isDevanagari(story.summary)) {
        displaySummary = story.summary;
      } else if (story.summaryNe && !isDevanagari(story.summaryNe)) {
        displaySummary = story.summaryNe;
      } else {
        displaySummary = '';
      }
    }

    if (!displaySummary || displaySummary.length < 30) return null;

    return {
      title: locale === 'ne'
        ? (story.titleNe && isDevanagari(story.titleNe) ? story.titleNe : isDevanagari(story.title) ? story.title : story.titleNe || story.title)
        : (story.title && !isDevanagari(story.title) ? story.title : story.titleNe && !isDevanagari(story.titleNe) ? story.titleNe : story.title),
      summary: displaySummary,
      signalCount: story.signalCount,
      sentiment: story.sentiment,
    };
  })();

  const visibleHighlights = isMobile && !expanded ? highlights.slice(0, 3) : highlights;
  const hasMore = isMobile && !expanded && highlights.length > 3;

  return (
    <div className="rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-white/[0.01] overflow-hidden">
      {/* Pulse badge + brief header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${pulseColor}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          {locale === 'ne'
            ? pulseLabel === 'very active' ? 'अति सक्रिय' : pulseLabel === 'active' ? 'सक्रिय' : pulseLabel === 'moderate' ? 'मध्यम' : 'शान्त'
            : pulseLabel}
        </span>
        <span className="text-[10px] text-gray-600">
          Day {Math.max(1, Math.ceil((Date.now() - new Date('2026-03-26T00:00:00+05:45').getTime()) / 86400000))}
        </span>
      </div>

      {/* Narrative body */}
      <div className="px-4 pt-1 pb-3">
        <p className={`text-[13px] md:text-sm leading-[1.7] text-gray-300 ${!summaryExpanded ? 'line-clamp-3' : ''}`}>
          {buildNarrative()}
        </p>

        {buildNarrative().length > 150 && (
          <button
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="mt-1 text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors"
          >
            {summaryExpanded
              ? (locale === 'ne' ? 'कम देखाउनुहोस्' : 'Show less')
              : (locale === 'ne' ? 'थप पढ्नुहोस्' : 'Read more')}
          </button>
        )}

        {/* Top story highlight */}
        {topStoryNarrative && topStoryNarrative.signalCount >= 10 && (
          <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                {locale === 'ne' ? 'मुख्य समाचार' : 'Top Story'}
              </span>
              <span className="text-[10px] text-gray-600">{topStoryNarrative.signalCount} {locale === 'ne' ? 'स्रोत' : 'sources'}</span>
            </div>
            <p className={`text-xs leading-relaxed text-gray-400 ${!topStoryExpanded ? 'line-clamp-3' : ''}`}>
              {topStoryNarrative.summary}
            </p>
            {topStoryNarrative.summary.length > 120 && (
              <button
                onClick={() => setTopStoryExpanded(!topStoryExpanded)}
                className="mt-1 text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors"
              >
                {topStoryExpanded
                  ? (locale === 'ne' ? 'कम देखाउनुहोस्' : 'Show less')
                  : (locale === 'ne' ? 'थप पढ्नुहोस्' : 'Read more')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Key Movements */}
      {highlights.length > 0 && (
        <div className="border-t border-white/[0.06] px-3 pt-2.5 pb-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 px-1 mb-2">
            {locale === 'ne' ? 'प्रमुख गतिविधि' : 'Key Movements'}
          </h4>
          <div className="space-y-[5px]">
            {visibleHighlights.map((item) => (
              <Link
                key={item.commitmentId}
                href={`/explore/first-100-days/${item.slug}`}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors hover:bg-white/[0.04] ${DIRECTION_BG[item.direction]}`}
              >
                <span className={`text-xs flex-shrink-0 ${DIRECTION_COLOR[item.direction]}`}>
                  {DIRECTION_ICON[item.direction]}
                </span>
                <span className="text-[12px] text-gray-200 truncate flex-1 min-w-0">
                  {locale === 'ne' ? item.titleNe : item.title}
                </span>
                <span className="text-[10px] text-gray-500 flex-shrink-0 tabular-nums">
                  {item.signalCount}
                </span>
              </Link>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-1.5 w-full text-center text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors py-1"
            >
              {locale === 'ne'
                ? `+ ${highlights.length - 3} थप हेर्नुहोस्`
                : `+ ${highlights.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-2.5">
        <Link
          href="/what-changed"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors"
        >
          {locale === 'ne' ? 'के परिवर्तन भयो?' : 'What Changed?'}
        </Link>
        <Link
          href="/sectors"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors"
        >
          {locale === 'ne' ? 'क्षेत्रगत' : 'Sectors'}
        </Link>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-2 text-[10px] text-gray-600">
        <span>{totalSignals} {locale === 'ne' ? 'सिग्नल' : 'signals'}</span>
        <span className="text-gray-700">·</span>
        <span>{sourcesActive} {locale === 'ne' ? 'स्रोत' : 'sources'}</span>
        {brief.stats?.topSource && (
          <>
            <span className="text-gray-700">·</span>
            <span className="truncate">
              {brief.stats.topSource
                .replace(/^(rss|yt|fb|x|tiktok|reddit|telegram|threads)-/i, '')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
