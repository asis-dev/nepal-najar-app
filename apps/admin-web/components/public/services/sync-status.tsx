'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPendingSyncs } from '@/lib/services/offline-store';
import { syncOfflineDrafts } from '@/lib/services/offline-sync';

/**
 * Shows pending offline sync count and a "Sync now" button.
 * For use on the /me page Services Hub section.
 */
export function SyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const pending = await getPendingSyncs();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncOfflineDrafts();
      if (result.synced > 0) {
        setSyncResult(`Synced ${result.synced} draft${result.synced > 1 ? 's' : ''}`);
      } else if (result.failed > 0) {
        setSyncResult('Sync failed — will retry later');
      } else {
        setSyncResult('Nothing to sync');
      }
      await refreshCount();
    } catch {
      setSyncResult('Sync error');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  if (pendingCount === 0 && !syncResult) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">{'\uD83D\uDD04'}</span>
        <div>
          <p className="text-sm font-medium text-amber-200">
            {pendingCount > 0
              ? `${pendingCount} unsynced draft${pendingCount > 1 ? 's' : ''}`
              : syncResult || 'All synced'}
          </p>
          <p className="text-xs text-amber-400/60">
            Saved offline, waiting to sync
          </p>
        </div>
      </div>
      {pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-amber-600/80 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync now'}
        </button>
      )}
    </div>
  );
}
