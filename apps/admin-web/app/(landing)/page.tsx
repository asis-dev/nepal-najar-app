'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Landmark,
  Map as MapIcon,
  MapPinned,
  Newspaper,
  ScanSearch,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { TrustLanes } from '@/components/public/trust-lanes';
import { MeroWardCard } from '@/components/public/mero-ward-card';
import { usePreferencesStore } from '@/lib/stores/preferences';
import {
  useArticleCount,
  useLatestArticles,
  usePromiseStats,
} from '@/lib/hooks/use-promises';

const NepalGlobe = dynamic(
  () => import('@/components/globe/nepal-globe').then((m) => ({ default: m.NepalGlobe })),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-np-void" />,
  },
);

const Nepal3DMap = dynamic(
  () => import('@/components/map/nepal-3d-map').then((m) => ({ default: m.Nepal3DMap })),
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
    summary: 'Education, logistics, and industrial growth promises are highly watched across the province.',
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
  const setShowPicker = usePreferencesStore((s) => s.setShowPicker);
  const { stats, isLoading: statsLoading } = usePromiseStats();
  const { data: latestArticles, isLoading: articlesLoading } = useLatestArticles(3);
  const { data: articleCount } = useArticleCount();
  const [selectedProvince, setSelectedProvince] = useState<string>('Bagmati Province');

  const selectedProvinceData = useMemo(
    () => provinceOverview.find((province) => province.name === selectedProvince) ?? provinceOverview[2],
    [selectedProvince],
  );

  const activityCards = [
    {
      title: 'Explore promises',
      description: 'Browse the biggest public promises, linked evidence, and tracked progress across sectors.',
      href: '/explore/projects',
      icon: ScanSearch,
      metric: statsLoading ? '--' : `${stats?.total ?? 0} tracked`,
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
                  See what Nepal is building, what is delayed, and what changed today.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-gray-200 sm:text-lg">
                  Nepal Najar gives people one place to track Balen&apos;s first 100 days, province-level delivery, accountability, and source-backed updates without mixing official claims with public signals or discovered reporting.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/explore/first-100-days"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-400/20 bg-primary-600 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-500"
                  >
                    Track Balen&apos;s 100 Days
                    <ArrowRight className="h-5 w-5" />
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
                    label="Promises tracked"
                    value={statsLoading ? '--' : stats?.total ?? 0}
                  />
                  <LandingStat
                    label="In progress"
                    value={statsLoading ? '--' : stats?.inProgress ?? 0}
                  />
                  <LandingStat
                    label="Articles scanned"
                    value={articleCount ?? 0}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="glass-card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Balen&apos;s first 100 days</p>
                      <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">
                        The accountability tracker should be visible from day one
                      </h2>
                    </div>
                    <TimerReset className="mt-1 h-5 w-5 shrink-0 text-primary-300" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Delivered</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {statsLoading ? '--' : stats?.delivered ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Stalled</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {statsLoading ? '--' : stats?.stalled ?? 0}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-gray-400">
                    Follow the promise tracker to see what has actually moved, what is backed by evidence, and where public pressure is building.
                  </p>

                  <Link
                    href="/explore/first-100-days"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary-300 transition-colors hover:text-primary-200"
                  >
                    Open the first 100 days tracker
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <MeroWardCard />
              </div>
            </div>
          </div>
        </section>

        <section className="public-section pt-2">
          <div className="public-shell">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="glass-card p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Map Nepal</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">
                      Click any province to see where the pressure and progress are building
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
                      <Nepal3DMap
                        regionData={provinceOverview.map((province) => ({
                          name: province.name,
                          total: province.total,
                          delayed: province.delayed,
                          severity: province.severity,
                          progress: province.progress,
                        }))}
                        selectedProvince={selectedProvince}
                        onProvinceClick={setSelectedProvince}
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
                          <span
                            key={item}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-gray-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Why this matters</p>
                      <p className="mt-2 text-sm leading-7 text-gray-400">
                        Nepal Najar should let people move from the national view to a province-level question fast: what is happening here, who owns it, and what is slowing it down?
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
