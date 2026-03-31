'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Loader2, Shield, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAllPromises } from '@/lib/hooks/use-promises';
import { useTrending } from '@/lib/hooks/use-trending';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { useWatchlistStore, usePreferencesStore, useUserPreferencesStore } from '@/lib/stores/preferences';
import { useAuth } from '@/lib/hooks/use-auth';
import { isPublicCommitment } from '@/lib/data/commitments';
import { getPromiseRelevance } from '@/lib/utils/geo-relevance';
import { resolveCategories } from '@/components/public/interest-filter';
import { useCorruptionCases, useCorruptionStats } from '@/lib/hooks/use-corruption';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  formatAmountNpr,
  formatNprWithUsd,
} from '@/lib/data/corruption-types';
import type { FeedTab } from '@/lib/data/landing-types';
import {
  FEED_TAB_STORAGE_KEY,
  LAST_FOLLOWING_VISIT_KEY,
  INITIAL_FEED_COUNT,
  TRUST_SCORE,
} from '@/lib/data/landing-types';
import type { GovernmentPromise } from '@/lib/data/promises';

import { useCommentCounts } from '@/lib/hooks/use-comment-counts';
import { FeedTabBar } from './feed-tab-bar';
import { FeedCommitmentCard } from './feed-commitment-card';
import { StaleRow } from './stale-row';
import { FollowingEmptyState, TrendingEmptyState } from './empty-states';

/* ═══════════════════════════════════════════
   FeedIsland — client component owning the
   Feed section + Stale commitments section
   ═══════════════════════════════════════════ */

export function FeedIsland() {
  const { locale, t } = useI18n();
  const isMobile = useIsMobile();
  const { data: allPromises, isLoading: promisesLoading } = useAllPromises({ publicOnly: true });
  const { trending, trendingIds } = useTrending(12);
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

  /* ── Comment counts for visible commitments ── */
  const allVisibleIds = useMemo(() => {
    const items = feedTab === 'for-you'
      ? filteredForYouActive
      : feedTab === 'following'
        ? followingFeed
        : feedTab === 'trending'
          ? trendingFeed
          : [];
    return items.slice(0, feedCount).map((c) => c.id);
  }, [feedTab, filteredForYouActive, followingFeed, trendingFeed, feedCount]);
  const commentCounts = useCommentCounts(allVisibleIds);

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

  return (
    <>
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
            /* ── Corruption Tab Content ── */
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
                      <div className="text-[9px] text-gray-500 uppercase">{'\u2248'} {formatNprWithUsd(corruptionStats.totalAmountNpr).usd}</div>
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
                      <span className="text-[10px] text-gray-500">({'\u2248'} {formatNprWithUsd(c.estimated_amount_npr).usd})</span>
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
            /* ── For You / Following / Trending feed cards ── */
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
                      commentCount={commentCounts[commitment.id] || 0}
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
    </>
  );
}
