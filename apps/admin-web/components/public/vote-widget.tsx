'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useVotingStore } from '@/lib/stores/voting';
import { getDeviceFingerprint } from '@/lib/utils/device-fingerprint';
import { isFromNepal } from '@/lib/utils/geo-check';
import { useI18n } from '@/lib/i18n';

interface VoteWidgetProps {
  promiseId: string;
  /** 'compact' for promise cards, 'full' for detail page */
  variant?: 'compact' | 'full';
}

export function VoteWidget({ promiseId, variant = 'compact' }: VoteWidgetProps) {
  const { t, locale } = useI18n();
  const { votes, castVote, removeVote, getAggregates, deviceId, setDeviceId, geoVerified, setGeoVerified } = useVotingStore();
  const [checking, setChecking] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState<'up' | 'down' | null>(null);

  const currentVote = votes[promiseId] ?? null;
  const aggregates = getAggregates(promiseId);
  const totalVotes = aggregates.up + aggregates.down;

  // Initialize device fingerprint
  useEffect(() => {
    if (!deviceId) {
      setDeviceId(getDeviceFingerprint());
    }
  }, [deviceId, setDeviceId]);

  const handleVote = useCallback(async (vote: 'up' | 'down') => {
    // Toggle off if same vote
    if (currentVote === vote) {
      removeVote(promiseId);
      return;
    }

    // Check geo if not yet verified
    if (geoVerified === null) {
      setChecking(true);
      setGeoError(null);
      try {
        const result = await isFromNepal();
        setGeoVerified(result.isNepal);
        if (!result.isNepal) {
          setGeoError(
            locale === 'ne'
              ? 'मतदान नेपालबाट मात्र उपलब्ध छ'
              : 'Voting is available from Nepal only'
          );
          setChecking(false);
          return;
        }
      } catch {
        // If geo-check fails, allow voting (graceful degradation)
        setGeoVerified(true);
      }
      setChecking(false);
    } else if (geoVerified === false) {
      setGeoError(
        locale === 'ne'
          ? 'मतदान नेपालबाट मात्र उपलब्ध छ'
          : 'Voting is available from Nepal only'
      );
      return;
    }

    castVote(promiseId, vote);
    setJustVoted(vote);
    setTimeout(() => setJustVoted(null), 600);
  }, [currentVote, geoVerified, promiseId, castVote, removeVote, setGeoVerified, locale]);

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote('up'); }}
          disabled={checking}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-200 ${
            currentVote === 'up'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent'
          } ${justVoted === 'up' ? 'scale-110' : ''}`}
        >
          {checking ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ThumbsUp className="w-3 h-3" />
          )}
          <span className="tabular-nums">{formatCount(aggregates.up)}</span>
        </button>

        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote('down'); }}
          disabled={checking}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-200 ${
            currentVote === 'down'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent'
          } ${justVoted === 'down' ? 'scale-110' : ''}`}
        >
          <ThumbsDown className="w-3 h-3" />
          <span className="tabular-nums">{formatCount(aggregates.down)}</span>
        </button>

        {geoError && (
          <span className="text-[9px] text-red-400/70 ml-1">{geoError}</span>
        )}
      </div>
    );
  }

  // Full variant — for detail page
  const upPercent = totalVotes > 0 ? Math.round((aggregates.up / totalVotes) * 100) : 50;

  return (
    <div className="glass-card p-5">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">
        {locale === 'ne' ? 'जनमत' : 'Public Sentiment'}
      </h4>

      {/* Vote buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => handleVote('up')}
          disabled={checking}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            currentVote === 'up'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30'
          } ${justVoted === 'up' ? 'scale-105' : ''}`}
        >
          {checking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ThumbsUp className="w-4 h-4" />
          )}
          <span className="tabular-nums">{formatCount(aggregates.up)}</span>
        </button>

        <button
          onClick={() => handleVote('down')}
          disabled={checking}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            currentVote === 'down'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
              : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30'
          } ${justVoted === 'down' ? 'scale-105' : ''}`}
        >
          <ThumbsDown className="w-4 h-4" />
          <span className="tabular-nums">{formatCount(aggregates.down)}</span>
        </button>
      </div>

      {/* Sentiment bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-emerald-400"
          style={{ width: `${upPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>{upPercent}% {locale === 'ne' ? 'सहमत' : 'approve'}</span>
        <span>
          {formatCount(totalVotes)} {locale === 'ne' ? 'मत' : 'votes'}
          {aggregates.verifiedUp + aggregates.verifiedDown > 0 && (
            <span className="text-primary-400/60 ml-1">
              ({formatCount(aggregates.verifiedUp + aggregates.verifiedDown)} {locale === 'ne' ? 'प्रमाणित' : 'verified'})
            </span>
          )}
        </span>
      </div>

      {geoError && (
        <p className="text-xs text-red-400/80 mt-3 text-center">{geoError}</p>
      )}
    </div>
  );
}
