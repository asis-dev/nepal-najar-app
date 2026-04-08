'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Loader2, AlertTriangle, Play, Pause } from 'lucide-react';
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
import { computeGhantiScore, GRADE_COLORS, shouldShowGrade } from '@/lib/data/ghanti-score';
import { scorecardShareText } from '@/lib/utils/share';
import { ShareMenu } from '@/components/public/share-menu';
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
function BriefAudioRow({ baseAudioUrl, durationSeconds, storyCount, onStoryHighlight, signalCount, sourceCount }: {
  baseAudioUrl: string;
  durationSeconds?: number;
  storyCount: number;
  onStoryHighlight: (index: number) => void;
  signalCount?: number;
  sourceCount?: number;
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
    <div className="mb-1.5">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[10px] font-medium text-gray-500">
          Listen to the daily brief
        </span>
        <span className="text-[10px] text-gray-600 tabular-nums">
          {signalCount ? `${signalCount} signals` : ''}{signalCount && sourceCount ? ' · ' : ''}{sourceCount ? `${sourceCount} sources` : ''}
        </span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <DailyBriefPlayer
            audioUrl={enUrl}
            durationSeconds={durationSeconds}
            storyCount={storyCount}
            onStoryHighlight={onStoryHighlight}
            hideHeader
            inlineLabel="EN"
            inlineLabelColor="text-cyan-400"
          />
        </div>
        <div className="flex-1 min-w-0">
          <DailyBriefPlayer
            audioUrl={neUrl}
            durationSeconds={durationSeconds}
            storyCount={storyCount}
            onStoryHighlight={onStoryHighlight}
            hideHeader
            inlineLabel="ने"
            inlineLabelColor="text-amber-400"
          />
        </div>
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

  /* ── Scan stats (today's count) ── */
  const [scannedToday, setScannedToday] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/scan-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setScannedToday(d.signalsToday ?? null))
      .catch(() => {});
  }, []);

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
        <div className="mb-3 md:mb-6 text-center">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
            {locale === 'ne'
              ? t('home.heroTitle')
              : 'Report civic issues. Track promises. Verify truth.'}
          </h1>
          <p className="mt-1.5 text-[13px] text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {locale === 'ne'
              ? t('brand.heroSubheadline')
              : 'From street problems to national promises, one AI-powered, evidence-backed accountability platform.'}
          </p>

          {/* Stats strip */}
          {nowMs && (
            <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-semibold text-gray-300">
                {isPreInauguration
                  ? t('home.preLaunchCountdown').replace('{count}', String(daysUntilInauguration))
                  : `${locale === 'ne' ? 'दिन' : 'Day'} ${dayInTerm}`}
              </span>
              {ghantiScore && shouldShowGrade(ghantiScore.phase) && showLetterGrade && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${GRADE_COLORS[ghantiScore.grade].bg} ${GRADE_COLORS[ghantiScore.grade].text}`}>
                  {ghantiScore.grade}
                </span>
              )}
              {contradictionCount > 0 && (
                <Link
                  href="/what-changed?tab=contradictions"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {contradictionCount} {locale === 'ne' ? 'विवाद' : 'disputes'}
                </Link>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] text-cyan-400/80 font-medium">
                {(sourceCount / 1000).toFixed(1)}K {locale === 'ne' ? 'स्क्यान' : 'scanned'}
              </span>
              {scannedToday != null && scannedToday > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                  {scannedToday} {locale === 'ne' ? 'आज निकालिएको' : 'extracted today'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Listen about app + Report Civic Issue — single row ── */}
        <div className="mb-3 md:mb-5 flex items-center gap-2">
          <button
            className="flex flex-1 basis-1/2 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-600/15 px-2.5 py-2.5 text-[12px] font-bold text-red-100 transition-colors hover:bg-red-600/25"
            onClick={() => {
              const lang = locale === 'ne' ? 'ne' : 'en';
              if (playingAboutLang === lang) {
                aboutAudioRef.current?.pause();
                setPlayingAboutLang(null);
                return;
              }
              if (aboutAudioRef.current) aboutAudioRef.current.pause();
              aboutAudioRef.current = new Audio(`/audio/about-${lang}.mp3`);
              aboutAudioRef.current.addEventListener('ended', () => setPlayingAboutLang(null));
              aboutAudioRef.current.play().catch(() => {});
              setPlayingAboutLang(lang);
            }}
          >
            {playingAboutLang
              ? <Pause className="h-4 w-4" />
              : <Play className="h-4 w-4 fill-current" />}
            {playingAboutLang
              ? (locale === 'ne' ? 'बजाउँदै…' : 'Playing…')
              : (locale === 'ne' ? 'एप बारे सुन्नुहोस्' : 'About this app')}
          </button>
          <Link
            href="/complaints"
            className="flex flex-1 basis-1/2 items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/15 px-2.5 py-2.5 text-[12px] font-bold text-amber-100 transition-colors hover:bg-amber-500/25"
          >
            <AlertTriangle className="h-4 w-4" />
            {locale === 'ne' ? 'नागरिक समस्या दर्ता' : 'Report Civic Issue'}
          </Link>
        </div>

        {/* ── Scorecard Strip — compact ring + stats ── */}
        {(() => {
          const total = stats?.total ?? 109;
          const active = (stats?.inProgress ?? 0) + (stats?.stalled ?? 0) + (stats?.delivered ?? 0);
          const activityPct = total > 0 ? Math.round((active / total) * 100) : 0;
          const avgProg = stats?.avgProgress ?? 0;
          const stalledCount = stats?.stalled ?? 0;
          const inProgressCount = stats?.inProgress ?? 0;
          const deliveredCount = stats?.delivered ?? 0;
          const ringSize = isMobile ? 80 : 120;
          const sw = isMobile ? 6 : 8;
          const r = (ringSize - sw) / 2;
          const circ = 2 * Math.PI * r;
          const prog = (activityPct / 100) * circ;
          const dashOff = circ - prog;
          const ringColor = activityPct >= 70 ? '#10b981' : activityPct >= 40 ? '#06b6d4' : '#f59e0b';

          return (
            <div
              className="relative rounded-2xl border border-white/[0.08] p-3 sm:p-5 mb-3"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}
            >
              {/* Share icon — top right */}
              {nowMs && ghantiScore && (
                <div className="absolute top-2.5 right-2.5 z-10">
                  <ShareMenu
                    shareUrl="/"
                    shareText={scorecardShareText({ grade: shouldShowGrade(ghantiScore.phase) ? ghantiScore.grade : undefined, score: ghantiScore.score, locale, dayInTerm: ghantiScore.dayInTerm })}
                    shareTitle="Nepal Republic"
                    ogParams={{
                      ogType: 'report-card',
                      ogTitle: locale === 'ne' ? 'नेपाल रिपब्लिक' : 'Nepal Republic',
                      ogSection: 'dashboard',
                      ogLocale: locale,
                    }}
                    size="sm"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 sm:gap-5">
                {/* Compact ring */}
                <div className="relative flex-shrink-0">
                  <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                    <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
                    <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke={ringColor} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOff}
                      style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 8px ${ringColor}50)` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg md:text-2xl font-bold text-white">{activityPct}%</span>
                    <span className="text-[8px] text-gray-500">{locale === 'ne' ? 'सक्रिय' : 'active'}</span>
                  </div>
                </div>

                {/* Right side: inline status counts + progress */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs"><span className="font-semibold text-emerald-400">{inProgressCount}</span> <span className="text-gray-500">{locale === 'ne' ? 'अगाडि' : 'moving'}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-xs"><span className="font-semibold text-red-400">{stalledCount}</span> <span className="text-gray-500">{locale === 'ne' ? 'रोकिएको' : 'stuck'}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-xs"><span className="font-semibold text-amber-400">{stats?.notStarted ?? 0}</span> <span className="text-gray-500">{locale === 'ne' ? 'सुरु नभएको' : 'waiting'}</span></span>
                    </div>
                    {deliveredCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-xs"><span className="font-semibold text-blue-400">{deliveredCount}</span> <span className="text-gray-500">{locale === 'ne' ? 'पूरा' : 'done'}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-1000" style={{ width: `${avgProg}%` }} />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 tabular-nums">{avgProg}%</span>
                  </div>
                </div>
              </div>

              {/* Worst categories row */}
              <div className="mt-2.5 flex flex-wrap gap-1">
                {nowMs && showLetterGrade && worstCategories.slice(0, 3).map((cat) => {
                  const chipColor = cat.score >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : cat.score >= 20 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20';
                  return (
                    <span key={cat.category} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${chipColor}`}>
                      {locale === 'ne' ? cat.categoryNe : cat.category}: {cat.score}
                    </span>
                  );
                })}
              </div>

              {/* Pulse bar — inline */}
              <div className="mt-1.5">
                <PulseBar score={pulse} />
              </div>
            </div>
          );
        })()}

        {/* ── Daily Brief ── */}
        {brief && !briefLoading && (
          <div className="mb-3">
            {brief.audioUrl && (
              <BriefAudioRow
                baseAudioUrl={brief.audioUrl}
                durationSeconds={brief.audioDurationSeconds ?? undefined}
                storyCount={brief.topStories?.length ?? 0}
                onStoryHighlight={setAudioHighlightIdx}
                signalCount={brief.stats?.totalSignals24h}
                sourceCount={brief.stats?.sourcesActive}
              />
            )}
            <UnifiedDailyBrief
              brief={brief}
              highlights={brief.readerHighlights ?? []}
              locale={locale}
              isMobile={!!isMobile}
              weekMoved={weekActivity.movedForward}
              weekStalled={weekActivity.stalledCount}
            />
          </div>
        )}


      </div>
    </section>
  );
}
