'use client';

import { Suspense, useMemo, useState } from 'react';
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
  Share2,
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
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { CountdownStrip } from '@/components/public/countdown-strip';
import { VoteWidget } from '@/components/public/vote-widget';
import { BudgetOverviewStrip } from '@/components/budget/budget-overview-strip';
import { usePreferencesStore, useWatchlistStore } from '@/lib/stores/preferences';
import { useComparisonStore } from '@/lib/stores/comparison';
import { ExportButton } from '@/components/public/export-button';
import { exportPromisesCSV, exportPromisesPDF } from '@/lib/utils/export';
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

function formatRelativeSignalDate(dateString?: string | null) {
  if (!dateString) return 'Freshness unavailable';
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return 'Freshness unavailable';

  const diffDays = Math.floor((Date.now() - value.getTime()) / 86400000);
  if (diffDays <= 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const [sortBy, setSortBy] = useState<'default' | 'activity'>('default');
  const { locale, t } = useI18n();
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
    { key: 'All', labelKey: 'explore.all' },
    { key: 'not_started', labelKey: 'commitment.notStarted' },
    { key: 'in_progress', labelKey: 'commitment.inProgress' },
    { key: 'delivered', labelKey: 'commitment.delivered' },
    { key: 'stalled', labelKey: 'commitment.stalled' },
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

  // Filter logic
  const filteredPromises = useMemo(() => {
    const filtered = commitmentRecords.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      return true;
    });
    if (sortBy === 'activity') {
      return [...filtered].sort((a, b) => {
        const aDate = activityMap[a.id]?.lastActivityDate || '';
        const bDate = activityMap[b.id]?.lastActivityDate || '';
        return bDate.localeCompare(aDate);
      });
    }
    return filtered;
  }, [categoryFilter, statusFilter, sortBy, activityMap, commitmentRecords]);

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
    ? `${activeTodayCount} commitments moved today across Nepal Najar.`
    : `Tracking ${stats.total} commitments across Nepal's public accountability story.`;
  const subheadText = leadArticle
    ? `Latest signal: ${leadArticle.headline} from ${leadArticle.source_name}. ${totalEvidence} evidence links are already attached across the tracker.`
    : `${articleCount ?? 0} articles scanned, ${commitmentsWithEvidence} commitments with evidence, and a live record built for daily accountability.`;
  const watchlistCommitments = useMemo(
    () => commitmentRecords.filter((promise) => watchedProjectIds.includes(promise.id)),
    [commitmentRecords, watchedProjectIds],
  );
  const watchlistRecentCount = useMemo(
    () => watchlistCommitments.filter((promise) => {
      const lastSeen = activityMap[promise.id]?.lastActivityDate || promise.lastSignalAt || promise.lastUpdate;
      if (!lastSeen) return false;
      return formatRelativeSignalDate(lastSeen) === 'Updated today';
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
    ? `${activeTodayCount} commitments moved today. Watch them, verify them, and push the record forward.`
    : 'Nothing major moved today yet. That is exactly when evidence, tips, and citizen verification matter most.';

  // Share handlers
  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://nepalnajar.com/explore/first-100-days';
  const whatsappText = `Nepal Najar — Live Commitment Tracker 🇳🇵 Check which public commitments are moving: ${pageUrl}`;
  const shareText = `Nepal Najar — वचनबद्धता ट्रयाकर | Track Nepal's public commitments with evidence. ${pageUrl}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareCard(e: React.MouseEvent, promise: GovernmentPromise) {
    e.preventDefault();
    e.stopPropagation();
    const text = `${promise.title_ne}\n${promise.title}\n\nProgress: ${promise.progress}% | Status: ${t(statusLabelKeys[promise.status])}\nEvidence: ${promise.evidenceCount} items\n\n\u0928\u0947\u092A\u093E\u0932 \u0928\u091C\u0930 \u0935\u091A\u0928\u092C\u0926\u094D\u0927\u0924\u093E \u091F\u094D\u0930\u094D\u092F\u093E\u0915\u0930\n${pageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  const now = new Date();

  return (
    <div className="min-h-screen bg-np-base">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px]" />
        <div className="absolute top-2/3 left-1/3 w-[350px] h-[350px] bg-primary-500/[0.04] rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* ═══════════════════════════════════════
           SECTION 0: COUNTDOWN STRIP
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pt-8">
          <div className="max-w-6xl mx-auto">
            <CountdownStrip deadlines={deadlines} />
          </div>
        </section>

        {/* ═══════════════════════════════════════
           SECTION 1: HERO
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
                {isNe ? 'Commitment Tracker' : t('commitment.bachanTracker')}
              </p>
              <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-8">
                {isNe
                  ? 'हरेक वचनबद्धता, हरेक प्रमाण \u2014 Every commitment, every proof'
                  : 'Every commitment, every proof \u2014 हरेक वचनबद्धता, हरेक प्रमाण'}
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl">
              {/* Context card */}
              <div className="animate-slide-up">
                <div className={`glass-card h-full p-5 sm:p-6 ${showBalenSpotlight ? 'border-primary-400/30 shadow-[0_0_40px_rgba(59,130,246,0.12)]' : ''}`}>
                  {showBalenSpotlight ? (
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-300/20 bg-primary-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-200">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                      Balen campaign lens active
                    </div>
                  ) : null}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Nepal Najar &mdash; नेपाल नजर</p>
                      <p className="text-xs text-gray-500">National report card, campaign entry point</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4 text-left">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">Delivered</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{stats.delivered}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4 text-left">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">In Progress</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{stats.inProgress}</p>
                    </div>
                    <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.06] p-4 text-left">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-red-300/80">Stalled</p>
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
                      Campaign view
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <span className="text-xs text-gray-500">
                      {showBalenSpotlight
                        ? 'Scroll for the campaign spotlight and evidence context below.'
                        : 'Open the campaign spotlight to frame this tracker around Balen’s first 100 days.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           SECTION 2: WACHAN METER (Promise Score)
           ═══════════════════════════════════════ */}
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
                {/* Total */}
                <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t('commitment.total')}</div>
                </div>
                {/* In Progress */}
                <div className="text-center p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/[0.12]">
                  <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
                  <div className="text-xs text-blue-400/70 mt-0.5">{t('commitment.inProgress')}</div>
                </div>
                {/* Delivered */}
                <div className="text-center p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
                  <div className="text-2xl font-bold text-emerald-400">{stats.delivered}</div>
                  <div className="text-xs text-emerald-400/70 mt-0.5">{t('commitment.delivered')}</div>
                </div>
                {/* Not Started */}
                <div className="text-center p-3 rounded-xl bg-gray-500/[0.06] border border-gray-500/[0.12]">
                  <div className="text-2xl font-bold text-gray-400">{stats.notStarted}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t('commitment.notStarted')}</div>
                </div>
                {/* Stalled */}
                <div className="text-center p-3 rounded-xl bg-red-500/[0.06] border border-red-500/[0.12] col-span-2 sm:col-span-1">
                  <div className="text-2xl font-bold text-red-400">{stats.stalled}</div>
                  <div className="text-xs text-red-400/70 mt-0.5">{t('commitment.stalled')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-5xl mx-auto">
                <div className={`grid gap-6 overflow-hidden rounded-[28px] border bg-white/[0.03] shadow-2xl shadow-primary-950/20 lg:grid-cols-[320px_minmax(0,1fr)] ${
              showBalenSpotlight
                ? 'border-primary-400/25'
                : 'border-white/10'
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
                  <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">Campaign Spotlight</p>
                  <p className="mt-1 text-lg font-semibold text-white">Balen&apos;s first 100 days</p>
                </div>
              </div>

              <div className="flex flex-col justify-center p-5 sm:p-6 lg:p-8">
                <div className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  showBalenSpotlight
                    ? 'border-primary-300/20 bg-primary-500/12 text-primary-200'
                    : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
                }`}>
                  {showBalenSpotlight ? 'Campaign lens active' : 'Why this view exists'}
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                  {showBalenSpotlight ? 'Balen is now framed as a live campaign dossier' : 'A campaign lens inside the national tracker'}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                  {showBalenSpotlight
                    ? 'This view now foregrounds the Balen campaign angle while keeping the tracker as the source of truth underneath. The image stays lightweight, and the story context is visually obvious.'
                    : 'This spotlight gives Balen&apos;s campaign entry point a visual home without slowing the top of the page. The tracker still loads as the main product first, and the image comes in lazily as supporting context.'}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                    <Radio className="h-4 w-4 text-cyan-300" />
                    Campaign context
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                    <FileText className="h-4 w-4 text-primary-300" />
                    Evidence-linked promises
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                    <Calendar className="h-4 w-4 text-amber-300" />
                    First 100 days framing
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#DC143C]/12 via-primary-500/[0.08] to-[#003893]/14 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
              <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:p-10">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                    Today in Nepal Najar
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
                      Open daily changes
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/watchlist"
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-4 py-2 font-medium text-cyan-100 transition-colors hover:bg-cyan-500/15"
                    >
                      Watch commitments
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/feedback"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 font-medium text-gray-100 transition-colors hover:bg-black/30"
                    >
                      Submit feedback
                      <FileText className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      <Activity className="h-3.5 w-3.5 text-cyan-300" />
                      Fresh movement
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{activeTodayCount}</p>
                    <p className="mt-1 text-sm text-gray-300">commitments active today</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200">
                      <Newspaper className="h-3.5 w-3.5 text-rose-300" />
                      Evidence pulse
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{totalEvidence}</p>
                    <p className="mt-1 text-sm text-gray-300">evidence links across public commitments</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                      <Calendar className="h-3.5 w-3.5 text-amber-300" />
                      Weekly freshness
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{recentlyActiveCount}</p>
                    <p className="mt-1 text-sm text-gray-300">commitments touched in the last 7 days</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-px border-t border-white/10 bg-white/10 lg:grid-cols-3">
                <div className="bg-black/20 p-5 sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Latest signal</p>
                  {leadArticle ? (
                    <>
                      <p className="mt-3 text-lg font-medium text-white">{leadArticle.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-300">
                        {leadArticle.source_name} · {formatRelativeSignalDate(leadArticle.published_at)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-gray-300">
                      The signal feed is quiet right now, but the tracker is still ready for the next verified movement.
                    </p>
                  )}
                </div>
                <div className="bg-black/20 p-5 sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Most watched story</p>
                  {spotlightCommitment ? (
                    <>
                      <Link
                        href={`/explore/first-100-days/${spotlightCommitment.slug}`}
                        className="mt-3 block text-lg font-medium text-white transition-colors hover:text-cyan-200"
                      >
                        {isNe ? spotlightCommitment.title_ne : spotlightCommitment.title}
                      </Link>
                      <p className="mt-2 text-sm leading-6 text-gray-300">
                        {spotlightCommitment.evidenceCount} evidence items · {spotlightCommitment.progress}% progress · {formatRelativeSignalDate(spotlightCommitment.lastActivityDate || spotlightCommitment.lastSignalAt || spotlightCommitment.lastUpdate)}
                      </p>
                    </>
                  ) : null}
                </div>
                <div className="bg-black/20 p-5 sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">Why people come back</p>
                  <p className="mt-3 text-sm leading-7 text-gray-300">
                    Daily changes, evidence trails, and one public record that keeps getting sharper as signals and citizen input arrive.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto grid gap-5 lg:grid-cols-3">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                <Eye className="h-4 w-4" />
                Return loop
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">
                {watchlistCommitments.length > 0 ? `Your watchlist has ${watchlistCommitments.length} live commitments` : 'Start a watchlist worth returning for'}
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                {watchlistCommitments.length > 0
                  ? `${watchlistRecentCount} of your watched commitments moved today. ${watchlistLead ? `Lead watch: ${watchlistLead.title}.` : ''}`
                  : 'Save the commitments you care about and this tracker becomes personal. That is what turns a one-time visit into a daily habit.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/watchlist"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-500/15"
                >
                  Open watchlist
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {watchlistLead ? (
                  <Link
                    href={`/explore/first-100-days/${watchlistLead.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.08]"
                  >
                    Open lead watch
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <MapPin className="h-4 w-4" />
                Local relevance
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">
                {hasSetHometown && province ? `Tracking ${province}${district ? ` / ${district}` : ''}` : 'Make the tracker feel close to home'}
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                {hasSetHometown && province
                  ? `${localizedCommitments.length} commitments in this tracker can already be framed through your area or national impact.`
                  : 'Set your province or district and Nepal Najar can stop feeling abstract. Local context is what makes accountability feel personal.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/affects-me"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/15"
                >
                  Open affects me
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setShowPicker(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.08]"
                >
                  Set my area
                  <MapPin className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                <ShieldCheck className="h-4 w-4" />
                Trust layer
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">
                Public truth stays review-backed
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                Signals and media can flood in constantly, but Nepal Najar only becomes useful when evidence is legible and public truth is controlled.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">Verified</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{trustSummary.verified}</p>
                </div>
                <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/[0.05] p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-yellow-300">Partial</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{trustSummary.partial}</p>
                </div>
                <div className="rounded-2xl border border-gray-500/15 bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">Unverified</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{trustSummary.unverified}</p>
                </div>
                <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.05] p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-red-300">Disputed</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{trustSummary.disputed}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(13,34,64,0.92),rgba(20,83,45,0.12))] shadow-[0_18px_70px_rgba(2,6,23,0.32)]">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-200">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  Participation changes the record
                </div>
                <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  Nepal Najar should feel like a civic product you can affect
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 sm:text-base">
                  {actionSummary}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/feedback"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
                  >
                    Leave feedback
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/daily"
                    className="inline-flex items-center gap-2 rounded-full border border-primary-300/20 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-100 transition-colors hover:bg-primary-500/15"
                  >
                    See what changed
                    <Activity className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Signal</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">A citizen, source, or reporter submits proof, contradiction, or context.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">Review</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">The engine structures it, but reviewed decisions are what shape the public record.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Outcome</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">People see the movement, the evidence trail, and the updated accountability story.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           BUDGET OVERVIEW
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <Link href="/explore/first-100-days" className="block hover:opacity-90 transition-opacity">
              <BudgetOverviewStrip promises={promises} />
            </Link>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           SECTION 3: FILTER BAR
           ═══════════════════════════════════════ */}
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

        {/* ═══════════════════════════════════════
           SECTION 4: PROMISE CARDS GRID
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-400" />
                  {t('commitment.promiseList')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('commitment.promisesShown', { count: filteredPromises.length, total: promises.length })}
                </p>
              </div>
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
            </div>

            {filteredPromises.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Circle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">{t('commitment.noPromises')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredPromises.map((promise, idx) => {
                  const style = statusStyleConfig[promise.status];
                  const trust = trustStyleConfig[promise.trustLevel];
                  const TrustIcon = trust.Icon;
                  const CatIcon = categoryIcons[promise.category] ?? Building2;
                  const catColor = categoryColors[promise.category] ?? 'text-gray-400';

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
                      {/* Delivered glow overlay */}
                      {promise.status === 'delivered' && (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent pointer-events-none" />
                      )}
                      {/* Stalled warning overlay */}
                      {promise.status === 'stalled' && (
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-transparent pointer-events-none" />
                      )}

                      {/* Top row: status badge (left) + trust badge + bookmark (right) */}
                      <div className="flex items-center justify-between mb-4 relative z-10">
                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} ${style.glow ?? ''}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {t(statusLabelKeys[promise.status])}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Trust badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${trust.bg} ${trust.color} ${trust.border} ${trust.glow}`}
                          >
                            <TrustIcon className="w-3 h-3" />
                            {t(trust.labelKey)}
                          </span>

                          {/* Compare toggle */}
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

                          {/* Bookmark/Watch toggle */}
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

                      {/* Trending badge */}
                      {trendingIds.has(promise.id) && (
                        <span className="trending-badge mb-2 relative z-10">
                          <span className="text-[10px]">{'\uD83D\uDD25'}</span>
                          Trending
                        </span>
                      )}

                      {/* Title */}
                      <h3 className="text-base font-semibold text-white mb-0.5 relative z-10 group-hover:text-primary-300 transition-colors">
                        {isNe ? promise.title_ne : promise.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3 relative z-10">
                        {isNe ? promise.title : promise.title_ne}
                      </p>

                      {/* Category tag */}
                      <div className="mb-3 relative z-10">
                        <span className={`inline-flex items-center gap-1.5 text-xs ${catColor}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                          {isNe ? `${promise.category_ne} / ${promise.category}` : `${promise.category} / ${promise.category_ne}`}
                        </span>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2 relative z-10">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-300">
                          <FileText className="h-3 w-3 text-cyan-300" />
                          {promise.evidenceCount} evidence
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-300">
                          <Calendar className="h-3 w-3 text-amber-300" />
                          {formatRelativeSignalDate(activityMap[promise.id]?.lastActivityDate || promise.lastSignalAt || promise.lastUpdate)}
                        </span>
                        {promise.actors?.[0] ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-300">
                            <Users className="h-3 w-3 text-emerald-300" />
                            {promise.actors[0]}
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

                      {/* Description */}
                      <p className="text-sm text-gray-400 mb-4 leading-relaxed relative z-10">
                        {isNe ? promise.description_ne : promise.description}
                      </p>

                      {/* Budget info */}
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

                      {/* Progress bar */}
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

                      {/* Vote widget (compact) */}
                      <div className="mb-3 relative z-10">
                        <VoteWidget promiseId={promise.id} variant="compact" />
                      </div>

                      {/* Bottom row: meta + share */}
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
                              💬 {evidenceCounts[parseInt(promise.id, 10)]}
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
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Arrow indicator */}
                      <div className="absolute top-6 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <ArrowRight className="w-4 h-4 text-primary-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
           SECTION 5: KEY EVENTS TIMELINE
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                {t('commitment.keyEvents')}
              </h2>
            </div>

            <div className="relative ml-4 sm:ml-8">
              {/* Vertical connecting line */}
              <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-primary-500/40 via-cyan-500/30 to-transparent" />

              <div className="space-y-6">
                {timelineEvents.map((event, idx) => {
                  const config = eventCategoryConfig[event.type] ?? eventCategoryConfig[event.category] ?? { bg: 'bg-gray-500/15', text: 'text-gray-400' };
                  const eventDate = new Date(event.date + 'T00:00:00+05:45');
                  const isPast = now >= eventDate;

                  return (
                    <div key={idx} className="relative flex items-start gap-5 group">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className={`w-[15px] h-[15px] rounded-full border-2 transition-all duration-300 ${
                            isPast
                              ? 'border-cyan-400 bg-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                              : 'border-gray-600 bg-np-surface group-hover:border-primary-400'
                          }`}
                        />
                      </div>

                      {/* Event card */}
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
                            {event.category}
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

        {/* ═══════════════════════════════════════
           SECTION 6: SHARE
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="glass-card p-8 sm:p-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-[0_0_25px_rgba(37,211,102,0.3)]">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{t('commitment.shareTracker')}</h3>
              <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
                {t('commitment.shareTrackerDesc')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* WhatsApp */}
                <button
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-white bg-[#25D366]/20 border border-[#25D366]/40 hover:bg-[#25D366]/30 transition-all duration-200 shadow-[0_0_15px_rgba(37,211,102,0.15)] hover:shadow-[0_0_25px_rgba(37,211,102,0.25)]"
                >
                  {t('commitment.shareWhatsApp')}
                </button>

                {/* Facebook */}
                <button
                  onClick={() =>
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#1877F2]/20 border border-[#1877F2]/30 hover:bg-[#1877F2]/30 transition-all duration-200"
                >
                  Facebook
                </button>

                {/* Twitter / X */}
                <button
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14] transition-all duration-200"
                >
                  X / Twitter
                </button>

                {/* Copy Link */}
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

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
