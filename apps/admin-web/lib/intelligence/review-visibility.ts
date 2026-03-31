export interface SignalReviewFields {
  review_required?: boolean | null;
  review_status?: string | null;
}

/**
 * Public signal visibility rule:
 * - `approved` / `edited` is always visible
 * - `rejected` is never visible
 * - `pending` is visible only when no manual review is required
 */
export function isSignalVisibleToPublic(
  signal: SignalReviewFields,
): boolean {
  const status =
    typeof signal.review_status === 'string'
      ? signal.review_status.toLowerCase()
      : 'pending';

  if (status === 'rejected') return false;
  if (status === 'approved' || status === 'edited') return true;
  return signal.review_required === false;
}
