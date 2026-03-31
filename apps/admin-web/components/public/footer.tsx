'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { RepublicMark } from '@/components/ui/ghanti-card-mark';
import { ExternalLink } from 'lucide-react';

export function Footer() {
  const { locale, setLocale, t } = useI18n();

  const links = [
    { href: '/explore/first-100-days', label: locale === 'ne' ? 'ट्र्याकर' : 'Tracker' },
    { href: '/scorecard', label: locale === 'ne' ? 'स्कोरकार्ड' : 'Scorecard' },
    { href: '/report-card', label: locale === 'ne' ? 'रिपोर्ट कार्ड' : 'Report Card' },
    { href: '/corruption', label: locale === 'ne' ? 'भ्रष्टाचार' : 'Corruption' },
    { href: '/complaints', label: t('nav.complaints') },
    { href: '/daily', label: locale === 'ne' ? 'दैनिक ब्रिफ' : 'Daily Brief' },
    { href: '/trending', label: locale === 'ne' ? 'ट्रेन्डिङ' : 'Trending' },
    { href: '/about', label: t('footer.about') },
    { href: '/how-it-works', label: locale === 'ne' ? 'कसरी काम गर्छ' : 'How It Works' },
    { href: '/feedback', label: locale === 'ne' ? 'प्रतिक्रिया' : 'Feedback' },
  ];

  const social = [
    { href: 'https://x.com/nepalrepublic', label: 'X' },
    { href: 'https://facebook.com/nepalrepublic', label: 'Facebook' },
    { href: 'https://reddit.com/r/nepalrepublic', label: 'Reddit' },
  ];

  return (
    <footer className="relative z-20 border-t border-white/[0.06] bg-[#060810]">
      <div className="public-shell px-4 py-6 sm:px-6">
        {/* Centered brand */}
        <div className="flex flex-col items-center text-center mb-5">
          <RepublicMark compact />
          <p className="mt-1.5 text-[11px] text-gray-600 max-w-[280px]">
            {t('brand.taglineFull')}
          </p>
        </div>

        {/* Links — compact inline flow */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
          ))}
        </div>

        {/* Social */}
        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-600">
          {social.map(s => (
            <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{s.label}</a>
          ))}
        </div>

        {/* Bottom line */}
        <div className="mt-4 flex items-center justify-center gap-3 border-t border-white/[0.04] pt-3 text-[10px] text-gray-700">
          <div className="flex items-center gap-0.5">
            <button onClick={() => setLocale('en')} className={`rounded px-1.5 py-0.5 transition-colors ${locale === 'en' ? 'bg-white/[0.08] text-gray-400' : 'hover:text-gray-500'}`}>EN</button>
            <span>|</span>
            <button onClick={() => setLocale('ne')} className={`rounded px-1.5 py-0.5 transition-colors ${locale === 'ne' ? 'bg-white/[0.08] text-gray-400' : 'hover:text-gray-500'}`}>ने</button>
          </div>
          <span>&copy; 2026 Nepal Republic</span>
          <span className="flex items-center gap-1 text-emerald-500/60 font-medium">
            <span className="h-1 w-1 rounded-full bg-emerald-500/80" />
            {t('brand.poweredByAI')}
          </span>
        </div>
      </div>
    </footer>
  );
}
