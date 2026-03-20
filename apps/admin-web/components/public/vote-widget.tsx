'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, Star, CheckCircle2 } from 'lucide-react';
import { useVotingStore } from '@/lib/stores/voting';
import { useAuth } from '@/lib/hooks/use-auth';
import { getDeviceFingerprint } from '@/lib/utils/device-fingerprint';
import { isFromNepal } from '@/lib/utils/geo-check';
import { useI18n } from '@/lib/i18n';

interface VoteWidgetProps {
  promiseId: string;
  /** 'compact' for promise cards, 'full' for detail page */
  variant?: 'compact' | 'full';
}

export function VoteWidget({ promiseId, variant = 'compact' }: VoteWidgetProps) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const {
    votes,
    priorityVotes,
    castVote,
    removeVote,
    castPriorityVote,
    removePriorityVote,
    getAggregates,
    fetchAggregates,
    deviceId,
    setDeviceId,
    geoVerified,
    setGeoVerified,
  } = useVotingStore();
  const [checking, setChecking] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState<'up' | 'down' | null>(null);
  const [priorityLoading, setPriorityLoading] = useState(false);

  const currentVote = votes[promiseId] ?? null;
  const hasPriority = priorityVotes[promiseId] ?? false;
  const aggregates = getAggregates(promiseId);
  const totalVotes = aggregates.up + aggregates.down;

  // Initialize device fingerprint
  useEffect(() => {
    if (!deviceId) {
      setDeviceId(getDeviceFingerprint());
    }
  }, [deviceId, setDeviceId]);

  // Fetch aggregates from API on mount
  useEffect(() => {
    fetchAggregates(promiseId);
  }, [promiseId, fetchAggregates]);

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
          setGeoError(t('voting.fromNepalOnly'));
          setChecking(false);
          return;
        }
      } catch {
        // If geo-check fails, allow voting (graceful degradation)
        setGeoVerified(true);
      }
      setChecking(false);
    } else if (geoVerified === false) {
      setGeoError(t('voting.fromNepalOnly'));
      return;
    }

    castVote(promiseId, vote);
    setJustVoted(vote);
    setTimeout(() => setJustVoted(null), 600);

    // Sync with server
    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_type: 'promise',
          topic_id: promiseId,
          vote_type: vote,
          device_fingerprint: deviceId,
          geo_verified: geoVerified ?? false,
        }),
      });
      // Refetch aggregates after voting
      fetchAggregates(promiseId);
    } catch { /* silent fail — local state already updated */ }
  }, [currentVote, geoVerified, promiseId, castVote, removeVote, setGeoVerified, deviceId, fetchAggregates, t]);

  const handlePriority = useCallback(async () => {
    if (!isAuthenticated) return;
    setPriorityLoading(true);

    try {
      if (hasPriority) {
        // Remove priority — cast a neutral vote to clear it
        removePriorityVote(promiseId);
      } else {
        // Cast priority vote via API
        const res = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic_type: 'promise',
            topic_id: promiseId,
            vote_type: 'priority',
            device_fingerprint: deviceId,
            geo_verified: geoVerified ?? false,
          }),
        });

        if (res.ok) {
          castPriorityVote(promiseId);
          fetchAggregates(promiseId);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setPriorityLoading(false);
    }
  }, [isAuthenticated, hasPriority, promiseId, deviceId, geoVerified, castPriorityVote, removePriorityVote, fetchAggregates]);

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        {isAuthenticated && (
          <span className="flex items-center gap-0.5 text-[9px] text-emerald-400/80 mr-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Verified
          </span>
        )}

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

        {isAuthenticated && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePriority(); }}
            disabled={priorityLoading}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-200 ${
              hasPriority
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent'
            }`}
          >
            {priorityLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Star className={`w-3 h-3 ${hasPriority ? 'fill-amber-400' : ''}`} />
            )}
          </button>
        )}

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
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-300">
          {t('voting.publicSentiment')}
        </h4>
        {isAuthenticated && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Verified Citizen
          </span>
        )}
      </div>

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

      {/* Priority button — only for authenticated users */}
      {isAuthenticated && (
        <button
          onClick={() => handlePriority()}
          disabled={priorityLoading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 mb-4 ${
            hasPriority
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30'
          }`}
        >
          {priorityLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Star className={`w-4 h-4 ${hasPriority ? 'fill-amber-400' : ''}`} />
          )}
          {hasPriority ? 'Prioritized' : 'Prioritize This'}
        </button>
      )}

      {/* Priority count */}
      {aggregates.priorityCount > 0 && (
        <p className="text-[10px] text-amber-400/70 text-center mb-3">
          <Star className="w-2.5 h-2.5 inline fill-amber-400/70 mr-0.5" />
          {formatCount(aggregates.priorityCount)} {aggregates.priorityCount === 1 ? 'citizen prioritizes' : 'citizens prioritize'} this
        </p>
      )}

      {/* Sentiment bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-emerald-400"
          style={{ width: `${upPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>{upPercent}% {t('voting.approve')}</span>
        <span>
          {formatCount(totalVotes)} {t('voting.votes')}
          {aggregates.verifiedUp + aggregates.verifiedDown > 0 && (
            <span className="text-primary-400/60 ml-1">
              ({formatCount(aggregates.verifiedUp + aggregates.verifiedDown)} {t('voting.verified')})
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
