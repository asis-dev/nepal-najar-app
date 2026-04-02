export const PILOT_EVENT_NAMES = [
  'page_view',
  'watchlist_add',
  'watchlist_remove',
  'hometown_set',
  'feedback_submit',
  'evidence_submit',
  'verify_progress',
  'preference_changed',
  'share_clicked',
] as const;

export type PilotEventName = (typeof PILOT_EVENT_NAMES)[number];

export function isPilotEventName(value: unknown): value is PilotEventName {
  return typeof value === 'string' && PILOT_EVENT_NAMES.includes(value as PilotEventName);
}
