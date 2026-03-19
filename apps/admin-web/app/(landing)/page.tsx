'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  ShieldCheck,
  MapPinned,
  Newspaper,
  Users,
  CalendarDays,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { NepalNajarMark } from '@/components/ui/nepal-najar-mark';
import { TrustLanes } from '@/components/public/trust-lanes';

const NepalGlobe = dynamic(
  () => import('@/components/globe/nepal-globe').then((m) => ({ default: m.NepalGlobe })),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-np-void" />,
  },
);

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="relative min-h-screen overflow-hidden bg-np-void">
      <div className="absolute inset-0 z-0 nepal-hero-grid" />
      <div className="mountain-ridge" />
      <div className="mountain-ridge-soft" />
      <div className="absolute inset-0 z-0 opacity-25">
        <NepalGlobe />
      </div>

      <div className="relative z-10 px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="public-shell grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div className="max-w-3xl">
            <div className="mb-6">
              <NepalNajarMark className="mb-4" />
              <div className="section-kicker">
                <CalendarDays className="h-3.5 w-3.5" />
                The public eye on Balen&apos;s Nepal
              </div>
            </div>

            <h1 className="max-w-5xl text-balance font-sans text-[3.3rem] font-semibold leading-[0.92] tracking-[-0.04em] text-white sm:text-[4.5rem] lg:text-[5.4rem]">
              See what Nepal is building, what is delayed, and what changed today.
            </h1>

            <p className="mt-5 max-w-2xl text-lg font-medium text-gray-100/95 sm:text-[1.35rem]">
              Track promises, projects, government accountability, and source-backed updates in one place.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
              Nepal Najar is designed for people who want a clearer public view of what is moving, what is stalled, and who owns delivery.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3">
              {[
                { icon: ShieldCheck, label: 'Official signals' },
                { icon: Newspaper, label: 'Daily discoveries' },
                { icon: MapPinned, label: 'District drilldown' },
                { icon: Users, label: 'Public sentiment' },
              ].map((item) => (
                <div key={item.label} className="metric-chip">
                  <item.icon className="h-4 w-4 text-gray-300" />
                  {item.label}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-1 sm:px-8 sm:text-lg"
                style={{
                  background: 'linear-gradient(135deg, #174ea6 0%, #0f3d86 100%)',
                  boxShadow: '0 8px 24px rgba(15,61,134,0.28)',
                  border: '1px solid rgba(96,165,250,0.14)',
                }}
              >
                {t('landing.exploreNepal')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/daily"
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06]"
              >
                What changed today
              </Link>
            </div>
          </div>

          <div className="glass-card public-gradient-panel relative overflow-hidden p-5 sm:p-7">
            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Why it matters</p>
                  <h2 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-[1.8rem]">Clearer than scattered updates</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-gray-300">
                  Public platform
                </div>
              </div>

              <TrustLanes />

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { value: '7', label: 'Provinces under watch' },
                  { value: '20+', label: 'Projects tracked now' },
                  { value: 'Daily', label: 'Signal refresh rhythm' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center"
                  >
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
