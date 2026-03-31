'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { GhantiIcon } from '@/components/ui/ghanti-icon';
import { CardActions } from '@/components/public/card-actions';
import { commitmentShareText } from '@/lib/utils/share';
import { STATUS_CONFIG } from '@/lib/data/landing-types';
import type { GovernmentPromise } from '@/lib/data/promises';

export function FeedCommitmentCard({
  commitment,
  isTrending,
  locale,
  showNewDot,
  commentCount,
}: {
  commitment: GovernmentPromise;
  isTrending: boolean;
  locale: string;
  showNewDot?: boolean;
  commentCount?: number;
}) {
  const { t } = useI18n();
  const title = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
  const category = locale === 'ne' && commitment.category_ne ? commitment.category_ne : commitment.category;
  const summary = locale === 'ne' && commitment.summary_ne
    ? commitment.summary_ne
    : commitment.summary || commitment.description;
  const statusCfg = STATUS_CONFIG[commitment.status] ?? STATUS_CONFIG.not_started;

  return (
    <Link
      href={`/explore/first-100-days/${commitment.slug}`}
      className="glass-card-hover block p-3 md:p-5 transition-opacity duration-200 relative"
    >
      {showNewDot && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isTrending && (
              <span className="trending-badge">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
                </span>
                {t('home.trending').toLowerCase()}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
              {category}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-gray-100 sm:text-base">
            {title}
          </h3>
          {summary && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-400 sm:text-sm">
              {summary}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500">
        <span className={`inline-flex items-center gap-1.5 ${statusCfg.text}`}>
          <GhantiIcon status={commitment.status} size="xs" />
          {t(statusCfg.labelKey)}
        </span>
        {commitment.progress > 0 && (
          <span>{commitment.progress}%</span>
        )}
        {commitment.evidenceCount > 0 && (
          <span>{commitment.evidenceCount} {t('home.sources')}</span>
        )}
        {commitment.lastActivitySignalCount != null && commitment.lastActivitySignalCount > 0 && (
          <span className="text-cyan-400">{commitment.lastActivitySignalCount} {t('home.signals')}</span>
        )}
      </div>

      {/* Progress bar + Share */}
      <div className="mt-2.5 flex items-center gap-2">
        {commitment.progress > 0 && (
          <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${commitment.progress}%`,
                background: commitment.status === 'stalled'
                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                  : commitment.status === 'delivered'
                    ? 'linear-gradient(90deg, #059669, #10b981)'
                    : 'linear-gradient(90deg, #2563eb, #06b6d4)',
              }}
            />
          </div>
        )}
        {!commitment.progress && <div className="flex-1" />}
        <CardActions
          commitmentId={commitment.id}
          shareTitle={commitmentShareText({ title, progress: commitment.progress, status: commitment.status, locale })}
          shareUrl={`/explore/first-100-days/${commitment.slug}`}
          detailUrl={`/explore/first-100-days/${commitment.slug}`}
          commentCount={commentCount}
          size="sm"
        />
      </div>
    </Link>
  );
}
