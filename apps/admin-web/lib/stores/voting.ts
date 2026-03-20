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
}

interface VotingState {
  /** User's own votes: promiseId → 'up' | 'down' */
  votes: Record<string, VoteType>;
  /** Device fingerprint (set on first vote) */
  deviceId: string | null;
  /** Whether geo-check passed for this session */
  geoVerified: boolean | null;
}

interface VotingActions {
  castVote: (promiseId: string, vote: VoteType) => void;
  removeVote: (promiseId: string) => void;
  getVote: (promiseId: string) => VoteType | null;
  setDeviceId: (id: string) => void;
  setGeoVerified: (verified: boolean) => void;
  getAggregates: (promiseId: string) => VoteAggregates;
}

export const useVotingStore = create<VotingState & VotingActions>()(
  persist(
    (set, get) => ({
      votes: {},
      deviceId: null,
      geoVerified: null,

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

      setDeviceId: (id) => set({ deviceId: id }),

      setGeoVerified: (verified) => set({ geoVerified: verified }),

      /** Real aggregates come from /api/votes via Supabase. This returns empty defaults. */
      getAggregates: () => ({ up: 0, down: 0, verifiedUp: 0, verifiedDown: 0 }),
    }),
    {
      name: 'nepal-najar-votes',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        votes: state.votes,
        deviceId: state.deviceId,
      }),
    },
  ),
);
