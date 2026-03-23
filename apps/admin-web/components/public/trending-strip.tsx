'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useTrending } from '@/lib/hooks/use-trending';

const trendArrow: Record<string, string> = {
  rising: '\u2191',
  falling: '\u2193',
  stable: '\u2192',
  new: '\u2728',
};

function SkeletonPill() {
  return (
    <div className="flex-shrink-0 animate-pulse rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5">
      <div className="h-3.5 w-24 rounded bg-white/[0.06]" />
    </div>
  );
}

export function TrendingStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { trending, pulse, pulseLevel, isLoading } = useTrending(8);

  const pulseColor = {
    low: 'bg-blue-400',
    moderate: 'bg-emerald-400',
    high: 'bg-orange-400',
    very_high: 'bg-red-400',
  }[pulseLevel];

  const pulseGlow = {
    low: 'shadow-[0_0_6px_rgba(96,165,250,0.4)]',
    moderate: 'shadow-[0_0_6px_rgba(52,211,153,0.4)]',
    high: 'shadow-[0_0_6px_rgba(251,146,60,0.4)]',
    very_high: 'shadow-[0_0_8px_rgba(248,113,113,0.5)]',
  }[pulseLevel];

  if (!isLoading && trending.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        {/* Pulse indicator */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${pulseColor} opacity-40 trending-pulse`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${pulseColor} ${pulseGlow}`} />
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
              Trending
            </span>
          </div>
          {pulse > 0 && (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold tabular-nums text-gray-300">
              {pulse}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px flex-shrink-0 bg-white/[0.08]" />

        {/* Horizontal scroll area */}
        <div
          ref={scrollRef}
          className="trending-scroll flex flex-1 items-center gap-2 overflow-x-auto"
        >
          {isLoading ? (
            <>
              <SkeletonPill />
              <SkeletonPill />
              <SkeletonPill />
              <SkeletonPill />
              <SkeletonPill />
            </>
          ) : (
            <>
              {trending.map((item) => (
                <Link
                  key={item.id}
                  href="/trending"
                  className="trending-pill flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 transition-all duration-300 hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white"
                >
                  <span className="text-[11px]">
                    {item.type === 'commitment' ? '\uD83D\uDD25' : item.type === 'person' ? '\uD83D\uDC64' : item.type === 'event' ? '\uD83D\uDCC5' : '\uD83D\uDCCA'}
                  </span>
                  <span className="max-w-[180px] truncate">{item.title}</span>
                  <span className="text-[10px] text-gray-500">
                    {trendArrow[item.trend] ?? ''}
                  </span>
                  {item.signalCount > 0 && (
                    <span className="rounded-full bg-white/[0.06] px-1.5 py-px text-[9px] tabular-nums text-gray-400">
                      {item.signalCount}
                    </span>
                  )}
                </Link>
              ))}

              {/* See all link */}
              <Link
                href="/trending"
                className="flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary-300 transition-colors hover:text-primary-200"
              >
                See all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
