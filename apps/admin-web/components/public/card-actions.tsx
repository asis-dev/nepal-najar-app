'use client';

import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { useI18n } from '@/lib/i18n';
import { ShareMenu } from '@/components/public/share-menu';
import type { ShareImageParams } from '@/lib/utils/share';

interface CardActionsProps extends ShareImageParams {
  /** Commitment ID for watchlist */
  commitmentId?: string;
  /** Minister slug for watchlist (reuses same watchlist store) */
  ministerSlug?: string;
  /** Share text — short description of what's being shared */
  shareTitle: string;
  /** Share URL path (e.g. /explore/first-100-days/slug) */
  shareUrl: string;
  /** Optional extra share context */
  shareText?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Number of approved comments */
  commentCount?: number;
  /** Number of follows (server-side, if available) */
  followCount?: number;
  /** Detail page URL for comment link (e.g. /explore/first-100-days/slug) */
  detailUrl?: string;
}

export function CardActions({
  commitmentId,
  ministerSlug,
  shareTitle,
  shareUrl,
  shareText,
  size = 'sm',
  commentCount,
  followCount,
  detailUrl,
  ogTitle,
  ogSubtitle,
  ogSection,
  ogProgress,
  ogStatus,
  ogFacts,
  ogType,
  ogSlug,
}: CardActionsProps) {
  const { locale } = useI18n();
  const { watchedProjectIds, toggleWatch } = useWatchlistStore();
  const heartId = commitmentId || (ministerSlug ? `minister:${ministerSlug}` : undefined);
  const isWatched = heartId ? watchedProjectIds.includes(heartId) : false;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const btnClass = 'shrink-0 p-1.5 rounded-lg transition-colors';
  const countClass = 'text-[10px] tabular-nums text-gray-500 -ml-0.5';

  const commentEl = (
    <>
      <MessageCircle className={iconSize} />
      {(commentCount ?? 0) > 0 && <span className={countClass}>{commentCount}</span>}
    </>
  );

  // Build OG params — prefer data-fetching routes (ogType+ogSlug) for rich images
  const ogParams = ogTitle
    ? { ogTitle, ogSubtitle, ogSection, ogProgress, ogStatus, ogFacts, ogLocale: locale, ogType, ogSlug }
    : undefined;

  return (
    <div className="flex items-center gap-0.5">
      {/* Heart / Follow */}
      {heartId && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWatch(heartId);
          }}
          className={`${btnClass} flex items-center gap-0.5 ${isWatched ? 'text-rose-400' : 'text-gray-600 hover:text-rose-400'} hover:bg-white/[0.06]`}
          aria-label={isWatched ? 'Unfollow' : 'Follow'}
        >
          <Heart className={`${iconSize} ${isWatched ? 'fill-current' : ''}`} />
          {(followCount ?? 0) > 0 && <span className={countClass}>{followCount}</span>}
        </button>
      )}

      {/* Comments */}
      {detailUrl ? (
        <Link
          href={`${detailUrl}#comments`}
          onClick={(e) => e.stopPropagation()}
          className={`${btnClass} flex items-center gap-0.5 text-gray-600 hover:text-gray-300 hover:bg-white/[0.06]`}
          aria-label="Comments"
        >
          {commentEl}
        </Link>
      ) : (
        <span className={`${btnClass} flex items-center gap-0.5 text-gray-600`}>
          {commentEl}
        </span>
      )}

      {/* Share menu with platform picker */}
      <ShareMenu
        shareUrl={shareUrl}
        shareText={shareText || shareTitle}
        shareTitle={shareTitle}
        ogParams={ogParams}
        size={size}
      />
    </div>
  );
}
