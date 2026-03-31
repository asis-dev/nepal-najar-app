'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Loader2, AlertTriangle, Heart, Share2, Star, Play, Pause, ExternalLink } from 'lucide-react';
import { DailyBriefPlayer } from '@/components/public/daily-brief-player';
import { useI18n } from '@/lib/i18n';
import {
  useAllPromises,
  usePromiseStats,
  useArticleCount,
} from '@/lib/hooks/use-promises';
import { useTrending } from '@/lib/hooks/use-trending';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { usePreferencesStore } from '@/lib/stores/preferences';
import { useUserPreferencesStore } from '@/lib/stores/preferences';
import { useAuth } from '@/lib/hooks/use-auth';
import { isPublicCommitment } from '@/lib/data/commitments';
import { GhantiIcon, GhantiBellCount } from '@/components/ui/ghanti-icon';
import { getPromiseRelevance } from '@/lib/utils/geo-relevance';
import { InterestFilter, resolveCategories } from '@/components/public/interest-filter';
import { ShareButtons } from '@/components/public/share-buttons';
import { commitmentShareText, scorecardShareText, shareOrCopy } from '@/lib/utils/share';
import { computeGhantiScore, GRADE_COLORS, GRADE_LABELS } from '@/lib/data/ghanti-score';
import type { GovernmentPromise } from '@/lib/data/promises';
import { useCorruptionCases, useCorruptionStats } from '@/lib/hooks/use-corruption';
import { STATUS_LABELS, STATUS_COLORS, SEVERITY_COLORS, SEVERITY_LABELS, formatAmountNpr, formatNprWithUsd, type CorruptionCase } from '@/lib/data/corruption-types';
import { Shield, Clock } from 'lucide-react';

/* ═══════════════════════════════════════════
   Feed Tab Type
   ═══════════════════════════════════════════ */
type FeedTab = 'for-you' | 'following' | 'trending' | 'corruption';

const FEED_TAB_STORAGE_KEY = 'feed-tab-preference';
const LAST_FOLLOWING_VISIT_KEY = 'last-following-visit';
const INAUGURATION_TIMESTAMP = new Date('2026-03-26T00:00:00+05:45').getTime();
const NO_GRADE_WINDOW_DAYS = 30;
const FIRST_100_DAYS_WINDOW = 100;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

/* ═══════════════════════════════════════════
   Daily Brief Types & Fetch
   ═══════════════════════════════════════════ */
interface DailyBriefStory {
  title: string;
  titleNe?: string;
  summary: string;
  summaryNe?: string;
  signalCount: number;
  sources: string[];
  relatedCommitments: number[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
}

interface DailyBrief {
  date: string;
  pulse: number;
  pulseLabel: string;
  summaryEn: string;
  summaryNe: string;
  topStories?: DailyBriefStory[];
  readerHighlights?: ReaderHighlight[];
  stats: {
    totalSignals24h: number;
    newSignals: number;
    sourcesActive: number;
    topSource: string;
  };
  audioUrl?: string | null;
  videoUrl?: string | null;
  audioDurationSeconds?: number | null;
}

interface ReaderHighlight {
  commitmentId: number;
  title: string;
  titleNe: string;
  slug: string;
  direction: 'confirms' | 'contradicts' | 'new_activity';
  directionLabel: string;
  directionLabelNe: string;
  signalCount: number;
  owner: string;
  ownerNe: string;
  whyItMatters: string;
  whyItMattersNe: string;
  nextWatchpoint: string;
  nextWatchpointNe: string;
  confidenceScore: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  trustLevel: string;
}

function useDailyBrief() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/daily-brief', { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) setBrief(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  return { brief, isLoading };
}

/* ═══════════════════════════════════════════
   Contradictions hook (signals where classification = 'contradicts')
   ═══════════════════════════════════════════ */
function useContradictions() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/signals?classification=contradicts&days=7', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.commitmentCount === 'number') {
          setCount(data.commitmentCount);
        } else if (data && Array.isArray(data.signals)) {
          // Count unique commitment IDs
          const commitmentIds = new Set<string>();
          for (const s of data.signals) {
            if (s.commitment_id) commitmentIds.add(s.commitment_id);
            if (s.promise_id) commitmentIds.add(s.promise_id);
          }
          setCount(commitmentIds.size);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return count;
}

/* ═══════════════════════════════════════════
   Mobile Detection Hook
   ═══════════════════════════════════════════ */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

/* ═══════════════════════════════════════════
   Status helpers
   ═══════════════════════════════════════════ */
const STATUS_CONFIG = {
  in_progress: { labelKey: 'commitment.inProgress', color: 'bg-emerald-500', text: 'text-emerald-400', dot: '\u{1F7E2}' },
  stalled: { labelKey: 'commitment.stalled', color: 'bg-red-500', text: 'text-red-400', dot: '\u{1F534}' },
  not_started: { labelKey: 'commitment.notStarted', color: 'bg-amber-500', text: 'text-amber-400', dot: '\u{1F7E1}' },
  delivered: { labelKey: 'commitment.delivered', color: 'bg-blue-400', text: 'text-blue-400', dot: '\u2705' },
} as const;

/* Trust level to numeric score for sorting */
const TRUST_SCORE: Record<string, number> = {
  verified: 5,
  high: 4,
  moderate: 3,
  low: 2,
  unverified: 1,
};

/* ═══════════════════════════════════════════
   Big Picture Status Card (desktop only — hidden on mobile)
   ═══════════════════════════════════════════ */
