/**
 * Government Era — tracks the inauguration date and provides helpers
 * to distinguish "inherited baseline" data from "new government" evidence.
 *
 * Balen Shah sworn in: March 26, 2026 (Nepal Time)
 */

/** Inauguration timestamp in milliseconds (Nepal Time = UTC+5:45) */
export const INAUGURATION_DATE = '2026-03-26T00:00:00+05:45';
export const INAUGURATION_MS = new Date(INAUGURATION_DATE).getTime();

/** Grace period: no public grade for the first N days */
export const NO_GRADE_WINDOW_DAYS = 30;

/** First 100 days tracking window */
export const FIRST_100_DAYS = 100;

/** Is a signal from the new government era? */
export function isNewGovernmentSignal(publishedAt: string | null | undefined): boolean {
  if (!publishedAt) return false;
  return new Date(publishedAt).getTime() >= INAUGURATION_MS;
}

/** Label a timestamp as baseline or new-government */
export function getEraLabel(publishedAt: string | null | undefined): 'baseline' | 'new-government' {
  return isNewGovernmentSignal(publishedAt) ? 'new-government' : 'baseline';
}

/** How many days since inauguration */
export function daysSinceInauguration(): number {
  return Math.max(0, Math.floor((Date.now() - INAUGURATION_MS) / (24 * 60 * 60 * 1000)));
}

/** Day number in office (1-indexed) */
export function dayInOffice(): number {
  return daysSinceInauguration() + 1;
}

/** Is the government still in the no-grade grace period? */
export function isGracePeriod(): boolean {
  return daysSinceInauguration() < NO_GRADE_WINDOW_DAYS;
}
