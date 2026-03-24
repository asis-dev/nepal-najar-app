'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useVotingStore } from '@/lib/stores/voting';
import { getDeviceFingerprint } from '@/lib/utils/device-fingerprint';

/**
 * Lightweight vote widget for signals/sources on the detail page.
 * Uses the existing /api/votes endpoint with topic_type = 'signal' | 'evidence'.
 * Represents: "Is this source accurate?"
 */
interface SourceVoteWidgetProps {
  targetType: 'signal' | 'evidence';
  targetId: string;
}

export function SourceVoteWidget({ targetType, targetId }: SourceVoteWidgetProps) {
  const { deviceId, setDeviceId, geoVerified } = useVotingStore();
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [counts, setCounts] = useState({ up: 0, down: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [justVoted, setJustVoted] = useState<'up' | 'down' | null>(null);

  // Storage key for anonymous tracking
  const storageKey = `src-vote:${targetType}:${targetId}`;

  // Initialize device fingerprint
  useEffect(() => {
    if (!deviceId) {
      setDeviceId(getDeviceFingerprint());
    }
  }, [deviceId, setDeviceId]);

  // Load local vote on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'up' || stored === 'down') setVote(stored);
    } catch {}
  }, [storageKey]);

  // Fetch aggregate counts
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/votes?topic_type=${targetType}&topic_id=${encodeURIComponent(targetId)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCounts({ up: data.up ?? 0, down: data.down ?? 0 });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [targetType, targetId]);

  const handleVote = useCallback(
    async (v: 'up' | 'down') => {
      // Toggle off if same vote
      if (vote === v) {
        setVote(null);
        try { localStorage.removeItem(storageKey); } catch {}
        setCounts((prev) => ({
          ...prev,
          [v]: Math.max(0, prev[v] - 1),
        }));
        return;
      }

      const oldVote = vote;
      setVote(v);
      setJustVoted(v);
      setTimeout(() => setJustVoted(null), 500);

      try { localStorage.setItem(storageKey, v); } catch {}

      // Optimistic update
      setCounts((prev) => ({
        up: prev.up + (v === 'up' ? 1 : 0) - (oldVote === 'up' ? 1 : 0),
        down: prev.down + (v === 'down' ? 1 : 0) - (oldVote === 'down' ? 1 : 0),
      }));

      // Sync to server
      setSubmitting(true);
      try {
        await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic_type: targetType,
            topic_id: targetId,
            vote_type: v,
            device_fingerprint: deviceId,
            geo_verified: geoVerified ?? false,
          }),
        });
      } catch {}
      setSubmitting(false);
    },
    [vote, storageKey, targetType, targetId, deviceId, geoVerified],
  );

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString());

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote('up'); }}
        disabled={submitting}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] transition-all duration-200 ${
          vote === 'up'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10'
        } ${justVoted === 'up' ? 'scale-110' : ''}`}
        title="Accurate"
      >
        <ThumbsUp className="w-2.5 h-2.5" />
        {counts.up > 0 && <span className="tabular-nums">{fmt(counts.up)}</span>}
      </button>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote('down'); }}
        disabled={submitting}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] transition-all duration-200 ${
          vote === 'down'
            ? 'bg-red-500/15 text-red-400'
            : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
        } ${justVoted === 'down' ? 'scale-110' : ''}`}
        title="Inaccurate"
      >
        <ThumbsDown className="w-2.5 h-2.5" />
        {counts.down > 0 && <span className="tabular-nums">{fmt(counts.down)}</span>}
      </button>
    </div>
  );
}
