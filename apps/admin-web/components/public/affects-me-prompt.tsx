'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/stores/preferences';
import { useAllPromises } from '@/lib/hooks/use-promises';
import { categorizePromises } from '@/lib/utils/geo-relevance';

/**
 * Embeddable prompt that either:
 * - Shows "Set your location" CTA if hometown not set
 * - Shows "X promises directly affect {province}" if set
 */
export function AffectsMePrompt() {
  const { t, locale } = useI18n();
  const { province, district, hasSetHometown, setShowPicker } = usePreferencesStore();
  const { data: allPromises } = useAllPromises();

  const directCount = useMemo(() => {
    if (!allPromises || !province) return 0;
    const { direct } = categorizePromises(allPromises, province, district);
    return direct.length;
  }, [allPromises, province, district]);

  if (!hasSetHometown) {
    return (
      <div className="glass-card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300">
            {t('affectsMe.setLocation')}
          </p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary-500/15 text-primary-400 text-xs font-medium hover:bg-primary-500/25 transition-colors"
        >
          {t('affectsMe.changeLocation')}
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/affects-me"
      className="glass-card p-4 flex items-center gap-3 hover:bg-white/[0.04] transition-all group"
    >
      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
        <Target className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium group-hover:text-primary-300 transition-colors">
          <span className="text-emerald-400 font-bold">{directCount}</span>{' '}
          {t('affectsMe.promisesAffectYou')}
        </p>
        <p className="text-xs text-gray-500">
          {locale === 'ne' ? t(`province.${province}`) : province}
          {district && `, ${district}`}
        </p>
      </div>
    </Link>
  );
}
