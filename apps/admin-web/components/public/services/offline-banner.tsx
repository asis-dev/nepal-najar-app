'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Thin offline banner for /services routes. Shows only when the browser
 * reports offline. Content is still served from the service worker cache.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500/15 px-3 py-1.5 text-[11px] font-medium text-amber-300 backdrop-blur-sm">
      <WifiOff className="h-3 w-3" />
      <span>You&apos;re offline — showing saved service info</span>
    </div>
  );
}
