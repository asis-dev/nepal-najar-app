'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ═══════════════════════════════════════════════
   VOTING STORE
   Geo-verified, device-fingerprinted voting
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
  /** Mock aggregate data (replaced by API later) */
  aggregates: Record<string, VoteAggregates>;
}

interface VotingActions {
  castVote: (promiseId: string, vote: VoteType) => void;
  removeVote: (promiseId: string) => void;
  getVote: (promiseId: string) => VoteType | null;
  setDeviceId: (id: string) => void;
  setGeoVerified: (verified: boolean) => void;
  getAggregates: (promiseId: string) => VoteAggregates;
}

/** Seed mock aggregates for 30+ promises */
function seedAggregates(): Record<string, VoteAggregates> {
  const seeds: Record<string, VoteAggregates> = {};
  // Promise IDs 1-35 with realistic vote distributions
  const data: [string, number, number][] = [
    ['1', 2847, 423],    // Melamchi Water — popular
    ['2', 1923, 891],    // East-West Highway
    ['3', 4521, 234],    // Zero Corruption — very popular
    ['4', 891, 345],     // Digital Nepal
    ['5', 3102, 156],    // Clean Kathmandu — delivered, loved
    ['6', 1567, 789],    // 10000 MW Hydro
    ['7', 456, 1234],    // Smart Classrooms — stalled, disliked
    ['8', 2345, 567],    // Universal Healthcare
    ['9', 678, 890],     // Provincial Capital
    ['10', 1890, 234],   // Fast-Track Citizenship
    ['11', 3456, 123],   // Anti-corruption commission reform
    ['12', 1234, 567],   // E-governance portal
    ['13', 2100, 345],   // National railway
    ['14', 890, 456],    // Pokhara-Lumbini expressway
    ['15', 1567, 234],   // 500 health posts
    ['16', 2345, 178],   // Free textbooks
    ['17', 1789, 345],   // Kathmandu metro
    ['18', 3210, 189],   // River cleanup
    ['19', 1456, 567],   // Land reform
    ['20', 2678, 234],   // Public procurement transparency
    ['21', 1123, 890],   // Agricultural modernization
    ['22', 890, 345],    // Tourism infrastructure
    ['23', 2345, 456],   // Nepal broadband
    ['24', 1567, 678],   // Judicial reform
    ['25', 3456, 123],   // Electoral reform
    ['26', 1890, 567],   // Social security expansion
    ['27', 1234, 345],   // Industrial zones
    ['28', 2100, 234],   // Airport modernization
    ['29', 1678, 456],   // Teacher training
    ['30', 2890, 178],   // Forest conservation
  ];

  for (const [id, up, down] of data) {
    seeds[id] = {
      up,
      down,
      verifiedUp: Math.floor(up * 0.65),
      verifiedDown: Math.floor(down * 0.58),
    };
  }

  return seeds;
}

export const useVotingStore = create<VotingState & VotingActions>()(
  persist(
    (set, get) => ({
      votes: {},
      deviceId: null,
      geoVerified: null,
      aggregates: seedAggregates(),

      castVote: (promiseId, vote) =>
        set((state) => {
          const previousVote = state.votes[promiseId];
          const newVotes = { ...state.votes, [promiseId]: vote };
          const newAggregates = { ...state.aggregates };

          // Update aggregates optimistically
          const agg = newAggregates[promiseId] ?? { up: 0, down: 0, verifiedUp: 0, verifiedDown: 0 };

          // Remove previous vote
          if (previousVote === 'up') agg.up = Math.max(0, agg.up - 1);
          if (previousVote === 'down') agg.down = Math.max(0, agg.down - 1);

          // Add new vote
          if (vote === 'up') agg.up += 1;
          if (vote === 'down') agg.down += 1;

          newAggregates[promiseId] = agg;

          return { votes: newVotes, aggregates: newAggregates };
        }),

      removeVote: (promiseId) =>
        set((state) => {
          const previousVote = state.votes[promiseId];
          const { [promiseId]: _, ...remainingVotes } = state.votes;
          const newAggregates = { ...state.aggregates };

          const agg = newAggregates[promiseId];
          if (agg && previousVote === 'up') agg.up = Math.max(0, agg.up - 1);
          if (agg && previousVote === 'down') agg.down = Math.max(0, agg.down - 1);

          return { votes: remainingVotes, aggregates: newAggregates };
        }),

      getVote: (promiseId) => get().votes[promiseId] ?? null,

      setDeviceId: (id) => set({ deviceId: id }),

      setGeoVerified: (verified) => set({ geoVerified: verified }),

      getAggregates: (promiseId) =>
        get().aggregates[promiseId] ?? { up: 0, down: 0, verifiedUp: 0, verifiedDown: 0 },
    }),
    {
      name: 'nepal-najar-votes',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        votes: state.votes,
        deviceId: state.deviceId,
        // Don't persist aggregates — they come from seed / API
      }),
    },
  ),
);
