'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Share,
  Bookmark,
  Building2,
  Truck,
  Cpu,
  Heart,
  Zap,
  GraduationCap,
  Leaf,
  Scale,
  Fingerprint,
  Briefcase,
  Users,
  ExternalLink,
  Target,
  ChevronDown,
  ChevronUp,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Camera,
  Loader2,
} from 'lucide-react';
import type { CommitmentBriefing } from '@/lib/intelligence/commitment-briefing';
import type { ImpactPrediction } from '@/lib/intelligence/impact-predictor';
import { useI18n } from '@/lib/i18n';
import { TruthMeter } from '@/components/public/truth-meter';
import { CommunityEvidenceFeed } from '@/components/public/community-evidence-feed';
import { EvidenceSourceBadge, deriveSourceType } from '@/components/public/evidence-source-badge';
import { CommentsSection } from '@/components/public/comments-section';
import { VoteWidget } from '@/components/public/vote-widget';
import { SourceVoteWidget } from '@/components/public/source-vote-widget';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { useAuth } from '@/lib/hooks/use-auth';
import { commitmentShareText, shareOrCopy } from '@/lib/utils/share';
import { isPublicCommitment } from '@/lib/data/commitments';
import {
  getPromiseBySlug,
  getPromiseById,
  type PromiseStatus,
  type TrustLevel,
  type GovernmentPromise,
} from '@/lib/data/promises';
import { useAllPromises, useLatestArticles, usePromiseTodaySignals } from '@/lib/hooks/use-promises';
import { GhantiIcon } from '@/components/ui/ghanti-icon';
import { translateActor } from '@/components/public/commitment-card';
import { translateOrg } from '@/lib/data/government-bodies';

/* ═══════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════ */
const STATUS_CONFIG: Record<
  PromiseStatus,
  { label: string; labelNe: string; dot: string; text: string; bg: string; barGradient: string }
> = {
  not_started: {
    label: 'Not Started',
    labelNe: 'सुरु भएको छैन',
    dot: 'bg-gray-400',
    text: 'text-gray-400',
    bg: 'bg-gray-500/15',
    barGradient: 'linear-gradient(90deg, #6b7280, #9ca3af)',
  },
  in_progress: {
    label: 'In Progress',
    labelNe: 'प्रगतिमा',
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    bg: 'bg-blue-500/15',
    barGradient: 'linear-gradient(90deg, #2563eb, #06b6d4)',
  },
  delivered: {
    label: 'Delivered',
    labelNe: 'सम्पन्न',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    barGradient: 'linear-gradient(90deg, #059669, #10b981)',
  },
  stalled: {
    label: 'Stalled',
    labelNe: 'रोकिएको',
    dot: 'bg-red-400',
    text: 'text-red-400',
    bg: 'bg-red-500/15',
    barGradient: 'linear-gradient(90deg, #dc2626, #ef4444)',
  },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
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

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function sourceTypeIcon(sourceType: string): string {
  switch (sourceType) {
    case 'news':
      return '\uD83D\uDCF0';
    case 'video':
    case 'youtube':
      return '\uD83D\uDCFA';
    case 'social':
    case 'twitter':
    case 'facebook':
    case 'reddit':
      return '\uD83D\uDCAC';
    case 'government':
    case 'official':
      return '\uD83C\uDFDB\uFE0F';
    default:
      return '\uD83D\uDCF0';
  }
}

function getTruthLabel(score: number): 'unverified' | 'low' | 'moderate' | 'high' | 'verified' {
  if (score >= 81) return 'verified';
  if (score >= 61) return 'high';
  if (score >= 41) return 'moderate';
  if (score >= 21) return 'low';
  return 'unverified';
}

/* ═══════════════════════════════════════════════
   SKELETON COMPONENTS
   ═══════════════════════════════════════════════ */
function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-32 rounded-full bg-white/[0.06]" />
      <div className="h-10 w-3/4 rounded-lg bg-white/[0.06]" />
      <div className="h-4 w-1/2 rounded bg-white/[0.06]" />
      <div className="h-3 w-40 rounded bg-white/[0.06]" />
      <div className="h-2 w-full rounded-full bg-white/[0.06]" />
    </div>
  );
}

