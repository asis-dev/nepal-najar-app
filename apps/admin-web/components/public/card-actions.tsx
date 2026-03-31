'use client';

import { Heart, Share } from 'lucide-react';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { shareOrCopy } from '@/lib/utils/share';

interface CardActionsProps {
  /** Commitment ID for watchlist */
  commitmentId?: string;
  /** Share text */
  shareTitle: string;
  /** Share URL path (e.g. /explore/first-100-days/slug) */
  shareUrl: string;
  /** Optional extra share context */
  shareText?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function CardActions({ commitmentId, shareTitle, shareUrl, shareText, size = 'sm' }: CardActionsProps) {
  const { watchedProjectIds, toggleWatch } = useWatchlistStore();
  const isWatched = commitmentId ? watchedProjectIds.includes(commitmentId) : false;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const btnClass = 'shrink-0 p-1.5 rounded-lg transition-colors';

  return (
    <div className="flex items-center gap-0.5">
      {commitmentId && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWatch(commitmentId);
          }}
          className={`${btnClass} ${isWatched ? 'text-rose-400' : 'text-gray-600 hover:text-rose-400'} hover:bg-white/[0.06]`}
          aria-label={isWatched ? 'Unfollow' : 'Follow'}
        >
          <Heart className={`${iconSize} ${isWatched ? 'fill-current' : ''}`} />
        </button>
      )}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const fullUrl = `${window.location.origin}${shareUrl}`;
          shareOrCopy({ title: shareTitle, text: shareText || shareTitle, url: fullUrl });
        }}
        className={`${btnClass} text-gray-600 hover:text-gray-300 hover:bg-white/[0.06]`}
        aria-label="Share"
      >
        <Share className={iconSize} />
      </button>
    </div>
  );
}
