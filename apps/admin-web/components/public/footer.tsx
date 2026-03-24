'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { NepalNajarMark } from '@/components/ui/nepal-najar-mark';

/* ─── Link data ─── */

const exploreLinks = [
  { href: '/explore/first-100-days', label: 'Tracker' },
  { href: '/report-card', label: 'Report Card' },
  { href: '/explore/government', label: 'Government' },
  { href: '/trending', label: 'Trending' },
];

const communityLinks = [
  { href: '/evidence', label: 'Submit Evidence' },
  { href: '/verifier-applications', label: 'Apply as Verifier' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/how-it-works', label: 'How It Works' },
];

const resourceLinks = [
  { href: '/how-it-works', label: 'About' },
  { href: '/how-it-works#faq', label: 'FAQ' },
  { href: '/api/v1', label: 'API' },
  { href: '/privacy', label: 'Privacy Policy' },
];

const connectLinks = [
  { href: 'https://x.com/nepalnajar', label: 'X / Twitter', external: true },
  { href: 'https://facebook.com/nepalnajar', label: 'Facebook', external: true },
  { href: 'https://reddit.com/r/nepalnajar', label: 'Reddit', external: true },
  { href: 'https://github.com/nepalnajar', label: 'GitHub', external: true },
];

/* ─── Link column component ─── */

function FooterColumn({ title, links }: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map(({ href, label, external }) => (
          <li key={href + label}>
            {external ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 transition-colors hover:text-gray-300"
              >
                {label}
              </a>
            ) : (
              <Link
                href={href}
                className="text-xs text-gray-500 transition-colors hover:text-gray-300"
              >
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Footer ─── */

export function Footer() {
  const { locale, setLocale } = useI18n();

  return (
    <footer className="relative z-20 border-t border-white/5 bg-black/40">
      <div className="public-shell px-4 py-6 sm:px-6 sm:py-8">
        {/* Top: Brand + tagline */}
        <div className="mb-6 text-center sm:mb-8">
          <div className="inline-block">
            <NepalNajarMark compact />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            The nation&apos;s report card.
          </p>
        </div>

        {/* Link grid: 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          <FooterColumn title="Explore" links={exploreLinks} />
          <FooterColumn title="Community" links={communityLinks} />
          <div className="hidden lg:block">
            <FooterColumn title="Resources" links={resourceLinks} />
          </div>
          <div className="hidden lg:block">
            <FooterColumn title="Connect" links={connectLinks} />
          </div>
        </div>

        {/* Bottom bar: language toggle + legal */}
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-white/5 pt-5 sm:mt-8 sm:flex-row sm:justify-center sm:gap-2">
          {/* Language toggle */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setLocale('en')}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                locale === 'en'
                  ? 'bg-white/10 text-gray-200'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              EN
            </button>
            <span className="text-gray-700">|</span>
            <button
              onClick={() => setLocale('ne')}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                locale === 'ne'
                  ? 'bg-white/10 text-gray-200'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              ने
            </button>
          </div>

          <span className="hidden text-gray-700 sm:inline">&middot;</span>

          <span className="text-[11px] text-gray-600">
            &copy; 2026 Nepal Najar
          </span>

          <span className="hidden text-gray-700 sm:inline">&middot;</span>

          <span className="text-[11px] text-gray-600">
            Made with ❤️ for Nepal
          </span>
        </div>
      </div>
    </footer>
  );
}
