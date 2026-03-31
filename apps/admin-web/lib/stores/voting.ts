'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ═══════════════════════════════════════════════
   VOTING STORE
   Geo-verified, device-fingerprinted voting.
   Aggregates come from Supabase /api/votes — no fake seeding.
   ═══════════════════════════════════════════════ */

type VoteType = 'up' | 'down';

interface VoteAggregates {
  up: number;
  down: number;
  verifiedUp: number;
  verifiedDown: number;
  weightedUp: number;
  weightedDown: number;
  weightedTotal: number;
  priorityCount: number;
}

interface VotingState {
  /** User's own votes: promiseId → 'up' | 'down' */
  votes: Record<string, VoteType>;
  /** User's priority votes: promiseId → true */
  priorityVotes: Record<string, boolean>;
  /** Device fingerprint (set on first vote) */
  deviceId: string | null;
  /** Whether geo-check passed for this session */
  geoVerified: boolean | null;
  /** Cached aggregates from API */
  aggregatesCache: Record<string, VoteAggregates>;
}

interface VotingActions {
  castVote: (promiseId: string, vote: VoteType) => void;
  removeVote: (promiseId: string) => void;
  getVote: (promiseId: string) => VoteType | null;
  castPriorityVote: (promiseId: string) => void;
  removePriorityVote: (promiseId: string) => void;
  setDeviceId: (id: string) => void;
  setGeoVerified: (verified: boolean) => void;
  getAggregates: (promiseId: string) => VoteAggregates;
  setAggregates: (promiseId: string, aggregates: VoteAggregates) => void;
  fetchAggregates: (promiseId: string) => Promise<void>;
}

export const useVotingStore = create<VotingState & VotingActions>()(
  persist(
    (set, get) => ({
      votes: {},
      priorityVotes: {},
      deviceId: null,
      geoVerified: null,
      aggregatesCache: {},

      castVote: (promiseId, vote) =>
        set((state) => {
          const newVotes = { ...state.votes, [promiseId]: vote };
          return { votes: newVotes };
        }),

      removeVote: (promiseId) =>
        set((state) => {
          const { [promiseId]: _, ...remainingVotes } = state.votes;
          return { votes: remainingVotes };
        }),

      getVote: (promiseId) => get().votes[promiseId] ?? null,

      castPriorityVote: (promiseId) =>
        set((state) => ({
          priorityVotes: { ...state.priorityVotes, [promiseId]: true },
        })),

      removePriorityVote: (promiseId) =>
        set((state) => {
          const { [promiseId]: _, ...remaining } = state.priorityVotes;
          return { priorityVotes: remaining };
        }),

      setDeviceId: (id) => set({ deviceId: id }),

      setGeoVerified: (verified) => set({ geoVerified: verified }),

      getAggregates: (promiseId) => {
        const cached = get().aggregatesCache[promiseId];
        if (cached) return cached;
        return {
          up: 0, down: 0,
          verifiedUp: 0, verifiedDown: 0,
          weightedUp: 0, weightedDown: 0,
          weightedTotal: 0, priorityCount: 0,
        };
      },

      setAggregates: (promiseId, aggregates) =>
        set((state) => ({
          aggregatesCache: { ...state.aggregatesCache, [promiseId]: aggregates },
        })),

      fetchAggregates: async (promiseId) => {
        try {
          const res = await fetch(
            `/api/votes?topic_type=promise&topic_id=${encodeURIComponent(promiseId)}`
          );
          if (!res.ok) return;
          const data = await res.json();
          get().setAggregates(promiseId, {
            up: data.up ?? 0,
            down: data.down ?? 0,
            verifiedUp: data.verifiedUp ?? 0,
            verifiedDown: data.verifiedDown ?? 0,
            weightedUp: data.weightedUp ?? 0,
            weightedDown: data.weightedDown ?? 0,
            weightedTotal: data.weightedTotal ?? 0,
            priorityCount: data.priorityCount ?? 0,
          });
        } catch { /* silent fail — show zeros */ }
      },
    }),
    {
      name: 'nepalrepublic-votes',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        votes: state.votes,
        priorityVotes: state.priorityVotes,
        deviceId: state.deviceId,
      }),
    },
  ),
);
