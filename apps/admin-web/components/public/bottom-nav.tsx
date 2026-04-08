'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Award, User, X, Heart, Star, Globe, HelpCircle, MessageSquare, LogOut, Swords, Scale, AlertCircle, Shield, MessageSquareWarning, Home, Grid3x3, FolderLock, ListTodo } from 'lucide-react';
import { useTrending } from '@/lib/hooks/use-trending';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { useState, useEffect } from 'react';

const PULSE_COLORS = {
  low: 'bg-blue-400',
  moderate: 'bg-emerald-400',
  high: 'bg-orange-400',
  very_high: 'bg-red-400',
} as const;

const navItems = [
  { href: '/', icon: Home, label: 'Home', labelNe: 'गृह', hasPulse: true },
  { href: '/services', icon: Grid3x3, label: 'Services', labelNe: 'सेवाहरू' },
  { href: '/me/tasks', icon: ListTodo, label: 'Tasks', labelNe: 'कार्यहरू' },
  { href: '/complaints', icon: MessageSquareWarning, label: 'Issues', labelNe: 'समस्या' },
  { href: '/me', icon: User, label: 'Me', labelNe: 'म', isMe: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { pulseLevel } = useTrending();
  const pulseDotColor = PULSE_COLORS[pulseLevel];
  const { user, isAuthenticated, karma, signOut, isVerifier } = useAuth();
  const { locale, setLocale } = useI18n();
  const [showMeSheet, setShowMeSheet] = useState(false);

  // Close the sheet on route change
  useEffect(() => {
    setShowMeSheet(false);
  }, [pathname]);

  const handleMeTap = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setShowMeSheet((prev) => !prev);
  };

  const handleSignOut = async () => {
    setShowMeSheet(false);
    await signOut();
    router.push('/');
  };

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ne' : 'en');
  };

  return (
    <>
      {/* Me bottom sheet overlay */}
      {showMeSheet && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowMeSheet(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-[5rem] left-3 right-3 mx-auto max-w-md rounded-2xl border border-white/[0.1] bg-np-void/95 p-5 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — user info */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-primary-300">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-100">
                    {user?.displayName || 'User'}
                  </p>
                  {karma !== null && (
                    <p className="text-xs text-gray-400">
                      <Star className="mr-1 inline h-3 w-3 text-amber-400" />
                      {karma} karma
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowMeSheet(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Menu items */}
            <div className="space-y-1">
              <MeSheetLink
                href="/me/tasks"
                icon={ListTodo}
                label={locale === 'ne' ? 'मेरो कार्यहरू' : 'My Tasks'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/me/tasks')}
              />
              <MeSheetLink
                href="/services"
                icon={Grid3x3}
                label={locale === 'ne' ? 'सेवा निर्देशिका' : 'Services Directory'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/services')}
              />
              <MeSheetLink
                href="/me/vault"
                icon={FolderLock}
                label={locale === 'ne' ? 'मेरो कागजात कोष' : 'My Vault'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/me/vault')}
              />
              <MeSheetLink
                href="/watchlist"
                icon={Heart}
                label={locale === 'ne' ? 'फलो गरिएका' : 'Following'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/watchlist')}
              />
              <MeSheetLink
                href="/reputation"
                icon={Star}
                label={locale === 'ne' ? 'प्रतिष्ठा' : 'Reputation'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/reputation')}
              />
              <MeSheetLink
                href="/disputed"
                icon={Swords}
                label={locale === 'ne' ? 'विवाद' : 'Disputes'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/disputed')}
              />

              {/* Language toggle */}
              <button
                onClick={toggleLocale}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
              >
                <Globe className="h-4 w-4" />
                <span>{locale === 'en' ? 'नेपाली' : 'English'}</span>
                <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-xs">
                  {locale === 'en' ? 'EN' : 'ने'}
                </span>
              </button>

              <MeSheetLink
                href="/scorecard"
                icon={Award}
                label={locale === 'ne' ? 'मन्त्रालय' : 'Ministries'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/scorecard')}
              />
              <MeSheetLink
                href="/constitution"
                icon={Scale}
                label={locale === 'ne' ? 'संविधान' : 'Constitution'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/constitution')}
              />
              <MeSheetLink
                href="/about"
                icon={HelpCircle}
                label={locale === 'ne' ? 'बारेमा' : 'About This App'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/about')}
              />
              <MeSheetLink
                href="/how-it-works"
                icon={HelpCircle}
                label={locale === 'ne' ? 'कसरी काम गर्छ' : 'How It Works'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/how-it-works')}
              />
              <MeSheetLink
                href="/feedback"
                icon={MessageSquare}
                label={locale === 'ne' ? 'प्रतिक्रिया' : 'Feedback'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/feedback')}
              />
              <MeSheetLink
                href="/complaints"
                icon={AlertCircle}
                label={locale === 'ne' ? 'नागरिक समस्या' : 'Civic Issues'}
                onClick={() => setShowMeSheet(false)}
                isActive={pathname.startsWith('/complaints')}
              />
              {isVerifier && (
                <MeSheetLink
                  href="/complaints/ops"
                  icon={Shield}
                  label={locale === 'ne' ? 'उजुरी सञ्चालन' : 'Complaint Ops'}
                  onClick={() => setShowMeSheet(false)}
                  isActive={pathname.startsWith('/complaints/ops')}
                />
              )}

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span>{locale === 'ne' ? 'साइन आउट' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-3 pb-2 md:hidden">
        {/* Pulse activity dot — on the Home icon area */}
        <div className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <div className="relative flex items-center justify-center">
            <span className={`absolute inline-flex h-3 w-3 rounded-full ${pulseDotColor} opacity-30 nav-pulse-outer`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${pulseDotColor}`} />
          </div>
        </div>
        <div className="mx-auto flex h-16 max-w-md items-center justify-around rounded-2xl border border-white/[0.1] bg-np-void/95 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          {navItems.map(({ href, icon: Icon, label, labelNe, isMe, hasPulse }) => {
            const isActive = isMe
              ? showMeSheet
              : href === '/'
                ? pathname === '/'
                : pathname.startsWith(href);
            const navLabel = locale === 'ne' ? labelNe : label;

            if (isMe) {
              return (
                <button
                  key="me"
                  onClick={handleMeTap}
                  className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                    isActive ? '' : 'opacity-50 hover:opacity-75'
                  }`}
                  aria-label={navLabel}
                  title={navLabel}
                >
                  <div className={`rounded-xl p-1 transition-colors ${
                    isActive ? 'bg-primary-500/15' : ''
                  }`}>
                    <Icon className={`h-[18px] w-[18px] transition-colors ${
                      isActive ? 'text-primary-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <span
                    className={`text-[9px] font-medium leading-none transition-colors ${
                      isActive ? 'text-primary-300' : 'text-gray-500'
                    }`}
                  >
                    {navLabel}
                  </span>
                  {isActive && (
                    <span
                      className="absolute -top-px left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-primary-400"
                      style={{ boxShadow: '0 0 8px rgba(96,165,250,0.5)' }}
                    />
                  )}
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setShowMeSheet(false)}
                className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                  isActive ? '' : 'opacity-50 hover:opacity-75'
                }`}
                aria-label={navLabel}
                title={navLabel}
              >
                <div className={`relative rounded-xl p-1 transition-colors ${
                  isActive ? 'bg-primary-500/15' : ''
                }`}>
                  <Icon className={`h-5 w-5 transition-colors ${
                    isActive ? 'text-primary-400' : 'text-gray-400'
                  }`} />
                  {hasPulse && (
                    <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${pulseDotColor}`} />
                  )}
                </div>
                <span
                  className={`text-[9px] font-medium leading-none transition-colors ${
                    isActive ? 'text-primary-300' : 'text-gray-500'
                  }`}
                >
                  {navLabel}
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
    </>
  );
}

/* ─── Me Sheet Link ─── */

function MeSheetLink({
  href,
  icon: Icon,
  label,
  onClick,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary-500/15 text-primary-300'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
