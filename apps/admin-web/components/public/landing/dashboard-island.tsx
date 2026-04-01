'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Loader2, AlertTriangle, Share, Play, Pause } from 'lucide-react';
import { DailyBriefPlayer } from '@/components/public/daily-brief-player';
import { useI18n } from '@/lib/i18n';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import {
  useAllPromises,
  usePromiseStats,
  useArticleCount,
} from '@/lib/hooks/use-promises';
import { useTrending } from '@/lib/hooks/use-trending';
import { useWatchlistStore, usePreferencesStore, useUserPreferencesStore } from '@/lib/stores/preferences';
import { useAuth } from '@/lib/hooks/use-auth';
import { isPublicCommitment } from '@/lib/data/commitments';
import { computeGhantiScore, GRADE_COLORS } from '@/lib/data/ghanti-score';
import { scorecardShareText, shareOrCopy } from '@/lib/utils/share';
import { useDailyBrief } from '@/lib/hooks/use-daily-brief';
import { useContradictions } from '@/lib/hooks/use-contradictions';
import { UnifiedDailyBrief } from '@/components/public/landing/unified-daily-brief';
import { PulseBar } from '@/components/public/landing/pulse-bar';

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const INAUGURATION_TIMESTAMP = new Date('2026-03-26T00:00:00+05:45').getTime();
const NO_GRADE_WINDOW_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Stable audio URL wrapper — computes cache-bust ONCE on mount so
 * parent re-renders don't change the URL and destroy the Audio element.
 */