function StatusBox({
  status,
  count,
  label,
  glowColor,
}: {
  status: 'in_progress' | 'stalled' | 'not_started' | 'delivered';
  count: number;
  label: string;
  glowColor: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md px-6 py-5 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        boxShadow: `0 0 30px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <GhantiIcon status={status} size="lg" />
      <span className="text-4xl font-bold text-white tabular-nums tracking-tight leading-none">
        {count}
      </span>
      <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Inline Status Row (mobile only — compact)
   ═══════════════════════════════════════════ */
function InlineStatusRow({ stats }: { stats: { inProgress: number; stalled: number; notStarted: number; delivered: number } }) {
  return (
    <div className="flex items-center justify-center gap-4 text-sm font-semibold tabular-nums">
      <GhantiBellCount status="in_progress" count={stats.inProgress} />
      <GhantiBellCount status="stalled" count={stats.stalled} />
      <GhantiBellCount status="not_started" count={stats.notStarted} />
      <GhantiBellCount status="delivered" count={stats.delivered} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Pulse Bar Component
   ═══════════════════════════════════════════ */
function PulseBar({ score }: { score: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(100, Math.max(0, score))), 300);
    return () => clearTimeout(t);
  }, [score]);

  // Color transitions: blue (calm) -> green -> orange -> red (very active)
  const getGradient = () => {
    if (score >= 75) return 'linear-gradient(90deg, #2563eb, #10b981, #f59e0b, #ef4444)';
    if (score >= 50) return 'linear-gradient(90deg, #2563eb, #10b981, #f59e0b)';
    if (score >= 25) return 'linear-gradient(90deg, #2563eb, #10b981)';
    return 'linear-gradient(90deg, #2563eb, #3b82f6)';
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 uppercase tracking-wider font-medium shrink-0">
        Pulse
      </span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${width}%`,
            background: getGradient(),
            boxShadow: '0 0 8px rgba(59,130,246,0.3)',
            transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
      <span className="text-sm font-bold text-white tabular-nums min-w-[2.5ch] text-right">
        {score}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Feed Card Component
   ═══════════════════════════════════════════ */
function FeedCommitmentCard({
  commitment,
  isTrending,
  locale,
  showNewDot,
}: {
  commitment: GovernmentPromise;
  isTrending: boolean;
  locale: string;
  showNewDot?: boolean;
}) {
  const { t } = useI18n();
  const title = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
  const category = locale === 'ne' && commitment.category_ne ? commitment.category_ne : commitment.category;
  const summary = locale === 'ne' && commitment.summary_ne
    ? commitment.summary_ne
    : commitment.summary || commitment.description;
  const statusCfg = STATUS_CONFIG[commitment.status] ?? STATUS_CONFIG.not_started;

  return (
    <Link
      href={`/explore/first-100-days/${commitment.slug}`}
      className="glass-card-hover block p-3 md:p-5 transition-opacity duration-200 relative"
    >
      {showNewDot && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isTrending && (
              <span className="trending-badge">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
                </span>
                {t('home.trending').toLowerCase()}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
              {category}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-gray-100 sm:text-base">
            {title}
          </h3>
          {summary && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-400 sm:text-sm">
              {summary}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500">
        <span className={`inline-flex items-center gap-1.5 ${statusCfg.text}`}>
          <GhantiIcon status={commitment.status} size="xs" />
          {t(statusCfg.labelKey)}
        </span>
        {commitment.progress > 0 && (
          <span>{commitment.progress}%</span>
        )}
        {commitment.evidenceCount > 0 && (
          <span>{commitment.evidenceCount} {t('home.sources')}</span>
        )}
        {commitment.lastActivitySignalCount != null && commitment.lastActivitySignalCount > 0 && (
          <span className="text-cyan-400">{commitment.lastActivitySignalCount} {t('home.signals')}</span>
        )}
      </div>

      {/* Progress bar + Share */}
      <div className="mt-2.5 flex items-center gap-2">
        {commitment.progress > 0 && (
          <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${commitment.progress}%`,
                background: commitment.status === 'stalled'
                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                  : commitment.status === 'delivered'
                    ? 'linear-gradient(90deg, #059669, #10b981)'
                    : 'linear-gradient(90deg, #2563eb, #06b6d4)',
              }}
            />
          </div>
        )}
        {!commitment.progress && <div className="flex-1" />}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const text = commitmentShareText({ title, progress: commitment.progress, status: commitment.status, locale });
            const shareUrl = `${window.location.origin}/explore/first-100-days/${commitment.slug}`;
            shareOrCopy({ title: text, text, url: shareUrl });
          }}
          className="shrink-0 p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
          aria-label={t('common.share')}
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════
   Stale Commitment Row (simplified)
   ═══════════════════════════════════════════ */
function StaleRow({
  commitment,
  locale,
}: {
  commitment: GovernmentPromise;
  locale: string;
}) {
  const title = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
  const category = locale === 'ne' && commitment.category_ne ? commitment.category_ne : commitment.category;
  return (
    <Link
      href={`/explore/first-100-days/${commitment.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors duration-300 hover:bg-white/[0.04]"
    >
      <span className="min-w-0 truncate text-sm text-gray-400">{title}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-600">
        {category}
      </span>
    </Link>
  );
}

/* ═══════════════════════════════════════════
   Feed Tab Bar
   ═══════════════════════════════════════════ */
function FeedTabBar({
  activeTab,
  onTabChange,
  followingCount,
  categoriesOfInterest,
  onCategoriesChange,
  isMobile,
}: {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  followingCount: number;
  categoriesOfInterest: string[];
  onCategoriesChange: (categories: string[]) => void;
  isMobile: boolean;
}) {
  const { t, locale } = useI18n();
  const filterCount = categoriesOfInterest.length;

  const tabs: { id: FeedTab; label: string; badge?: number }[] = [
    { id: 'for-you', label: filterCount > 0 ? `${t('home.forYou')} (${filterCount})` : t('home.forYou') },
    { id: 'following', label: t('home.following'), badge: followingCount > 0 ? followingCount : undefined },
    { id: 'corruption', label: t('home.corruption') },
    { id: 'trending', label: t('home.trending') },
  ];

  return (
    <div
      className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 md:py-3 backdrop-blur-xl"
      style={{
        background: 'linear-gradient(180deg, rgba(8,10,18,0.92) 0%, rgba(8,10,18,0.8) 100%)',
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-1.5 md:gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <div key={tab.id} className="relative flex-1 md:flex-none inline-flex items-center">
                <button
                  onClick={() => onTabChange(tab.id)}
                  suppressHydrationWarning
                  className={`w-full inline-flex items-center justify-center gap-1.5 rounded-full text-xs px-3 py-1.5 md:text-sm md:px-4 md:py-2 font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={isActive ? {
                    background: 'rgba(255,255,255,0.1)',
                    boxShadow: '0 0 12px rgba(96,165,250,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                  } : undefined}
                >
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold tabular-nums px-1 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
                {/* Filter trigger sits next to "For You" tab, outside the button to avoid nesting */}
                {tab.id === 'for-you' && isActive && (
                  <InterestFilter
                    selected={categoriesOfInterest}
                    onChange={onCategoriesChange}
                    isMobile={isMobile}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Following Empty State
   ═══════════════════════════════════════════ */
function FollowingEmptyState({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
        <Heart className="h-6 w-6 text-gray-500" />
      </div>
      <p className="text-sm font-medium text-gray-300 mb-1">
        {t('home.notFollowingTitle')}
      </p>
      <p className="text-xs text-gray-500 mb-5">
        {t('home.notFollowingDesc')}
      </p>
      <button
        onClick={onBrowse}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-white/[0.08] hover:text-white"
      >
        {t('home.browseAll')}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Trending Empty State
   ═══════════════════════════════════════════ */
function TrendingEmptyState() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-sm text-gray-400">
        {t('home.noTrending')}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Story Card Component (for Daily Brief upgrade)
   ═══════════════════════════════════════════ */
const SENTIMENT_STYLES = {
  positive: { dot: 'bg-emerald-400', label: 'text-emerald-400', text: 'Positive' },
  negative: { dot: 'bg-red-400', label: 'text-red-400', text: 'Negative' },
  neutral: { dot: 'bg-amber-400', label: 'text-amber-400', text: 'Neutral' },
  mixed: { dot: 'bg-purple-400', label: 'text-purple-400', text: 'Mixed' },
} as const;

function StoryCards({
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
  const toggleWatch = useWatchlistStore((s) => s.toggleWatch);
  const isWatched = useWatchlistStore((s) => s.isWatched);
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

              {/* Follow star for first related commitment */}
              {firstCommitmentIdStr && (
                <button
                  onClick={() => toggleWatch(firstCommitmentIdStr)}
                  className={`ml-auto p-1 rounded-lg transition-colors ${
                    isWatched(firstCommitmentIdStr)
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                  aria-label={t('home.followStory')}
                >
                  <Star className={`w-3.5 h-3.5 ${isWatched(firstCommitmentIdStr) ? 'fill-current' : ''}`} />
                </button>
              )}
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

const HIGHLIGHT_CONFIDENCE_TONE: Record<
  ReaderHighlight['confidenceLabel'],
  string
> = {
  high: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  medium: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  low: 'border-red-500/25 bg-red-500/10 text-red-300',
};

const HIGHLIGHT_DIRECTION_TONE: Record<
  ReaderHighlight['direction'],
  string
> = {
  confirms: 'text-emerald-300',
  contradicts: 'text-red-300',
  new_activity: 'text-cyan-300',
};

/* ─── Unified Daily Brief Card ─── */

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

function UnifiedDailyBrief({
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

  // Detect if text is primarily Devanagari (Nepali) — requires majority Devanagari
  const isDevanagari = (text: string) => {
    const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    // Text is Devanagari only if Devanagari chars significantly outnumber Latin
    return devanagariChars > latinChars * 2 && devanagariChars > 10;
  };

  // Build narrative body from available data
  const buildNarrative = () => {
    if (locale === 'ne') {
      // Nepali: prefer summaryNe, fall back to summaryEn if it's actually Nepali (old cached data)
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

    // English locale: use summaryEn only if it's actually English
    if (brief.summaryEn && !isDevanagari(brief.summaryEn)) {
      return brief.summaryEn
        .replace(/^-\s*/gm, '')  // Remove bullet dashes
        .split('\n')
        .filter(line => line.trim())
        .join(' ');
    }

    // Fallback: generate from stats (when summaryEn is missing or contains Nepali from old cached data)
    return `${totalSignals} intelligence signals were collected from ${sourcesActive} sources in the last 24 hours. ${movedCount} government commitments showed new activity.`;
  };

  // Get top story narrative (the real news content) if it exists
  const topStoryNarrative = (() => {
    const stories = brief.topStories;
    if (!stories || stories.length === 0) return null;
    const story = stories[0];

    // Pick summary matching user's locale — handle possible field swaps
    let displaySummary: string;
    if (locale === 'ne') {
      // Prefer whichever field actually contains Nepali text
      if (story.summaryNe && isDevanagari(story.summaryNe)) {
        displaySummary = story.summaryNe;
      } else if (isDevanagari(story.summary)) {
        displaySummary = story.summary;
      } else {
        displaySummary = '';
      }
    } else {
      // Prefer whichever field actually contains English text
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

      {/* Narrative body — follows user's language selection */}
      <div className="px-4 pt-1 pb-3">
        <p className={`text-[13px] md:text-sm leading-[1.7] text-gray-300 ${!summaryExpanded ? 'line-clamp-3' : ''}`}>
          {buildNarrative()}
        </p>

        {/* Read more / collapse toggle */}
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

        {/* Top story highlight — if there's a dominant news story */}
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

      {/* Key Movements — commitments that had activity */}
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

      {/* Footer — source attribution */}
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

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
const INITIAL_FEED_COUNT = 10;

export default function LandingPage() {
  const { locale, t } = useI18n();
  const isMobile = useIsMobile();
  const { stats, isLoading: statsLoading } = usePromiseStats();
  const { data: allPromises, isLoading: promisesLoading } = useAllPromises({ publicOnly: true });
  const { data: articleCount } = useArticleCount();
  const { trending, trendingIds, pulse } = useTrending(12);
  const { brief, isLoading: briefLoading } = useDailyBrief();
  const contradictionCount = useContradictions();
  const { isAuthenticated } = useAuth();
  const watchedProjectIds = useWatchlistStore((s) => s.watchedProjectIds);
  const isWatched = useWatchlistStore((s) => s.isWatched);
  const userProvince = usePreferencesStore((s) => s.province);
  const userDistrict = usePreferencesStore((s) => s.district);
  const categoriesOfInterest = useUserPreferencesStore((s) => s.categoriesOfInterest) ?? [];
  const setCategoriesOfInterest = useUserPreferencesStore((s) => s.setCategoriesOfInterest);

  /* ── Hydrate zustand stores from localStorage ── */
  useEffect(() => {
    useWatchlistStore.persist.rehydrate();
    usePreferencesStore.persist.rehydrate();
    useUserPreferencesStore.persist.rehydrate();
  }, []);

  /* ── Feed tab state with localStorage persistence ── */
  const [feedTab, setFeedTab] = useState<FeedTab>('for-you');
  const [feedCount, setFeedCount] = useState(INITIAL_FEED_COUNT);
  const [staleExpanded, setStaleExpanded] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [audioHighlightIdx, setAudioHighlightIdx] = useState(-1);
  const [playingAboutLang, setPlayingAboutLang] = useState<'en' | 'ne' | null>(null);
  const aboutAudioRef = useRef<HTMLAudioElement | null>(null);
  const [lastFollowingVisit, setLastFollowingVisit] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number | null>(null);

  /* ── Corruption report form state ── */
  const [showCorruptionForm, setShowCorruptionForm] = useState(false);
  const [corruptionTitle, setCorruptionTitle] = useState('');
  const [corruptionDesc, setCorruptionDesc] = useState('');
  const [corruptionType, setCorruptionType] = useState('');
  const [corruptionMunicipality, setCorruptionMunicipality] = useState('');
  const [corruptionEvidenceUrl, setCorruptionEvidenceUrl] = useState('');
  const [corruptionEvidenceNote, setCorruptionEvidenceNote] = useState('');
  const [corruptionAnonymous, setCorruptionAnonymous] = useState(false);
  const [isSubmittingCorruption, setIsSubmittingCorruption] = useState(false);
  const [corruptionSubmitMsg, setCorruptionSubmitMsg] = useState<string | null>(null);
  const [corruptionSubmitError, setCorruptionSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  // Cleanup about-audio on unmount
  useEffect(() => {
    return () => {
      if (aboutAudioRef.current) {
        aboutAudioRef.current.pause();
        aboutAudioRef.current = null;
      }
    };
  }, []);

  // Restore tab preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FEED_TAB_STORAGE_KEY) as FeedTab | null;
      if (stored && ['for-you', 'following', 'trending', 'corruption'].includes(stored)) {
        // Don't default anonymous users to "following"
        if (stored === 'following' && !isAuthenticated) {
          setFeedTab('for-you');
        } else {
          setFeedTab(stored);
        }
      }
      const lastVisit = localStorage.getItem(LAST_FOLLOWING_VISIT_KEY);
      if (lastVisit) setLastFollowingVisit(parseInt(lastVisit, 10));
    } catch { /* SSR or localStorage unavailable */ }
  }, [isAuthenticated]);

  const handleTabChange = useCallback((tab: FeedTab) => {
    setFeedTab(tab);
    setFeedCount(INITIAL_FEED_COUNT);
    try {
      localStorage.setItem(FEED_TAB_STORAGE_KEY, tab);
      if (tab === 'following') {
        const now = Date.now();
        localStorage.setItem(LAST_FOLLOWING_VISIT_KEY, String(now));
        setLastFollowingVisit(now);
      }
    } catch { /* ignore */ }
  }, []);

  /* ── Compute "This week" activity ── */
  const weekActivity = useMemo(() => {
    if (!allPromises) return { movedForward: 0, stalledCount: 0 };

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let movedForward = 0;
    let stalledCount = 0;

    for (const p of allPromises) {
      if (!isPublicCommitment(p)) continue;
      const activityDate = p.lastActivityDate || p.lastSignalAt || p.lastUpdate;
      if (!activityDate) continue;
      const ts = new Date(activityDate).getTime();
      if (ts >= weekAgo) {
        if (p.status === 'in_progress' || p.status === 'delivered') {
          movedForward++;
        } else if (p.status === 'stalled') {
          stalledCount++;
        }
      }
    }

    return { movedForward, stalledCount };
  }, [allPromises]);

  /* ── Top movers: top 2 by recent progress change ── */
  const topMovers = useMemo(() => {
    // Use trending data first (commitments with highest scores)
    const trendingCommitments = trending
      .filter((t) => t.type === 'commitment')
      .slice(0, 2);

    if (trendingCommitments.length >= 2) {
      return trendingCommitments.map((t) => {
        const match = allPromises?.find((p) => p.id === t.id);
        return {
          title: match?.title ?? t.title,
          progress: match?.progress ?? 0,
        };
      });
    }

    // Fallback: most recently changed commitments with progress
    if (!allPromises) return [];
    return allPromises
      .filter((p) => isPublicCommitment(p) && p.progress > 0)
      .sort((a, b) => {
        const aDate = a.lastActivityDate || a.lastSignalAt || a.lastUpdate || '';
        const bDate = b.lastActivityDate || b.lastSignalAt || b.lastUpdate || '';
        return bDate.localeCompare(aDate);
      })
      .slice(0, 2)
      .map((p) => ({ title: p.title, progress: p.progress }));
  }, [trending, allPromises]);

  /* ── Build a trending score map for quick lookup ── */
  const trendingScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trending) {
      if (t.type === 'commitment') map.set(t.id, t.score);
    }
    return map;
  }, [trending]);

  /* ── All public promises ── */
  const publicPromises = useMemo(() => {
    if (!allPromises) return [];
    return allPromises.filter((p) => isPublicCommitment(p));
  }, [allPromises]);

  /* ── "For You" feed: personalized sort ── */
  const forYouFeed = useMemo(() => {
    if (!publicPromises.length) return { active: [] as GovernmentPromise[], stale: [] as GovernmentPromise[] };

    const now = Date.now();
    const h48 = 48 * 60 * 60 * 1000;
    const d7 = 7 * 24 * 60 * 60 * 1000;

    const scored = publicPromises.map((p) => {
      let score = 0;
      const activityDate = p.lastActivityDate || p.lastSignalAt || p.lastUpdate;
      const activityTs = activityDate ? new Date(activityDate).getTime() : 0;
      const isTrend = trendingIds.has(p.id);
      const hasRecentActivity = activityTs > 0 && (now - activityTs) < h48;
      const hasWeekActivity = activityTs > 0 && (now - activityTs) < d7;

      // Tier 1: trending + recent activity (last 48h)
      if (isTrend && hasRecentActivity) score += 10000;
      // Tier 2: in user's province/district
      if (userProvince) {
        const rel = getPromiseRelevance(p, userProvince, userDistrict);
        if (rel.relevance === 'direct') score += 5000;
        else if (rel.relevance === 'indirect') score += 2000;
      }
      // Tier 3: recent activity (last 7 days)
      if (hasWeekActivity) score += 1000;
      // Tier 4: trust level
      score += (TRUST_SCORE[p.trustLevel] ?? 0) * 100;
      // Tier 5: not_started with zero activity gets lowest
      if (p.status === 'not_started' && p.evidenceCount === 0 && !activityTs) {
        score -= 500;
      }
      // Tiebreaker: recency
      if (activityTs > 0) score += activityTs / 1e12;

      return { promise: p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const active: GovernmentPromise[] = [];
    const stale: GovernmentPromise[] = [];
    for (const { promise: p } of scored) {
      if (
        p.status !== 'not_started' ||
        p.evidenceCount > 0 ||
        (p.lastActivitySignalCount ?? 0) > 0 ||
        trendingIds.has(p.id)
      ) {
        active.push(p);
      } else {
        stale.push(p);
      }
    }

    return { active, stale };
  }, [publicPromises, trendingIds, userProvince, userDistrict]);

  /* ── "Following" feed ── */
  const followingFeed = useMemo(() => {
    if (!publicPromises.length) return [];
    const followed = publicPromises.filter((p) => isWatched(p.id));
    // Sort by most recent activity first
    followed.sort((a, b) => {
      const aDate = a.lastActivityDate || a.lastSignalAt || a.lastUpdate || '';
      const bDate = b.lastActivityDate || b.lastSignalAt || b.lastUpdate || '';
      return bDate.localeCompare(aDate);
    });
    return followed;
  }, [publicPromises, isWatched, watchedProjectIds]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── "Trending" feed ── */
  const trendingFeed = useMemo(() => {
    if (!publicPromises.length) return [];
    const trendingItems = publicPromises
      .filter((p) => trendingScoreMap.has(p.id) && (trendingScoreMap.get(p.id)! > 0))
      .sort((a, b) => (trendingScoreMap.get(b.id) ?? 0) - (trendingScoreMap.get(a.id) ?? 0));
    return trendingItems;
  }, [publicPromises, trendingScoreMap]);

  /* ── Resolve selected group IDs to actual PromiseCategory values ── */
  const resolvedCategories = useMemo(
    () => resolveCategories(categoriesOfInterest),
    [categoriesOfInterest],
  );

  /* ── Apply interest-category filter on "For You" feed ── */
  const filteredForYouActive = useMemo(() => {
    if (!resolvedCategories.length) return forYouFeed.active;
    return forYouFeed.active.filter((c) => resolvedCategories.includes(c.category));
  }, [forYouFeed.active, resolvedCategories]);

  const filteredForYouStale = useMemo(() => {
    if (!resolvedCategories.length) return forYouFeed.stale;
    return forYouFeed.stale.filter((c) => resolvedCategories.includes(c.category));
  }, [forYouFeed.stale, resolvedCategories]);

  /* ── Corruption feed data ── */
  const { data: corruptionStats } = useCorruptionStats();
  const { data: corruptionResult } = useCorruptionCases({ pageSize: 20 });
  const corruptionCases = corruptionResult?.cases ?? [];

  /* ── Choose which feed to show ── */
  const currentFeedItems = feedTab === 'for-you'
    ? filteredForYouActive
    : feedTab === 'following'
      ? followingFeed
      : feedTab === 'corruption'
        ? [] // corruption uses its own rendering
        : trendingFeed;

  const staleItems = feedTab === 'for-you' ? filteredForYouStale : [];

  const visibleFeed = currentFeedItems.slice(0, feedCount);
  const hasMore = feedCount < currentFeedItems.length;

  const loadMore = useCallback(() => {
    setFeedCount((prev) => Math.min(prev + 10, currentFeedItems.length));
  }, [currentFeedItems.length]);

  /* ── Check for "new" activity on following cards ── */
  const hasNewActivity = useCallback((commitment: GovernmentPromise): boolean => {
    if (lastFollowingVisit === 0) return false;
    const activityDate = commitment.lastActivityDate || commitment.lastSignalAt || commitment.lastUpdate;
    if (!activityDate) return false;
    return new Date(activityDate).getTime() > lastFollowingVisit;
  }, [lastFollowingVisit]);

  const sourceCount = articleCount ?? 44;

  /* ── Ghanti Index score ── */
  const ghantiScore = useMemo(() => allPromises ? computeGhantiScore(allPromises) : null, [allPromises]);
  const effectiveNow = nowMs ?? Date.now();
  const isPreInauguration = effectiveNow < INAUGURATION_TIMESTAMP;
  const daysUntilInauguration = Math.max(0, Math.ceil((INAUGURATION_TIMESTAMP - effectiveNow) / DAY_IN_MS));
  const dayInTerm = isPreInauguration
    ? 0
    : Math.floor((effectiveNow - INAUGURATION_TIMESTAMP) / DAY_IN_MS) + 1;
  const dayInFirstHundred = Math.min(FIRST_100_DAYS_WINDOW, Math.max(0, dayInTerm));
  const isNoGradeWindow = !isPreInauguration && dayInTerm > 0 && dayInTerm <= NO_GRADE_WINDOW_DAYS;
  const showLetterGrade = !isPreInauguration && !isNoGradeWindow;

  const baselineCoverage = useMemo(() => {
    if (!publicPromises.length) {
      return {
        evidenceLinked: 0,
        reviewedConfidence: 0,
        activeMovement: 0,
        recentSignals: 0,
        sourceDepth: 0,
      };
    }

    const now = nowMs ?? Date.now();
    const weekAgo = now - 7 * DAY_IN_MS;
    const total = publicPromises.length;
    const withEvidence = publicPromises.filter((p) => p.evidenceCount > 0).length;
    const reviewed = publicPromises.filter((p) => p.trustLevel === 'verified' || p.trustLevel === 'partial').length;
    // Use baseline status (pre-live-engine) for data readiness — measures research depth, not government performance
    const active = publicPromises.filter((p) => {
      const bs = (p as unknown as Record<string, unknown>).baselineStatus as string | undefined;
      const bp = (p as unknown as Record<string, unknown>).baselineProgress as number | undefined;
      return (bs && bs !== 'not_started') || (bp && bp > 0);
    }).length;
    const recent = publicPromises.filter((p) => {
      const date = p.lastActivityDate || p.lastSignalAt || p.lastUpdate;
      return date ? new Date(date).getTime() >= weekAgo : false;
    }).length;
    const totalEvidence = publicPromises.reduce((sum, p) => sum + (p.evidenceCount || 0), 0);
    const averageEvidence = totalEvidence / total;

    return {
      evidenceLinked: Math.round((withEvidence / total) * 100),
      reviewedConfidence: Math.round((reviewed / total) * 100),
      activeMovement: Math.round((active / total) * 100),
      recentSignals: Math.round((recent / total) * 100),
      sourceDepth: Math.min(100, Math.round((averageEvidence / 5) * 100)),
    };
  }, [publicPromises, nowMs]);

  /* ── Per-category scores (worst 5) ── */
  const worstCategories = useMemo(() => {
    if (!allPromises) return [];
    const byCategory = new Map<string, { promises: GovernmentPromise[]; categoryNe: string }>();
    for (const p of allPromises) {
      if (!isPublicCommitment(p)) continue;
      const cat = p.category;
      if (!byCategory.has(cat)) byCategory.set(cat, { promises: [], categoryNe: p.category_ne || cat });
      byCategory.get(cat)!.promises.push(p);
    }
    const scored = Array.from(byCategory.entries()).map(([cat, { promises, categoryNe }]) => {
      const s = computeGhantiScore(promises);
      return { category: cat, categoryNe, score: s.score, grade: s.grade };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 5);
  }, [allPromises]);

  const scoreRows = showLetterGrade && ghantiScore
    ? ([
      ['deliveryRate', t('republicIndex.deliveryRate'), ghantiScore.subScores.deliveryRate, '#10b981'],
      ['avgProgress', t('republicIndex.avgProgress'), ghantiScore.subScores.avgProgress, '#3b82f6'],
      ['trustScore', t('republicIndex.trustScore'), ghantiScore.subScores.trustScore, '#8b5cf6'],
      ['budgetUtilization', t('republicIndex.budgetUtilization'), ghantiScore.subScores.budgetUtilization, '#f59e0b'],
      ['citizenSentiment', t('republicIndex.citizenSentiment'), ghantiScore.subScores.citizenSentiment, '#06b6d4'],
    ] as const)
    : ([
      ['evidenceLinked', t('home.baselineEvidenceLinked'), baselineCoverage.evidenceLinked, '#10b981'],
      ['reviewedConfidence', t('home.baselineReviewedConfidence'), baselineCoverage.reviewedConfidence, '#3b82f6'],
      ['activeMovement', t('home.baselineActiveMovement'), baselineCoverage.activeMovement, '#8b5cf6'],
      ['recentSignals', t('home.baselineRecentSignals'), baselineCoverage.recentSignals, '#f59e0b'],
      ['sourceDepth', t('home.baselineSourceDepth'), baselineCoverage.sourceDepth, '#06b6d4'],
    ] as const);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-np-void">
      {/* Subtle grid background */}
      <div className="absolute inset-0 z-0 nepal-hero-grid opacity-50" />

      <div className="relative z-10">
        {/* ════════════════════════════════════════
           SECTION 1 — Big Picture Dashboard
           ════════════════════════════════════════ */}
        <section className="px-4 pt-4 md:pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">

            {/* ── Hero ── */}
            <div className="mb-4 md:mb-6 text-center">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
                {locale === 'ne'
                  ? t('home.heroTitle')
                  : 'Track promises. Report reality. Verify truth.'}
              </h1>
              <p className="mt-2 text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed">
                {locale === 'ne'
                  ? t('brand.heroSubheadline')
                  : 'AI-powered tracking of government commitments, real-world issues, and evidence so you can see how the system actually performs.'}
              </p>
            </div>

            {/* ── Insight Card — what's happening RIGHT NOW ── */}
            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-3 sm:p-5 md:p-7"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                boxShadow: '0 20px 60px rgba(2,8,20,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="hidden md:block absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
                }}
              />

              {/* ── Promise Momentum Hero ── */}
              {(() => {
                const total = stats?.total ?? 109;
                const active = (stats?.inProgress ?? 0) + (stats?.stalled ?? 0) + (stats?.delivered ?? 0);
                const activityPct = total > 0 ? Math.round((active / total) * 100) : 0;
                const avgProg = stats?.avgProgress ?? 0;
                const stalledCount = stats?.stalled ?? 0;
                const inProgressCount = stats?.inProgress ?? 0;
                const deliveredCount = stats?.delivered ?? 0;
                const ringSize = isMobile ? 110 : 140;
                const sw = isMobile ? 8 : 10;
                const r = (ringSize - sw) / 2;
                const circ = 2 * Math.PI * r;
                const prog = (activityPct / 100) * circ;
                const dashOff = circ - prog;
                const ringColor = activityPct >= 70 ? '#10b981' : activityPct >= 40 ? '#06b6d4' : '#f59e0b';

                // Generate the key insight sentence
                const insightSentence = locale === 'ne'
                  ? stalledCount > 10
                    ? `${stalledCount} वचनबद्धता रोकिएका छन्। ${inProgressCount} अगाडि बढिरहेका छन्। औसत प्रगति ${avgProg}% मात्र।`
                    : `${inProgressCount} वचनबद्धता अगाडि बढिरहेका छन्। ${stalledCount} रोकिएका छन्। औसत ${avgProg}%।`
                  : stalledCount > 10
                    ? `${stalledCount} promises are stuck. ${inProgressCount} are moving. Average progress is only ${avgProg}%.`
                    : `${inProgressCount} promises are moving forward. ${stalledCount} are stuck. Average is ${avgProg}%.`;

                return (
                  <>
                    {/* Day counter + key insight */}
                    <div className="mb-4 md:mb-5">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                          {isPreInauguration
                            ? t('home.preLaunchCountdown').replace('{count}', String(daysUntilInauguration))
                            : `${locale === 'ne' ? 'दिन' : 'Day'} ${dayInTerm}`}
                        </span>
                        {showLetterGrade ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${GRADE_COLORS[ghantiScore!.grade].bg} ${GRADE_COLORS[ghantiScore!.grade].text}`}>
                            {ghantiScore!.grade}
                          </span>
                        ) : (
                          <span className="text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                            {locale === 'ne' ? 'आधाररेखा' : 'Baseline'}
                          </span>
                        )}
                      </div>
                      {/* The insight — human-readable, not raw data */}
                      <p className="text-center text-sm sm:text-base text-gray-300 font-medium leading-relaxed max-w-lg mx-auto">
                        {insightSentence}
                      </p>
                    </div>

                    {/* Ring + status summary */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 mb-4">
                      {/* Activity ring */}
                      <div className="relative flex-shrink-0">
                        <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                          <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
                          <circle
                            cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none"
                            stroke={ringColor} strokeWidth={sw} strokeLinecap="round"
                            strokeDasharray={circ} strokeDashoffset={dashOff}
                            style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 10px ${ringColor}50)` }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl md:text-3xl font-bold text-white">{activityPct}%</span>
                          <span className="text-[9px] text-gray-500">
                            {locale === 'ne' ? 'सक्रिय' : 'active'}
                          </span>
                        </div>
                      </div>

                      {/* Right side: interpreted status + progress bar */}
                      <div className="flex-1 w-full min-w-0 text-center sm:text-left">
                        {/* Status with interpretation */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-sm text-gray-300">
                              <span className="font-semibold text-emerald-400">{inProgressCount}</span>
                              <span className="text-gray-500"> {locale === 'ne' ? 'अगाडि बढ्दै' : 'moving forward'}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="text-sm text-gray-300">
                              <span className="font-semibold text-red-400">{stalledCount}</span>
                              <span className="text-gray-500"> {locale === 'ne' ? 'रोकिएको — कारवाही चाहिन्छ' : 'stuck — need attention'}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-sm text-gray-300">
                              <span className="font-semibold text-amber-400">{stats?.notStarted ?? 0}</span>
                              <span className="text-gray-500"> {locale === 'ne' ? 'सुरु भएको छैन' : 'not started yet'}</span>
                            </span>
                          </div>
                          {deliveredCount > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              <span className="text-sm text-gray-300">
                                <span className="font-semibold text-blue-400">{deliveredCount}</span>
                                <span className="text-gray-500"> {locale === 'ne' ? 'पूरा भयो' : 'delivered'}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Average progress bar */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-1000"
                                style={{ width: `${avgProg}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-400 tabular-nums">{avgProg}%</span>
                          </div>
                          <span className="text-[10px] text-gray-600">
                            {locale === 'ne' ? 'समग्र औसत प्रगति' : 'overall average progress'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Worst category chips — gated behind nowMs to prevent hydration mismatch */}
              {nowMs && showLetterGrade && worstCategories.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-3 md:mb-4">
                  {worstCategories.map((cat) => {
                    const chipColor = cat.score >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      cat.score >= 20 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20';
                    return (
                      <span key={cat.category} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${chipColor}`}>
                        {locale === 'ne' ? cat.categoryNe : cat.category}: {cat.score}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Source credibility line */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-[11px] text-gray-500 mb-2">
                <span className="text-cyan-400/80 font-medium">
                  {locale === 'ne'
                    ? `${(sourceCount / 1000).toFixed(1)}K सन्दर्भ स्क्यान`
                    : `${(sourceCount / 1000).toFixed(1)}K references scanned`}
                </span>
                <span className="text-gray-700">&middot;</span>
                <span>{locale === 'ne' ? '८०+ स्रोत' : '80+ sources'}</span>
                <span className="text-gray-700">&middot;</span>
                <span className="inline-flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {t('home.live')}
                </span>
              </div>

              {/* About this app — audio explainers */}
              <div className="mb-3 flex items-center justify-center gap-3 sm:justify-start">
                <button
                  onClick={() => {
                    if (playingAboutLang === 'en') {
                      aboutAudioRef.current?.pause();
                      setPlayingAboutLang(null);
                      return;
                    }
                    if (aboutAudioRef.current) aboutAudioRef.current.pause();
                    aboutAudioRef.current = new Audio('/audio/about-en.mp3');
                    aboutAudioRef.current.addEventListener('ended', () => setPlayingAboutLang(null));
                    aboutAudioRef.current.play().catch(() => {});
                    setPlayingAboutLang('en');
                  }}
                  className="group inline-flex items-center gap-2.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 pl-2 pr-4 py-1.5 text-[13px] font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
                >
                  {playingAboutLang === 'en' ? (
                    <><span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/30"><Pause className="h-3.5 w-3.5 text-white" /></span><span>Pause</span></>
                  ) : (
                    <><span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/30 transition-transform group-hover:scale-110"><Play className="h-3.5 w-3.5 text-white fill-white" /></span><span>About this app</span></>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (playingAboutLang === 'ne') {
                      aboutAudioRef.current?.pause();
                      setPlayingAboutLang(null);
                      return;
                    }
                    if (aboutAudioRef.current) aboutAudioRef.current.pause();
                    aboutAudioRef.current = new Audio('/audio/about-ne.mp3');
                    aboutAudioRef.current.addEventListener('ended', () => setPlayingAboutLang(null));
                    aboutAudioRef.current.play().catch(() => {});
                    setPlayingAboutLang('ne');
                  }}
                  className="group inline-flex items-center gap-2.5 rounded-full border border-orange-400/30 bg-orange-500/10 pl-2 pr-4 py-1.5 text-[13px] font-medium text-orange-200 transition-colors hover:bg-orange-500/20"
                >
                  {playingAboutLang === 'ne' ? (
                    <><span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 shadow-lg shadow-orange-500/30"><Pause className="h-3.5 w-3.5 text-white" /></span><span>रोक्नुहोस्</span></>
                  ) : (
                    <><span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-110"><Play className="h-3.5 w-3.5 text-white fill-white" /></span><span>नेपालीमा सुन्नुहोस्</span></>
                  )}
                </button>
              </div>

              {/* Share hero score — gated behind nowMs to prevent hydration mismatch */}
              {nowMs && ghantiScore && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                  <button
                    onClick={() => {
                      const text = scorecardShareText({
                        grade: showLetterGrade ? ghantiScore.grade : undefined,
                        score: showLetterGrade ? ghantiScore.score : undefined,
                        dayInTerm,
                        locale,
                      });
                      shareOrCopy({ title: 'Nepal Republic', text, url: window.location.origin });
                    }}
                    className="inline-flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                    {showLetterGrade ? t('home.shareScore') : t('home.shareSnapshot')}
                  </button>
                  <span className="text-gray-700 mx-1">·</span>
                  <Link
                    href="/how-we-score"
                    className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    {t('home.howWeScore')} →
                  </Link>
                </div>
              )}

              {/* Score disclaimer asterisk */}
              {nowMs && ghantiScore && (
                <p className="text-center text-[9px] text-gray-600 mb-2 md:mb-3">
                  <span className="group relative inline-flex items-center gap-0.5 cursor-help">
                    * {showLetterGrade ? t('home.scoreDisclaimer') : t('home.baselineDisclaimer')}
                    <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2 rounded-lg bg-gray-800 border border-white/10 text-[10px] text-gray-300 leading-relaxed shadow-xl z-50">
                      {showLetterGrade ? t('home.scoreDisclaimerFull') : t('home.baselineDisclaimerFull')}
                    </span>
                  </span>
                </p>
              )}

              {/* This week activity line — desktop only */}
              {!statsLoading && (
                <div className="hidden md:block text-sm text-gray-400 mb-3 text-left">
                  <span className="text-gray-500 font-medium">{t('home.thisWeek')}</span>{' '}
                  {weekActivity.movedForward > 0 && (
                    <span className="text-emerald-400">
                      {t('home.movedUp').replace('{count}', String(weekActivity.movedForward))}
                    </span>
                  )}
                  {weekActivity.movedForward > 0 && weekActivity.stalledCount > 0 && (
                    <span className="text-gray-600"> &middot; </span>
                  )}
                  {weekActivity.stalledCount > 0 && (
                    <span className="text-red-400">
                      {t('home.stalledDown').replace('{count}', String(weekActivity.stalledCount))}
                    </span>
                  )}
                  {weekActivity.movedForward === 0 && weekActivity.stalledCount === 0 && (
                    <span className="text-gray-500">{t('home.noStatusChanges')}</span>
                  )}
                </div>
              )}

              {/* Top movers — desktop only */}
              {topMovers.length > 0 && (
                <div className="hidden md:block text-sm text-gray-400 mb-3 text-left">
                  <span className="text-base leading-none">{'\uD83D\uDD25'}</span>{' '}
                  {topMovers.map((m, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-gray-600"> &middot; </span>}
                      <span className="text-gray-300">{m.title.length > 30 ? m.title.slice(0, 30) + '...' : m.title}</span>
                      {m.progress > 0 && (
                        <span className="text-emerald-400 ml-1">{'\u2191'}{m.progress}%</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Contradictions warning */}
              {contradictionCount > 0 && (
                <div className="flex items-center gap-2 text-xs md:text-sm text-amber-400/90 mb-2 md:mb-4 justify-center md:justify-start">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{contradictionCount !== 1 ? t('home.contradictionsPlural').replace('{count}', String(contradictionCount)) : t('home.contradictions').replace('{count}', String(contradictionCount))}</span>
                </div>
              )}

              {/* Daily brief divider + Story Cards */}
              <div className="border-t border-white/[0.06] pt-2 md:pt-4 mb-2 md:mb-4">
                {briefLoading ? (
                  <div className="flex items-center gap-2.5 text-xs md:text-sm text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    <span>{t('home.scanning').replace('{count}', String(sourceCount))}</span>
                  </div>
                ) : brief ? (
                  <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-2 md:mb-3">
                      <span>{'\uD83D\uDCCB'}</span>
                      {t('home.todaysBrief')}
                    </div>

                    {/* Audio players — EN and NE side by side on same row */}
                    {brief.audioUrl && (() => {
                      const cacheBust = `?v=${brief.date}`;
                      const enUrl = brief.audioUrl.replace('brief-ne.mp3', 'brief-en.mp3') + cacheBust;
                      const neUrl = brief.audioUrl + cacheBust;
                      return (
                        <div className="mb-2 flex gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400 px-1">English</div>
                            <DailyBriefPlayer
                              audioUrl={enUrl}
                              durationSeconds={brief.audioDurationSeconds || undefined}
                              storyCount={brief.topStories?.length || 0}
                              onStoryHighlight={setAudioHighlightIdx}
                              hideHeader
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400 px-1">नेपाली</div>
                            <DailyBriefPlayer
                              audioUrl={neUrl}
                              durationSeconds={brief.audioDurationSeconds || undefined}
                              storyCount={brief.topStories?.length || 0}
                              onStoryHighlight={setAudioHighlightIdx}
                              hideHeader
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Unified daily brief — single cohesive card */}
                    <UnifiedDailyBrief
                      brief={brief}
                      highlights={brief.readerHighlights ?? []}
                      locale={locale}
                      isMobile={isMobile}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-xs md:text-sm text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400 opacity-50" />
                    <span>{t('home.scanning').replace('{count}', String(sourceCount))}</span>
                  </div>
                )}
              </div>

              {/* Pulse bar — desktop only */}
              <div className="hidden md:block">
                <PulseBar score={pulse || brief?.pulse || 0} />
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 2 — Feed Tab Bar + Feed
           ════════════════════════════════════════ */}
        <section className="mt-6 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
            {/* Tab Bar */}
            <FeedTabBar
              activeTab={feedTab}
              onTabChange={handleTabChange}
              followingCount={watchedProjectIds.length}
              categoriesOfInterest={categoriesOfInterest}
              onCategoriesChange={setCategoriesOfInterest}
              isMobile={isMobile}
            />

            {/* Feed Content */}
            {promisesLoading ? (
              <div className="space-y-3 mt-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass-card p-4">
                    <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-3 h-1 w-full rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            ) : feedTab === 'following' && followingFeed.length === 0 ? (
              <FollowingEmptyState onBrowse={() => handleTabChange('for-you')} />
            ) : feedTab === 'trending' && trendingFeed.length === 0 ? (
              <TrendingEmptyState />
            ) : feedTab === 'corruption' ? (
              <div className="space-y-3 mt-3">
                {/* Report Corruption Button + Inline Form */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCorruptionForm((prev) => !prev);
                      setCorruptionSubmitMsg(null);
                      setCorruptionSubmitError(null);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] py-3 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/[0.12] hover:text-red-200"
                  >
                    <Shield className="h-4 w-4" />
                    {locale === 'ne' ? 'भ्रष्टाचार रिपोर्ट गर्नुहोस्' : 'Report Corruption'}
                    {showCorruptionForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showCorruptionForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (corruptionDesc.trim().length < 10) {
                          setCorruptionSubmitError(
                            locale === 'ne' ? 'विवरण कम्तीमा १० अक्षर हुनु पर्छ।' : 'Description must be at least 10 characters.',
                          );
                          return;
                        }
                        setIsSubmittingCorruption(true);
                        setCorruptionSubmitMsg(null);
                        setCorruptionSubmitError(null);
                        try {
                          const res = await fetch('/api/corruption/report', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: corruptionTitle.trim() || undefined,
                              description: corruptionDesc.trim(),
                              corruption_type: corruptionType || undefined,
                              municipality: corruptionMunicipality.trim() || undefined,
                              evidence_url: corruptionEvidenceUrl.trim() || undefined,
                              evidence_note: corruptionEvidenceNote.trim() || undefined,
                              is_anonymous: corruptionAnonymous,
                              language: locale === 'ne' ? 'ne' : 'en',
                            }),
                          });
                          const payload = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(payload?.error || `Failed with status ${res.status}`);
                          setCorruptionTitle('');
                          setCorruptionDesc('');
                          setCorruptionType('');
                          setCorruptionMunicipality('');
                          setCorruptionEvidenceUrl('');
                          setCorruptionEvidenceNote('');
                          setCorruptionAnonymous(false);
                          setCorruptionSubmitMsg(
                            locale === 'ne'
                              ? 'भ्रष्टाचार रिपोर्ट सफलतापूर्वक पेश भयो। समीक्षा पछि सार्वजनिक हुनेछ।'
                              : 'Corruption report submitted successfully. It will be public after review.',
                          );
                        } catch (err) {
                          setCorruptionSubmitError(
                            err instanceof Error
                              ? err.message
                              : locale === 'ne'
                                ? 'रिपोर्ट पेश गर्न सकिएन।'
                                : 'Failed to submit report.',
                          );
                        } finally {
                          setIsSubmittingCorruption(false);
                        }
                      }}
                      className="glass-card mt-2 p-4 sm:p-5 space-y-3"
                    >
                      <h3 className="text-sm font-semibold text-white">
                        {locale === 'ne' ? 'भ्रष्टाचार रिपोर्ट' : 'Report Corruption'}
                      </h3>

                      <input
                        value={corruptionTitle}
                        onChange={(e) => setCorruptionTitle(e.target.value)}
                        placeholder={locale === 'ne' ? 'शीर्षक (वैकल्पिक)' : 'Title (optional)'}
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                      />

                      <textarea
                        value={corruptionDesc}
                        onChange={(e) => setCorruptionDesc(e.target.value)}
                        rows={4}
                        required
                        placeholder={
                          locale === 'ne'
                            ? 'तपाईंले देख्नुभएको वा सुन्नुभएको भ्रष्टाचार वर्णन गर्नुहोस्। नाम, स्थान, रकम भए उल्लेख गर्नुहोस्...'
                            : 'Describe the corruption you\'ve witnessed or heard about. Include names, places, amounts if known...'
                        }
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={corruptionType}
                          onChange={(e) => setCorruptionType(e.target.value)}
                          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-primary-500/40 focus:outline-none [&>option]:bg-gray-900"
                        >
                          <option value="">{locale === 'ne' ? 'भ्रष्टाचार प्रकार छान्नुहोस्' : 'Select corruption type'}</option>
                          <option value="bribery">{locale === 'ne' ? 'घुस' : 'Bribery'}</option>
                          <option value="embezzlement">{locale === 'ne' ? 'हिनामिना' : 'Embezzlement'}</option>
                          <option value="nepotism">{locale === 'ne' ? 'कृपावाद' : 'Nepotism'}</option>
                          <option value="land_grab">{locale === 'ne' ? 'जग्गा कब्जा' : 'Land Grab'}</option>
                          <option value="procurement_fraud">{locale === 'ne' ? 'खरिद धाँधली' : 'Procurement Fraud'}</option>
                          <option value="abuse_of_authority">{locale === 'ne' ? 'अधिकार दुरुपयोग' : 'Abuse of Authority'}</option>
                          <option value="kickback">{locale === 'ne' ? 'कमिसन' : 'Kickback'}</option>
                          <option value="other">{locale === 'ne' ? 'अन्य' : 'Other'}</option>
                        </select>

                        <input
                          value={corruptionMunicipality}
                          onChange={(e) => setCorruptionMunicipality(e.target.value)}
                          placeholder={locale === 'ne' ? 'पालिका' : 'Municipality'}
                          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                        />
                      </div>

                      <input
                        value={corruptionEvidenceUrl}
                        onChange={(e) => setCorruptionEvidenceUrl(e.target.value)}
                        placeholder={
                          locale === 'ne'
                            ? 'प्रमाण लिंक (समाचार, सोशल मिडिया, कागजात)'
                            : 'Link to news article, social media post, or document'
                        }
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                      />

                      <textarea
                        value={corruptionEvidenceNote}
                        onChange={(e) => setCorruptionEvidenceNote(e.target.value)}
                        rows={2}
                        placeholder={locale === 'ne' ? 'प्रमाण नोट (वैकल्पिक)' : 'Evidence note (optional)'}
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                      />

                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={corruptionAnonymous}
                          onChange={(e) => setCorruptionAnonymous(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5"
                        />
                        {locale === 'ne' ? 'नाम सार्वजनिक नगर्नुहोस्' : 'Submit anonymously'}
                      </label>

                      {corruptionSubmitMsg && (
                        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                          {corruptionSubmitMsg}
                        </p>
                      )}
                      {corruptionSubmitError && (
                        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                          {corruptionSubmitError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmittingCorruption}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 py-2.5 text-sm font-semibold text-red-200 transition-all hover:bg-red-500/25 disabled:opacity-60"
                      >
                        {isSubmittingCorruption && <Loader2 className="h-4 w-4 animate-spin" />}
                        {locale === 'ne' ? 'रिपोर्ट पेश गर्नुहोस्' : 'Submit Report'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Corruption Summary */}
                {corruptionStats && (
                  <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3 md:p-4">
                    <h3 className="text-sm font-bold text-red-300 mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      {locale === 'ne' ? 'भ्रष्टाचार सारांश' : 'Corruption Summary'}
                    </h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-white">{corruptionStats.totalCases}</div>
                        <div className="text-[9px] text-gray-500 uppercase">{locale === 'ne' ? 'घटना' : 'Cases'}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-400">रू {formatAmountNpr(corruptionStats.totalAmountNpr)}</div>
                        <div className="text-[9px] text-gray-500 uppercase">≈ {formatNprWithUsd(corruptionStats.totalAmountNpr).usd}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-amber-400">{corruptionStats.activeInvestigations}</div>
                        <div className="text-[9px] text-gray-500 uppercase">{locale === 'ne' ? 'सक्रिय' : 'Active'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Corruption Cases */}
                {corruptionCases.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/corruption/${c.slug}`}
                    className="glass-card-hover block p-3 md:p-4 transition-opacity duration-200"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${STATUS_COLORS[c.status].bg} ${STATUS_COLORS[c.status].text}`}>
                        {STATUS_LABELS[c.status].en}
                      </span>
                      {c.severity && SEVERITY_COLORS[c.severity] && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${SEVERITY_COLORS[c.severity].bg} ${SEVERITY_COLORS[c.severity].text}`}>
                          {SEVERITY_LABELS[c.severity].en}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-100">{c.title}</h3>
                    {c.estimated_amount_npr != null && c.estimated_amount_npr > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-400 font-medium mt-1">
                        <span>रू {formatAmountNpr(c.estimated_amount_npr)}</span>
                        <span className="text-[10px] text-gray-500">(≈ {formatNprWithUsd(c.estimated_amount_npr).usd})</span>
                      </div>
                    )}
                    {c.summary && (
                      <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{c.summary}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-600 mt-2">
                      <Clock className="h-3 w-3" />
                      <span>Updated {new Date(c.updated_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}

                {corruptionCases.length > 0 && (
                  <Link
                    href="/corruption"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-medium text-gray-300 transition-all hover:bg-white/[0.06] hover:text-white"
                  >
                    {locale === 'ne' ? 'सबै घटनाहरू हेर्नुहोस्' : 'View All Cases'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3 mt-3">
                {/* Trending: "This Week's Movers" header with top 3 */}
                {feedTab === 'trending' && trendingFeed.length > 0 && (
                  <div className="rounded-xl border border-orange-500/15 bg-orange-500/[0.03] p-3 md:p-4 mb-1">
                    <h3 className="text-sm font-bold text-orange-300 mb-3 flex items-center gap-1.5">
                      <span>{'\uD83C\uDFC6'}</span> {t('home.weekMovers')}
                    </h3>
                    <div className="space-y-2">
                      {trendingFeed.slice(0, 3).map((commitment, idx) => {
                        const cTitle = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
                        return (
                          <Link
                            key={commitment.id}
                            href={`/explore/first-100-days/${commitment.slug}`}
                            className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/[0.04] transition-colors"
                          >
                            <span className="text-lg font-bold text-orange-400/80 w-7 text-center tabular-nums">
                              #{idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-200 truncate">{cTitle}</p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                {commitment.progress > 0 ? (
                                  <span className="text-emerald-400">{'\u2191'} {commitment.progress}%</span>
                                ) : (
                                  <span className="text-gray-600">{'\u2192'} {t('home.noChange')}</span>
                                )}
                                {(commitment.lastActivitySignalCount ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                                    {commitment.lastActivitySignalCount} {t('home.signals')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Render feed items (for trending, start numbering from #4) */}
                {visibleFeed.map((commitment, idx) => {
                  // For trending: skip top 3 (shown in header); for others: show all
                  if (feedTab === 'trending' && idx < 3 && trendingFeed.length > 3) return null;
                  const rankNum = feedTab === 'trending' ? idx + 1 : undefined;
                  return (
                    <div key={commitment.id} className="relative">
                      {rankNum && (
                        <span className="absolute -left-0 top-3 text-[10px] font-bold text-gray-600 tabular-nums z-10 hidden md:block" style={{ left: '-1.5rem' }}>
                          #{rankNum}
                        </span>
                      )}
                      <FeedCommitmentCard
                        commitment={commitment}
                        isTrending={trendingIds.has(commitment.id)}
                        locale={locale}
                        showNewDot={feedTab === 'following' ? hasNewActivity(commitment) : undefined}
                      />
                    </div>
                  );
                })}

                {hasMore && (
                  <button
                    onClick={loadMore}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-medium text-gray-300 transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    {t('common.loadMore')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                {feedTab === 'trending' && visibleFeed.length > 0 && (
                  <Link
                    href="/trending"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/15 bg-orange-500/[0.04] py-3 text-sm font-medium text-orange-300 transition-all hover:bg-orange-500/[0.08] hover:text-orange-200 mt-3"
                  >
                    {t('common.seeFullTrending')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 3 — Stale Commitments (collapsed, only on For You tab)
           ════════════════════════════════════════ */}
        {staleItems.length > 0 && feedTab === 'for-you' && (
          <section className="mt-6 px-4 pb-10 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
              <button
                onClick={() => setStaleExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-colors duration-300 hover:bg-white/[0.04]"
              >
                <span className="text-sm text-gray-400">
                  {t('home.staleCount').replace('{count}', String(staleItems.length))}
                </span>
                {staleExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {staleExpanded && (
                <div className="mt-2 space-y-1.5">
                  {staleItems.map((commitment) => (
                    <StaleRow key={commitment.id} commitment={commitment} locale={locale} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
           SECTION 4 — Support Nepal Republic
           ════════════════════════════════════════ */}
        <section className="mt-8 px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
            <div className="glass-card p-5 sm:p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-red-400" />
                <h3 className="text-sm font-bold text-gray-200">
                  {locale === 'ne' ? 'नेपाल रिपब्लिकलाई सहयोग गर्नुहोस्' : 'Support Nepal Republic'}
                </h3>
              </div>
              <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                {locale === 'ne'
                  ? 'उपयोगी लागे सहयोग गर्नुहोस्। तपाईंको सहयोगले यो प्लेटफर्म सबैका लागि निःशुल्क राख्न मद्दत गर्छ।'
                  : 'If you find this useful, consider supporting us. Your contribution helps keep this platform free for everyone.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="https://buy.stripe.com/fZu14g9KPePD6aCgvn1RC00"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5147e5] shadow-lg shadow-[#635BFF]/20"
                >
                  <Heart className="h-4 w-4" />
                  {locale === 'ne' ? 'सहयोग गर्नुहोस्' : 'Support Us'}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
