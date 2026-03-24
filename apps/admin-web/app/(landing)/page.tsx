'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Loader2, AlertTriangle, Heart } from 'lucide-react';
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
import { getPromiseRelevance } from '@/lib/utils/geo-relevance';
import { InterestFilter } from '@/components/public/interest-filter';
import type { GovernmentPromise } from '@/lib/data/promises';

/* ═══════════════════════════════════════════
   Feed Tab Type
   ═══════════════════════════════════════════ */
type FeedTab = 'for-you' | 'following' | 'trending';

const FEED_TAB_STORAGE_KEY = 'feed-tab-preference';
const LAST_FOLLOWING_VISIT_KEY = 'last-following-visit';

/* ═══════════════════════════════════════════
   Daily Brief Types & Fetch
   ═══════════════════════════════════════════ */
interface DailyBrief {
  date: string;
  pulse: number;
  pulseLabel: string;
  summaryEn: string;
  summaryNe: string;
  stats: {
    totalSignals24h: number;
    newSignals: number;
    sourcesActive: number;
    topSource: string;
  };
}

function useDailyBrief() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/daily-brief', { signal: controller.signal })
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
  in_progress: { label: 'progressing', color: 'bg-emerald-500', text: 'text-emerald-400', dot: '\u{1F7E2}' },
  stalled: { label: 'stalled', color: 'bg-red-500', text: 'text-red-400', dot: '\u{1F534}' },
  not_started: { label: 'not started', color: 'bg-amber-500', text: 'text-amber-400', dot: '\u{1F7E1}' },
  delivered: { label: 'delivered', color: 'bg-blue-400', text: 'text-blue-400', dot: '\u2705' },
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
  emoji,
  count,
  label,
  glowColor,
}: {
  emoji: string;
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
      <span className="text-2xl leading-none">{emoji}</span>
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
      <span className="text-emerald-400">{'\u{1F7E2}'}{stats.inProgress}</span>
      <span className="text-red-400">{'\u{1F534}'}{stats.stalled}</span>
      <span className="text-amber-400">{'\u{1F7E1}'}{stats.notStarted}</span>
      <span className="text-blue-400">{'\u2705'}{stats.delivered}</span>
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
  const title = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
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
                trending
              </span>
            )}
            <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
              {commitment.category}
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
          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.color}`} />
          {statusCfg.label}
        </span>
        {commitment.progress > 0 && (
          <span>{commitment.progress}%</span>
        )}
        {commitment.evidenceCount > 0 && (
          <span>{commitment.evidenceCount} sources</span>
        )}
        {commitment.lastActivitySignalCount != null && commitment.lastActivitySignalCount > 0 && (
          <span className="text-cyan-400">{commitment.lastActivitySignalCount} signals</span>
        )}
      </div>

      {/* Progress bar */}
      {commitment.progress > 0 && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
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
  return (
    <Link
      href={`/explore/first-100-days/${commitment.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors duration-300 hover:bg-white/[0.04]"
    >
      <span className="min-w-0 truncate text-sm text-gray-400">{title}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-600">
        {commitment.category}
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
  const filterCount = categoriesOfInterest.length;

  const tabs: { id: FeedTab; label: string; badge?: number }[] = [
    { id: 'for-you', label: filterCount > 0 ? `For You (${filterCount})` : 'For You' },
    { id: 'following', label: 'Following', badge: followingCount > 0 ? followingCount : undefined },
    { id: 'trending', label: 'Trending' },
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
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
        <Heart className="h-6 w-6 text-gray-500" />
      </div>
      <p className="text-sm font-medium text-gray-300 mb-1">
        You&apos;re not following any commitments yet.
      </p>
      <p className="text-xs text-gray-500 mb-5">
        Tap <Heart className="inline h-3 w-3 text-rose-400" /> on any commitment to follow it.
      </p>
      <button
        onClick={onBrowse}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-white/[0.08] hover:text-white"
      >
        Browse all commitments
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Trending Empty State
   ═══════════════════════════════════════════ */
function TrendingEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-sm text-gray-400">
        No commitments trending right now. Check back later.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
const INITIAL_FEED_COUNT = 10;

export default function LandingPage() {
  const { locale } = useI18n();
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
  const [lastFollowingVisit, setLastFollowingVisit] = useState<number>(0);

  // Restore tab preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FEED_TAB_STORAGE_KEY) as FeedTab | null;
      if (stored && ['for-you', 'following', 'trending'].includes(stored)) {
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

  /* ── Apply interest-category filter on "For You" feed ── */
  const filteredForYouActive = useMemo(() => {
    if (!categoriesOfInterest.length) return forYouFeed.active;
    return forYouFeed.active.filter((c) => categoriesOfInterest.includes(c.category));
  }, [forYouFeed.active, categoriesOfInterest]);

  const filteredForYouStale = useMemo(() => {
    if (!categoriesOfInterest.length) return forYouFeed.stale;
    return forYouFeed.stale.filter((c) => categoriesOfInterest.includes(c.category));
  }, [forYouFeed.stale, categoriesOfInterest]);

  /* ── Choose which feed to show ── */
  const currentFeedItems = feedTab === 'for-you'
    ? filteredForYouActive
    : feedTab === 'following'
      ? followingFeed
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

  return (
    <div className="relative min-h-screen overflow-x-clip bg-np-void">
      {/* Subtle grid background */}
      <div className="absolute inset-0 z-0 nepal-hero-grid opacity-50" />

      <div className="relative z-10">
        {/* ════════════════════════════════════════
           SECTION 1 — Big Picture Dashboard
           ════════════════════════════════════════ */}
        <section className="px-4 pt-4 md:pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            {/* Dark glass container */}
            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-3 md:p-7"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                boxShadow: '0 20px 60px rgba(2,8,20,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Radial glow behind status boxes — desktop only */}
              <div
                className="hidden md:block absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
                }}
              />

              {/* Title row */}
              <div className="relative text-center mb-3 md:mb-6">
                <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white">
                  The nation&apos;s report card.
                </h1>
                <p className="mt-1 text-xs md:text-sm text-gray-400">
                  {statsLoading ? '--' : stats?.total ?? 0} commitments{' '}
                  <span className="text-gray-600">&middot;</span>{' '}
                  {sourceCount} sources{' '}
                  <span className="text-gray-600">&middot;</span>{' '}
                  <span className="inline-flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </span>
                </p>
              </div>

              {/* Mobile: inline status counts */}
              {!statsLoading && (
                <div className="md:hidden mb-3">
                  <InlineStatusRow stats={{
                    inProgress: stats?.inProgress ?? 0,
                    stalled: stats?.stalled ?? 0,
                    notStarted: stats?.notStarted ?? 0,
                    delivered: stats?.delivered ?? 0,
                  }} />
                </div>
              )}

              {/* Desktop: Status boxes — 4 across */}
              <div className="hidden md:grid relative grid-cols-4 gap-3 mb-6">
                {statsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-5 animate-pulse">
                      <div className="h-8 w-12 mx-auto rounded bg-white/[0.06] mb-2" />
                      <div className="h-3 w-16 mx-auto rounded bg-white/[0.04]" />
                    </div>
                  ))
                ) : (
                  <>
                    <StatusBox
                      emoji={'\u{1F7E2}'}
                      count={stats?.inProgress ?? 0}
                      label="progressing"
                      glowColor="rgba(16,185,129,0.12)"
                    />
                    <StatusBox
                      emoji={'\u{1F534}'}
                      count={stats?.stalled ?? 0}
                      label="stalled"
                      glowColor="rgba(239,68,68,0.12)"
                    />
                    <StatusBox
                      emoji={'\u{1F7E1}'}
                      count={stats?.notStarted ?? 0}
                      label="waiting"
                      glowColor="rgba(245,158,11,0.10)"
                    />
                    <StatusBox
                      emoji={'\u2705'}
                      count={stats?.delivered ?? 0}
                      label="delivered"
                      glowColor="rgba(59,130,246,0.12)"
                    />
                  </>
                )}
              </div>

              {/* This week activity line — desktop only */}
              {!statsLoading && (
                <div className="hidden md:block text-sm text-gray-400 mb-3 text-left">
                  <span className="text-gray-500 font-medium">This week:</span>{' '}
                  {weekActivity.movedForward > 0 && (
                    <span className="text-emerald-400">
                      {weekActivity.movedForward} moved{' '}
                      <span className="text-emerald-500">{'\u2191'}</span>
                    </span>
                  )}
                  {weekActivity.movedForward > 0 && weekActivity.stalledCount > 0 && (
                    <span className="text-gray-600"> &middot; </span>
                  )}
                  {weekActivity.stalledCount > 0 && (
                    <span className="text-red-400">
                      {weekActivity.stalledCount} stalled{' '}
                      <span className="text-red-500">{'\u2193'}</span>
                    </span>
                  )}
                  {weekActivity.movedForward === 0 && weekActivity.stalledCount === 0 && (
                    <span className="text-gray-500">No status changes yet</span>
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
                  <span>{contradictionCount} commitment{contradictionCount !== 1 ? 's have' : ' has'} contradictions</span>
                </div>
              )}

              {/* Daily brief divider + content */}
              <div className="border-t border-white/[0.06] pt-2 md:pt-4 mb-2 md:mb-4">
                {briefLoading ? (
                  <div className="flex items-center gap-2.5 text-xs md:text-sm text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    <span>Scanning {sourceCount} sources...</span>
                  </div>
                ) : brief ? (
                  <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-1 md:mb-2">
                      <span>{'\uD83D\uDCCB'}</span>
                      Today&apos;s brief
                    </div>
                    <p className="text-xs md:text-sm leading-relaxed text-gray-300 line-clamp-1 md:line-clamp-none">
                      {locale === 'ne' && brief.summaryNe
                        ? brief.summaryNe.split('\n').slice(0, 3).join(' ')
                        : brief.summaryEn.split('\n').slice(0, 3).join(' ')}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-xs md:text-sm text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400 opacity-50" />
                    <span>Scanning {sourceCount} sources...</span>
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
          <div className="mx-auto w-full max-w-3xl">
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
            ) : (
              <div className="space-y-2 md:space-y-3 mt-3">
                {visibleFeed.map((commitment) => (
                  <FeedCommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    isTrending={trendingIds.has(commitment.id)}
                    locale={locale}
                    showNewDot={feedTab === 'following' ? hasNewActivity(commitment) : undefined}
                  />
                ))}

                {hasMore && (
                  <button
                    onClick={loadMore}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-medium text-gray-300 transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    Load more
                    <ArrowRight className="h-4 w-4" />
                  </button>
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
            <div className="mx-auto w-full max-w-3xl">
              <button
                onClick={() => setStaleExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-colors duration-300 hover:bg-white/[0.04]"
              >
                <span className="text-sm text-gray-400">
                  {staleItems.length} commitments with no activity yet
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
      </div>
    </div>
  );
}
