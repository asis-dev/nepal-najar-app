'use client';

import Link from 'next/link';
import { Eye, ShieldCheck, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { NepalNajarMark } from '@/components/ui/nepal-najar-mark';

const quickLinkKeys = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/explore/projects', labelKey: 'nav.projects' },
  { href: '/explore/map', labelKey: 'nav.map' },
  { href: '/explore/first-100-days', labelKey: 'nav.first100Days' },
];

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-white/[0.06] bg-np-surface/60">
      <div className="accent-crimson" />

      <div className="public-shell py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <NepalNajarMark />
            <p className="text-sm leading-relaxed text-gray-500">
              {t('footer.brandDesc')}
            </p>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{t('footer.trustRule')}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                {t('footer.trustRuleDesc')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.04] pt-3">
              <Users className="h-3.5 w-3.5 text-primary-400" />
              <span className="text-xs text-gray-500">
                <span className="text-gray-300 font-medium">2,847</span> {t('footer.citizensWatching')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-gray-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                {t('footer.civicClarity')}
              </span>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wider text-gray-400">
                {t('footer.quickLinks')}
              </h4>
              <ul className="grid gap-2">
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

            <div className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wider text-gray-400">
                {t('footer.ourMission')}
              </h4>
              <p className="text-sm leading-relaxed text-gray-500">
                {t('footer.missionDesc')}
              </p>
              <div className="grid gap-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Official</p>
                  <p className="mt-1 text-sm text-gray-300">{t('trustLane.officialDesc')}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Public</p>
                  <p className="mt-1 text-sm text-gray-300">{t('trustLane.publicDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Eye className="h-3.5 w-3.5 text-nepal-red" />
                <span className="text-xs text-gray-600 italic">
                  {t('footer.tagline')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.04] bg-np-base/50">
        <div className="public-shell py-4">
          <p className="text-center text-xs text-gray-600">
            &copy; {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
