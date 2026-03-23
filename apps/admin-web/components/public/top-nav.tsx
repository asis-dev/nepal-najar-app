'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  Globe,
  Menu,
  X,
  LogIn,
  LogOut,
  Eye,
  ClipboardCheck,
  Target,
  Search,
  Bookmark,
  MessageSquarePlus,
  Map,
  Megaphone,
  TrendingUp,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { NepalNajarMark } from '@/components/ui/nepal-najar-mark';
import { NotificationBell } from '@/components/public/notification-bell';
import { useTrending } from '@/lib/hooks/use-trending';

const PULSE_COLORS = {
  low: 'bg-blue-400',
  moderate: 'bg-emerald-400',
  high: 'bg-orange-400',
  very_high: 'bg-red-400',
} as const;

const primaryNavLinks = [
  { href: '/', labelKey: 'nav.home', icon: Eye },
  { href: '/explore/first-100-days', labelKey: 'nav.tracker', icon: Target },
  { href: '/trending', labelKey: 'nav.trending', icon: TrendingUp },
  { href: '/daily', labelKey: 'nav.daily', icon: Calendar },
  { href: '/report-card', labelKey: 'nav.reportCard', icon: ClipboardCheck },
  { href: '/watchlist', labelKey: 'nav.watchlist', icon: Bookmark },
];

const mobileOnlyLinks = [
  { href: '/search', labelKey: 'nav.search', icon: Search },
  { href: '/feedback', labelKey: 'nav.feedback', icon: MessageSquarePlus },
  { href: '/explore/map', labelKey: 'nav.mapBeta', icon: Map },
  { href: '/proposals', labelKey: 'nav.proposalsBeta', icon: Megaphone },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale, t } = useI18n();
  const { pulseLevel } = useTrending();
  const pulseDotColor = PULSE_COLORS[pulseLevel];
  const { user, isAuthenticated, signOut } = useAuth();

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await signOut();
    router.push('/');
  };

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
            {/* Pulse activity indicator */}
            <Link
              href="/trending"
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-2.5 py-1.5 text-gray-400 transition-colors hover:border-white/[0.15] hover:text-gray-200"
              title="Political activity pulse"
            >
              <div className="relative flex items-center justify-center">
                <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${pulseDotColor} opacity-30 nav-pulse-outer`} />
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${pulseDotColor}`} />
              </div>
              <TrendingUp className="h-3.5 w-3.5" />
            </Link>
            <NotificationBell />
            <Link
              href="/search"
              className="flex items-center justify-center rounded-xl border border-white/[0.08] p-2 text-gray-400 transition-colors hover:border-white/[0.15] hover:text-gray-200"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Link>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-white/[0.15] hover:text-gray-200"
            >
              <Globe className="h-4 w-4" />
              <span>{locale === 'en' ? 'EN' : 'ने'} | {locale === 'en' ? 'ने' : 'EN'}</span>
            </button>

            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-white/[0.15] hover:text-white"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/20 text-xs font-semibold text-primary-300">
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-np-border bg-np-surface/95 shadow-xl backdrop-blur-xl">
                    <div className="border-b border-np-border px-4 py-3">
                      <p className="truncate text-sm font-medium text-white">{user.displayName || t('auth.myAccount')}</p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-red-400"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('auth.signOut')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl border border-primary-500/30 bg-primary-500/10 px-3 py-2 text-sm font-medium text-primary-300 transition-colors hover:bg-primary-500/20 hover:text-primary-200"
              >
                <LogIn className="h-4 w-4" />
                {t('auth.signIn')}
              </Link>
            )}
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

            {isAuthenticated && user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                {t('auth.signOut')}
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-2xl border border-primary-500/30 bg-primary-500/10 px-3 py-3 text-sm font-medium text-primary-300 transition-colors hover:bg-primary-500/20"
              >
                <LogIn className="h-4 w-4" />
                {t('auth.signIn')}
              </Link>
            )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
