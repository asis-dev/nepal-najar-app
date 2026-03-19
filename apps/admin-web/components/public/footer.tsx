'use client';

import Link from 'next/link';
import { Eye, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { NepalFlagIcon } from '@/components/ui/nepal-flag-icon';

const quickLinkKeys = [
  { href: '/explore', labelKey: 'nav.home' },
  { href: '/explore/projects', labelKey: 'nav.projects' },
  { href: '/explore/map', labelKey: 'nav.map' },
  { href: '/explore/first-100-days', labelKey: 'nav.first100Days' },
];

export function Footer() {
  const t = useTranslation();

  return (
    <footer className="border-t border-white/[0.06] bg-np-surface/60">
      {/* Crimson accent at top of footer */}
      <div className="accent-crimson" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Left — Branding */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <NepalFlagIcon size={20} />
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-semibold tracking-tight">
                  Nepal <span className="text-nepal-red">Najar</span>
                </span>
                <span className="text-xs font-nepali text-gray-500">नजर</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              {t('footer.brandDesc')}
            </p>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Trust rule</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                Official, discovered, public, and inferred signals stay separate so people can see what is confirmed and what still needs scrutiny.
              </p>
            </div>
            {/* Participation counter */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
              <Users className="h-3.5 w-3.5 text-primary-400" />
              <span className="text-xs text-gray-500">
                <span className="text-gray-300 font-medium">2,847</span> citizens actively watching
              </span>
            </div>
          </div>

          {/* Center — Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              {t('footer.quickLinks')}
            </h4>
            <ul className="space-y-2">
              {quickLinkKeys.map(({ href, labelKey }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-gray-500 transition-colors hover:text-nepal-red"
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — Mission */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              {t('footer.ourMission')}
            </h4>
            <p className="text-sm leading-relaxed text-gray-500">
              The public eye on Balen&apos;s Nepal. Track promises, projects, delays, and district-level change with source-backed civic intelligence.
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <Eye className="h-3.5 w-3.5 text-nepal-red" />
              <span className="text-xs text-gray-600 italic">
                High-altitude civic intelligence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.04] bg-np-base/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-600">
            &copy; {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
