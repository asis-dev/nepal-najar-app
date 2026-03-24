'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  useAllPromises,
  usePromiseStats,
  useArticleCount,
} from '@/lib/hooks/use-promises';
import { useTrending } from '@/lib/hooks/use-trending';
import { isPublicCommitment } from '@/lib/data/commitments';
import type { GovernmentPromise } from '@/lib/data/promises';

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
   Animated Counter Hook
   ═══════════════════════════════════════════ */
function useAnimatedCounter(target: number, duration = 1500, delay = 0) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) { setCount(0); return; }

    const startTime = performance.now() + delay;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, delay]);

  return count;
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

/* ═══════════════════════════════════════════
   Big Picture Status Card
   ═══════════════════════════════════════════ */
function StatusBox({
  emoji,
  count,
  label,
  glowColor,
  delay,
}: {
  emoji: string;
  count: number;
  label: string;
  glowColor: string;
  delay: number;
}) {
  const animatedCount = useAnimatedCounter(count, 1500, delay);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md px-4 py-4 sm:px-6 sm:py-5 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{
        boxShadow: `0 0 30px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <span className="text-xl sm:text-2xl leading-none">{emoji}</span>
      <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums tracking-tight leading-none">
        {animatedCount}
      </span>
      <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-medium">
        {label}
      </span>
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
          className="h-full rounded-full transition-all duration-1500 ease-out"
          style={{
            width: `${width}%`,
            background: getGradient(),
            boxShadow: '0 0 8px rgba(59,130,246,0.3)',
            transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
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
function CommitmentCard({
  commitment,
  isTrending,
  locale,
}: {
  commitment: GovernmentPromise;
  isTrending: boolean;
  locale: string;
}) {
  const title = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
  const summary = locale === 'ne' && commitment.summary_ne
    ? commitment.summary_ne
    : commitment.summary || commitment.description;
  const statusCfg = STATUS_CONFIG[commitment.status] ?? STATUS_CONFIG.not_started;

  return (
    <Link
      href={`/explore/first-100-days/${commitment.slug}`}
      className="glass-card-hover block p-4 sm:p-5 transition-all duration-500"
    >
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
            className="h-full rounded-full transition-all duration-700 ease-out"
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
   LANDING PAGE
   ═══════════════════════════════════════════ */
const INITIAL_FEED_COUNT = 20;

export default function LandingPage() {
  const { locale } = useI18n();
  const { stats, isLoading: statsLoading } = usePromiseStats();
  const { data: allPromises, isLoading: promisesLoading } = useAllPromises({ publicOnly: true });
  const { data: articleCount } = useArticleCount();
  const { trending, trendingIds, pulse } = useTrending(12);
  const { brief, isLoading: briefLoading } = useDailyBrief();
  const contradictionCount = useContradictions();

  const [feedCount, setFeedCount] = useState(INITIAL_FEED_COUNT);
  const [staleExpanded, setStaleExpanded] = useState(false);

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

  /* ── Partition: active feed vs stale ── */
  const { feedItems, staleItems } = useMemo(() => {
    if (!allPromises) return { feedItems: [], staleItems: [] };

    const publicPromises = allPromises.filter((p) => isPublicCommitment(p));

    const active: GovernmentPromise[] = [];
    const stale: GovernmentPromise[] = [];

    for (const p of publicPromises) {
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

    // Sort active: trending first, then by most recent activity
    active.sort((a, b) => {
      const aT = trendingIds.has(a.id) ? 1 : 0;
      const bT = trendingIds.has(b.id) ? 1 : 0;
      if (aT !== bT) return bT - aT;

      // Then by last activity date (most recent first)
      const aDate = a.lastActivityDate || a.lastSignalAt || a.lastUpdate || '';
      const bDate = b.lastActivityDate || b.lastSignalAt || b.lastUpdate || '';
      return bDate.localeCompare(aDate);
    });

    return { feedItems: active, staleItems: stale };
  }, [allPromises, trendingIds]);

  const visibleFeed = feedItems.slice(0, feedCount);
  const hasMore = feedCount < feedItems.length;

  const loadMore = useCallback(() => {
    setFeedCount((prev) => Math.min(prev + 20, feedItems.length));
  }, [feedItems.length]);

  const sourceCount = articleCount ?? 44;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-np-void">
      {/* Subtle grid background */}
      <div className="absolute inset-0 z-0 nepal-hero-grid opacity-50" />

      <div className="relative z-10">
        {/* ════════════════════════════════════════
           SECTION 1 — Big Picture Dashboard
           ════════════════════════════════════════ */}
        <section className="px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            {/* Dark glass container */}
            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-5 sm:p-7"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                boxShadow: '0 20px 60px rgba(2,8,20,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Radial glow behind status boxes */}
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
                }}
              />

              {/* Title row */}
              <div className="relative text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  The nation&apos;s report card.
                </h1>
                <p className="mt-1.5 text-sm text-gray-400">
                  {statsLoading ? '--' : stats?.total ?? 0} commitments{' '}
                  <span className="text-gray-600">&middot;</span>{' '}
                  {sourceCount} sources{' '}
                  <span className="text-gray-600">&middot;</span>{' '}
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </span>
                </p>
              </div>

              {/* Status boxes — 2x2 on mobile, 4 across on sm+ */}
              <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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
                      delay={0}
                    />
                    <StatusBox
                      emoji={'\u{1F534}'}
                      count={stats?.stalled ?? 0}
                      label="stalled"
                      glowColor="rgba(239,68,68,0.12)"
                      delay={100}
                    />
                    <StatusBox
                      emoji={'\u{1F7E1}'}
                      count={stats?.notStarted ?? 0}
                      label="waiting"
                      glowColor="rgba(245,158,11,0.10)"
                      delay={200}
                    />
                    <StatusBox
                      emoji={'\u2705'}
                      count={stats?.delivered ?? 0}
                      label="delivered"
                      glowColor="rgba(59,130,246,0.12)"
                      delay={300}
                    />
                  </>
                )}
              </div>

              {/* This week activity line */}
              {!statsLoading && (
                <div className="text-sm text-gray-400 mb-3 text-center sm:text-left">
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

              {/* Top movers */}
              {topMovers.length > 0 && (
                <div className="text-sm text-gray-400 mb-3 text-center sm:text-left">
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
                <div className="flex items-center gap-2 text-sm text-amber-400/90 mb-4 text-center sm:text-left sm:justify-start justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{contradictionCount} commitment{contradictionCount !== 1 ? 's have' : ' has'} contradictions</span>
                </div>
              )}

              {/* Daily brief divider + content */}
              <div className="border-t border-white/[0.06] pt-4 mb-4">
                {briefLoading ? (
                  <div className="flex items-center gap-2.5 text-sm text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    <span>Scanning {sourceCount} sources...</span>
                  </div>
                ) : brief ? (
                  <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-2">
                      <span>{'\uD83D\uDCCB'}</span>
                      Today&apos;s brief
                    </div>
                    <p className="text-sm leading-relaxed text-gray-300">
                      {locale === 'ne' && brief.summaryNe
                        ? brief.summaryNe.split('\n').slice(0, 3).join(' ')
                        : brief.summaryEn.split('\n').slice(0, 3).join(' ')}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-sm text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400 opacity-50" />
                    <span>Scanning {sourceCount} sources...</span>
                  </div>
                )}
              </div>

              {/* Pulse bar */}
              <PulseBar score={pulse || brief?.pulse || 0} />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 2 — The Feed
           ════════════════════════════════════════ */}
        <section className="mt-6 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            {promisesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass-card p-4">
                    <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-3 h-1 w-full rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleFeed.map((commitment) => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    isTrending={trendingIds.has(commitment.id)}
                    locale={locale}
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
           SECTION 3 — Stale Commitments (collapsed)
           ════════════════════════════════════════ */}
        {staleItems.length > 0 && (
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
