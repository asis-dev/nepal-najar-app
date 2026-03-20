'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Map, Calendar, MapPinHouse, TimerReset } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const navItems = [
  { href: '/', labelKey: 'nav.home', icon: Eye },
  { href: '/explore/first-100-days', labelKey: 'nav.first100Days', icon: TimerReset },
  { href: '/explore/map', labelKey: 'nav.map', icon: Map },
  { href: '/daily', labelKey: 'nav.daily', icon: Calendar },
  { href: '/mero-ward', labelKey: 'nav.myArea', icon: MapPinHouse },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslation();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-4 pb-2 md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around rounded-[1.4rem] border border-white/[0.08] bg-np-surface/92 shadow-[0_-12px_30px_rgba(3,8,20,0.35)] backdrop-blur-xl">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="relative flex h-full flex-1 flex-col items-center justify-center gap-1"
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              >
                {t(labelKey)}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary-400"
                  style={{ boxShadow: '0 0 6px rgba(96,165,250,0.6)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
