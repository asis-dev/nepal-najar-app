'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Landmark,
  Globe,
  Menu,
  X,
  LogIn,
  Eye,
  Map,
  MapPinHouse,
  ClipboardCheck,
  FolderKanban,
  TimerReset,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { NepalNajarMark } from '@/components/ui/nepal-najar-mark';

const primaryNavLinks = [
  { href: '/', labelKey: 'nav.home', icon: Eye },
  { href: '/explore/first-100-days', labelKey: 'nav.first100Days', icon: TimerReset },
  { href: '/explore/map', labelKey: 'nav.map', icon: Map },
  { href: '/explore/government', labelKey: 'nav.government', icon: Landmark },
  { href: '/daily', labelKey: 'nav.daily', icon: Calendar },
  { href: '/mero-ward', labelKey: 'nav.myArea', icon: MapPinHouse },
];

const mobileOnlyLinks = [
  { href: '/explore/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { href: '/report-card', labelKey: 'nav.reportCard', icon: ClipboardCheck },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

  const toggleLang = () => setLocale(locale === 'en' ? 'ne' : 'en');
  const isActivePath = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-np-base/80 backdrop-blur-xl">
      <div className="accent-crimson" />
      <div className="public-shell">
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3 sm:h-[4.5rem] sm:gap-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 text-white transition-opacity hover:opacity-85"
          >
            <NepalNajarMark compact />
          </Link>

          <div className="hidden items-center justify-center gap-1 lg:flex">
          {primaryNavLinks.map(({ href, labelKey, icon: Icon }) => {
            const isActive = isActivePath(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/[0.07] text-white'
                    : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                }`}
              >
                  <Icon className="h-4 w-4" />
                {t(labelKey)}
              </Link>
            );
          })}
          </div>

          <div className="hidden items-center justify-end gap-2 md:flex">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-white/[0.15] hover:text-gray-200"
            >
              <Globe className="h-4 w-4" />
              <span>{locale === 'en' ? 'EN' : 'ने'} | {locale === 'en' ? 'ने' : 'EN'}</span>
            </button>

            <Link
              href="/admin-login"
              className="flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-300"
            >
              <LogIn className="h-4 w-4" />
              {t('nav.operatorLogin')}
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="justify-self-end rounded-xl border border-white/[0.08] p-2 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-np-base/95 backdrop-blur-xl md:hidden">
          <div className="public-shell pb-4 pt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {[...primaryNavLinks, ...mobileOnlyLinks].map(({ href, labelKey, icon: Icon }) => {
              const isActive = isActivePath(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-white/[0.14] bg-white/[0.07] text-white'
                      : 'border-white/[0.08] bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </Link>
              );
              })}
            </div>

            <div className="my-3 border-t border-white/[0.06]" />

            <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => {
                toggleLang();
                setMobileOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            >
              <Globe className="h-4 w-4" />
              {locale === 'en' ? 'EN | ने' : 'ने | EN'}
            </button>

            <Link
              href="/admin-login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
            >
              <LogIn className="h-4 w-4" />
              {t('nav.operatorLogin')}
            </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