function SignalSkeleton() {
  return (
    <div className="glass-card p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-5 h-5 rounded bg-white/[0.06]" />
        <div className="h-3 w-28 rounded bg-white/[0.06]" />
        <div className="ml-auto h-3 w-10 rounded bg-white/[0.06]" />
      </div>
      <div className="h-4 w-full rounded bg-white/[0.06]" />
    </div>
  );
}

function BriefingSkeleton() {
  return (
    <div className="glass-card p-5 sm:p-6 animate-pulse space-y-5">
      <div>
        <div className="h-3 w-32 rounded bg-white/[0.06] mb-3" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-white/[0.06]" />
          <div className="h-4 w-5/6 rounded bg-white/[0.06]" />
          <div className="h-4 w-4/6 rounded bg-white/[0.06]" />
        </div>
      </div>
      <div>
        <div className="h-3 w-36 rounded bg-white/[0.06] mb-3" />
        <div className="space-y-2">
          <div className="h-16 w-full rounded-lg bg-white/[0.04]" />
          <div className="h-16 w-full rounded-lg bg-white/[0.04]" />
        </div>
      </div>
      <div>
        <div className="h-3 w-28 rounded bg-white/[0.06] mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
      <div>
        <div className="h-3 w-28 rounded bg-white/[0.06] mb-3" />
        <div className="h-16 w-full rounded-lg bg-white/[0.04]" />
      </div>
    </div>
  );
}

function ImpactSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="glass-card p-5 sm:p-6">
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-white/[0.06]" />
          <div className="h-4 w-5/6 rounded bg-white/[0.06]" />
          <div className="h-4 w-3/6 rounded bg-white/[0.06]" />
        </div>
        <div className="h-3 w-40 rounded bg-white/[0.06] mt-4" />
      </div>
      <div className="glass-card p-5 sm:p-6">
        <div className="h-3 w-28 rounded bg-white/[0.06] mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
      <div className="glass-card p-5 sm:p-6">
        <div className="h-3 w-24 rounded bg-white/[0.06] mb-4" />
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════════ */
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="text-lg">{icon}</span>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════ */
export default function PromiseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale, t, localizeField } = useI18n();
  const { toggleWatch, isWatched } = useWatchlistStore();
  const { isAuthenticated } = useAuth();
  const { data: livePromises } = useAllPromises();
  const evidenceRef = useRef<HTMLDivElement>(null);

  const isNe = locale === 'ne';
  const idParam = params.id as string;

  const [showAllSignals, setShowAllSignals] = useState(false);
  const [briefing, setBriefing] = useState<CommitmentBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingError, setBriefingError] = useState(false);
  const [activeTab, setActiveTab] = useState<'brief' | 'sources' | 'evidence'>('brief');
  const [impact, setImpact] = useState<ImpactPrediction | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState(false);
  const impactRef = useRef<HTMLDivElement>(null);
  const impactFetchedRef = useRef(false);

  // Resolve the commitment — static data always available as fallback
  const staticPromise = useMemo(
    () => getPromiseBySlug(idParam) ?? getPromiseById(idParam),
    [idParam],
  );
  const promise = useMemo(() => {
    if (!livePromises || livePromises.length === 0) return staticPromise;
    const liveMatch = livePromises.find(
      (c) => c.slug === idParam || c.id === idParam || String(c.id) === idParam,
    );
    return liveMatch ?? staticPromise;
  }, [idParam, livePromises, staticPromise]);

  // Defer briefing fetch — load AFTER page renders (non-blocking)
  useEffect(() => {
    if (!promise?.id) {
      setBriefingLoading(false);
      return;
    }

    const controller = new AbortController();

    // Use requestIdleCallback (or setTimeout fallback) to defer AI fetch
    // so the page renders immediately with static data first
    const scheduleLoad = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (cb: () => void) => (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(cb, { timeout: 2000 })
      : (cb: () => void) => setTimeout(cb, 500);

    scheduleLoad(() => {
      setBriefingLoading(true);
      setBriefingError(false);
      fetch(`/api/briefing?commitment_id=${promise.id}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
        .then((data) => setBriefing(data))
        .catch((e) => {
          if ((e as Error).name !== 'AbortError') setBriefingError(true);
        })
        .finally(() => setBriefingLoading(false));
    });

    return () => controller.abort();
  }, [promise?.id]);

  // Lazy-load impact prediction (fetch when section scrolls into view or after briefing loads)
  useEffect(() => {
    if (!promise?.id || impactFetchedRef.current) return;

    const node = impactRef.current;
    if (!node) {
      // Fallback: fetch after briefing loads
      if (!briefingLoading) {
        impactFetchedRef.current = true;
        fetchImpact(promise.id);
      }
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impactFetchedRef.current) {
          impactFetchedRef.current = true;
          observer.disconnect();
          fetchImpact(promise.id);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(node);
    return () => observer.disconnect();

    function fetchImpact(id: string | number) {
      setImpactLoading(true);
      setImpactError(false);
      fetch(`/api/impact?commitment_id=${id}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed');
        })
        .then((data) => setImpact(data))
        .catch(() => setImpactError(true))
        .finally(() => setImpactLoading(false));
    }
  }, [promise?.id, briefingLoading]);

  // Fetch signals (latest sources)
  const { data: todaySignals, isLoading: signalsLoading } = usePromiseTodaySignals(promise?.id ?? '');

  // Fetch scraped articles (deeper sources list)
  const { data: realArticles } = useLatestArticles(20, promise?.id);

  // Combine signals for "Latest Sources" section
  const allSources = useMemo(() => {
    const items: Array<{
      id: string;
      headline: string;
      sourceName: string;
      sourceUrl: string;
      sourceType: string;
      time: string;
      confidence: number;
    }> = [];

    // Add today's signals
    const signalsList = Array.isArray(todaySignals) ? todaySignals : [];
    if (signalsList.length > 0) {
      for (const s of signalsList) {
        items.push({
          id: s.id,
          headline: s.headline,
          sourceName: s.source_name,
          sourceUrl: s.source_url,
          sourceType: 'news',
          time: s.discovered_at,
          confidence: s.confidence,
        });
      }
    }

    // Add scraped articles not already in signals
    const articlesList = Array.isArray(realArticles) ? realArticles : [];
    if (articlesList.length > 0) {
      const signalIds = new Set(items.map((i) => i.id));
      for (const a of articlesList) {
        if (!signalIds.has(a.id)) {
          items.push({
            id: a.id,
            headline: a.headline,
            sourceName: a.source_name,
            sourceUrl: a.source_url,
            sourceType: a.source_type,
            time: a.published_at || a.scraped_at,
            confidence: a.confidence,
          });
        }
      }
    }

    // Sort by most recent
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return items;
  }, [todaySignals, realArticles]);

  const visibleSources = showAllSignals ? allSources : allSources.slice(0, 5);

  // Share handler
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!promise) return;
    const title = locale === 'ne' ? (promise.title_ne || promise.title) : promise.title;
    const text = commitmentShareText({ title, progress: promise.progress, status: promise.status, locale });
    await shareOrCopy({ title, text, url });
  };

  /* ── Not found ── */
  if (!promise) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('detail.notFoundTitle')}
          </h1>
          <p className="text-gray-500 mb-6">
            {t('detail.notFoundDesc')}
          </p>
          <Link
            href="/explore/first-100-days"
            className="inline-flex items-center gap-2 btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('detail.backToTracker')}
          </Link>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[promise.status];
  const CatIcon = CATEGORY_ICONS[promise.category] ?? Building2;

  // Compute a truth score from article confidences or fallback
  const truthScore = (() => {
    if (realArticles && realArticles.length > 0) {
      const avg = realArticles.reduce((s, a) => s + a.confidence, 0) / realArticles.length;
      return Math.round(avg * 100);
    }
    if (promise.trustLevel === 'verified') return 85;
    if (promise.trustLevel === 'partial') return 55;
    if (promise.trustLevel === 'disputed') return 20;
    return 10;
  })();

  const truthLabel = getTruthLabel(truthScore);

  // AI summary: use summary field or fall back to description
  const aiSummary = isNe
    ? promise.summary_ne || promise.description_ne
    : promise.summary || promise.description;

  // Last updated relative time
  const lastUpdatedTime = promise.lastSignalAt
    ? relativeTime(promise.lastSignalAt)
    : promise.lastUpdate
      ? relativeTime(promise.lastUpdate)
      : null;

  const sourceCount = promise.sourceCount ?? allSources.length;

  // Assigned officials — separate people from organizations
  const actorPeople = (promise.actors || []).filter((a) => {
    const orgPrefixes = ['Ministry of', 'Department of', 'Office of', 'District ', 'Provincial '];
    const orgNames = new Set(['Federal Parliament', 'Supreme Court', 'Judicial Council', 'Election Commission', 'Public Service Commission', 'CIAA', 'NEA', 'KUKL', 'CAAN', 'PPMO', 'NPC', 'NRB', 'NTA', 'NTB', 'SEBON', 'NEPSE', 'NARC', 'HITP', 'NITC', 'CTEVT', 'CDC', 'ERO', 'IBN', 'TEPC', 'NRNA', 'DOED', 'DOR', 'DWSS', 'DOA', 'DHM', 'UGC', 'MOCIT', 'MOHP', 'MOLMAC', 'IRD', 'SSF', 'Nepal Rastra Bank', 'Investment Board Nepal', 'Social Security Fund', 'Health Insurance Board', 'Electricity Regulatory Commission', 'Truth and Reconciliation Commission', 'National Dalit Commission', 'National Sports Council', 'Inland Revenue Department', 'Attorney General Office', 'Survey Department', 'Kathmandu Metropolitan City']);
    return !orgNames.has(a) && !orgPrefixes.some((p) => a.startsWith(p));
  });
  const actorOrgs = (promise.actors || []).filter((a) => !actorPeople.includes(a));

  return (
    <div className="min-h-screen pb-24 md:pb-12">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">
        {/* ═══════════════════════════════════════
           SECTION 1: HEADER
           ═══════════════════════════════════════ */}
        <section className="pt-6 pb-6">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-300 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {t('detail.back')}
          </button>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
            >
              <GhantiIcon status={promise.status} size="sm" />
              {isNe ? status.labelNe : status.label}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-display font-bold text-white leading-tight tracking-tight mb-2">
            {isNe ? promise.title_ne : promise.title}
          </h1>

          {/* Short summary as subtitle */}
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            {aiSummary}
          </p>

          <p className="text-sm text-gray-500 mb-4">
            {isNe ? promise.title : promise.title_ne}
          </p>

          {/* Category + Department */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <CatIcon className="w-4 h-4" />
            <span>{isNe ? promise.category_ne : promise.category}</span>
            {promise.scope && (
              <>
                <span className="text-gray-600">&middot;</span>
                <span className="capitalize text-gray-500">{t(`detail.scope${promise.scope.charAt(0).toUpperCase()}${promise.scope.slice(1)}`)}</span>
              </>
            )}
          </div>

          {/* Assigned officials + organizations */}
          {(actorPeople.length > 0 || actorOrgs.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
              {actorPeople.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  {actorPeople.map((a) => translateActor(a, locale)).join(', ')}
                </span>
              )}
              {actorOrgs.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  {actorOrgs.map((o) => translateOrg(o, locale)).join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Progress bar (8px thick) */}
          <div className="mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, promise.progress ?? 0))}%`,
                    background: status.barGradient,
                    boxShadow: (promise.progress ?? 0) > 0 ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none',
                  }}
                />
              </div>
              <span className="text-sm font-bold text-white tabular-nums min-w-[3ch] text-right">
                {promise.progress ?? 0}%
              </span>
            </div>
            {(promise.progress ?? 0) === 0 && promise.status === 'not_started' && (
              <p className="text-xs text-gray-500 mt-1">
                {t('detail.noProgressData')}
              </p>
            )}
          </div>

          {/* Blocker */}
          {promise.status === 'stalled' && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 font-medium">
                {'\u26D4'} {t('detail.blocker')}: {t('detail.blockerDesc')}
              </p>
            </div>
          )}

          {/* Truth meter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{'\uD83D\uDEE1\uFE0F'} {t('detail.truth')}:</span>
            <TruthMeter score={truthScore} label={truthLabel} size="md" />
          </div>
        </section>

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4 md:mb-8" />

        {/* ═══════════════════════════════════════
           MOBILE TAB BAR (sticky below header)
           ═══════════════════════════════════════ */}
        <div className="md:hidden sticky top-0 z-20 mb-4">
          <div className="flex rounded-xl border border-white/[0.08] bg-np-void/90 backdrop-blur-xl overflow-hidden">
            {(['brief', 'sources', 'evidence'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'brief' ? t('detail.briefTab') : tab === 'sources' ? t('detail.sourcesTab') : t('detail.evidenceTab')}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-primary-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════
           SECTION 2: FULL BRIEFING
           ═══════════════════════════════════════ */}
        <section className={`pb-8 ${activeTab !== 'brief' ? 'hidden md:block' : ''}`}>
          <SectionHeader icon={'\uD83D\uDCCB'} title={t('detail.intelligenceBriefing')} />

          {briefingLoading ? (
            <BriefingSkeleton />
          ) : briefingError || !briefing ? (
            /* Graceful fallback: only the short summary shows */
            <div className="glass-card p-5 sm:p-6">
              <p className="text-[15px] sm:text-base text-gray-200 leading-relaxed">
                &ldquo;{aiSummary}&rdquo;
              </p>
              {lastUpdatedTime && (
                <p className="text-xs text-gray-500 mt-4">
                  {t('detail.lastUpdated')}: {lastUpdatedTime}
                  {sourceCount > 0 && (
                    <>
                      {' '}&middot;{' '}
                      {sourceCount} {t('detail.sourcesTracking')}
                    </>
                  )}
                </p>
              )}
            </div>
          ) : (
            /* Full briefing — all 4 sections visible immediately */
            <div className="glass-card p-5 sm:p-6 space-y-6">
              {(() => {
                const fb = isNe && briefing.fullBriefingNe
                  ? briefing.fullBriefingNe
                  : briefing.fullBriefing;

                return (
                  <>
                    {/* What's happening */}
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        {t('detail.whatsHappening')}
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {fb.whatsHappening}
                      </p>
                    </div>

                    {/* Who's saying what */}
                    {fb.whosSayingWhat && fb.whosSayingWhat.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                          {t('detail.whosSayingWhat')}
                        </h3>
                        <div className="space-y-2.5">
                          {fb.whosSayingWhat.map((item, i) => {
                            const sentimentColor =
                              item.sentiment === 'positive'
                                ? 'border-l-emerald-400'
                                : item.sentiment === 'negative'
                                  ? 'border-l-red-400'
                                  : 'border-l-gray-500';
                            const dotColor =
                              item.sentiment === 'positive'
                                ? 'bg-emerald-400'
                                : item.sentiment === 'negative'
                                  ? 'bg-red-400'
                                  : 'bg-gray-500';

                            return (
                              <div
                                key={i}
                                className={`pl-3.5 py-2.5 pr-3 border-l-2 ${sentimentColor} bg-white/[0.02] rounded-r-lg`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                  <span className="text-xs font-semibold text-gray-300">
                                    {item.source}
                                  </span>
                                  {item.person && (
                                    <span className="text-xs text-gray-500">
                                      &middot; {item.person}
                                    </span>
                                  )}
                                  <span className="ml-auto text-[10px] text-gray-600">
                                    {item.date}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  &ldquo;{item.quote}&rdquo;
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Key numbers */}
                    {fb.keyNumbers && fb.keyNumbers.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                          {t('detail.keyNumbers')}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {fb.keyNumbers.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                            >
                              <span className="text-base flex-shrink-0">{item.icon}</span>
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-500 truncate">{item.label}</p>
                                <p className="text-xs font-bold text-white truncate">{item.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* What to watch */}
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        {t('detail.whatToWatch')}
                      </h3>
                      <div className="pl-3.5 py-3 pr-3 border-l-2 border-l-amber-400/60 bg-amber-500/[0.04] rounded-r-lg">
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {fb.whatToWatch}
                        </p>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-[10px] text-gray-600 pt-2 border-t border-white/[0.04]">
                      <span>
                        {briefing.signalCount} {t('detail.signals')} &middot;{' '}
                        {briefing.sourceCount} {t('detail.sources')}
                      </span>
                      <span>
                        {t('detail.generated')}{' '}
                        {new Date(briefing.generatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════
           SECTION 2.5: WHEN THIS IS DONE (Impact Prediction)
           ═══════════════════════════════════════ */}
        <section ref={impactRef} className={`pb-8 ${activeTab !== 'brief' ? 'hidden md:block' : ''}`}>
          <SectionHeader icon={'\u2728'} title={t('detail.whenThisIsDone')} />

          {impactLoading ? (
            <ImpactSkeleton />
          ) : impactError ? (
            /* Error: hide the section entirely as requested */
            null
          ) : !impact ? (
            /* No data yet: hide the section entirely */
            null
          ) : (
            <div className="space-y-4">
              {/* Vision summary */}
              <div className="glass-card p-5 sm:p-6">
                <p className="text-[15px] sm:text-base text-gray-200 leading-relaxed italic">
                  &ldquo;{isNe && impact.summaryNe ? impact.summaryNe : impact.summaryEn}&rdquo;
                </p>
                {impact.estimatedCompletion && (
                  <p className="text-xs text-gray-500 mt-3">
                    {'\uD83D\uDCC5'} {t('detail.estCompletion')}: {impact.estimatedCompletion}
                  </p>
                )}
              </div>

              {/* Before → After */}
              {impact.beforeAfter && impact.beforeAfter.length > 0 && (
                <div className="glass-card p-5 sm:p-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">
                    {'\uD83D\uDCCA'} {t('detail.beforeAfter')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {impact.beforeAfter.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-stretch rounded-xl overflow-hidden border border-white/[0.06]"
                      >
                        <div className="flex-1 px-3 py-2.5 bg-red-500/[0.06]">
                          <p className="text-[10px] text-gray-500 mb-0.5">{item.metric}</p>
                          <p className="text-xs font-semibold text-red-300">{item.before}</p>
                        </div>
                        <div className="flex items-center px-1.5 text-gray-600 text-xs">{'\u2192'}</div>
                        <div className="flex-1 px-3 py-2.5 bg-emerald-500/[0.06]">
                          <p className="text-[10px] text-gray-500 mb-0.5">{item.metric}</p>
                          <p className="text-xs font-semibold text-emerald-300">{item.after}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Impacts */}
              {impact.impacts && impact.impacts.length > 0 && (
                <div className="glass-card p-5 sm:p-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">
                    {'\uD83D\uDCA1'} {t('detail.keyImpacts')}
                  </h3>
                  <div className="space-y-2.5">
                    {impact.impacts.map((item, i) => {
                      const confidenceColor =
                        item.confidence === 'high'
                          ? 'bg-emerald-400'
                          : item.confidence === 'medium'
                            ? 'bg-amber-400'
                            : 'bg-gray-500';
                      const confidenceLabel =
                        item.confidence === 'high'
                          ? t('detail.confidenceHigh')
                          : item.confidence === 'medium'
                            ? t('detail.confidenceMedium')
                            : t('detail.confidenceSpeculative');

                      return (
                        <div
                          key={i}
                          className="pl-4 py-3 pr-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base flex-shrink-0">{item.icon}</span>
                              <span className="text-sm font-semibold text-white">
                                {localizeField(item.titleEn, item.titleNe, 'Update')}
                              </span>
                            </div>
                            <span className="flex items-center gap-1.5 text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">
                              <span className={`w-1.5 h-1.5 rounded-full ${confidenceColor}`} />
                              {confidenceLabel}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed mb-1.5">
                            {localizeField(item.descriptionEn, item.descriptionNe)}
                          </p>
                          <p className="text-[10px] text-gray-600">
                            {'\uD83D\uDC65'} {item.affectedPeople}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Who benefits most */}
              {impact.primaryBeneficiaries && impact.primaryBeneficiaries.length > 0 && (
                <div className="glass-card p-5 sm:p-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                    {t('detail.whoBenefitsMost')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {impact.primaryBeneficiaries.map((b, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-500/10 text-primary-300 border border-primary-500/20"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="text-[10px] text-gray-600 text-center">
                {t('detail.aiGenerated')} &middot;{' '}
                {new Date(impact.generatedAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════
           SECTION 3: LATEST SOURCES (with voting)
           ═══════════════════════════════════════ */}
        <section className={`pb-8 ${activeTab !== 'sources' ? 'hidden md:block' : ''}`}>
          <SectionHeader icon={'\uD83D\uDCF0'} title={t('detail.latestSources')} />

          {signalsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SignalSkeleton key={i} />
              ))}
            </div>
          ) : allSources.length > 0 ? (
            <div className="space-y-3">
              {visibleSources.map((source) => {
                const truthBadge = Math.round(source.confidence * 100);
                return (
                  <div
                    key={source.id}
                    className="glass-card p-4 hover:border-white/[0.12] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{sourceTypeIcon(source.sourceType)}</span>
                        <span className="font-medium text-gray-300">{source.sourceName}</span>
                        <span className="text-gray-600">&middot;</span>
                        <span>{relativeTime(source.time)}</span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 whitespace-nowrap">
                        {'\uD83D\uDEE1\uFE0F'} {truthBadge}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed line-clamp-2 mb-2">
                      {source.headline}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <a
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          {t('detail.readOriginal')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <EvidenceSourceBadge
                          sourceType={deriveSourceType({
                            source_type: source.sourceType,
                            source_name: source.sourceName,
                            confidence: source.confidence,
                          })}
                          isNe={locale === 'ne'}
                          compact
                        />
                      </div>
                      {/* Source voting */}
                      <SourceVoteWidget targetType="signal" targetId={source.id} />
                    </div>
                  </div>
                );
              })}

              {/* Show all toggle */}
              {allSources.length > 5 && !showAllSignals && (
                <button
                  onClick={() => setShowAllSignals(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-primary-400 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-primary-500/20 transition-all"
                >
                  {t('detail.showAllSources').replace('{count}', String(allSources.length))}
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-gray-500">
                {t('detail.noSourcesYet')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t('detail.noSourcesDesc')}
              </p>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════
           SECTION 4: COMMUNITY EVIDENCE
           ═══════════════════════════════════════ */}
        <section ref={evidenceRef} id="community-evidence" className={`pb-8 scroll-mt-6 ${activeTab !== 'evidence' ? 'hidden md:block' : ''}`}>
          <SectionHeader icon={'\uD83D\uDCF8'} title={t('detail.communityEvidence')} />
          <CommunityEvidenceFeed promiseId={promise.id} />
        </section>

        {/* ═══════════════════════════════════════
           SECTION 5: DISCUSSION
           ═══════════════════════════════════════ */}
        <section className={`pb-8 ${activeTab !== 'evidence' ? 'hidden md:block' : ''}`}>
          <SectionHeader icon={'\uD83D\uDCAC'} title={t('detail.discussion')} />
          <CommentsSection promiseId={promise.id} />
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
      </div>

      {/* ═══════════════════════════════════════
         SECTION 6: STICKY ACTIONS BAR (mobile)
         ═══════════════════════════════════════ */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden safe-bottom">
        <div className="bg-gray-900/95 backdrop-blur-xl border-t border-white/[0.06]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
            {/* Watch */}
            <button
              onClick={() => toggleWatch(promise.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isWatched(promise.id)
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'bg-white/[0.05] text-gray-300 border border-white/[0.08]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {isWatched(promise.id)
                ? t('detail.watching')
                : t('detail.watch')}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] text-gray-300 border border-white/[0.08] transition-all hover:bg-white/[0.08]"
            >
              <Share className="w-3.5 h-3.5" />
              {t('detail.share')}
            </button>

            {/* Submit Evidence */}
            <button
              onClick={() => evidenceRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30 transition-all hover:bg-primary-500/30"
            >
              <Camera className="w-3.5 h-3.5" />
              {t('detail.evidence')}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop inline actions bar */}
      <div className="hidden md:block max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-8">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => toggleWatch(promise.id)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isWatched(promise.id)
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                : 'bg-white/[0.04] text-gray-300 border border-white/[0.08] hover:border-primary-500/30 hover:text-primary-300'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isWatched(promise.id) ? 'fill-primary-400' : ''}`} />
            {isWatched(promise.id)
              ? t('detail.watching')
              : t('detail.watch')}
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.04] text-gray-300 border border-white/[0.08] hover:bg-white/[0.06] transition-all"
          >
            <Share className="w-4 h-4" />
            {t('detail.share')}
          </button>

          <button
            onClick={() => evidenceRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary-500/15 text-primary-300 border border-primary-500/30 hover:bg-primary-500/25 transition-all"
          >
            <Camera className="w-4 h-4" />
            {t('detail.submitEvidence')}
          </button>
        </div>
      </div>
    </div>
  );
}
