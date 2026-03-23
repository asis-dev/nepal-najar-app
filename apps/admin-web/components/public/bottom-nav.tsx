'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Target, ClipboardCheck, Activity, Landmark, MoreHorizontal } from 'lucide-react';
import { useTrending } from '@/lib/hooks/use-trending';
import { useState } from 'react';

const PULSE_COLORS = {
  low: 'bg-blue-400',
  moderate: 'bg-emerald-400',
  high: 'bg-orange-400',
  very_high: 'bg-red-400',
} as const;

// Primary nav — icons only, 5 tabs
const navItems = [
  { href: '/', icon: Eye, label: 'Home' },
  { href: '/explore/first-100-days', icon: Target, label: 'Tracker' },
  { href: '/report-card', icon: ClipboardCheck, label: 'Report Card' },
  { href: '/trending', icon: Activity, label: 'Pulse', isPulse: true },
  { href: '/explore/government', icon: Landmark, label: 'Gov' },
  { href: '/more', icon: MoreHorizontal, label: 'More', isMore: true },
];

// "More" drawer items
const moreItems = [
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/daily', label: 'Daily Digest' },
  { href: '/affects-me', label: 'What Affects Me' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/search', label: 'Search' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { pulseLevel } = useTrending();
  const pulseDotColor = PULSE_COLORS[pulseLevel];
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-[5rem] left-3 right-3 mx-auto max-w-md rounded-2xl border border-white/[0.1] bg-np-void/95 p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map(({ href, label }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMore(false)}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-500/15 text-primary-300'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-3 pb-2 md:hidden">
        {/* Pulse activity dot */}
        <div className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <div className="relative flex items-center justify-center">
            <span className={`absolute inline-flex h-3 w-3 rounded-full ${pulseDotColor} opacity-30 nav-pulse-outer`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${pulseDotColor}`} />
          </div>
        </div>
        <div className="mx-auto flex h-[4.25rem] max-w-md items-center justify-around rounded-2xl border border-white/[0.1] bg-np-void/95 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          {navItems.map(({ href, icon: Icon, label, isPulse, isMore }) => {
            const isActive = isMore
              ? showMore
              : href === '/'
                ? pathname === '/'
                : pathname.startsWith(href);

            if (isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setShowMore(!showMore)}
                  className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                    showMore ? '' : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <div className={`rounded-xl p-1.5 transition-colors ${
                    showMore ? 'bg-primary-500/15' : ''
                  }`}>
                    <Icon className={`h-5 w-5 transition-colors ${
                      showMore ? 'text-primary-400' : 'text-gray-400'
                    }`} />
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setShowMore(false)}
                className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                  isActive ? '' : 'opacity-50 hover:opacity-75'
                }`}
              >
                <div className={`relative rounded-xl p-1.5 transition-colors ${
                  isActive ? 'bg-primary-500/15' : ''
                }`}>
                  <Icon className={`h-5 w-5 transition-colors ${
                    isActive ? 'text-primary-400' : 'text-gray-400'
                  }`} />
                  {isPulse && (
                    <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${pulseDotColor}`} />
                  )}
                </div>
                {isActive && (
                  <span
                    className="absolute -top-px left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-primary-400"
                    style={{ boxShadow: '0 0 8px rgba(96,165,250,0.5)' }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
