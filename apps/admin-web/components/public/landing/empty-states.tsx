'use client';

import { Heart, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function FollowingEmptyState({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
        <Heart className="h-6 w-6 text-gray-500" />
      </div>
      <p className="text-sm font-medium text-gray-300 mb-1">
        {t('home.notFollowingTitle')}
      </p>
      <p className="text-xs text-gray-500 mb-5">
        {t('home.notFollowingDesc')}
      </p>
      <button
        onClick={onBrowse}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-white/[0.08] hover:text-white"
      >
        {t('home.browseAll')}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function TrendingEmptyState() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-sm text-gray-400">
        {t('home.noTrending')}
      </p>
    </div>
  );
}
