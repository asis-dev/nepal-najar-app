'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  MessageSquareWarning,
  Map,
  Megaphone,
  TrendingUp,
  Landmark,
  Activity,
  Swords,
  Scale,
  User,
  Settings,
  ChevronDown,
  Shield,
  MoreHorizontal,
  Info,
  RefreshCw,
  BarChart3,
  Grid3x3,
  FolderLock,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { ShieldCheck, Award, Star, Users } from 'lucide-react';
import { RepublicMark } from '@/components/ui/ghanti-card-mark';
import { NotificationBell } from '@/components/public/notification-bell';
import { useTrending } from '@/lib/hooks/use-trending';
import { SearchOverlay } from '@/components/public/search-overlay';

/* Live scan stats for header badge */
function useScanStats() {
  const [stats, setStats] = useState<{
    signalsToday: number;
    sourcesToday: number;
    latestSweepAt?: string | null;
    latestSweepStatus?: string | null;
    isStale?: boolean;
  } | null>(null);
  useEffect(() => {
    fetch('/api/scan-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d))
      .catch(() => {});
  }, []);
  return stats;
}

const PULSE_COLORS = {
  low: 'bg-blue-400',
  moderate: 'bg-emerald-400',
  high: 'bg-orange-400',
  very_high: 'bg-red-400',
} as const;

// Desktop: 5 primary tabs always visible
const desktopPrimaryLinks = [
  { href: '/', labelKey: 'nav.home', icon: Eye },
  { href: '/services', labelKey: 'nav.services', icon: Grid3x3 },
  { href: '/explore/first-100-days', labelKey: 'nav.tracker', icon: Target },
  { href: '/report-card', labelKey: 'nav.reportCard', icon: ClipboardCheck },
  { href: '/complaints', labelKey: 'nav.complaints', icon: MessageSquareWarning },
];

// Desktop: overflow into "More" dropdown
const desktopMoreLinks = [
  { href: '/inbox', labelKey: 'nav.inbox', icon: MessageSquareWarning },
  { href: '/me/vault', labelKey: 'nav.vault', icon: FolderLock },
  { href: '/corruption', labelKey: 'nav.corruption', icon: Shield },
  { href: '/ministers', labelKey: 'nav.ministers', icon: Users },
  { href: '/scorecard', labelKey: 'nav.ministries', icon: Award },
  { href: '/disputed', labelKey: 'nav.disputed', icon: Swords },
  { href: '/constitution', labelKey: 'nav.constitution', icon: Scale },
  { href: '/sectors', labelKey: 'nav.sectors', icon: BarChart3 },
  { href: '/what-changed', labelKey: 'nav.whatChanged', icon: RefreshCw },
  { href: '/watchlist', labelKey: 'nav.watchlist', icon: Bookmark },
  { href: '/about', labelKey: 'nav.about', icon: Info },
];

// All links for mobile menu
const allNavLinks = [
  { href: '/', labelKey: 'nav.home', icon: Eye },
  { href: '/services', labelKey: 'nav.services', icon: Grid3x3 },
  { href: '/me/vault', labelKey: 'nav.vault', icon: FolderLock },
  { href: '/explore/first-100-days', labelKey: 'nav.tracker', icon: Target },
  { href: '/report-card', labelKey: 'nav.reportCard', icon: ClipboardCheck },
  { href: '/ministers', labelKey: 'nav.ministers', icon: Users },
  { href: '/corruption', labelKey: 'nav.corruption', icon: Shield },
  { href: '/complaints', labelKey: 'nav.complaints', icon: MessageSquareWarning },
  { href: '/scorecard', labelKey: 'nav.ministries', icon: Award },
  { href: '/disputed', labelKey: 'nav.disputed', icon: Swords },
  { href: '/constitution', labelKey: 'nav.constitution', icon: Scale },
  { href: '/sectors', labelKey: 'nav.sectors', icon: BarChart3 },
  { href: '/what-changed', labelKey: 'nav.whatChanged', icon: RefreshCw },
  { href: '/watchlist', labelKey: 'nav.watchlist', icon: Bookmark },
  { href: '/about', labelKey: 'nav.about', icon: Info },
];

const mobileOnlyLinks = [
  { href: '/search', labelKey: 'nav.search', icon: Search },
  { href: '/feedback', labelKey: 'nav.feedback', icon: MessageSquarePlus },
  { href: '/explore/government', labelKey: 'nav.government', icon: Landmark },
  { href: '/explore/map', labelKey: 'nav.mapBeta', icon: Map },
  { href: '/proposals', labelKey: 'nav.proposalsBeta', icon: Megaphone },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale, t } = useI18n();
  const { pulseLevel } = useTrending();
  const pulseDotColor = PULSE_COLORS[pulseLevel];
  const scanStats = useScanStats();
  const { user, isAuthenticated, isVerifier, signOut, karma, level } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Keyboard shortcuts: / and Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K — always opens search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // / key — only if not already in an input/textarea/contenteditable
      if (e.key === '/' && !searchOpen) {
        const tag = (e.target as HTMLElement)?.tagName;
        const isEditable =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          (e.target as HTMLElement)?.isContentEditable;
        if (!isEditable) {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Close user menu and more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
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
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-np-base/80 backdrop-blur-xl" suppressHydrationWarning>
      <div className="accent-crimson" />
      <div className="public-shell">
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3 sm:h-[4.5rem] sm:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 text-white transition-opacity hover:opacity-85"
          >
            <RepublicMark compact />
          </Link>

          <div className="hidden items-center justify-center gap-0.5 lg:flex shrink-0">
            {desktopPrimaryLinks.map(({ href, labelKey, icon: Icon }) => {
              const isActive = isActivePath(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={t(labelKey)}
                  className={`relative flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.07] text-white'
                      : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(labelKey)}
                </Link>
              );
            })}
            {/* More dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors ${
                  moreMenuOpen || desktopMoreLinks.some(l => isActivePath(l.href))
                    ? 'bg-white/[0.07] text-white'
                    : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                }`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                {locale === 'ne' ? 'थप' : 'More'}
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${moreMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-np-border bg-np-surface/95 shadow-xl backdrop-blur-xl">
                  <div className="py-1">
                    {desktopMoreLinks.map(({ href, labelKey, icon: Icon }) => {
                      const isActive = isActivePath(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreMenuOpen(false)}
                          className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-white/[0.07] text-white'
                              : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {t(labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden items-center justify-end gap-2 lg:flex shrink-0">
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
            {scanStats?.latestSweepAt && (
              <span
                className={`rounded-xl border px-2 py-1 text-[10px] font-medium ${
                  scanStats.isStale
                    ? 'border-amber-500/30 text-amber-300'
                    : 'border-emerald-500/30 text-emerald-300'
                }`}
                title={`Last intelligence sweep: ${new Date(scanStats.latestSweepAt).toLocaleString()}`}
              >
                {scanStats.isStale ? 'Data stale' : 'Fresh data'}
              </span>
            )}
            <NotificationBell />
            {/* Desktop search bar */}
            <button
              onClick={openSearch}
              className="group flex w-[250px] items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-sm text-gray-500 transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-gray-300 focus:w-[400px] focus:border-primary-500/30"
            >
              <Search className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{locale === 'ne' ? 'खोज्नुहोस्...' : 'Search...'}</span>
              <kbd className="ml-auto hidden rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-gray-600 lg:inline-block">
                /
              </kbd>
            </button>
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
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{user.displayName || t('auth.myAccount')}</p>
                        {user.role === 'verifier' && (
                          <span className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                            <ShieldCheck className="h-3 w-3" /> Verifier
                          </span>
                        )}
                        {user.role === 'admin' && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Star className="h-3 w-3" /> Admin
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                      {karma != null && (
                        <p className="mt-1 text-xs text-gray-500">
                          <Award className="mr-1 inline h-3 w-3 text-primary-400" />
                          {karma} karma · Level {level || 1}
                        </p>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        href="/reputation"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-gray-200"
                      >
                        <Award className="h-4 w-4" />
                        My Reputation
                      </Link>
                      {isVerifier && (
                        <>
                          <Link
                            href="/verify-evidence"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-cyan-300"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Verify Evidence
                          </Link>
                          <Link
                            href="/complaints/ops"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-amber-300"
                          >
                            <Shield className="h-4 w-4" />
                            Complaint Ops
                          </Link>
                        </>
                      )}
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

          {/* Mobile: search + language toggle + hamburger always visible */}
          <div className="flex items-center gap-2 justify-self-end md:hidden">
            <button
              onClick={openSearch}
              className="flex items-center justify-center rounded-xl border border-white/[0.08] p-2 text-gray-300 transition-colors hover:border-white/[0.15] hover:text-white"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 rounded-xl border border-white/[0.08] px-2.5 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-white/[0.15] hover:text-white"
              aria-label="Toggle language"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{locale === 'en' ? 'ने' : 'EN'}</span>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-xl border border-white/[0.08] p-2 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

      </div>

      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-np-base/95 backdrop-blur-xl md:hidden">
          <div className="public-shell pb-4 pt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {[...allNavLinks, ...mobileOnlyLinks].map(({ href, labelKey, icon: Icon }) => {
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

      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
    </nav>
  );
}
