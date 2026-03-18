'use client';

import Link from 'next/link';
import { Mountain } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const quickLinkKeys = [
  { href: '/explore', labelKey: 'nav.home' },
  { href: '/explore/projects', labelKey: 'nav.projects' },
  { href: '/explore/map', labelKey: 'nav.map' },
  { href: '/explore/chat', labelKey: 'nav.chat' },
];

export function Footer() {
  const t = useTranslation();

  return (
    <footer className="border-t border-white/[0.06] bg-np-surface/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Left — Branding */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Mountain className="h-5 w-5 text-primary-400" />
              <span className="text-base font-semibold tracking-tight">
                Nepal Najar
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              {t('footer.brandDesc')}
            </p>
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
                    className="text-sm text-gray-500 transition-colors hover:text-primary-400"
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
              {t('footer.missionText')}
            </p>
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
