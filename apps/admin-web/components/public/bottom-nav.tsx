'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, CalendarDays, ClipboardCheck, Bookmark, Target, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTrending } from '@/lib/hooks/use-trending';

const PULSE_COLORS = {
  low: 'bg-blue-400',
  moderate: 'bg-emerald-400',
  high: 'bg-orange-400',
  very_high: 'bg-red-400',
} as const;

const navItems = [
  { href: '/', labelKey: 'nav.home', icon: Eye },
  { href: '/explore/first-100-days', labelKey: 'nav.tracker', icon: Target },
  { href: '/trending', labelKey: 'nav.trending', icon: TrendingUp },
  { href: '/daily', labelKey: 'nav.daily', icon: CalendarDays },
  { href: '/report-card', labelKey: 'nav.reportCard', icon: ClipboardCheck },
  { href: '/watchlist', labelKey: 'nav.watchlist', icon: Bookmark },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslation();
  const { pulseLevel } = useTrending();
  const pulseDotColor = PULSE_COLORS[pulseLevel];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-3 pb-2 md:hidden">
      {/* Pulse activity dot */}
      <div className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2">
        <div className="relative flex items-center justify-center">
          <span className={`absolute inline-flex h-3 w-3 rounded-full ${pulseDotColor} opacity-30 nav-pulse-outer`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${pulseDotColor}`} />
        </div>
      </div>
      <div className="mx-auto flex h-[4.25rem] max-w-md items-center justify-around rounded-2xl border border-white/[0.1] bg-np-void/95 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive ? '' : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div className={`rounded-xl p-1.5 transition-colors ${
                isActive ? 'bg-primary-500/15' : ''
              }`}>
                <Icon
                  className={`h-[1.15rem] w-[1.15rem] transition-colors ${
                    isActive ? 'text-primary-400' : 'text-gray-400'
                  }`}
                />
              </div>
              <span
                className={`text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  isActive ? 'text-primary-300' : 'text-gray-500'
                }`}
              >
                {t(labelKey)}
              </span>
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
  );
}
