'use client';

import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';

/**
 * Fixed bottom bar (above the mobile nav) showing offline/online sync status.
 * Slides in when offline, briefly shows "Back online" when reconnecting, then hides.
 */
export function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState<'offline' | 'online'>('offline');

  useEffect(() => {
    if (!isOnline) {
      setVariant('offline');
      setMessage('Offline — forms save locally');
      setVisible(true);
    } else if (wasOffline && isOnline) {
      // Just came back online
      setVariant('online');
      setMessage('Back online — syncing...');
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const bgClass =
    variant === 'offline'
      ? 'bg-amber-600/95 text-amber-50 border-amber-500/50'
      : 'bg-emerald-600/95 text-emerald-50 border-emerald-500/50';

  const icon = variant === 'offline' ? '\uD83D\uDCF4' : '\u2705';

  return (
    <div
      className={`fixed bottom-16 left-0 right-0 z-50 flex items-center justify-center transition-all duration-300 ease-in-out print:hidden ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`mx-4 w-full max-w-md rounded-xl border px-4 py-2.5 text-center text-sm font-medium shadow-lg backdrop-blur-sm ${bgClass}`}
      >
        <span className="mr-1.5">{icon}</span>
        {message}
      </div>
    </div>
  );
}
