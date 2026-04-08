'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Newspaper, TrendingUp, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ShareMenu } from '@/components/public/share-menu';
import { commitmentShareText } from '@/lib/utils/share';
import type { WorkingPromise } from '@/lib/hooks/use-accountability';

interface WhatsWorkingProps {
  promises: WorkingPromise[];
}

function confidenceBadge(confidence: string | null) {
  if (!confidence) return null;
  const colors: Record<string, string> = {
    high: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    medium: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    low: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  };
  return (
    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors[confidence] ?? colors.low}`}>
      {confidence}
    </span>
  );
}

export function WhatsWorkingSection({ promises }: WhatsWorkingProps) {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  // Helper for relative time using t() keys
  function relativeTime(date: string | null): string {
    if (!date) return t('accountability.unknown');
    if (nowMs === null) return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const diff = nowMs - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return t('accountability.justNow');
    if (hours < 24) return t('accountability.hoursAgo').replace('{hours}', String(hours));
    const days = Math.floor(hours / 24);
    if (days < 7) return t('accountability.daysAgo').replace('{days}', String(days));
    const weeks = Math.floor(days / 7);
    return t('accountability.weeksAgo').replace('{weeks}', String(weeks));
  }

  if (promises.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-gray-500 text-sm">
          {t('accountability.noEvidence')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">
          {t('accountability.whatsWorking')}
        </h3>
        <span className="text-xs text-gray-500 ml-auto">
          {promises.length} {t('accountability.promises')}
        </span>
      </div>

      <div className="grid w-full min-w-0 max-w-full gap-3 overflow-hidden sm:grid-cols-2">
        {promises.map((p) => (
          <Link
            key={p.id}
            href={`/explore/first-100-days/${p.id}`}
            className="glass-card group block w-full min-w-0 max-w-full overflow-hidden border-l-2 border-emerald-500/50 p-3 transition-all duration-200 hover:border-emerald-400 hover:bg-white/[0.03] sm:p-4"
          >
            {/* Header */}
            <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
              <h4 className="min-w-0 flex-1 break-words text-sm font-medium text-gray-200 line-clamp-2 transition-colors group-hover:text-white">
                {isNe && p.title_ne ? p.title_ne : p.title}
              </h4>
              <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                <ShareMenu
                  shareUrl={`/explore/first-100-days/${p.id}`}
                  shareText={commitmentShareText({ title: isNe && p.title_ne ? p.title_ne : p.title, progress: p.progress, status: 'in_progress', locale })}
                  shareTitle={isNe && p.title_ne ? p.title_ne : p.title}
                  size="sm"
                  ogParams={{
                    ogType: 'commitment',
                    ogSlug: p.id,
                    ogTitle: isNe && p.title_ne ? p.title_ne : p.title,
                    ogSection: 'commitments',
                    ogProgress: p.progress,
                    ogStatus: 'in_progress',
                    ogLocale: locale,
                  }}
                />
                <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-primary-400 transition-colors" />
              </div>
            </div>

            {/* Category + Progress */}
            <div className="mb-3 flex min-w-0 items-center gap-2">
              <span className="shrink-0 truncate text-[10px] uppercase tracking-wider text-gray-500">
                {t(`categoryName.${p.category}`)}
              </span>
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500/60 transition-all duration-700"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 tabular-nums">{p.progress}%</span>
            </div>

            {/* Latest article */}
            <div className="flex items-center gap-2 min-w-0">
              <Newspaper className="w-3 h-3 text-gray-600 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate min-w-0">
                {p.latestHeadline || t('accountability.articleAvailable')}
              </span>
            </div>

            {/* Footer: article count + confidence + time */}
            <div className="flex items-center gap-2 mt-2 min-w-0">
              <span className="text-[10px] text-emerald-400/80 font-medium">
                <TrendingUp className="w-3 h-3 inline mr-0.5" />
                {p.articleCount} {t('accountability.articles')}
              </span>
              {confidenceBadge(p.confidence)}
              <span className="text-[10px] text-gray-600 ml-auto">
                {relativeTime(p.latestDate)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
