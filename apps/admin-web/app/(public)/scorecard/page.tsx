'use client';

import { useState, useMemo } from 'react';
import { Award, Search, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useGovernmentBodies } from '@/lib/hooks/use-government-bodies';
import {
  sortBodies,
  BODY_TYPE_LABELS,
  MIN_COMMITMENTS_DEFAULT,
  type BodySortOption,
  type GovernmentBodyType,
} from '@/lib/data/government-bodies';
import { GRADE_COLORS } from '@/lib/data/ghanti-score';
import { PublicPageHero } from '@/components/public/page-hero';
import { BodyCard } from '@/components/public/scorecard/body-card';

/* ═══════════════════════════════════════════════
   GOVERNMENT BODIES SCORECARD
   ═══════════════════════════════════════════════ */

const SORT_OPTIONS: { value: BodySortOption; labelKey: string }[] = [
  { value: 'worst', labelKey: 'scorecard.sortWorst' },
  { value: 'best', labelKey: 'scorecard.sortBest' },
  { value: 'most', labelKey: 'scorecard.sortMost' },
  { value: 'alpha', labelKey: 'scorecard.sortAlpha' },
];

const TYPE_FILTERS: { value: GovernmentBodyType | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'scorecard.filterAll' },
  { value: 'ministry', labelKey: 'scorecard.filterMinistries' },
  { value: 'autonomous', labelKey: 'scorecard.filterConstitutional' },
  { value: 'judiciary', labelKey: 'scorecard.filterJudiciary' },
];

export default function ScorecardPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const [sort, setSort] = useState<BodySortOption>('worst');
  const [typeFilter, setTypeFilter] = useState<GovernmentBodyType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const { bodies: rawBodies, isLoading } = useGovernmentBodies(sort);

  const bodies = useMemo(() => {
    let filtered = rawBodies;
    if (typeFilter !== 'all') {
      filtered = filtered.filter((b) => b.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.nameNe.includes(q) ||
          b.includes.some((s) => s.toLowerCase().includes(q)),
      );
    }
    // When not searching/filtering by type, apply minimum-commitment threshold
    if (!showAll && typeFilter === 'all' && !search.trim()) {
      filtered = filtered.filter((b) => b.commitmentCount >= MIN_COMMITMENTS_DEFAULT);
    }
    return sortBodies(filtered, sort);
  }, [rawBodies, typeFilter, search, sort, showAll]);

  const hiddenCount = rawBodies.length - rawBodies.filter((b) => b.commitmentCount >= MIN_COMMITMENTS_DEFAULT).length;

  // Summary stats
  const totalBodies = rawBodies.length;
  const avgScore =
    rawBodies.length > 0
      ? Math.round(rawBodies.reduce((s, b) => s + b.score.score, 0) / rawBodies.length)
      : 0;
  const worstBody = rawBodies.length > 0
    ? [...rawBodies].sort((a, b) => a.score.score - b.score.score)[0]
    : null;

  return (
    <>
      <PublicPageHero
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            {t('scorecard.eyebrow')}
          </span>
        }
        title={t('scorecard.title')}
        description={t('scorecard.description')}
        stats={
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <StatBox
              label={t('scorecard.bodies')}
              value={String(totalBodies)}
            />
            <StatBox
              label={t('scorecard.avgScore')}
              value={`${avgScore}/100`}
            />
            {worstBody && (
              <StatBox
                label={t('scorecard.needsAttention')}
                value={isNe ? worstBody.nameNe.split(' ').slice(0, 2).join(' ') : worstBody.name.split(' ').slice(0, 3).join(' ')}
                highlight
              />
            )}
          </div>
        }
      />

      <section className="public-section">
        <div className="public-shell">
          {/* ── Filters Row ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            {/* Type pills */}
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTypeFilter(tf.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    typeFilter === tf.value
                      ? 'bg-white/10 text-white'
                      : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
                  }`}
                >
                  {t(tf.labelKey)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('scorecard.searchPlaceholder')}
                  className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.06] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-white/[0.12] w-40"
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as BodySortOption)}
                  className="pl-8 pr-6 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.06] text-gray-300 focus:outline-none focus:border-white/[0.12] appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Loading ── */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="h-4 bg-white/[0.04] rounded w-16 mb-3" />
                  <div className="h-5 bg-white/[0.04] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/2 mb-3" />
                  <div className="h-1.5 bg-white/[0.04] rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* ── Body Cards Grid ── */}
          {!isLoading && (
            <>
              {bodies.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  {t('scorecard.noResults')}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {bodies.map((body) => (
                      <BodyCard key={body.slug} body={body} />
                    ))}
                  </div>
                  {/* Show all button — only when filtering by minimum commitment count */}
                  {!showAll && hiddenCount > 0 && typeFilter === 'all' && !search.trim() && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="mt-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs font-medium text-gray-400 hover:bg-white/[0.06] hover:text-gray-300 transition-colors"
                    >
                      {t('scorecard.showSmallerBodies').replace('{count}', String(hiddenCount)).replace('{min}', String(MIN_COMMITMENTS_DEFAULT))}
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Methodology ── */}
          <details className="mt-8 glass-card">
            <summary className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
              {t('scorecard.howWeScore')}
            </summary>
            <div className="px-4 pb-4 text-xs text-gray-600 space-y-2">
              <p>
                {t('scorecard.scoringIntro')}
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('scorecard.scoringDelivery')}</li>
                <li>{t('scorecard.scoringProgress')}</li>
                <li>{t('scorecard.scoringTrust')}</li>
                <li>{t('scorecard.scoringBudget')}</li>
                <li>{t('scorecard.scoringSentiment')}</li>
              </ul>
              <p className="text-gray-700">
                {t('scorecard.scoringShared')}
              </p>
            </div>
          </details>
        </div>
      </section>
    </>
  );
}

/* ── Stat Box ── */
function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border ${
        highlight
          ? 'bg-red-500/5 border-red-500/15'
          : 'bg-white/[0.02] border-white/[0.06]'
      }`}
    >
      <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">{label}</div>
      <div
        className={`text-sm font-semibold ${highlight ? 'text-red-400' : 'text-gray-200'} truncate max-w-[140px]`}
      >
        {value}
      </div>
    </div>
  );
}
