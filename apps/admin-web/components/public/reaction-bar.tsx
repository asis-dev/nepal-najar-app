'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';

const REACTIONS = [
  { key: 'angry', emoji: '😡', label: 'Angry' },
  { key: 'shocked', emoji: '😱', label: 'Shocked' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'clap', emoji: '👏', label: 'Well Done' },
  { key: 'eyes', emoji: '👀', label: 'Watching' },
] as const;

type ReactionKey = (typeof REACTIONS)[number]['key'];

interface ReactionData {
  counts: Record<string, number>;
  userReaction: string | null;
}

/**
 * Generic reaction bar — works for corruption cases, ministers, commitments, etc.
 * Uses `entityType:entitySlug` as the key in the DB.
 * For backward compat, corruption cases still use bare slug.
 */
export function ReactionBar({
  caseSlug,
  entityType,
  entitySlug,
}: {
  /** @deprecated Use entityType + entitySlug instead */
  caseSlug?: string;
  entityType?: 'corruption' | 'minister' | 'commitment';
  entitySlug?: string;
}) {
  // Build the slug key — backward compat for corruption
  const slugKey = caseSlug
    ? caseSlug
    : entityType && entitySlug
      ? `${entityType}:${entitySlug}`
      : '';
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<string | null>(null);

  const { data } = useQuery<ReactionData>({
    queryKey: ['reactions', slugKey],
    queryFn: async () => {
      const res = await fetch(`/api/corruption/reactions?slug=${encodeURIComponent(slugKey)}`);
      if (!res.ok) return { counts: {}, userReaction: null };
      return res.json();
    },
    staleTime: 30_000,
    enabled: !!slugKey,
  });

  const mutation = useMutation({
    mutationFn: async (reaction: string) => {
      const res = await fetch('/api/corruption/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slugKey, reaction }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onMutate: (reaction) => {
      // Optimistic update
      const current = data?.userReaction ?? optimistic;
      setOptimistic(current === reaction ? null : reaction);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', slugKey] });
    },
  });

  const counts = data?.counts ?? {};
  const userReaction = optimistic ?? data?.userReaction ?? null;
  const totalReactions = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          React
        </h3>
        {totalReactions > 0 && (
          <span className="text-[10px] text-gray-600">
            {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isAuthenticated ? (
        <div className="flex items-center gap-1.5 sm:gap-2">
          {REACTIONS.map((r) => {
            const isActive = userReaction === r.key;
            const count = counts[r.key] ?? 0;
            // Adjust count for optimistic state
            const displayCount =
              isActive && data?.userReaction !== r.key
                ? count + 1
                : !isActive && data?.userReaction === r.key
                ? Math.max(0, count - 1)
                : count;

            return (
              <button
                key={r.key}
                onClick={() => mutation.mutate(r.key)}
                disabled={mutation.isPending}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 sm:px-3 py-2 transition-all ${
                  isActive
                    ? 'bg-white/[0.12] border border-white/[0.2] scale-110'
                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:scale-105'
                } disabled:opacity-60`}
                title={r.label}
              >
                <span className={`text-lg sm:text-xl ${isActive ? '' : 'grayscale-[30%]'} transition-all`}>
                  {r.emoji}
                </span>
                {displayCount > 0 && (
                  <span className={`text-[10px] tabular-nums ${isActive ? 'text-white font-semibold' : 'text-gray-500'}`}>
                    {displayCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {REACTIONS.map((r) => {
              const count = counts[r.key] ?? 0;
              return (
                <div
                  key={r.key}
                  className="flex flex-col items-center gap-0.5 rounded-xl px-2.5 sm:px-3 py-2 bg-white/[0.03] border border-white/[0.06]"
                >
                  <span className="text-lg sm:text-xl grayscale-[30%]">{r.emoji}</span>
                  {count > 0 && (
                    <span className="text-[10px] tabular-nums text-gray-500">{count}</span>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            href="/login"
            className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors ml-1"
          >
            Sign in to react
          </Link>
        </div>
      )}
    </div>
  );
}
