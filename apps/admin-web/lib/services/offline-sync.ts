/**
 * Offline sync manager — syncs IndexedDB drafts to the server API when back online.
 */

import { getPendingSyncs, markSynced, type OfflineDraft } from './offline-store';

export interface SyncResult {
  synced: number;
  failed: number;
}

/**
 * Sync all pending (unsynced) drafts to /api/me/drafts.
 * Returns count of synced and failed drafts.
 */
export async function syncOfflineDrafts(): Promise<SyncResult> {
  // Don't attempt if we're offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingSyncs();

    for (const draft of pending) {
      try {
        const res = await fetch('/api/me/drafts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceSlug: draft.serviceSlug,
            formKey: draft.formKey,
            data: draft.data,
            submitted: draft.submitted || false,
          }),
        });

        if (res.ok) {
          await markSynced(draft.serviceSlug);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
  } catch {
    // getPendingSyncs failed — IndexedDB issue
  }

  return { synced, failed };
}
