/**
 * Daily Promise Picker — deterministic "promise of the day" for engagement
 *
 * Uses a hash of the date to pick the same promise for all users on any given day.
 * Date is computed in Nepal timezone (UTC+5:45) so the promise changes at midnight NPT.
 */

import { promises, type GovernmentPromise } from './promises';

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

/** Get a date string in Nepal timezone */
function getNepalDateString(date?: Date): string {
  const d = date ?? new Date();
  const nepalOffset = 5 * 60 + 45; // minutes
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  const nepalDate = new Date(utcMs + nepalOffset * 60000);
  return `${nepalDate.getFullYear()}-${nepalDate.getMonth() + 1}-${nepalDate.getDate()}`;
}

/** Simple deterministic hash for a string */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/* ═══════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════ */

/**
 * Get today's "promise of the day" — deterministic per date.
 * All users in Nepal see the same promise on the same day.
 */
export function getDailyPromise(date?: Date): GovernmentPromise {
  const dateStr = getNepalDateString(date);
  const index = simpleHash(dateStr) % promises.length;
  return promises[index];
}

/**
 * Get the daily promise for each of the last N days (most recent first).
 * Useful for the 7-day calendar view.
 */
export function getDailyPromiseHistory(days: number = 7): Array<{
  date: string;
  promise: GovernmentPromise;
}> {
  const history: Array<{ date: string; promise: GovernmentPromise }> = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getNepalDateString(d);
    history.push({
      date: dateStr,
      promise: getDailyPromise(d),
    });
  }

  return history;
}

/**
 * Get Nepal timezone date string for today (YYYY-MM-DD format).
 */
export function getNepalToday(): string {
  return getNepalDateString();
}
