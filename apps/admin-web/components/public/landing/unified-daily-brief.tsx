'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DailyBrief, ReaderHighlight } from '@/lib/data/landing-types';
import { pickLocalizedField } from '@/lib/i18n';

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
  weekMoved,
  weekStalled,
}: {
  brief: DailyBrief;
  highlights: ReaderHighlight[];
  locale: string;
  isMobile: boolean;
  weekMoved?: number;
  weekStalled?: number;
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
    const raw = pickLocalizedField(locale, brief.summaryEn, brief.summaryNe);
    if (raw) {
      return raw
        .replace(/^-\s*/gm, '')
        .split('\n')
        .filter((line: string) => line.trim())
        .join(' ');
    }
    if (locale === 'ne') {
      return `${totalSignals} सिग्नलहरू ${sourcesActive} स्रोतबाट संकलन गरिएको छ। ${movedCount} प्रतिबद्धताहरूमा नयाँ गतिविधि देखियो।`;
    }
    return `${totalSignals} intelligence signals were collected from ${sourcesActive} sources in the last 24 hours. ${movedCount} government commitments showed new activity.`;
  };

  // Get top story narrative if it exists
  const topStoryNarrative = (() => {
    const stories = brief.topStories;
    if (!stories || stories.length === 0) return null;
    const story = stories[0];

    const displaySummary = pickLocalizedField(locale, story.summary, story.summaryNe);
    if (!displaySummary || displaySummary.length < 30) return null;

    return {
      title: pickLocalizedField(locale, story.title, story.titleNe, 'Top Story'),
      summary: displaySummary,
      signalCount: story.signalCount,
      sentiment: story.sentiment,
    };
  })();

  const visibleHighlights = isMobile && !expanded ? highlights.slice(0, 3) : highlights;
  const hasMore = isMobile && !expanded && highlights.length > 3;

  return (
    <div className="rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-white/[0.01] overflow-hidden">
      {/* Narrative body */}
      <div className="px-4 pt-3 pb-3">
        <p className={`text-[13px] md:text-sm leading-[1.7] text-gray-300 ${!summaryExpanded ? 'line-clamp-3' : ''}`}>
          <span className="font-semibold text-cyan-400">{locale === 'ne' ? 'आजको ब्रिफ:' : "Today's Brief:"}</span>{' '}
          {buildNarrative()}
        </p>

        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          {buildNarrative().length > 150 && (
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors"
            >
              {summaryExpanded
                ? (locale === 'ne' ? 'कम देखाउनुहोस्' : 'Show less')
                : (locale === 'ne' ? 'थप पढ्नुहोस्' : 'Read more')}
            </button>
          )}
          {buildNarrative().length > 150 && <span className="text-gray-700">·</span>}
          <Link href="/what-changed" className="text-[10px] text-cyan-400/80 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30 transition-colors">
            {locale === 'ne' ? 'के परिवर्तन भयो?' : 'What changed?'}
          </Link>
          <span className="text-gray-700">·</span>
          <Link href="/sectors" className="text-[10px] text-cyan-400/80 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30 transition-colors">
            {locale === 'ne' ? 'क्षेत्रगत' : 'Sectors'}
          </Link>
          <span className="text-gray-700">·</span>
          <Link href="/ministers" className="text-[10px] text-cyan-400/80 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30 transition-colors">
            {locale === 'ne' ? 'मन्त्रीहरू यो हप्ता' : 'Ministers this week'}
          </Link>
        </div>

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

      {/* Key Movements — horizontal scrolling marquee */}
      {highlights.length > 0 && (
        <div className="border-t border-white/[0.06] py-2 overflow-hidden">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              {locale === 'ne' ? 'प्रमुख गतिविधि' : 'Key Movements'}
            </h4>
            {(weekMoved != null && weekMoved > 0) && (
              <span className="text-[10px] text-gray-500">
                <span className="text-emerald-400 font-semibold">{weekMoved}</span> {locale === 'ne' ? 'अगाडि' : 'moved'}
                {weekStalled != null && weekStalled > 0 && (
                  <> · <span className="text-red-400 font-semibold">{weekStalled}</span> {locale === 'ne' ? 'रोकिएको' : 'stuck'}</>
                )}
                {' '}<span className="text-gray-600">{locale === 'ne' ? 'यो हप्ता' : 'this week'}</span>
              </span>
            )}
          </div>
          <div className="relative overflow-hidden">
            <div className="flex animate-marquee gap-4 whitespace-nowrap">
              {[...highlights, ...highlights].map((item, i) => (
                <Link
                  key={`${item.commitmentId}-${i}`}
                  href={`/explore/first-100-days/${item.slug}`}
                  className="inline-flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
                >
                  <span className={`text-[11px] ${DIRECTION_COLOR[item.direction]}`}>
                    {DIRECTION_ICON[item.direction]}
                  </span>
                  <span className="text-[11px] text-gray-300">
                    {pickLocalizedField(locale, item.title, item.titleNe, 'Commitment')}
                  </span>
                  <span className="text-[10px] text-gray-600 tabular-nums">
                    ({item.signalCount})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
