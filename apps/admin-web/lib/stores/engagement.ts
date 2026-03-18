'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ═══════════════════════════════════════════════
   ENGAGEMENT STORE
   Daily streak tracking + Najar Index cache
   Persisted to localStorage — no account needed
   ═══════════════════════════════════════════════ */

/**
 * Get today's date in Nepal timezone (UTC+5:45) as YYYY-MM-DD.
 *
 * Nepal has a non-standard UTC+5:45 offset, so we compute it manually
 * rather than relying on Intl.DateTimeFormat (inconsistent across engines).
 *
 * @returns Date string in YYYY-MM-DD format, e.g. "2026-03-18"
 */
function getNepalToday(): string {
  const now = new Date();
  // Nepal is UTC+5:45
  const nepalOffset = 5 * 60 + 45; // minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalDate = new Date(utcMs + nepalOffset * 60000);
  return nepalDate.toISOString().split('T')[0];
}

/**
 * Check if dateB is exactly 1 day after dateA.
 *
 * Used to determine if a user's visit is consecutive (streak continues)
 * or has a gap (streak resets).
 *
 * @param dateA - Earlier date as YYYY-MM-DD
 * @param dateB - Later date as YYYY-MM-DD
 * @returns true if dateB is exactly 1 calendar day after dateA
 */
function isConsecutiveDay(dateA: string, dateB: string): boolean {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  const diffMs = b.getTime() - a.getTime();
  return diffMs === 86400000; // exactly 24 hours
}

/** Cached snapshot of the Najar Index to avoid recomputing on every render */
interface CachedIndex {
  /** The computed score (0-100) */
  score: number;
  /** Letter grade: A | B | C | D | F */
  grade: string;
  /** ISO date when this cache was computed */
  computedAt: string;
}

/**
 * Engagement state persisted to localStorage.
 * Tracks daily visit streaks and caches the Najar Index.
 */
interface EngagementState {
  /** Current consecutive-day visit streak */
  currentStreak: number;
  /** All-time highest streak achieved */
  longestStreak: number;
  /** Last visit date in Nepal timezone (YYYY-MM-DD), null if never visited */
  lastVisitDate: string | null;
  /** Whether the user has interacted (voted) today */
  todayInteracted: boolean;
  /** Cached Najar Index to avoid recomputation */
  cachedIndex: CachedIndex | null;
}

interface EngagementActions {
  /**
   * Record a visit for today. Call on page mount.
   * - If already visited today: no-op
   * - If visited yesterday: increment streak
   * - If gap > 1 day: reset streak to 1
   */
  recordVisit: () => void;
  /** Mark that the user has interacted (e.g. voted) today */
  recordInteraction: () => void;
  /** Update the cached Najar Index snapshot */
  setCachedIndex: (index: CachedIndex) => void;
}

export const useEngagementStore = create<EngagementState & EngagementActions>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastVisitDate: null,
      todayInteracted: false,
      cachedIndex: null,

      recordVisit: () => {
        const today = getNepalToday();
        const { lastVisitDate, currentStreak, longestStreak } = get();

        // Already visited today — no-op
        if (lastVisitDate === today) return;

        let newStreak: number;
        if (lastVisitDate && isConsecutiveDay(lastVisitDate, today)) {
          // Consecutive day — increment streak
          newStreak = currentStreak + 1;
        } else {
          // First visit or gap — start fresh
          newStreak = 1;
        }

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(longestStreak, newStreak),
          lastVisitDate: today,
          todayInteracted: false, // reset daily interaction flag
        });
      },

      recordInteraction: () => {
        set({ todayInteracted: true });
      },

      setCachedIndex: (index) => {
        set({ cachedIndex: index });
      },
    }),
    {
      name: 'nepal-najar-engagement',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastVisitDate: state.lastVisitDate,
        todayInteracted: state.todayInteracted,
        cachedIndex: state.cachedIndex,
      }),
    },
  ),
);