function BriefAudioRow({ baseAudioUrl, durationSeconds, storyCount, onStoryHighlight }: {
  baseAudioUrl: string;
  durationSeconds?: number;
  storyCount: number;
  onStoryHighlight: (index: number) => void;
}) {
  // useMemo with empty deps = computed once per mount, stable across re-renders
  const { enUrl, neUrl } = useMemo(() => {
    const cacheBust = `?v=${Date.now()}`;
    return {
      enUrl: baseAudioUrl.replace('brief-ne.mp3', 'brief-en.mp3') + cacheBust,
      neUrl: baseAudioUrl + cacheBust,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseAudioUrl]);

  return (
    <div className="mb-2 flex gap-2">
      <div className="flex-1 min-w-0">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400 px-1">
          English Audio Brief
        </div>
        <DailyBriefPlayer
          audioUrl={enUrl}
          durationSeconds={durationSeconds}
          storyCount={storyCount}
          onStoryHighlight={onStoryHighlight}
          hideHeader
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400 px-1">
          नेपाली अडियो ब्रिफ
        </div>
        <DailyBriefPlayer
          audioUrl={neUrl}
          durationSeconds={durationSeconds}
          storyCount={storyCount}
          onStoryHighlight={onStoryHighlight}
          hideHeader
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Dashboard Island — Big Picture Dashboard
   ═══════════════════════════════════════════ */
export function DashboardIsland() {
  const { locale, t } = useI18n();
  const isMobile = useIsMobile();
  const { stats, isLoading: statsLoading } = usePromiseStats();
  const { data: allPromises } = useAllPromises({ publicOnly: true });
  const { data: articleCount } = useArticleCount();
  const { trending, pulse } = useTrending(12);
  const { brief, isLoading: briefLoading } = useDailyBrief();
  const contradictionCount = useContradictions();
  useAuth(); // ensure auth store is hydrated

  /* ── Audio state ── */
  const [playingAboutLang, setPlayingAboutLang] = useState<'en' | 'ne' | null>(null);
  const aboutAudioRef = useRef<HTMLAudioElement | null>(null);

  /* ── Hydration guard ── */
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [audioHighlightIdx, setAudioHighlightIdx] = useState(-1);

  /* ── Hydrate zustand stores from localStorage ── */
  useEffect(() => {
    useWatchlistStore.persist.rehydrate();
    usePreferencesStore.persist.rehydrate();
    useUserPreferencesStore.persist.rehydrate();
  }, []);

  /* ── Mount: set nowMs for hydration-safe rendering ── */
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  /* ── Cleanup about-audio on unmount ── */
  useEffect(() => {
    return () => {
      if (aboutAudioRef.current) {
        aboutAudioRef.current.pause();
        aboutAudioRef.current = null;
      }
    };
  }, []);

  /* ── Ghanti Score ── */
  const ghantiScore = useMemo(
    () => (allPromises ? computeGhantiScore(allPromises) : null),
    [allPromises],
  );

  const effectiveNow = nowMs ?? Date.now();
  const isPreInauguration = effectiveNow < INAUGURATION_TIMESTAMP;
  const daysUntilInauguration = Math.max(
    0,
    Math.ceil((INAUGURATION_TIMESTAMP - effectiveNow) / DAY_IN_MS),
  );
  const dayInTerm = isPreInauguration
    ? 0
    : Math.floor((effectiveNow - INAUGURATION_TIMESTAMP) / DAY_IN_MS) + 1;
  const isNoGradeWindow =
    !isPreInauguration && dayInTerm > 0 && dayInTerm <= NO_GRADE_WINDOW_DAYS;
  const showLetterGrade = !isPreInauguration && !isNoGradeWindow;

  /* ── "This week" activity ── */
  const weekActivity = useMemo(() => {
    if (!allPromises) return { movedForward: 0, stalledCount: 0 };

    const now = Date.now();
    const weekAgo = now - 7 * DAY_IN_MS;
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

  /* ── Per-category scores (worst 5) ── */
  const worstCategories = useMemo(() => {
    if (!allPromises) return [];
    const byCategory = new Map<
      string,
      { promises: typeof allPromises; categoryNe: string }
    >();
    for (const p of allPromises) {
      if (!isPublicCommitment(p)) continue;
      const cat = p.category;
      if (!byCategory.has(cat))
        byCategory.set(cat, { promises: [], categoryNe: p.category_ne || cat });
      byCategory.get(cat)!.promises.push(p);
    }
    const scored = Array.from(byCategory.entries()).map(
      ([cat, { promises, categoryNe }]) => {
        const s = computeGhantiScore(promises);
        return { category: cat, categoryNe, score: s.score, grade: s.grade };
      },
    );
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 5);
  }, [allPromises]);

  const sourceCount = articleCount ?? 34100;

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */
  return (
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

        {/* ── Why Nepal Republic Exists — audio CTA ── */}
        <div
          className="mb-4 md:mb-5 rounded-xl border border-white/[0.06] px-4 py-3"
          style={{
            background:
              'linear-gradient(135deg, rgba(220,20,60,0.06) 0%, rgba(0,56,147,0.06) 100%)',
          }}
        >
          <p className="text-[13px] font-medium text-gray-300 text-center mb-2.5">
            {locale === 'ne' ? 'यो एप किन बन्यो? सुन्नुहोस्' : 'Why does this app exist? Listen'}
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <button
              onClick={() => {
                if (playingAboutLang === 'en') {
                  aboutAudioRef.current?.pause();
                  setPlayingAboutLang(null);
                  return;
                }
                if (aboutAudioRef.current) aboutAudioRef.current.pause();
                aboutAudioRef.current = new Audio('/audio/about-en.mp3');
                aboutAudioRef.current.addEventListener('ended', () =>
                  setPlayingAboutLang(null),
                );
                aboutAudioRef.current.play().catch(() => {});
                setPlayingAboutLang('en');
              }}
              className="group inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-[13px] font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 shadow-md shadow-cyan-500/30 transition-transform group-hover:scale-110">
                {playingAboutLang === 'en'
                  ? <Pause className="h-3.5 w-3.5 text-white" />
                  : <Play className="h-3.5 w-3.5 text-white fill-white" />}
              </span>
              {playingAboutLang === 'en' ? 'Playing…' : 'English'}
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
                aboutAudioRef.current.addEventListener('ended', () =>
                  setPlayingAboutLang(null),
                );
                aboutAudioRef.current.play().catch(() => {});
                setPlayingAboutLang('ne');
              }}
              className="group inline-flex items-center gap-2 rounded-lg border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-[13px] font-medium text-orange-200 transition-colors hover:bg-orange-500/20"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 shadow-md shadow-orange-500/30 transition-transform group-hover:scale-110">
                {playingAboutLang === 'ne'
                  ? <Pause className="h-3.5 w-3.5 text-white" />
                  : <Play className="h-3.5 w-3.5 text-white fill-white" />}
              </span>
              {playingAboutLang === 'ne' ? 'सुन्दै…' : 'नेपालीमा'}
            </button>
          </div>
        </div>

        {/* ── Insight Card — what's happening RIGHT NOW ── */}
        <div
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-3 sm:p-5 md:p-7"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
            boxShadow:
              '0 20px 60px rgba(2,8,20,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="hidden md:block absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
            }}
          />

          {/* ── Promise Momentum Hero ── */}
          {(() => {
            const total = stats?.total ?? 109;
            const active =
              (stats?.inProgress ?? 0) +
              (stats?.stalled ?? 0) +
              (stats?.delivered ?? 0);
            const activityPct =
              total > 0 ? Math.round((active / total) * 100) : 0;
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
            const ringColor =
              activityPct >= 70
                ? '#10b981'
                : activityPct >= 40
                  ? '#06b6d4'
                  : '#f59e0b';

            const insightSentence =
              locale === 'ne'
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
                        ? t('home.preLaunchCountdown').replace(
                            '{count}',
                            String(daysUntilInauguration),
                          )
                        : `${locale === 'ne' ? 'दिन' : 'Day'} ${dayInTerm}`}
                    </span>
                    {showLetterGrade ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${GRADE_COLORS[ghantiScore!.grade].bg} ${GRADE_COLORS[ghantiScore!.grade].text}`}
                      >
                        {ghantiScore!.grade}
                      </span>
                    ) : (
                      <span className="text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                        {locale === 'ne' ? 'आधाररेखा' : 'Baseline'}
                      </span>
                    )}
                  </div>
                  <p className="text-center text-sm sm:text-base text-gray-300 font-medium leading-relaxed max-w-lg mx-auto">
                    {insightSentence}
                  </p>
                </div>

                {/* Ring + status summary */}
                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 mb-4">
                  {/* Activity ring */}
                  <div className="relative flex-shrink-0">
                    <svg
                      width={ringSize}
                      height={ringSize}
                      className="transform -rotate-90"
                    >
                      <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={r}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={sw}
                      />
                      <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={r}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth={sw}
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={dashOff}
                        style={{
                          transition: 'stroke-dashoffset 1.5s ease-out',
                          filter: `drop-shadow(0 0 10px ${ringColor}50)`,
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl md:text-3xl font-bold text-white">
                        {activityPct}%
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {locale === 'ne' ? 'सक्रिय' : 'active'}
                      </span>
                    </div>
                  </div>

                  {/* Right side: interpreted status + progress bar */}
                  <div className="flex-1 w-full min-w-0 text-center sm:text-left">
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-sm text-gray-300">
                          <span className="font-semibold text-emerald-400">
                            {inProgressCount}
                          </span>
                          <span className="text-gray-500">
                            {' '}
                            {locale === 'ne'
                              ? 'अगाडि बढ्दै'
                              : 'moving forward'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-sm text-gray-300">
                          <span className="font-semibold text-red-400">
                            {stalledCount}
                          </span>
                          <span className="text-gray-500">
                            {' '}
                            {locale === 'ne'
                              ? 'रोकिएको — कारवाही चाहिन्छ'
                              : 'stuck — need attention'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-sm text-gray-300">
                          <span className="font-semibold text-amber-400">
                            {stats?.notStarted ?? 0}
                          </span>
                          <span className="text-gray-500">
                            {' '}
                            {locale === 'ne'
                              ? 'सुरु भएको छैन'
                              : 'not started yet'}
                          </span>
                        </span>
                      </div>
                      {deliveredCount > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-sm text-gray-300">
                            <span className="font-semibold text-blue-400">
                              {deliveredCount}
                            </span>
                            <span className="text-gray-500">
                              {' '}
                              {locale === 'ne' ? 'पूरा भयो' : 'delivered'}
                            </span>
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
                        <span className="text-xs font-medium text-gray-400 tabular-nums">
                          {avgProg}%
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-600">
                        {locale === 'ne'
                          ? 'समग्र औसत प्रगति'
                          : 'overall average progress'}
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
                const chipColor =
                  cat.score >= 40
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : cat.score >= 20
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20';
                return (
                  <span
                    key={cat.category}
                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${chipColor}`}
                  >
                    {locale === 'ne' ? cat.categoryNe : cat.category}:{' '}
                    {cat.score}
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
            <span>
              {locale === 'ne' ? '८०+ स्रोत' : '80+ sources'}
            </span>
            <span className="text-gray-700">&middot;</span>
            <span className="inline-flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {t('home.live')}
            </span>
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
                  shareOrCopy({
                    title: 'Nepal Republic',
                    text,
                    url: window.location.origin,
                  });
                }}
                className="inline-flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Share className="w-3 h-3" />
                {showLetterGrade
                  ? t('home.shareScore')
                  : t('home.shareSnapshot')}
              </button>
              <span className="text-gray-700 mx-1">&middot;</span>
              <Link
                href="/how-we-score"
                className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors"
              >
                {t('home.howWeScore')} &rarr;
              </Link>
            </div>
          )}

          {/* Score disclaimer asterisk */}
          {nowMs && ghantiScore && (
            <p className="text-center text-[9px] text-gray-600 mb-2 md:mb-3">
              <span className="group relative inline-flex items-center gap-0.5 cursor-help">
                *{' '}
                {showLetterGrade
                  ? t('home.scoreDisclaimer')
                  : t('home.baselineDisclaimer')}
                <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2 rounded-lg bg-gray-800 border border-white/10 text-[10px] text-gray-300 leading-relaxed shadow-xl z-50">
                  {showLetterGrade
                    ? t('home.scoreDisclaimerFull')
                    : t('home.baselineDisclaimerFull')}
                </span>
              </span>
            </p>
          )}

          {/* This week activity line — desktop only */}
          {!statsLoading && (
            <div className="hidden md:block text-sm text-gray-400 mb-3 text-left">
              <span className="text-gray-500 font-medium">
                {t('home.thisWeek')}
              </span>{' '}
              {weekActivity.movedForward > 0 && (
                <span className="text-emerald-400">
                  {t('home.movedUp').replace(
                    '{count}',
                    String(weekActivity.movedForward),
                  )}
                </span>
              )}
              {weekActivity.movedForward > 0 &&
                weekActivity.stalledCount > 0 && (
                  <span className="text-gray-600"> &middot; </span>
                )}
              {weekActivity.stalledCount > 0 && (
                <span className="text-red-400">
                  {t('home.stalledDown').replace(
                    '{count}',
                    String(weekActivity.stalledCount),
                  )}
                </span>
              )}
              {weekActivity.movedForward === 0 &&
                weekActivity.stalledCount === 0 && (
                  <span className="text-gray-500">
                    {t('home.noStatusChanges')}
                  </span>
                )}
            </div>
          )}

          {/* Top movers — desktop only */}
          {topMovers.length > 0 && (
            <div className="hidden md:block text-sm text-gray-400 mb-3 text-left">
              <span className="text-base leading-none">
                {'\uD83D\uDD25'}
              </span>{' '}
              {topMovers.map((m, i) => (
                <span key={i}>
                  {i > 0 && (
                    <span className="text-gray-600"> &middot; </span>
                  )}
                  <span className="text-gray-300">
                    {m.title.length > 30
                      ? m.title.slice(0, 30) + '...'
                      : m.title}
                  </span>
                  {m.progress > 0 && (
                    <span className="text-emerald-400 ml-1">
                      {'\u2191'}
                      {m.progress}%
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Contradictions warning */}
          {contradictionCount > 0 && (
            <div className="flex items-center gap-2 text-xs md:text-sm text-amber-400/90 mb-2 md:mb-4 justify-center md:justify-start">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {contradictionCount !== 1
                  ? t('home.contradictionsPlural').replace(
                      '{count}',
                      String(contradictionCount),
                    )
                  : t('home.contradictions').replace(
                      '{count}',
                      String(contradictionCount),
                    )}
              </span>
            </div>
          )}

          {/* Daily brief divider + Story Cards */}
          <div className="border-t border-white/[0.06] pt-2 md:pt-4 mb-2 md:mb-4">
            {briefLoading ? (
              <div className="flex items-center gap-2.5 text-xs md:text-sm text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                <span>
                  {t('home.scanning').replace(
                    '{count}',
                    String(sourceCount),
                  )}
                </span>
              </div>
            ) : brief ? (
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-2 md:mb-3">
                  <span>{'\uD83D\uDCCB'}</span>
                  {t('home.todaysBrief')}
                </div>

                {/* Audio players — EN and NE side by side on same row */}
                {brief.audioUrl && <BriefAudioRow
                  baseAudioUrl={brief.audioUrl}
                  durationSeconds={brief.audioDurationSeconds || undefined}
                  storyCount={brief.topStories?.length || 0}
                  onStoryHighlight={setAudioHighlightIdx}
                />}

                {/* Unified daily brief — single cohesive card */}
                <UnifiedDailyBrief
                  brief={brief}
                  highlights={brief.readerHighlights ?? []}
                  locale={locale}
                  isMobile={isMobile}
                />
              </div>
            ) : (
              <div className="text-xs md:text-sm text-gray-500 py-2">
                {locale === 'ne' ? 'आजको ब्रिफ तयार हुँदैछ...' : "Today's brief is being prepared..."}
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
  );
}
