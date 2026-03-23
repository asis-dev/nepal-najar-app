'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Eye,
  Landmark,
  Map as MapIcon,
  MapPinned,
    Newspaper,
    ScanSearch,
    ShieldCheck,
  } from 'lucide-react';
import { Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { TrustLanes } from '@/components/public/trust-lanes';
import { TrendingStrip } from '@/components/public/trending-strip';
import { MeroWardCard } from '@/components/public/mero-ward-card';
import { LeaderboardWidget } from '@/components/public/leaderboard-widget';
import { AffectsMePrompt } from '@/components/public/affects-me-prompt';
import { usePreferencesStore, useWatchlistStore } from '@/lib/stores/preferences';
import {
    useArticleCount,
    useLatestArticles,
    usePromiseStats,
    useDailyActivity,
  } from '@/lib/hooks/use-promises';

const NepalGlobe = dynamic(
  () => import('@/components/globe/nepal-globe').then((m) => ({ default: m.NepalGlobe })),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-np-void" />,
  },
);

const MapFallback = dynamic(
  () => import('@/components/map/map-fallback').then((m) => ({ default: m.MapFallback })),
  {
    ssr: false,
    loading: () => <div className="h-full w-full rounded-[1.75rem] bg-white/[0.03]" />,
  },
);

type ProvinceOverview = {
  name: string;
  label: string;
  total: number;
  delayed: number;
  progress: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  focus: string[];
};

const provinceOverview: ProvinceOverview[] = [
  {
    name: 'Koshi Province',
    label: 'Koshi',
    total: 31,
    delayed: 4,
    progress: 56,
    severity: 'medium',
    summary: 'Roads, hydropower, and district-level health upgrades are the strongest visible workstreams.',
    focus: ['Transport', 'Energy', 'Health'],
  },
  {
    name: 'Madhesh Province',
    label: 'Madhesh',
    total: 28,
    delayed: 7,
    progress: 44,
    severity: 'high',
    summary: 'Border connectivity, local services, and governance delivery remain the key public pressure points.',
    focus: ['Transport', 'Social', 'Governance'],
  },
  {
    name: 'Bagmati Province',
    label: 'Bagmati',
    total: 42,
    delayed: 6,
    progress: 63,
    severity: 'medium',
    summary: 'Kathmandu valley reforms, digital governance, and anti-corruption commitments are driving the most attention.',
    focus: ['Technology', 'Governance', 'Anti-Corruption'],
  },
  {
    name: 'Gandaki Province',
    label: 'Gandaki',
    total: 24,
    delayed: 3,
    progress: 58,
    severity: 'low',
    summary: 'Tourism-linked infrastructure, local roads, and environmental resilience projects are advancing steadily.',
    focus: ['Environment', 'Infrastructure', 'Transport'],
  },
  {
    name: 'Lumbini Province',
    label: 'Lumbini',
    total: 29,
    delayed: 5,
    progress: 49,
    severity: 'medium',
    summary: 'Education, logistics, and industrial growth commitments are highly watched across the province.',
    focus: ['Education', 'Economy', 'Transport'],
  },
  {
    name: 'Karnali Province',
    label: 'Karnali',
    total: 18,
    delayed: 5,
    progress: 37,
    severity: 'high',
    summary: 'Basic infrastructure and service delivery remain the biggest test for visible progress in Karnali.',
    focus: ['Infrastructure', 'Health', 'Energy'],
  },
  {
    name: 'Sudurpashchim Province',
    label: 'Sudurpashchim',
    total: 20,
    delayed: 6,
    progress: 34,
    severity: 'critical',
    summary: 'Transport gaps and slower follow-through are keeping this province under closer public scrutiny.',
    focus: ['Transport', 'Infrastructure', 'Social'],
  },
];

function LandingStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-card px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const setShowPicker = usePreferencesStore((s) => s.setShowPicker);
  const province = usePreferencesStore((s) => s.province);
  const watchedProjectIds = useWatchlistStore((s) => s.watchedProjectIds);
  const { stats, isLoading: statsLoading } = usePromiseStats();
  const { data: latestArticles, isLoading: articlesLoading } = useLatestArticles(3);
  const { data: articleCount } = useArticleCount();
  const { data: dailyActivity } = useDailyActivity();
  const [selectedProvince, setSelectedProvince] = useState<string>('Bagmati Province');

  const selectedProvinceData = useMemo(
    () => provinceOverview.find((province) => province.name === selectedProvince) ?? provinceOverview[2],
    [selectedProvince],
  );
  const dailySpotlight = dailyActivity?.activePromises?.[0];
  const commitmentCount = statsLoading ? '--' : stats?.total ?? 0;

  const activityCards = [
    {
      title: 'Explore commitments',
      description: 'Browse live public commitments, linked evidence, and tracked movement across sectors.',
      href: '/explore/first-100-days',
      icon: ScanSearch,
      metric: statsLoading ? '--' : `${stats?.total ?? 0} live`,
    },
    {
      title: 'Who owns delivery',
      description: 'See which ministry, department, or office is responsible for moving work forward.',
      href: '/explore/government',
      icon: Landmark,
      metric: 'Public accountability',
    },
    {
      title: 'Report card',
      description: 'See what is working, what is stuck, and what the public is signaling most strongly this week.',
      href: '/report-card',
      icon: ShieldCheck,
      metric: 'Weekly score',
    },
  ];

  const severityTone = {
    low: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/25',
    medium: 'text-amber-300 bg-amber-500/12 border-amber-500/25',
    high: 'text-orange-300 bg-orange-500/12 border-orange-500/25',
    critical: 'text-red-300 bg-red-500/12 border-red-500/25',
  }[selectedProvinceData.severity];

  const returnCards = [
    {
      title: 'Come back for daily movement',
      body: `${dailyActivity?.summary.activeCount ?? 0} commitments moved today. The daily feed turns the tracker into a habit instead of a one-time browse.`,
      href: '/daily',
      icon: Newspaper,
      cta: 'Open daily',
    },
    {
      title: watchedProjectIds.length > 0 ? 'Your watchlist is already live' : 'Build your own watchlist',
      body: watchedProjectIds.length > 0
        ? `${watchedProjectIds.length} commitments are already saved. Follow them so the next return feels personal.`
        : 'Save the commitments you care about and Nepal Najar starts feeling like your own civic dashboard.',
      href: '/watchlist',
      icon: Eye,
      cta: 'Open watchlist',
    },
    {
      title: province ? `${province} can be your entry point` : 'Make it local',
      body: province
        ? 'Your saved location can anchor the national tracker in something closer to home.'
        : 'Set your area, then use the local lens and notifications to keep the product tied to your geography.',
      href: province ? '/affects-me' : '/notifications',
      icon: Bell,
      cta: province ? 'Open affects me' : 'Open notifications',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-np-void">
      <div className="absolute inset-0 z-0 nepal-hero-grid" />
      <div className="mountain-ridge opacity-75" />
      <div className="mountain-ridge-soft opacity-80" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-full max-w-5xl opacity-12 lg:block">
        <NepalGlobe />
      </div>

      <div className="relative z-10">
        <section className="public-section pt-14 sm:pt-16 lg:pt-20">
          <div className="public-shell">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:gap-8">
              <div className="max-w-3xl">
                <div className="section-kicker">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t('landing.tagline')}
                </div>

                <h1 className="mt-5 max-w-4xl text-balance font-sans text-[2.65rem] font-semibold leading-[0.94] tracking-[-0.045em] text-white sm:text-[3.6rem] lg:text-[4.45rem]">
                  The nation&apos;s report card. As Nepal watches.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-gray-200 sm:text-lg">
                  {commitmentCount} public commitments. Tracked daily with source-backed evidence. No spin, no bias, just what moved, what stalled, and what changed today.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/explore/first-100-days"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-400/20 bg-primary-600 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-500"
                  >
                    View live commitments
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/explore/first-100-days?entry=balen"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                  >
                    Campaign: Balen 100 Days
                  </Link>
                  <Link
                    href="/explore/map"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                  >
                    <MapIcon className="h-4 w-4 text-cyan-300" />
                    Explore the map
                  </Link>
                  <button
                    onClick={() => setShowPicker(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                  >
                    <MapPinned className="h-4 w-4 text-cyan-300" />
                    Set my area
                  </button>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <LandingStat
                    label="Commitments live"
                    value={commitmentCount}
                  />
                  <LandingStat
                    label="In progress"
                    value={statsLoading ? '--' : stats?.inProgress ?? 0}
                  />
                  <LandingStat
                    label="Active today"
                    value={dailyActivity?.summary.activeCount ?? 0}
                  />
                </div>
                {/* articles scanned — subtle, bottom-right */}
                <p className="mt-2 text-right text-[10px] text-gray-600">
                  <span className="relative mr-1 inline-flex h-1 w-1"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-500" /></span>
                  {articleCount ?? 0} sources scanned
                </p>
              </div>

              <div className="grid gap-4">
                {/* Balen Hero Image */}
                <div className="relative mx-auto w-full max-w-sm xl:max-w-none">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-primary-500/20 via-transparent to-transparent blur-2xl" />
                  <Image
                    src="/images/balen.JPG"
                    alt="Balen Shah campaign spotlight"
                    width={500}
                    height={500}
                    className="relative rounded-2xl border border-white/10 object-cover shadow-2xl shadow-primary-900/30"
                    loading="lazy"
                    sizes="(max-width: 1280px) 320px, 420px"
                  />
                  <div className="absolute bottom-0 left-0 right-0 rounded-b-2xl bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Campaign spotlight</p>
                    <p className="mt-1 text-sm font-medium text-white">Balen&apos;s first 100 days</p>
                    <div className="mt-2 flex items-center gap-4">
                      <div>
                        <p className="text-2xl font-bold text-white">{statsLoading ? '--' : stats?.delivered ?? 0}</p>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-400">Delivered</p>
                      </div>
                      <div className="h-8 w-px bg-white/20" />
                      <div>
                        <p className="text-2xl font-bold text-white">{statsLoading ? '--' : stats?.inProgress ?? 0}</p>
                        <p className="text-[10px] uppercase tracking-wider text-amber-400">In Progress</p>
                      </div>
                      <div className="h-8 w-px bg-white/20" />
                      <div>
                        <p className="text-2xl font-bold text-white">{statsLoading ? '--' : stats?.stalled ?? 0}</p>
                        <p className="text-[10px] uppercase tracking-wider text-red-400">Stalled</p>
                      </div>
                    </div>
                    <Link
                      href="/explore/first-100-days?entry=balen"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-300 transition-colors hover:text-primary-200"
                    >
                      Open campaign view
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                <MeroWardCard />
              </div>
            </div>
          </div>
        </section>

        {/* Trending Now strip */}
        <section className="px-4 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <TrendingStrip />
          </div>
        </section>

        <section className="public-section pt-2">
          <div className="public-shell">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="glass-card p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                      Regional preview
                      </div>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">
                      Explore a regional preview while location coverage is still maturing
                    </h2>
                  </div>
                  <Link
                    href="/explore/map"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-300 transition-colors hover:text-primary-200"
                  >
                    Open full map
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_270px]">
                  <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                    <div className="h-[360px] w-full">
                      <MapFallback
                        regionData={provinceOverview.map((province) => ({
                          name: province.name,
                          total: province.total,
                          delayed: province.delayed,
                          severity: province.severity,
                          progress: province.progress,
                        }))}
                        selectedProvince={selectedProvince}
                        onProvinceClick={(name: string) => {
                          setSelectedProvince(name);
                          router.push(`/explore/map?province=${encodeURIComponent(name)}`);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Selected province</p>
                          <h3 className="mt-1 text-xl font-semibold text-white">{selectedProvinceData.label}</h3>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${severityTone}`}>
                          {selectedProvinceData.severity} pressure
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Tracked</p>
                          <p className="mt-1 text-xl font-semibold text-white">{selectedProvinceData.total}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Delayed</p>
                          <p className="mt-1 text-xl font-semibold text-white">{selectedProvinceData.delayed}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Progress</p>
                          <p className="mt-1 text-xl font-semibold text-white">{selectedProvinceData.progress}%</p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-gray-400">
                        {selectedProvinceData.summary}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedProvinceData.focus.map((item) => (
                          <Link
                            key={item}
                            href={`/explore/map?province=${encodeURIComponent(selectedProvince)}&category=${encodeURIComponent(item)}`}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-gray-300 hover:bg-white/[0.08] hover:text-white hover:border-primary-500/30 transition-all cursor-pointer"
                          >
                            {item}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Why this matters</p>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        Nepal Najar should let people move from the national view to a province-level question fast. Geographic coverage is still catching up, so treat this as an early regional lens rather than a final map.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Today in Nepal</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">
                      Fresh signals worth checking
                    </h2>
                  </div>
                  <Link
                    href="/daily"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-300 transition-colors hover:text-primary-200"
                  >
                    Daily
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {articlesLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                        <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                        <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/[0.06]" />
                        <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" />
                      </div>
                    ))
                  ) : latestArticles && latestArticles.length > 0 ? (
                    latestArticles.map((article) => (
                      <a
                        key={article.id}
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.05]"
                      >
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gray-500">
                          <Newspaper className="h-3.5 w-3.5 text-cyan-300" />
                          <span className="truncate">{article.source_name}</span>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6 text-gray-100">
                          {article.headline}
                        </p>
                        {article.content_excerpt ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                            {article.content_excerpt}
                          </p>
                        ) : null}
                      </a>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-gray-400">
                        No fresh public signals have been loaded yet. The daily page will show them here once sources start flowing.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section pt-2">
          <div className="public-shell">
            <Link href="/daily" className="block group">
              <div className="glass-card-hover flex items-center gap-5 p-5 sm:p-6">
                <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-primary-500/15 to-cyan-500/15 p-4">
                  <Target className="h-7 w-7 text-primary-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Live activity spotlight
                  </p>
                  <h3 className="mt-1 truncate text-lg font-semibold text-white">
                    {dailySpotlight?.title || 'Check what moved today'}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-gray-400">
                    {dailySpotlight?.topHeadline || 'Follow the freshest reviewed signals across the public tracker.'}
                  </p>
                </div>
                <span className="hidden items-center gap-2 text-sm font-medium text-primary-300 transition-colors group-hover:text-primary-200 sm:inline-flex">
                  Open daily activity
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        </section>

        <section className="public-section pt-4">
          <div className="public-shell">
            <div className="grid gap-4 lg:grid-cols-3">
              {activityCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="glass-card-hover block p-5 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-2xl bg-white/[0.04] p-3">
                        <Icon className="h-5 w-5 text-primary-300" />
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                        {card.metric}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{card.description}</p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary-300">
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="public-section pt-2">
          <div className="public-shell">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Why people come back</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Nepal Najar should feel alive after the first visit</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {returnCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="glass-card-hover block p-5 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-2xl bg-white/[0.04] p-3">
                        <Icon className="h-5 w-5 text-primary-300" />
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                        Return loop
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-400">{card.body}</p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary-300">
                      {card.cta}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* What Affects Me */}
        <section className="public-section pt-2">
          <div className="public-shell">
            <AffectsMePrompt />
          </div>
        </section>

        {/* Most Engaged Areas */}
        <section className="public-section pt-2">
          <div className="public-shell">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Community layer</p>
                <p className="mt-1 text-sm text-gray-400">These engagement views stay visible, but remain secondary while the tracker leads.</p>
              </div>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                Beta
              </span>
            </div>
            <LeaderboardWidget type="areas" limit={5} />
          </div>
        </section>

        <section className="public-section pt-2 pb-14">
          <div className="public-shell">
            <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="glass-card p-6 sm:p-7">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Why people trust this</p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">
                  Four separate signal lanes, not one blurred feed
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-400">
                  Nepal Najar works best when people can tell the difference between what the government officially says, what the internet is uncovering, what citizens are reporting, and what the system is only inferring.
                </p>
              </div>

              <TrustLanes />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
