'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { CountdownStrip } from '@/components/public/countdown-strip';
import { VoteWidget } from '@/components/public/vote-widget';
import { BudgetOverviewStrip } from '@/components/budget/budget-overview-strip';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { useComparisonStore } from '@/lib/stores/comparison';
import { ExportButton } from '@/components/public/export-button';
import { exportPromisesCSV, exportPromisesPDF } from '@/lib/utils/export';
import { useEvidenceCounts } from '@/lib/hooks/use-evidence-vault';
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
import { useAllPromises } from '@/lib/hooks/use-promises';

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
  const categoryFilter = searchParams.get('category') || 'All';
  const statusFilter = searchParams.get('status') || 'All';
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'activity'>('default');
  const { locale, t } = useI18n();
  const { data: livePromises } = useAllPromises();

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'All') params.delete(key);
    else params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const setCategoryFilter = (v: string) => setFilter('category', v);
  const setStatusFilter = (v: string) => setFilter('status', v);
  const { toggleWatch, isWatched } = useWatchlistStore();
  const { addToComparison, removeFromComparison, isInComparison } = useComparisonStore();
  const { data: evidenceCounts } = useEvidenceCounts();

  const isNe = locale === 'ne';

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
    const filtered = promises.filter((p) => {
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
  }, [categoryFilter, statusFilter, sortBy, activityMap]);

  // Use computeStats from data file
  const stats = useMemo(() => computeStats(), []);

  // Share handlers
  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://nepalnajar.com/explore/first-100-days';
  const whatsappText = `Nepal Najar \u2014 Balen\u2019s Commitment Tracker \ud83c\uddf3\ud83c\uddf5 Check which promises are being delivered: ${pageUrl}`;
  const shareText = `Nepal Najar \u2014 \u0935\u091A\u0928 \u091F\u094D\u0930\u094D\u092F\u093E\u0915\u0930 | Track Nepal\u2019s political promises with evidence. ${pageUrl}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareCard(e: React.MouseEvent, promise: GovernmentPromise) {
    e.preventDefault();
    e.stopPropagation();
    const text = `${promise.title_ne}\n${promise.title}\n\nProgress: ${promise.progress}% | Status: ${t(statusLabelKeys[promise.status])}\nEvidence: ${promise.evidenceCount} items\n\n\u0928\u0947\u092A\u093E\u0932 \u0928\u091C\u0930 \u0935\u091A\u0928 \u091F\u094D\u0930\u094D\u092F\u093E\u0915\u0930\n${pageUrl}`;
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
                  ? 'हरेक वचन, हरेक प्रमाण \u2014 Every promise, every proof'
                  : 'Every promise, every proof \u2014 हरेक वचन, हरेक प्रमाण'}
              </p>
            </div>

            {/* Context card */}
            <div className="animate-slide-up max-w-lg mx-auto">
              <div className="glass-card p-5">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Nepal Najar &mdash; नेपाल नजर</p>
                    <p className="text-xs text-gray-500">{t('commitment.trackingCommitments')}</p>
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
