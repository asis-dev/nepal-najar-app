'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Map,
  FolderKanban,
  Calendar,
  Landmark,
  Globe,
  Menu,
  X,
  LogIn,
  Search,
  Eye,
  MapPinHouse,
  ClipboardCheck,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { NepalNajarMark } from '@/components/ui/nepal-najar-mark';

const navLinks = [
  { href: '/explore', labelKey: 'nav.home', icon: Eye },
  { href: '/daily', labelKey: 'nav.daily', icon: Calendar },
  { href: '/mero-ward', labelKey: 'nav.myArea', icon: MapPinHouse },
  { href: '/explore/government', labelKey: 'nav.government', icon: Landmark },
  { href: '/report-card', labelKey: 'nav.reportCard', icon: ClipboardCheck },
  { href: '/explore/map', labelKey: 'nav.map', icon: Map },
  { href: '/explore/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { href: '/explore/first-100-days', labelKey: 'nav.first100Days', icon: Calendar },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { locale, setLocale, t } = useI18n();

  const toggleLang = () => setLocale(locale === 'en' ? 'ne' : 'en');

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-np-base/80 backdrop-blur-xl">
      {/* Crimson accent line at very top */}
      <div className="accent-crimson" />

      <div className="public-shell flex h-16 items-center justify-between gap-3">
        <Link
          href="/explore"
          className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-80"
        >
          <NepalNajarMark compact />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map(({ href, labelKey, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== '/explore' && pathname.startsWith(href));
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

        {/* Right side: search + language toggle + admin */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Search toggle */}
          {searchOpen ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-3 py-1.5">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('hero.searchPlaceholder')}
                className="w-48 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
                autoFocus
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-300"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-white/[0.15] hover:text-gray-200"
          >
            <Globe className="h-4 w-4" />
            <span>{locale === 'en' ? 'EN' : 'ने'} | {locale === 'en' ? 'ने' : 'EN'}</span>
          </button>

          <Link
            href="/admin-login"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
          >
            <LogIn className="h-4 w-4" />
            Operator Login
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-np-base/95 backdrop-blur-xl md:hidden">
          <div className="public-shell space-y-1 pb-4 pt-3">
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('hero.searchPlaceholder')}
                className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
              />
            </div>

            {navLinks.map(({ href, labelKey, icon: Icon }) => {
              const isActive =
                pathname === href ||
                (href !== '/explore' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
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

            <div className="my-2 border-t border-white/[0.06]" />

            <button
              onClick={() => {
                toggleLang();
                setMobileOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            >
              <Globe className="h-4 w-4" />
              {locale === 'en' ? 'EN | ने' : 'ने | EN'}
            </button>

            <Link
              href="/admin-login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
            >
              <LogIn className="h-4 w-4" />
              Operator Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
