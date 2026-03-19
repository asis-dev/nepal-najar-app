'use client';

import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useVotingStore } from '@/lib/stores/voting';
import { getDeviceFingerprint } from '@/lib/utils/device-fingerprint';
import { isFromNepal } from '@/lib/utils/geo-check';
import { promises as staticPromises } from '@/lib/data/promises';
import type { VoteAggregate } from '@/lib/hooks/use-accountability';

interface PublicVoiceProps {
  voteAggregates: VoteAggregate[];
}

export function PublicVoiceSection({ voteAggregates }: PublicVoiceProps) {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';
  const { votes, castVote, removeVote, deviceId, setDeviceId, geoVerified, setGeoVerified } = useVotingStore();

  const [voting, setVoting] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Merge server votes with local votes for optimistic display
  const voteMap = new Map<string, { up: number; down: number }>();
  for (const agg of voteAggregates) {
    voteMap.set(agg.topicId, { up: agg.up, down: agg.down });
  }

  // Sort promises by net votes (from server), then by ID
  const sortedPromises = [...staticPromises].sort((a, b) => {
    const aVotes = voteMap.get(a.id);
    const bVotes = voteMap.get(b.id);
    const aNet = (aVotes?.up ?? 0) - (aVotes?.down ?? 0);
    const bNet = (bVotes?.up ?? 0) - (bVotes?.down ?? 0);
    return bNet - aNet;
  });

  const handleVote = useCallback(
    async (promiseId: string, voteType: 'up' | 'down') => {
      const currentVote = votes[promiseId] ?? null;

      // Toggle off
      if (currentVote === voteType) {
        removeVote(promiseId);
        return;
      }

      // Geo check
      if (geoVerified === null) {
        setVoting(promiseId);
        setGeoError(null);
        try {
          const result = await isFromNepal();
          setGeoVerified(result.isNepal);
          if (!result.isNepal) {
            setGeoError(t('voting.fromNepalOnly'));
            setVoting(null);
            return;
          }
        } catch {
          setGeoVerified(true); // graceful degradation
        }
        setVoting(null);
      } else if (geoVerified === false) {
        setGeoError(t('voting.fromNepalOnly'));
        return;
      }

      // Cast vote locally
      castVote(promiseId, voteType);

      // Persist to server (fire and forget)
      const fingerprint = deviceId || getDeviceFingerprint();
      if (!deviceId) setDeviceId(fingerprint);

      fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_type: 'promise',
          topic_id: promiseId,
          vote_type: voteType,
          device_fingerprint: fingerprint,
          geo_verified: geoVerified ?? false,
        }),
      }).catch(() => {
        // Silent fail — local vote still works
      });
    },
    [votes, castVote, removeVote, geoVerified, setGeoVerified, deviceId, setDeviceId, t],
  );

  const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-primary-400" />
        <h3 className="text-lg font-semibold text-white">
          {t('accountability.publicVoice')}
        </h3>
        <span className="text-xs text-gray-500 ml-auto">
          {t('accountability.whatMatters')}
        </span>
      </div>

      {geoError && (
        <div className="glass-card p-3 border border-red-500/20 text-center">
          <p className="text-xs text-red-400">{geoError}</p>
        </div>
      )}

      <div className="space-y-2">
        {sortedPromises.map((promise) => {
          const currentVote = votes[promise.id] ?? null;
          const serverVotes = voteMap.get(promise.id) ?? { up: 0, down: 0 };
          // Optimistic: add local vote to server counts
          let up = serverVotes.up;
          let down = serverVotes.down;
          if (currentVote === 'up') up = Math.max(up, 1);
          if (currentVote === 'down') down = Math.max(down, 1);
          const total = up + down;
          const upPct = total > 0 ? Math.round((up / total) * 100) : 50;
          const isVoting = voting === promise.id;

          return (
            <div
              key={promise.id}
              className="glass-card p-3 sm:p-4 flex items-center gap-3 group hover:bg-white/[0.02] transition-colors"
            >
              {/* Vote buttons */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleVote(promise.id, 'up')}
                  disabled={isVoting}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    currentVote === 'up'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                </button>
                <span className="text-[10px] text-gray-500 tabular-nums font-medium">
                  {formatCount(up - down)}
                </span>
                <button
                  onClick={() => handleVote(promise.id, 'down')}
                  disabled={isVoting}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    currentVote === 'down'
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>

              {/* Promise info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-300 group-hover:text-gray-200 transition-colors line-clamp-1">
                  {isNe && promise.title_ne ? promise.title_ne : promise.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-600">
                    {t(`categoryName.${promise.category}`)}
                  </span>
                  {total > 0 && (
                    <>
                      <div className="flex-1 max-w-24 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/40"
                          style={{ width: `${upPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-600 tabular-nums">
                        {total} {t('accountability.votes')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
