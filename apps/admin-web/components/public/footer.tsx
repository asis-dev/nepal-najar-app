'use client';

import Link from 'next/link';
import {
  Eye,
  Heart,
  MapPin,
  MessageSquarePlus,
  Mountain,
  ShieldCheck,
} from 'lucide-react';
import { NepalNajarMark } from '@/components/ui/nepal-najar-mark';
import { useArticleCount, usePromiseStats } from '@/lib/hooks/use-promises';

const trackLinks = [
  { href: '/explore/first-100-days', label: 'Commitment Tracker' },
  { href: '/daily', label: 'Daily Activity' },
  { href: '/report-card', label: 'Report Card' },
  { href: '/search', label: 'Search' },
  { href: '/watchlist', label: 'Watchlist' },
];

const exploreLinks = [
  { href: '/explore/map', label: 'Province Map (Beta)' },
  { href: '/affects-me', label: 'What Affects Me (Beta)' },
  { href: '/mero-ward', label: 'Mero Ward (Beta)' },
  { href: '/proposals', label: 'Citizen Proposals (Beta)' },
  { href: '/evidence', label: 'Evidence Vault' },
  { href: '/leaderboard', label: 'Leaderboard (Beta)' },
];

const aboutLinks = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/explore/government', label: 'Government' },
  { href: '/explore/compare', label: 'Compare Commitments' },
  { href: '/feedback', label: 'Give Feedback' },
  { href: '/admin-login', label: 'Operator Login' },
];

export function Footer() {
  const { data: articleCount } = useArticleCount();
  const { stats } = usePromiseStats();

  return (
    <footer className="relative z-20 border-t border-white/[0.08] bg-gradient-to-b from-[#0a0f1a] to-[#060a12]">
      {/* Crimson accent line at top */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-red-700/60 to-transparent" />

      {/* Main footer content */}
      <div className="public-shell py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          {/* Brand column */}
          <div className="space-y-5">
            <NepalNajarMark />
            <p className="text-sm leading-relaxed text-gray-400 max-w-sm">
              The nation&apos;s report card. Tracking {stats?.total ?? '--'} public
              commitments with source-backed civic intelligence so people can see
              what is moving, what is stalled, and what changed today.
            </p>

            {/* Trust badge */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-400/90">
                  Trust Architecture
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-400">
                Four signal lanes — Official, Discovered, Public, Inferred —
                never blended. You always know where information comes from.
              </p>
            </div>

            {/* Live stats */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs text-gray-400">
                  <span className="text-gray-200 font-medium">{articleCount ?? 0}</span> sources scanned
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs text-gray-400">
                  <span className="text-gray-200 font-medium">{stats?.total ?? 0}</span> public commitments live
                </span>
              </div>
            </div>
          </div>

          {/* Track column */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
              Track
            </h4>
            <ul className="space-y-2.5">
              {trackLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-white"
                  >
                    <span className="h-px w-3 bg-gray-700 transition-all group-hover:w-5 group-hover:bg-red-500" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore column */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
              Explore
            </h4>
            <ul className="space-y-2.5">
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-white"
                  >
                    <span className="h-px w-3 bg-gray-700 transition-all group-hover:w-5 group-hover:bg-red-500" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More column */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
              More
            </h4>
            <ul className="space-y-2.5">
              {aboutLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-white"
                  >
                    <span className="h-px w-3 bg-gray-700 transition-all group-hover:w-5 group-hover:bg-red-500" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Feedback CTA */}
            <Link
              href="/feedback"
              className="mt-4 flex items-center gap-2 rounded-lg border border-primary-500/20 bg-primary-500/[0.06] px-3 py-2.5 transition-colors hover:bg-primary-500/[0.12]"
            >
              <MessageSquarePlus className="h-4 w-4 text-primary-400" />
              <div>
                <p className="text-[11px] font-medium text-primary-300">Help us improve</p>
                <p className="text-[10px] text-gray-500">Share your feedback</p>
              </div>
            </Link>

            {/* Nepal badge */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <Mountain className="h-4 w-4 text-blue-400/80" />
              <div>
                <p className="text-[11px] font-medium text-gray-300">Built for Nepal</p>
                <p className="text-[10px] text-gray-500">नेपालको लागि बनाइएको</p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-10 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Bottom row */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-red-500/70" />
            <span className="text-sm italic text-gray-500">
              The nation&apos;s report card. As Nepal watches.
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-gray-600">
              &copy; 2026 Nepal Najar
            </span>
            <span className="text-gray-700">|</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-600">
              Made with <Heart className="h-3 w-3 text-red-500/60" /> in Kathmandu
            </span>
            <span className="text-gray-700">|</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-600">
              <MapPin className="h-3 w-3 text-gray-600" />
              नेपाल नजर
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
