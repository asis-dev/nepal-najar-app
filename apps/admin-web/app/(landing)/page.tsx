'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  Mountain,
  ShieldCheck,
  MapPinned,
  Newspaper,
  Users,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { NepalFlagIcon } from '@/components/ui/nepal-flag-icon';
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
      <div className="absolute inset-0 z-0 opacity-35">
        <NepalGlobe />
      </div>

      <div className="relative z-10 px-6 pb-14 pt-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-200 backdrop-blur-md">
              <NepalFlagIcon size={18} />
              <span className="font-medium">Nepal Najar</span>
              <span className="text-gray-500">The public eye on Balen&apos;s Nepal</span>
            </div>

            <div className="mb-7 flex items-center gap-3 animate-fade-in">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                style={{
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Mountain className="h-7 w-7 text-gray-100" />
              </div>
            </div>

            <h1
              className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              Nepal <span className="text-white/90">Najar</span>
            </h1>

            <p className="mt-5 max-w-2xl text-xl font-display text-gray-100/95 sm:text-2xl">
              See what Nepal is building, what is delayed, and what changed today.
            </p>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg">
              Follow government promises, public projects, and source-backed updates in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { icon: ShieldCheck, label: 'Official signals' },
                { icon: Newspaper, label: 'Daily discoveries' },
                { icon: MapPinned, label: 'District drilldown' },
                { icon: Users, label: 'Public sentiment' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-200 backdrop-blur-md"
                >
                  <item.icon className="h-4 w-4 text-gray-300" />
                  {item.label}
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
              <Link
                href="/explore"
                className="inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-1"
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
                href="/explore/daily"
                className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06]"
              >
                What changed today
              </Link>
            </div>
          </div>

          <div className="glass-card relative overflow-hidden p-6 sm:p-7">
            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Why it matters</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Clearer than scattered updates</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-gray-300">
                  Public platform
                </div>
              </div>

              <TrustLanes />

              <div className="mt-6 grid grid-cols-3 gap-3">
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
