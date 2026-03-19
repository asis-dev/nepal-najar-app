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
      <div className="absolute inset-0 z-0">
        <NepalGlobe />
      </div>

      <div className="relative z-10 px-6 pb-14 pt-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-gray-200 backdrop-blur-md">
              <NepalFlagIcon size={18} />
              <span className="font-medium">Nepal Najar</span>
              <span className="text-gray-500">The public eye on Balen&apos;s Nepal</span>
            </div>

            <div className="mb-7 flex items-center gap-3 animate-fade-in">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-400/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(220,20,60,0.20) 0%, rgba(0,56,147,0.18) 100%)',
                  boxShadow: '0 0 40px rgba(220,20,60,0.12)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Mountain className="h-7 w-7 text-white" />
              </div>
            </div>

            <h1
              className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.45)' }}
            >
              Nepal <span className="text-gradient-blue">Najar</span>
            </h1>

            <p
              className="mt-5 max-w-2xl text-xl font-display text-gray-100/95 sm:text-2xl"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
            >
              {t('hero.tagline')}
            </p>
            <p
              className="mt-3 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}
            >
              Watch what the government promises, what Nepal is actually building, what is delayed, and what the public is watching district by district.
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
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-gray-200 backdrop-blur-md"
                >
                  <item.icon className="h-4 w-4 text-primary-400" />
                  {item.label}
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
              <Link
                href="/explore"
                className="inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: '0 8px 30px rgba(37,99,235,0.4), 0 0 80px rgba(37,99,235,0.15)',
                  border: '1px solid rgba(96,165,250,0.2)',
                }}
              >
                {t('landing.exploreNepal')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/explore/daily"
                className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08]"
              >
                What changed today
              </Link>
            </div>
          </div>

          <div className="glass-card relative overflow-hidden p-6 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary-500/[0.08] to-transparent" />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Under watch</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Why people keep checking</h2>
                </div>
                <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                  Live civic signal
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
