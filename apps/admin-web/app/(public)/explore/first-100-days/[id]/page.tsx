'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Share2,
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
import { useI18n } from '@/lib/i18n';
import { TruthMeter } from '@/components/public/truth-meter';
import { CommunityEvidenceFeed } from '@/components/public/community-evidence-feed';
import { CommentsSection } from '@/components/public/comments-section';
import { VoteWidget } from '@/components/public/vote-widget';
import { SourceVoteWidget } from '@/components/public/source-vote-widget';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { useAuth } from '@/lib/hooks/use-auth';
import { isPublicCommitment } from '@/lib/data/commitments';
import {
  getPromiseBySlug,
  getPromiseById,
  type PromiseStatus,
  type TrustLevel,
  type GovernmentPromise,
} from '@/lib/data/promises';
import { useAllPromises, useLatestArticles, usePromiseTodaySignals } from '@/lib/hooks/use-promises';

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
  const { locale } = useI18n();
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

  // Resolve the commitment
  const promise = useMemo(() => {
    const liveMatch = livePromises
      ?.filter((c) => isPublicCommitment(c))
      .find((c) => c.slug === idParam || c.id === idParam);
    return liveMatch ?? getPromiseBySlug(idParam) ?? getPromiseById(idParam);
  }, [idParam, livePromises]);

  // Fetch briefing immediately on page load
  useEffect(() => {
    if (!promise?.id) {
      setBriefingLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      setBriefingLoading(true);
      setBriefingError(false);
      try {
        const res = await fetch(`/api/briefing?commitment_id=${promise.id}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setBriefing(data);
        } else {
          setBriefingError(true);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setBriefingError(true);
        }
      } finally {
        setBriefingLoading(false);
      }
    })();

    return () => controller.abort();
  }, [promise?.id]);

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
    if (todaySignals) {
      for (const s of todaySignals) {
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
    if (realArticles) {
      const signalIds = new Set(items.map((i) => i.id));
      for (const a of realArticles) {
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
    const title = promise ? `${promise.title_ne} - ${promise.title}` : '';
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  /* ── Not found ── */
  if (!promise) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {isNe ? 'प्रतिबद्धता फेला परेन' : 'Commitment not found'}
          </h1>
          <p className="text-gray-500 mb-6">
            {isNe ? 'यो प्रतिबद्धता अब उपलब्ध छैन।' : 'This commitment is no longer available.'}
          </p>
          <Link
            href="/explore/first-100-days"
            className="inline-flex items-center gap-2 btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            {isNe ? 'ट्र्याकरमा फर्कनुहोस्' : 'Back to tracker'}
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

  // Assigned officials
  const officials = promise.actors && promise.actors.length > 0 ? promise.actors.join(', ') : null;

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
            {isNe ? 'पछाडि जानुहोस्' : 'Back'}
          </button>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
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
                <span className="capitalize text-gray-500">{promise.scope}</span>
              </>
            )}
          </div>

          {/* Assigned official */}
          {officials && (
            <p className="text-sm text-gray-400 mb-4">
              <span className="mr-1.5">{'\uD83D\uDC64'}</span>
              {officials}
            </p>
          )}

          {/* Progress bar (8px thick) */}
          <div className="mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${promise.progress}%`,
                    background: status.barGradient,
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
                  }}
                />
              </div>
              <span className="text-sm font-bold text-white tabular-nums min-w-[3ch] text-right">
                {promise.progress}%
              </span>
            </div>
          </div>

          {/* Blocker */}
          {promise.status === 'stalled' && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 font-medium">
                {'\u26D4'} {isNe ? 'अवरोधक' : 'Blocker'}: {isNe ? 'प्रगति रोकिएको छ' : 'Progress has stalled'}
              </p>
            </div>
          )}

          {/* Truth meter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{'\uD83D\uDEE1\uFE0F'} Truth:</span>
            <TruthMeter score={truthScore} label={truthLabel} size="md" />
          </div>
        </section>

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8" />

        {/* ═══════════════════════════════════════
           SECTION 2: FULL BRIEFING (immediately visible)
           ═══════════════════════════════════════ */}
        <section className="pb-8">
          <SectionHeader icon={'\uD83D\uDCCB'} title={isNe ? 'सारांश' : 'Intelligence Briefing'} />

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
                  {isNe ? 'अन्तिम अद्यावधिक' : 'Last updated'}: {lastUpdatedTime}
                  {sourceCount > 0 && (
                    <>
                      {' '}&middot;{' '}
                      {sourceCount} {isNe ? 'स्रोतहरू ट्र्याक गर्दै' : 'sources tracking'}
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
                        {isNe ? 'के भइरहेको छ' : "What's happening"}
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {fb.whatsHappening}
                      </p>
                    </div>

                    {/* Who's saying what */}
                    {fb.whosSayingWhat && fb.whosSayingWhat.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                          {isNe ? 'कसले के भन्दैछ' : "Who's saying what"}
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
                          {isNe ? 'मुख्य तथ्याङ्क' : 'Key numbers'}
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
                        {isNe ? 'के हेर्ने' : 'What to watch'}
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
                        {briefing.signalCount} {isNe ? 'संकेतहरू' : 'signals'} &middot;{' '}
                        {briefing.sourceCount} {isNe ? 'स्रोतहरू' : 'sources'}
                      </span>
                      <span>
                        {isNe ? 'उत्पन्न' : 'Generated'}{' '}
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
           SECTION 3: LATEST SOURCES (with voting)
           ═══════════════════════════════════════ */}
        <section className="pb-8">
          <SectionHeader icon={'\uD83D\uDCF0'} title={isNe ? 'ताजा स्रोतहरू' : 'Latest Sources'} />

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
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        {isNe ? 'मूल पढ्नुहोस्' : 'Read original'}
                        <ExternalLink className="w-3 h-3" />
                      </a>
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
                  {isNe
                    ? `सबै ${allSources.length} स्रोतहरू हेर्नुहोस्`
                    : `Show all ${allSources.length} sources`}
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-gray-500">
                {isNe ? 'अहिलेसम्म कुनै स्रोत भेटिएको छैन।' : 'No sources found yet.'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {isNe
                  ? 'बुद्धिमत्ता इन्जिनले स्वचालित रूपमा स्रोत खोज्छ।'
                  : 'The intelligence engine is continuously scanning for sources.'}
              </p>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════
           SECTION 4: COMMUNITY EVIDENCE
           ═══════════════════════════════════════ */}
        <section ref={evidenceRef} id="community-evidence" className="pb-8 scroll-mt-6">
          <SectionHeader icon={'\uD83D\uDCF8'} title={isNe ? 'समुदाय प्रमाण' : 'Community Evidence'} />
          <CommunityEvidenceFeed promiseId={promise.id} />
        </section>

        {/* ═══════════════════════════════════════
           SECTION 5: DISCUSSION
           ═══════════════════════════════════════ */}
        <section className="pb-8">
          <SectionHeader icon={'\uD83D\uDCAC'} title={isNe ? 'छलफल' : 'Discussion'} />
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
                ? isNe ? 'हेरिरहेको' : 'Watching'
                : isNe ? 'हेर्नुहोस्' : 'Watch'}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] text-gray-300 border border-white/[0.08] transition-all hover:bg-white/[0.08]"
            >
              <Share2 className="w-3.5 h-3.5" />
              {isNe ? 'साझा' : 'Share'}
            </button>

            {/* Submit Evidence */}
            <button
              onClick={() => evidenceRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30 transition-all hover:bg-primary-500/30"
            >
              <Camera className="w-3.5 h-3.5" />
              {isNe ? 'प्रमाण' : 'Evidence'}
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
              ? isNe ? 'हेरिरहेको' : 'Watching'
              : isNe ? 'हेर्नुहोस्' : 'Watch'}
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.04] text-gray-300 border border-white/[0.08] hover:bg-white/[0.06] transition-all"
          >
            <Share2 className="w-4 h-4" />
            {isNe ? 'साझा गर्नुहोस्' : 'Share'}
          </button>

          <button
            onClick={() => evidenceRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary-500/15 text-primary-300 border border-primary-500/30 hover:bg-primary-500/25 transition-all"
          >
            <Camera className="w-4 h-4" />
            {isNe ? 'प्रमाण पेश गर्नुहोस्' : 'Submit Evidence'}
          </button>
        </div>
      </div>
    </div>
  );
}
