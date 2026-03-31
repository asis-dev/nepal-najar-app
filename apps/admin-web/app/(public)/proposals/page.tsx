'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  Filter,
  TrendingUp,
  Clock,
  ThumbsUp,
  ChevronDown,
  Loader2,
  Search,
  Inbox,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  useProposals,
  type ProposalFilters,
  type ProposalCategory,
  type ProposalStatus,
} from '@/lib/hooks/use-proposals';
import { ProposalCard } from '@/components/public/proposal-card';
import { NEPAL_PROVINCES } from '@/lib/stores/preferences';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const STATUS_TABS: { key: ProposalFilters['status']; labelKey: string }[] = [
  { key: 'all', labelKey: 'proposals.filters.all' },
  { key: 'open', labelKey: 'proposals.filters.open' },
  { key: 'trending', labelKey: 'proposals.filters.trending' },
  { key: 'accepted', labelKey: 'proposals.filters.accepted' },
];

const SORT_OPTIONS: { key: NonNullable<ProposalFilters['sort']>; labelKey: string; icon: React.ElementType }[] = [
  { key: 'trending', labelKey: 'proposals.sort.trending', icon: TrendingUp },
  { key: 'newest', labelKey: 'proposals.sort.newest', icon: Clock },
  { key: 'top_voted', labelKey: 'proposals.sort.topVoted', icon: ThumbsUp },
];

const CATEGORIES: ProposalCategory[] = [
  'infrastructure', 'health', 'education', 'environment', 'transport',
  'technology', 'water_sanitation', 'agriculture', 'tourism', 'governance',
  'social', 'energy', 'other',
];

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function ProposalsBrowsePage() {
  const { t, locale } = useI18n();
  const { isAuthenticated } = useAuth();
  const isNe = locale === 'ne';

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ProposalFilters['status']>('all');
  const [categoryFilter, setCategoryFilter] = useState<ProposalCategory | 'all'>('all');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [sortBy, setSortBy] = useState<ProposalFilters['sort']>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filters: ProposalFilters = useMemo(
    () => ({
      status: statusFilter,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      province: provinceFilter || undefined,
      sort: sortBy,
      search: searchQuery || undefined,
    }),
    [statusFilter, categoryFilter, provinceFilter, sortBy, searchQuery],
  );

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useProposals(filters);

  const allProposals = useMemo(
    () => data?.pages.flatMap((page) => page.proposals) ?? [],
    [data],
  );

  return (
    <div className="public-page">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-primary-500/[0.045] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <section className="public-section pb-0">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-4">
                <Megaphone className="w-3.5 h-3.5" />
                {t('proposals.eyebrow')}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                {t('proposals.pageTitle')}
              </h1>
              <p className="text-gray-400 text-sm sm:text-base mt-2 max-w-lg mx-auto">
                {t('proposals.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Search + filters */}
        <section className="public-section pt-6 pb-0">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('proposals.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-all"
                />
              </div>

              {/* Status tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {STATUS_TABS.map(({ key, labelKey }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      statusFilter === key
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-200'
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                ))}

                {/* Filters toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${
                    showFilters
                      ? 'bg-white/[0.07] text-white border border-white/[0.14]'
                      : 'text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {t('proposals.filters.filters')}
                </button>
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Province */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {t('proposals.form.province')}
                    </label>
                    <div className="relative">
                      <select
                        value={provinceFilter}
                        onChange={(e) => setProvinceFilter(e.target.value)}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/40"
                      >
                        <option value="">{t('proposals.filters.allProvinces')}</option>
                        {NEPAL_PROVINCES.map((p) => (
                          <option key={p.name} value={p.name}>
                            {isNe ? p.name_ne : p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {t('proposals.form.category')}
                    </label>
                    <div className="relative">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as ProposalCategory | 'all')}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/40"
                      >
                        <option value="all">{t('proposals.filters.allCategories')}</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {t(`proposals.categories.${cat}`)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {t('proposals.sort.label')}
                    </label>
                    <div className="flex gap-1">
                      {SORT_OPTIONS.map(({ key, labelKey, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setSortBy(key)}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                            sortBy === key
                              ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                              : 'text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {t(labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Proposal list */}
        <section className="public-section">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="glass-card p-5 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-8 space-y-2">
                          <div className="h-5 w-5 bg-white/5 rounded mx-auto" />
                          <div className="h-4 w-6 bg-white/5 rounded mx-auto" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-white/5 rounded w-3/4" />
                          <div className="h-3 bg-white/5 rounded w-1/2" />
                          <div className="h-3 bg-white/5 rounded w-1/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : allProposals.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {allProposals.map((proposal) => (
                      <ProposalCard key={proposal.id} proposal={proposal} />
                    ))}
                  </div>

                  {/* Load more */}
                  {hasNextPage && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all disabled:opacity-50"
                      >
                        {isFetchingNextPage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        {t('proposals.loadMore')}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Empty state */
                <div className="glass-card p-12 sm:p-16 text-center">
                  <Inbox className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-300 mb-2">
                    {t('proposals.empty.title')}
                  </h2>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                    {t('proposals.empty.description')}
                  </p>
                  {isAuthenticated && (
                    <Link
                      href="/proposals/create"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      {t('proposals.createProposal')}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAB */}
        <div className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-40">
          <Link
            href={isAuthenticated ? '/proposals/create' : '/login'}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 shadow-[0_4px_20px_rgba(59,130,246,0.4)] transition-all duration-200 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            {t('proposals.propose')}
          </Link>
        </div>

        {/* Footer accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
