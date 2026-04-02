'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Target,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  ArrowRight,
  Share,
  ExternalLink,
  Calendar,
  Filter,
  Building2,
  Truck,
  Cpu,
  Heart,
  Zap,
  GraduationCap,
  Leaf,
  Scale,
  Fingerprint,
  MapPin,
  FileText,
  Link2,
  Banknote,
  TrendingUp,
  Briefcase,
  Users,
  Bookmark,
  GitCompareArrows,
  Radio,
  ArrowUpDown,
  Activity,
  Newspaper,
  Eye,
  Sparkles,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { CountdownStrip } from '@/components/public/countdown-strip';
import { VoteWidget } from '@/components/public/vote-widget';
import { BudgetOverviewStrip } from '@/components/budget/budget-overview-strip';
import { usePreferencesStore, useWatchlistStore } from '@/lib/stores/preferences';
import { useComparisonStore } from '@/lib/stores/comparison';
import { ExportButton } from '@/components/public/export-button';
import { exportPromisesCSV, exportPromisesPDF } from '@/lib/utils/export';
import { commitmentShareText, shareIntentUrl, shareOrCopy } from '@/lib/utils/share';
import { useEvidenceCounts } from '@/lib/hooks/use-evidence-vault';
import { isPublicCommitment } from '@/lib/data/commitments';
import {
  promises,
  deadlines,
  timelineEvents,
  computeStats,
  formatNPR,
  formatNPRtoUSD,
  type PromiseStatus,
  type TrustLevel,
  type GovernmentPromise,
} from '@/lib/data/promises';
import { useAllPromises, useArticleCount, useLatestArticles } from '@/lib/hooks/use-promises';
import { useTrending } from '@/lib/hooks/use-trending';
import { GhantiIcon } from '@/components/ui/ghanti-icon';
import { translateActor } from '@/components/public/commitment-card';

/* ═══════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════ */
const statusStyleConfig: Record<PromiseStatus, { bg: string; text: string; dot: string; glow?: string }> = {
  not_started: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.2)]' },
  delivered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  stalled: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.2)]' },
};

const statusLabelKeys: Record<PromiseStatus, string> = {
  not_started: 'commitment.notStarted',
  in_progress: 'commitment.inProgress',
  delivered: 'commitment.delivered',
  stalled: 'commitment.stalled',
};

/* ═══════════════════════════════════════════════
   TRUST LEVEL CONFIG
   ═══════════════════════════════════════════════ */
const trustStyleConfig: Record<TrustLevel, { labelKey: string; color: string; bg: string; border: string; glow: string; Icon: React.ElementType }> = {
  verified: { labelKey: 'trust.verified', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.25)]', Icon: ShieldCheck },
  partial: { labelKey: 'trust.partial', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', glow: 'shadow-[0_0_8px_rgba(234,179,8,0.25)]', Icon: Shield },
  unverified: { labelKey: 'trust.unverified', color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-500/30', glow: '', Icon: ShieldAlert },
  disputed: { labelKey: 'trust.disputed', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.25)]', Icon: ShieldX },
};

/* ═══════════════════════════════════════════════
   CATEGORY CONFIG
   ═══════════════════════════════════════════════ */
const categoryIcons: Record<string, React.ElementType> = {
  Infrastructure: Building2,
  Transport: Truck,
  Technology: Cpu,
  Health: Heart,
  Environment: Leaf,
  Energy: Zap,
  Education: GraduationCap,
  'Anti-Corruption': Fingerprint,
  Governance: Scale,
  Economy: Briefcase,
  Social: Users,
};

const categoryColors: Record<string, string> = {
  Infrastructure: 'text-blue-400',
  Transport: 'text-amber-400',
  Technology: 'text-cyan-400',
  Health: 'text-rose-400',
  Environment: 'text-emerald-400',
  Energy: 'text-yellow-400',
  Education: 'text-purple-400',
  'Anti-Corruption': 'text-orange-400',
  Governance: 'text-indigo-400',
  Economy: 'text-teal-400',
  Social: 'text-pink-400',
};

const allCategories = [
  'All', 'Infrastructure', 'Transport', 'Technology', 'Health', 'Energy',
  'Education', 'Environment', 'Governance', 'Anti-Corruption', 'Economy', 'Social',
];

/* ═══════════════════════════════════════════════
   EVENT CATEGORY CONFIG
   ═══════════════════════════════════════════════ */
const eventCategoryConfig: Record<string, { bg: string; text: string }> = {
  election: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  ceremony: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  governance: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  policy: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  finance: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  milestone: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
};

/* ═══════════════════════════════════════════════
   MOBILE LOAD-MORE BATCH SIZE
   ═══════════════════════════════════════════════ */
const MOBILE_INITIAL_COUNT = 15;
const MOBILE_LOAD_MORE_COUNT = 15;

/* ═══════════════════════════════════════════════
   CIRCULAR PROGRESS RING
   ═══════════════════════════════════════════════ */
function ProgressRing({ percentage, size = 180, strokeWidth = 12 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.4))' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

function formatRelativeSignalDate(dateString: string | null | undefined, t: (key: string) => string) {
  if (!dateString) return t('dates.freshnessUnavailable');
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return t('dates.freshnessUnavailable');

  const diffDays = Math.floor((Date.now() - value.getTime()) / 86400000);
  if (diffDays <= 0) return t('dates.today');
  if (diffDays === 1) return t('dates.yesterday');
  if (diffDays < 7) return t('dates.daysAgo').replace('{days}', String(diffDays));
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return t('dates.weeksAgo').replace('{weeks}', String(diffWeeks));
  const diffMonths = Math.floor(diffDays / 30);
  return t('dates.monthsAgo').replace('{months}', String(diffMonths));
}

/* ═══════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════ */
export default function BachanTrackerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-white/40">Loading...</div></div>}>
      <BachanTrackerContent />
    </Suspense>
  );
}

function BachanTrackerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const entry = searchParams.get('entry');
  const categoryFilter = searchParams.get('category') || 'All';
  const statusFilter = searchParams.get('status') || 'All';
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'activity'>('activity');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_INITIAL_COUNT);
  const { locale, t } = useI18n();
  const isMobile = useIsMobile();
  const { data: livePromises } = useAllPromises();
  const { data: articleCount } = useArticleCount();
  const { data: latestArticles } = useLatestArticles(8);
  const commitmentRecords = useMemo(
    () => (livePromises?.filter((commitment) => isPublicCommitment(commitment))?.length
      ? livePromises.filter((commitment) => isPublicCommitment(commitment))
      : promises),
    [livePromises],
  );

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'All') params.delete(key);
    else params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
    setMobileVisibleCount(MOBILE_INITIAL_COUNT); // reset load-more on filter change
  };
  const setCategoryFilter = (v: string) => setFilter('category', v);
  const setStatusFilter = (v: string) => setFilter('status', v);
  const { toggleWatch, isWatched } = useWatchlistStore();
  const watchedProjectIds = useWatchlistStore((state) => state.watchedProjectIds);
  const { province, district, hasSetHometown, setShowPicker } = usePreferencesStore();
  const { addToComparison, removeFromComparison, isInComparison } = useComparisonStore();
  const { data: evidenceCounts } = useEvidenceCounts();
  const { trendingIds } = useTrending();

  const isNe = locale === 'ne';
  const showBalenSpotlight = entry === 'balen';

  // Status filter entries
  const statusFilterEntries = [
    { key: 'All', labelKey: 'explore.all', emoji: '' },
    { key: 'in_progress', labelKey: 'commitment.inProgress', emoji: '\uD83D\uDFE2' },
    { key: 'stalled', labelKey: 'commitment.stalled', emoji: '\uD83D\uDD34' },
    { key: 'delivered', labelKey: 'commitment.delivered', emoji: '\u2705' },
    { key: 'not_started', labelKey: 'commitment.notStarted', emoji: '' },
  ];

  // Build activity-aware lookup from live Supabase data
  const activityMap = useMemo(() => {
    const map: Record<string, { lastActivityDate?: string; lastActivitySignalCount?: number }> = {};
    if (livePromises) {
      for (const lp of livePromises) {
        if (lp.lastActivityDate) {
          map[lp.id] = { lastActivityDate: lp.lastActivityDate, lastActivitySignalCount: lp.lastActivitySignalCount };
        }
      }
    }
    return map;
  }, [livePromises]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter logic — includes search on mobile
  const filteredPromises = useMemo(() => {
    let filtered = commitmentRecords.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      return true;
    });

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.title_ne.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.description_ne?.toLowerCase().includes(q),
      );
    }

    if (sortBy === 'activity') {
      return [...filtered].sort((a, b) => {
        const aDate = activityMap[a.id]?.lastActivityDate || '';
        const bDate = activityMap[b.id]?.lastActivityDate || '';
        return bDate.localeCompare(aDate);
      });
    }
    return filtered;
  }, [categoryFilter, statusFilter, sortBy, activityMap, commitmentRecords, searchQuery]);

  // Use computeStats from data file
  const stats = useMemo(() => computeStats(commitmentRecords), [commitmentRecords]);

  const totalEvidence = useMemo(
    () => commitmentRecords.reduce((sum, promise) => sum + promise.evidenceCount, 0),
    [commitmentRecords],
  );
  const commitmentsWithEvidence = useMemo(
    () => commitmentRecords.filter((promise) => promise.evidenceCount > 0).length,
    [commitmentRecords],
  );
  const recentlyActiveCount = useMemo(
    () => commitmentRecords.filter((promise) => {
      if (!promise.lastActivityDate) return false;
      const diffDays = Math.floor((Date.now() - new Date(promise.lastActivityDate).getTime()) / 86400000);
      return diffDays <= 7;
    }).length,
    [commitmentRecords],
  );
  const activeTodayCount = useMemo(
    () => commitmentRecords.filter((promise) => promise.lastActivityDate === today).length,
    [commitmentRecords, today],
  );
  const leadArticle = useMemo(
    () => latestArticles?.find((article) => article.promise_ids?.length > 0) ?? latestArticles?.[0],
    [latestArticles],
  );
  const featuredCommitment = useMemo(
    () => [...commitmentRecords].sort((a, b) => {
      const evidenceDelta = (b.evidenceCount || 0) - (a.evidenceCount || 0);
      if (evidenceDelta !== 0) return evidenceDelta;
      return (b.progress || 0) - (a.progress || 0);
    })[0],
    [commitmentRecords],
  );
  const spotlightCommitment = useMemo(
    () => [...commitmentRecords].sort((a, b) => {
      const bSignals = activityMap[b.id]?.lastActivitySignalCount || 0;
      const aSignals = activityMap[a.id]?.lastActivitySignalCount || 0;
      if (bSignals !== aSignals) return bSignals - aSignals;
      const bDate = activityMap[b.id]?.lastActivityDate || '';
      const aDate = activityMap[a.id]?.lastActivityDate || '';
      return bDate.localeCompare(aDate);
    })[0] ?? featuredCommitment,
    [activityMap, commitmentRecords, featuredCommitment],
  );
  const headlineText = activeTodayCount > 0
    ? t('tracker.headlineMovedToday').replace('{count}', String(activeTodayCount))
    : t('tracker.headlineTracking').replace('{total}', String(stats.total));
  const subheadText = leadArticle
    ? t('tracker.subheadWithArticle').replace('{headline}', leadArticle.headline).replace('{source}', leadArticle.source_name).replace('{evidence}', String(totalEvidence))
    : t('tracker.subheadDefault').replace('{articles}', String(articleCount ?? 0)).replace('{withEvidence}', String(commitmentsWithEvidence));
  const watchlistCommitments = useMemo(
    () => commitmentRecords.filter((promise) => watchedProjectIds.includes(promise.id)),
    [commitmentRecords, watchedProjectIds],
  );
  const watchlistRecentCount = useMemo(
    () => watchlistCommitments.filter((promise) => {
      const lastSeen = activityMap[promise.id]?.lastActivityDate || promise.lastSignalAt || promise.lastUpdate;
      if (!lastSeen) return false;
      const d = new Date(lastSeen);
      return !Number.isNaN(d.getTime()) && Math.floor((Date.now() - d.getTime()) / 86400000) <= 0;
    }).length,
    [activityMap, watchlistCommitments],
  );
  const watchlistLead = watchlistCommitments[0];
  const localizedCommitments = useMemo(
    () => commitmentRecords.filter((promise) => {
      if (!province) return false;
      if (promise.affectedProvinces?.includes(province)) return true;
      if (district && promise.affectedDistricts?.includes(district)) return true;
      if (!promise.affectedProvinces?.length && promise.geoScope === 'national') return true;
      return false;
    }),
    [commitmentRecords, district, province],
  );
  const trustSummary = useMemo(
    () => ({
      verified: commitmentRecords.filter((promise) => promise.trustLevel === 'verified').length,
      partial: commitmentRecords.filter((promise) => promise.trustLevel === 'partial').length,
      unverified: commitmentRecords.filter((promise) => promise.trustLevel === 'unverified').length,
      disputed: commitmentRecords.filter((promise) => promise.trustLevel === 'disputed').length,
    }),
    [commitmentRecords],
  );
  const actionSummary = activeTodayCount > 0
    ? t('tracker.actionMovedToday').replace('{count}', String(activeTodayCount))
    : t('tracker.actionNothingMoved');

  // Share handlers
  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://nepalrepublic.org/explore/first-100-days';
  const shareSummaryTitle = `Nepal Republic — Live Commitment Tracker`;
  const shareSummaryText = locale === 'ne'
    ? 'नेपालका सार्वजनिक प्रतिबद्धताहरू प्रमाणसहित ट्र्याक गर्नुहोस्।'
    : 'Track Nepal\'s public commitments with evidence.';
  const whatsappShareIntent = shareIntentUrl('whatsapp', {
    title: shareSummaryTitle,
    text: shareSummaryText,
    url: pageUrl,
  });
  const facebookShareIntent = shareIntentUrl('facebook', {
    title: shareSummaryTitle,
    text: shareSummaryText,
    url: pageUrl,
  });
  const xShareIntent = shareIntentUrl('x', {
    title: shareSummaryTitle,
    text: shareSummaryText,
    url: pageUrl,
  });

  function handleCopyLink() {
    navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShareCard(e: React.MouseEvent, promise: GovernmentPromise) {
    e.preventDefault();
    e.stopPropagation();
    const title = locale === 'ne' ? (promise.title_ne || promise.title) : promise.title;
    const text = commitmentShareText({ title, progress: promise.progress, status: promise.status, locale });
    const url = `${pageUrl.replace(/\/explore\/first-100-days.*/, '')}/explore/first-100-days/${promise.slug || promise.id}`;
    await shareOrCopy({ title, text, url });
  }

  const handleLoadMore = useCallback(() => {
    setMobileVisibleCount((prev) => prev + MOBILE_LOAD_MORE_COUNT);
  }, []);

  const now = new Date();

  // For mobile: slice visible cards
  const visiblePromises = isMobile
    ? filteredPromises.slice(0, mobileVisibleCount)
    : filteredPromises;
  const hasMore = isMobile && mobileVisibleCount < filteredPromises.length;

  return (
    <div className="min-h-screen bg-np-base">
      {/* Ambient glow effects — hidden on mobile for performance */}
      {!isMobile && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px]" />
          <div className="absolute top-2/3 left-1/3 w-[350px] h-[350px] bg-primary-500/[0.04] rounded-full blur-[80px]" />
        </div>
      )}

      <div className="relative z-10">

        {/* ═══════════════════════════════════════
           MOBILE: Compact header + inline stats
           ═══════════════════════════════════════ */}
        {isMobile ? (
          <section className="px-3 pt-4 pb-2">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
                {t('commitment.bachanTracker')}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {stats.total} {t('tracker.total')} &middot; {stats.inProgress} {t('tracker.active')} &middot; {stats.stalled} {t('tracker.stalledCount')} &middot; {stats.delivered} {t('tracker.done')}
            </p>

            {/* Wachan meter: single-line text stat */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${stats.avgProgress}%`,
                    background: 'linear-gradient(90deg, #2563eb, #06b6d4, #10b981)',
                    boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)',
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-white tabular-nums">{stats.avgProgress}%</span>
            </div>
          </section>
        ) : (
          <>
            {/* ═══════════════════════════════════════
               DESKTOP: SECTION 0: COUNTDOWN STRIP
               ═══════════════════════════════════════ */}
            <section className="px-4 sm:px-6 lg:px-8 pt-8">
              <div className="max-w-6xl mx-auto">
                <CountdownStrip deadlines={deadlines} />
              </div>
            </section>

            {/* ═══════════════════════════════════════
               DESKTOP: SECTION 1: HERO
               ═══════════════════════════════════════ */}
            <section className="relative pt-8 pb-12 px-4 sm:px-6 lg:px-8">
              <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary-500/[0.08] via-transparent to-transparent" />

              <div className="relative max-w-6xl mx-auto text-center">
                {/* Title */}
                <div className="animate-fade-in">
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-2">
                    <span className="bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
                      {t('commitment.bachanTracker')}
                    </span>
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-400 font-medium mb-4">
                    {isNe ? 'Commitment Tracker' : '\u0935\u091A\u0928\u092C\u0926\u094D\u0927\u0924\u093E \u0905\u0928\u0941\u0917\u092E\u0928'}
                  </p>
                  <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-8">
                    {isNe ? t('tracker.taglineNe') : t('tracker.taglineEn')}
                  </p>
                </div>

                <div className="mx-auto mt-8 max-w-3xl">
                  {/* Context card */}
                  <div className="animate-slide-up">
                    <div className={`glass-card h-full p-5 sm:p-6 ${showBalenSpotlight ? 'border-primary-400/30 shadow-[0_0_40px_rgba(59,130,246,0.12)]' : ''}`}>
                      {showBalenSpotlight ? (
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-300/20 bg-primary-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-200">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                          {t('tracker.campaignLensActive')}
                        </div>
                      ) : null}
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">{isNe ? '\u0928\u0947\u092A\u093E\u0932 \u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915' : 'Nepal Republic'}</p>
                          <p className="text-xs text-gray-500">{t('tracker.nationalReportCard')}</p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4 text-left">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">{t('commitment.delivered')}</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{stats.delivered}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4 text-left">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">{t('commitment.inProgress')}</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{stats.inProgress}</p>
                        </div>
                        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.06] p-4 text-left">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-red-300/80">{t('commitment.stalled')}</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{stats.stalled}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                        <Link
                          href="/explore/first-100-days?entry=balen"
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium transition-colors ${
                            showBalenSpotlight
                              ? 'border-primary-400/50 bg-primary-500/15 text-primary-200'
                              : 'border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]'
                          }`}
                        >
                          {t('tracker.campaignView')}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <span className="text-xs text-gray-500">
                          {showBalenSpotlight
                            ? t('tracker.scrollForSpotlight')
                            : t('tracker.openCampaignSpotlight')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════
           SECTION 2: WACHAN METER — Desktop only (mobile has inline stats above)
           ═══════════════════════════════════════ */}
        {!isMobile && (
          <section className="px-4 sm:px-6 lg:px-8 pb-12">
            <div className="max-w-4xl mx-auto">
              <div className="glass-card p-8 sm:p-10">
                <div className="text-center mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {t('commitment.wachanMeter')}
                  </h2>
                  <p className="text-sm text-gray-500">{t('commitment.overallScorecard')}</p>
                </div>

                {/* Progress Ring */}
                <div className="flex justify-center mb-8">
                  <ProgressRing percentage={stats.avgProgress} />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t('commitment.total')}</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/[0.12]">
                    <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
                    <div className="text-xs text-blue-400/70 mt-0.5">{t('commitment.inProgress')}</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
                    <div className="text-2xl font-bold text-emerald-400">{stats.delivered}</div>
                    <div className="text-xs text-emerald-400/70 mt-0.5">{t('commitment.delivered')}</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-gray-500/[0.06] border border-gray-500/[0.12]">
                    <div className="text-2xl font-bold text-gray-400">{stats.notStarted}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t('commitment.notStarted')}</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-red-500/[0.06] border border-red-500/[0.12] col-span-2 sm:col-span-1">
                    <div className="text-2xl font-bold text-red-400">{stats.stalled}</div>
                    <div className="text-xs text-red-400/70 mt-0.5">{t('commitment.stalled')}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
           DESKTOP-ONLY SECTIONS: Balen spotlight, Today hero, panels, participation CTA, budget
           ═══════════════════════════════════════ */}
        {!isMobile && (
          <>
            {/* Balen Spotlight */}
            <section className="px-4 sm:px-6 lg:px-8 pb-12">
              <div className="max-w-5xl mx-auto">
                <div className={`grid gap-6 overflow-hidden rounded-[28px] border bg-white/[0.03] shadow-2xl shadow-primary-950/20 lg:grid-cols-[320px_minmax(0,1fr)] ${
                  showBalenSpotlight ? 'border-primary-400/25' : 'border-white/10'
                }`}>
                  <div className="relative aspect-[5/4] sm:aspect-[16/10] lg:aspect-auto">
                    <Image
                      src="/images/balen.JPG"
                      alt="Balen Shah first 100 days spotlight"
                      fill
                      className="object-cover"
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 320px"
                      quality={70}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-primary-500/10" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">{t('tracker.campaignSpotlight')}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{t('tracker.balenFirst100Days')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center p-5 sm:p-6 lg:p-8">
                    <div className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      showBalenSpotlight
                        ? 'border-primary-300/20 bg-primary-500/12 text-primary-200'
                        : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
                    }`}>
                      {showBalenSpotlight ? t('tracker.campaignLens') : t('tracker.whyViewExists')}
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                      {showBalenSpotlight ? t('tracker.campaignDossier') : t('tracker.campaignLensInside')}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                      {showBalenSpotlight
                        ? t('tracker.campaignDossierDesc')
                        : t('tracker.campaignLensInsideDesc')}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                        <Radio className="h-4 w-4 text-cyan-300" />
                        {t('tracker.campaignContext')}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                        <FileText className="h-4 w-4 text-primary-300" />
                        {t('tracker.evidenceLinkedPromises')}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                        <Calendar className="h-4 w-4 text-amber-300" />
                        {t('tracker.first100DaysFraming')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Today in Nepal Republic hero */}
            <section className="px-4 sm:px-6 lg:px-8 pb-12">
              <div className="max-w-6xl mx-auto">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#DC143C]/12 via-primary-500/[0.08] to-[#003893]/14 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
                  <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:p-10">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                        {t('tracker.todayInRepublic')}
                      </div>
                      <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                        {headlineText}
                      </h2>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-200/90 sm:text-base">
                        {subheadText}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3 text-sm">
                        <Link
                          href="/daily"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 font-medium text-white transition-colors hover:bg-white/[0.12]"
                        >
                          {t('tracker.openDailyChanges')}
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                        <Link
                          href="/watchlist"
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-4 py-2 font-medium text-cyan-100 transition-colors hover:bg-cyan-500/15"
                        >
                          {t('tracker.watchCommitments')}
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href="/feedback"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 font-medium text-gray-100 transition-colors hover:bg-black/30"
                        >
                          {t('tracker.submitFeedback')}
                          <FileText className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                          <Activity className="h-3.5 w-3.5 text-cyan-300" />
                          {t('tracker.freshMovement')}
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-white">{activeTodayCount}</p>
                        <p className="mt-1 text-sm text-gray-300">{t('tracker.commitmentsActiveToday')}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200">
                          <Newspaper className="h-3.5 w-3.5 text-rose-300" />
                          {t('tracker.evidencePulse')}
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-white">{totalEvidence}</p>
                        <p className="mt-1 text-sm text-gray-300">{t('tracker.evidenceLinksAcross')}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                          <Calendar className="h-3.5 w-3.5 text-amber-300" />
                          {t('tracker.weeklyFreshness')}
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-white">{recentlyActiveCount}</p>
                        <p className="mt-1 text-sm text-gray-300">{t('tracker.touchedLast7Days')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-px border-t border-white/10 bg-white/10 lg:grid-cols-3">
                    <div className="bg-black/20 p-5 sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">{t('tracker.latestSignal')}</p>
                      {leadArticle ? (
                        <>
                          <p className="mt-3 text-lg font-medium text-white">{leadArticle.headline}</p>
                          <p className="mt-2 text-sm leading-6 text-gray-300">
                            {leadArticle.source_name} · {formatRelativeSignalDate(leadArticle.published_at, t)}
                          </p>
                        </>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-gray-300">
                          {t('tracker.signalQuiet')}
                        </p>
                      )}
                    </div>
                    <div className="bg-black/20 p-5 sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">{t('tracker.mostWatchedStory')}</p>
                      {spotlightCommitment ? (
                        <>
                          <Link
                            href={`/explore/first-100-days/${spotlightCommitment.slug}`}
                            className="mt-3 block text-lg font-medium text-white transition-colors hover:text-cyan-200"
                          >
                            {isNe ? spotlightCommitment.title_ne : spotlightCommitment.title}
                          </Link>
                          <p className="mt-2 text-sm leading-6 text-gray-300">
                            {spotlightCommitment.evidenceCount} {t('tracker.evidenceItems')} · {spotlightCommitment.progress}% {t('commitment.progress')} · {formatRelativeSignalDate(spotlightCommitment.lastActivityDate || spotlightCommitment.lastSignalAt || spotlightCommitment.lastUpdate, t)}
                          </p>
                        </>
                      ) : null}
                    </div>
                    <div className="bg-black/20 p-5 sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">{t('tracker.whyPeopleComeBack')}</p>
                      <p className="mt-3 text-sm leading-7 text-gray-300">
                        {t('tracker.whyPeopleComeBackDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Return loop / Local relevance / Trust layer panels */}
            <section className="px-4 sm:px-6 lg:px-8 pb-12">
              <div className="max-w-6xl mx-auto grid gap-5 lg:grid-cols-3">
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    <Eye className="h-4 w-4" />
                    {t('tracker.returnLoop')}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {watchlistCommitments.length > 0 ? t('tracker.watchlistLive').replace('{count}', String(watchlistCommitments.length)) : t('tracker.startWatchlist')}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-300">
                    {watchlistCommitments.length > 0
                      ? `${t('tracker.watchlistMovedToday').replace('{count}', String(watchlistRecentCount))} ${watchlistLead ? t('tracker.leadWatch').replace('{title}', isNe ? watchlistLead.title_ne : watchlistLead.title) : ''}`
                      : t('tracker.watchlistEmpty')}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/watchlist"
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-500/15"
                    >
                      {t('tracker.openWatchlist')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    {watchlistLead ? (
                      <Link
                        href={`/explore/first-100-days/${watchlistLead.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.08]"
                      >
                        {t('tracker.openLeadWatch')}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    <MapPin className="h-4 w-4" />
                    {t('tracker.localRelevance')}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {hasSetHometown && province ? (district ? t('tracker.trackingProvinceDistrict').replace('{province}', province).replace('{district}', district) : t('tracker.trackingProvince').replace('{province}', province)) : t('tracker.makeTrackerLocal')}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-300">
                    {hasSetHometown && province
                      ? t('tracker.localCommitments').replace('{count}', String(localizedCommitments.length))
                      : t('tracker.localEmpty')}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/affects-me"
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/15"
                    >
                      {t('tracker.openAffectsMe')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setShowPicker(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.08]"
                    >
                      {t('tracker.setMyArea')}
                      <MapPin className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    <ShieldCheck className="h-4 w-4" />
                    {t('tracker.trustLayer')}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {t('tracker.publicTruthReviewed')}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-300">
                    {t('tracker.trustLayerDesc')}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">{t('trust.verified')}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{trustSummary.verified}</p>
                    </div>
                    <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/[0.05] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-yellow-300">{t('trust.partial')}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{trustSummary.partial}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-500/15 bg-white/[0.03] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">{t('trust.unverified')}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{trustSummary.unverified}</p>
                    </div>
                    <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.05] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-red-300">{t('trust.disputed')}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{trustSummary.disputed}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Participation CTA */}
            <section className="px-4 sm:px-6 lg:px-8 pb-12">
              <div className="max-w-6xl mx-auto overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(13,34,64,0.92),rgba(20,83,45,0.12))] shadow-[0_18px_70px_rgba(2,6,23,0.32)]">
                <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:p-10">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-200">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                      {t('tracker.participationChanges')}
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                      {t('tracker.civicProduct')}
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 sm:text-base">
                      {actionSummary}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/feedback"
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
                      >
                        {t('tracker.leaveFeedback')}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/daily"
                        className="inline-flex items-center gap-2 rounded-full border border-primary-300/20 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-100 transition-colors hover:bg-primary-500/15"
                      >
                        {t('tracker.seeWhatChanged')}
                        <Activity className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{t('tracker.signalLabel')}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-300">{t('tracker.signalDesc')}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">{t('tracker.reviewLabel')}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-300">{t('tracker.reviewDesc')}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{t('tracker.outcomeLabel')}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-300">{t('tracker.outcomeDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Budget Overview */}
            <section className="px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <Link href="/explore/first-100-days" className="block hover:opacity-90 transition-opacity">
                  <BudgetOverviewStrip promises={promises} />
                </Link>
              </div>
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════
           FILTER BAR — mobile: sticky compact pill scroll; desktop: glass card
           ═══════════════════════════════════════ */}
        {isMobile ? (
          <div className="sticky top-0 z-30 bg-np-base/95 backdrop-blur-md border-b border-white/[0.06] px-3 py-1.5 space-y-1.5">
            {/* Search bar — compact */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setMobileVisibleCount(MOBILE_INITIAL_COUNT);
                }}
                placeholder={t('commitment.filterPromises')}
                className="w-full pl-7 pr-16 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-200 placeholder-gray-500 outline-none focus:border-primary-500/40"
              />
              {/* Sort + Watchlist */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button
                  onClick={() => setSortBy(sortBy === 'activity' ? 'default' : 'activity')}
                  className={`p-1 rounded-md transition-all ${
                    sortBy === 'activity'
                      ? 'text-emerald-400 bg-emerald-500/15'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title={t('daily.recentActivity')}
                >
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <Link
                  href="/watchlist"
                  className="p-1 rounded-md text-gray-500 hover:text-primary-400 transition-all"
                  title={t('nav.watchlist')}
                >
                  <Bookmark className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Status + Category pills — single scrollable row */}
            <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
              {statusFilterEntries.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200 flex-shrink-0 ${
                    statusFilter === s.key
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                      : 'bg-white/[0.04] text-gray-400 border border-transparent'
                  }`}
                >
                  {s.key !== 'All' && <GhantiIcon status={s.key as 'in_progress' | 'stalled' | 'delivered' | 'not_started'} size="xs" />}
                  {t(s.labelKey)}
                </button>
              ))}
              <span className="w-px h-4 bg-white/10 flex-shrink-0 self-center mx-0.5" />
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200 flex-shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                      : 'bg-white/[0.04] text-gray-400 border border-transparent'
                  }`}
                >
                  {t(`categoryName.${cat}`)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <section className="px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-6xl mx-auto">
              <div className="glass-card p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">{t('commitment.filterPromises')}</span>
                </div>

                {/* Category pills */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('commitment.category')}</div>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          categoryFilter === cat
                            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                            : 'bg-white/[0.04] text-gray-400 border border-transparent hover:bg-white/[0.08] hover:text-gray-300'
                        }`}
                      >
                        {t(`categoryName.${cat}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status pills */}
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('province.status')}</div>
                  <div className="flex flex-wrap gap-2">
                    {statusFilterEntries.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setStatusFilter(s.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          statusFilter === s.key
                            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                            : 'bg-white/[0.04] text-gray-400 border border-transparent hover:bg-white/[0.08] hover:text-gray-300'
                        }`}
                      >
                        {t(s.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
           PROMISE CARDS
           ═══════════════════════════════════════ */}
        <section className={`${isMobile ? 'px-3 pb-8 pt-3' : 'px-4 sm:px-6 lg:px-8 pb-16'}`}>
          <div className="max-w-6xl mx-auto">
            {/* Header row */}
            <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-8'}`}>
              <div>
                <h2 className={`${isMobile ? 'text-sm' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
                  {!isMobile && <Target className="w-5 h-5 text-primary-400" />}
                  {t('commitment.promiseList')}
                </h2>
                <p className={`${isMobile ? 'text-[11px]' : 'text-sm'} text-gray-500 mt-0.5`}>
                  {t('commitment.promisesShown', { count: filteredPromises.length, total: promises.length })}
                </p>
              </div>
              {!isMobile && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSortBy(sortBy === 'activity' ? 'default' : 'activity')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      sortBy === 'activity'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/[0.04] text-gray-400 border border-transparent hover:bg-white/[0.08]'
                    }`}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {t('daily.recentActivity')}
                  </button>
                  <ExportButton
                    onExportCSV={() => exportPromisesCSV(filteredPromises)}
                    onExportPDF={() => exportPromisesPDF(filteredPromises)}
                  />
                </div>
              )}
            </div>

            {filteredPromises.length === 0 ? (
              <div className={`glass-card ${isMobile ? 'p-8' : 'p-12'} text-center`}>
                <Circle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">{t('commitment.noPromises')}</p>
              </div>
            ) : (
              <>
                <div className={`grid grid-cols-1 ${isMobile ? 'gap-2' : 'md:grid-cols-2 gap-5'}`}>
                  {visiblePromises.map((promise, idx) => {
                    const style = statusStyleConfig[promise.status];
                    const trust = trustStyleConfig[promise.trustLevel];
                    const TrustIcon = trust.Icon;
                    const CatIcon = categoryIcons[promise.category] ?? Building2;
                    const catColor = categoryColors[promise.category] ?? 'text-gray-400';

                    if (isMobile) {
                      /* ── Mobile compact card ── */
                      return (
                        <Link
                          key={promise.id}
                          href={`/explore/first-100-days/${promise.slug}`}
                          className="glass-card p-3 flex flex-col gap-1.5 relative overflow-hidden group"
                        >
                          {/* Status color bar */}
                          <div
                            className="absolute inset-x-0 top-0 h-[2px] opacity-70"
                            style={{
                              background:
                                promise.status === 'delivered'
                                  ? 'linear-gradient(90deg, rgba(16,185,129,0.05), rgba(16,185,129,0.8), rgba(52,211,153,0.1))'
                                  : promise.status === 'stalled'
                                    ? 'linear-gradient(90deg, rgba(239,68,68,0.05), rgba(248,113,113,0.8), rgba(239,68,68,0.1))'
                                    : 'linear-gradient(90deg, rgba(37,99,235,0.05), rgba(34,211,238,0.8), rgba(59,130,246,0.1))',
                            }}
                          />

                          {/* Row 1: status + grade + watch */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                                <GhantiIcon status={promise.status} size="xs" />
                                {t(statusLabelKeys[promise.status])}
                              </span>
                              {trendingIds.has(promise.id) && (
                                <span className="text-[10px]">{'\uD83D\uDD25'}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Grade badge */}
                              {(() => {
                                const g = promise.progress >= 80 ? 'A' : promise.progress >= 60 ? 'B' : promise.progress >= 40 ? 'C' : promise.progress >= 20 ? 'D' : 'F';
                                const gc: Record<string, string> = {
                                  A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                                  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                  C: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                                  D: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                  F: 'bg-red-500/20 text-red-400 border-red-500/30',
                                };
                                return (
                                  <span className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${gc[g]}`}>{g}</span>
                                );
                              })()}
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatch(promise.id); }}
                                className={`p-1 rounded-md transition-all ${
                                  isWatched(promise.id)
                                    ? 'text-primary-400 bg-primary-500/15'
                                    : 'text-gray-600'
                                }`}
                              >
                                <Bookmark className={`w-3 h-3 ${isWatched(promise.id) ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                            {isNe ? promise.title_ne : promise.title}
                          </h3>

                          {/* Actors */}
                          {promise.actors && promise.actors.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 min-w-0">
                              <Users className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{promise.actors.slice(0, 2).map(a => translateActor(a, locale)).join(', ')}</span>
                            </div>
                          )}

                          {/* Category + freshness */}
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <CatIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{isNe ? (promise.category_ne || t(`categoryName.${promise.category}`)) : promise.category}</span>
                            <span>&middot;</span>
                            <span className="truncate">{formatRelativeSignalDate(activityMap[promise.id]?.lastActivityDate || promise.lastSignalAt || promise.lastUpdate, t)}</span>
                          </div>

                          {/* Summary (1 line) */}
                          {(promise.summary || promise.description) && (
                            <p className="text-[11px] text-gray-400 italic line-clamp-1 leading-relaxed">
                              &ldquo;{isNe ? (promise.summary_ne || promise.description_ne || promise.summary || promise.description) : (promise.summary || promise.description)}&rdquo;
                            </p>
                          )}

                          {/* Progress bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-200"
                                style={{
                                  width: `${promise.progress}%`,
                                  background:
                                    promise.status === 'delivered'
                                      ? 'linear-gradient(90deg, #059669, #10b981)'
                                      : promise.status === 'stalled'
                                        ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                                        : 'linear-gradient(90deg, #2563eb, #06b6d4)',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold tabular-nums text-gray-400 w-7 text-right">
                              {promise.progress}%
                            </span>
                          </div>

                          {/* Bottom: evidence count + arrow */}
                          <div className="flex items-center justify-between text-[10px] text-gray-500">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-0.5">
                                <FileText className="w-2.5 h-2.5" />
                                {promise.evidenceCount}
                              </span>
                              {evidenceCounts && evidenceCounts[parseInt(promise.id, 10)] > 0 && (
                                <span className="text-cyan-400/70">{evidenceCounts[parseInt(promise.id, 10)]}</span>
                              )}
                            </div>
                            <ArrowRight className="w-3 h-3 text-gray-600" />
                          </div>
                        </Link>
                      );
                    }

                    /* ── Desktop full card (unchanged) ── */
                    return (
                      <Link
                        key={promise.id}
                        href={`/explore/first-100-days/${promise.slug}`}
                        className="glass-card-hover p-6 flex flex-col relative overflow-hidden group"
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        <div
                          className="absolute inset-x-0 top-0 h-[2px] opacity-70"
                          style={{
                            background:
                              promise.status === 'delivered'
                                ? 'linear-gradient(90deg, rgba(16,185,129,0.05), rgba(16,185,129,0.8), rgba(52,211,153,0.1))'
                                : promise.status === 'stalled'
                                  ? 'linear-gradient(90deg, rgba(239,68,68,0.05), rgba(248,113,113,0.8), rgba(239,68,68,0.1))'
                                  : 'linear-gradient(90deg, rgba(37,99,235,0.05), rgba(34,211,238,0.8), rgba(59,130,246,0.1))',
                          }}
                        />
                        {promise.status === 'delivered' && (
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent pointer-events-none" />
                        )}
                        {promise.status === 'stalled' && (
                          <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-transparent pointer-events-none" />
                        )}

                        {/* Top row: status badge (left) + trust badge + bookmark (right) */}
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} ${style.glow ?? ''}`}
                          >
                            <GhantiIcon status={promise.status} size="xs" />
                            {t(statusLabelKeys[promise.status])}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${trust.bg} ${trust.color} ${trust.border} ${trust.glow}`}
                            >
                              <TrustIcon className="w-3 h-3" />
                              {t(trust.labelKey)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                isInComparison(promise.id)
                                  ? removeFromComparison(promise.id)
                                  : addToComparison(promise.id);
                              }}
                              className={`p-1.5 rounded-lg transition-all ${
                                isInComparison(promise.id)
                                  ? 'text-cyan-400 bg-cyan-500/15'
                                  : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'
                              }`}
                              title={isInComparison(promise.id) ? 'Remove from compare' : 'Add to compare'}
                            >
                              <GitCompareArrows className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatch(promise.id); }}
                              className={`p-1.5 rounded-lg transition-all ${
                                isWatched(promise.id)
                                  ? 'text-primary-400 bg-primary-500/15'
                                  : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'
                              }`}
                              title={isWatched(promise.id) ? t('watchlist.watching') : t('watchlist.watchPromise')}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isWatched(promise.id) ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {trendingIds.has(promise.id) && (
                          <span className="trending-badge mb-2 relative z-10">
                            <span className="text-[10px]">{'\uD83D\uDD25'}</span>
                            {t('tracker.trending')}
                          </span>
                        )}

                        <h3 className="text-base font-semibold text-white mb-0.5 relative z-10 group-hover:text-primary-300 transition-colors">
                          {isNe ? promise.title_ne : promise.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-3 relative z-10">
                          {isNe ? promise.title : promise.title_ne}
                        </p>

                        <div className="mb-3 relative z-10">
                          <span className={`inline-flex items-center gap-1.5 text-xs ${catColor}`}>
                            <CatIcon className="w-3.5 h-3.5" />
                            {isNe ? `${promise.category_ne} / ${promise.category}` : `${promise.category} / ${promise.category_ne}`}
                          </span>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2 relative z-10">
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-300">
                            <FileText className="h-3 w-3 text-cyan-300" />
                            {promise.evidenceCount} {t('tracker.evidence')}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-300">
                            <Calendar className="h-3 w-3 text-amber-300" />
                            {formatRelativeSignalDate(activityMap[promise.id]?.lastActivityDate || promise.lastSignalAt || promise.lastUpdate, t)}
                          </span>
                          {promise.actors?.[0] ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-300">
                              <Users className="h-3 w-3 text-emerald-300" />
                              {translateActor(promise.actors[0], locale)}
                            </span>
                          ) : null}
                        </div>

                        {/* Activity indicator */}
                        {(() => {
                          const activity = activityMap[promise.id];
                          const isActiveToday = activity?.lastActivityDate === today;
                          const daysSince = activity?.lastActivityDate
                            ? Math.floor((Date.now() - new Date(activity.lastActivityDate).getTime()) / 86400000)
                            : null;
                          const isRecentWeek = daysSince !== null && daysSince <= 7;

                          return (
                            <div className="mb-3 relative z-10">
                              {isActiveToday ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                  {t('daily.activeToday')}
                                  {activity?.lastActivitySignalCount ? (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-semibold">
                                      {activity.lastActivitySignalCount} {t('daily.signals')}
                                    </span>
                                  ) : null}
                                </span>
                              ) : isRecentWeek ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                  {daysSince} {t('daily.daysAgo')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                                  {daysSince !== null ? `${daysSince} ${t('daily.daysAgo')}` : t('daily.noActivity')}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        <p className="text-sm text-gray-400 mb-4 leading-relaxed relative z-10">
                          {isNe ? promise.description_ne : promise.description}
                        </p>

                        {promise.estimatedBudgetNPR && (
                          <div className="mb-4 relative z-10 flex items-center gap-3 text-xs">
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <Banknote className="w-3.5 h-3.5 text-primary-400/60" />
                              {formatNPR(promise.estimatedBudgetNPR)}
                            </span>
                            <span className="text-gray-600">
                              ({formatNPRtoUSD(promise.estimatedBudgetNPR)})
                            </span>
                            {promise.spentNPR != null && promise.spentNPR > 0 && (
                              <span className="inline-flex items-center gap-1 text-amber-400/70">
                                <TrendingUp className="w-3 h-3" />
                                {Math.round((promise.spentNPR / promise.estimatedBudgetNPR) * 100)}% {t('budget.spent')}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mb-4 relative z-10">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-gray-500">{t('commitment.progress')}</span>
                            <span className="text-gray-300 font-medium">{promise.progress}%</span>
                          </div>
                          <div className="h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${promise.progress}%`,
                                background:
                                  promise.status === 'delivered'
                                    ? 'linear-gradient(90deg, #059669, #10b981, #34d399)'
                                    : promise.status === 'stalled'
                                      ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                                      : 'linear-gradient(90deg, #2563eb, #06b6d4)',
                                boxShadow:
                                  promise.status === 'delivered'
                                    ? '0 0 14px rgba(16, 185, 129, 0.5)'
                                    : promise.status === 'stalled'
                                      ? '0 0 12px rgba(239, 68, 68, 0.3)'
                                      : '0 0 12px rgba(59, 130, 246, 0.3)',
                              }}
                            />
                          </div>
                        </div>

                        <div className="mb-3 relative z-10">
                          <VoteWidget promiseId={promise.id} variant="compact" />
                        </div>

                        <div className="mt-auto flex items-center justify-between text-xs text-gray-500 relative z-10 pt-2 border-t border-white/[0.04]">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              {promise.linkedProjects} {promise.linkedProjects !== 1 ? t('commitment.projectsPlural') : t('commitment.projects')}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {promise.evidenceCount} {t('commitment.evidence')}
                            </span>
                            {evidenceCounts && evidenceCounts[parseInt(promise.id, 10)] > 0 && (
                              <span className="inline-flex items-center gap-1 text-cyan-400/70">
                                {evidenceCounts[parseInt(promise.id, 10)]}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {promise.lastUpdate}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleShareCard(e, promise)}
                            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-gray-500 hover:text-primary-400 transition-colors"
                            title={t('commitment.shareWhatsApp')}
                          >
                            <Share className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="absolute top-6 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <ArrowRight className="w-4 h-4 text-primary-400" />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Load more button — mobile only */}
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    className="mt-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-medium text-gray-300 transition-all hover:bg-white/[0.06]"
                  >
                    {t('common.loadMore')} ({filteredPromises.length - mobileVisibleCount} {t('common.remaining')})
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
           DESKTOP-ONLY: Timeline + Share
           ═══════════════════════════════════════ */}
        {!isMobile && (
          <>
            {/* Key Events Timeline */}
            <section className="px-4 sm:px-6 lg:px-8 pb-16">
              <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    {t('commitment.keyEvents')}
                  </h2>
                </div>

                <div className="relative ml-4 sm:ml-8">
                  <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-primary-500/40 via-cyan-500/30 to-transparent" />

                  <div className="space-y-6">
                    {timelineEvents.map((event, idx) => {
                      const config = eventCategoryConfig[event.type] ?? eventCategoryConfig[event.category] ?? { bg: 'bg-gray-500/15', text: 'text-gray-400' };
                      const eventDate = new Date(event.date + 'T00:00:00+05:45');
                      const isPast = now >= eventDate;

                      return (
                        <div key={idx} className="relative flex items-start gap-5 group">
                          <div className="relative z-10 flex-shrink-0">
                            <div
                              className={`w-[15px] h-[15px] rounded-full border-2 transition-all duration-300 ${
                                isPast
                                  ? 'border-cyan-400 bg-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                                  : 'border-gray-600 bg-np-surface group-hover:border-primary-400'
                              }`}
                            />
                          </div>

                          <div className="glass-card-hover flex-1 p-5 -mt-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <h3 className="text-base font-semibold text-white">
                                  {isNe ? event.title_ne : event.title}
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {isNe ? event.title : event.title_ne}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                  <span className="text-sm text-gray-500">
                                    {eventDate.toLocaleDateString(isNe ? 'ne-NP' : 'en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center self-start px-2.5 py-1 rounded-full text-xs font-medium capitalize ${config.bg} ${config.text}`}
                              >
                                {t(`tracker.event${event.category.charAt(0).toUpperCase()}${event.category.slice(1)}`)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Share section */}
            <section className="px-4 sm:px-6 lg:px-8 pb-20">
              <div className="max-w-6xl mx-auto">
                <div className="glass-card p-8 sm:p-10 text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-[0_0_25px_rgba(37,211,102,0.3)]">
                      <Share className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{t('commitment.shareTracker')}</h3>
                  <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
                    {t('commitment.shareTrackerDesc')}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => window.open(whatsappShareIntent, '_blank', 'noopener,noreferrer')}
                      className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-white bg-[#25D366]/20 border border-[#25D366]/40 hover:bg-[#25D366]/30 transition-all duration-200 shadow-[0_0_15px_rgba(37,211,102,0.15)] hover:shadow-[0_0_25px_rgba(37,211,102,0.25)]"
                    >
                      {t('commitment.shareWhatsApp')}
                    </button>
                    <button
                      onClick={() => window.open(facebookShareIntent, '_blank', 'noopener,noreferrer')}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#1877F2]/20 border border-[#1877F2]/30 hover:bg-[#1877F2]/30 transition-all duration-200"
                    >
                      Facebook
                    </button>
                    <button
                      onClick={() => window.open(xShareIntent, '_blank', 'noopener,noreferrer')}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14] transition-all duration-200"
                    >
                      X / Twitter
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        copied
                          ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                          : 'text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]'
                      }`}
                    >
                      {copied ? t('commitment.copied') : t('commitment.copyLink')}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
