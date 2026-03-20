'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  CalendarDays,
  Landmark,
  MapPinned,
  Newspaper,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { NepalNajarMark } from '@/components/ui/nepal-najar-mark';
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

  return (
    <div className="relative min-h-screen overflow-x-clip bg-np-void">
      <div className="absolute inset-0 z-0 nepal-hero-grid" />
      <div className="mountain-ridge opacity-75" />
      <div className="mountain-ridge-soft opacity-80" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-full max-w-5xl opacity-18 lg:block">
        <NepalGlobe />
      </div>

      <div className="relative z-10">
        <section className="public-section pt-14 sm:pt-16 lg:pt-20">
          <div className="public-shell">
            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:gap-8">
              <div className="max-w-3xl">
                <div className="mb-5">
                  <NepalNajarMark className="mb-4" />
                  <div className="section-kicker">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t('landing.tagline')}
                  </div>
                </div>

                <h1 className="max-w-4xl text-balance font-sans text-[2.65rem] font-semibold leading-[0.94] tracking-[-0.045em] text-white sm:text-[3.6rem] lg:text-[4.45rem]">
                  See what Nepal is building, what is delayed, and what changed today.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-gray-200 sm:text-lg">
                  Nepal Najar gives people one place to track promises, delivery, accountability, and source-backed updates without mixing official claims with public signals or discovered reporting.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/explore"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-400/20 bg-primary-600 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-500"
                  >
                    {t('landing.exploreNepal')}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/daily"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                  >
                    What changed today
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
                    label="Delivered"
                    value={statsLoading ? '--' : stats?.delivered ?? 0}
                  />
                  <LandingStat
                    label="Articles scanned"
                    value={articleCount ?? 0}
                  />
                </div>
              </div>

              <div className="grid gap-4">
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

                <MeroWardCard />
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
