'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function UrgentInboxFloater() {
  const [urgent, setUrgent] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('nr-floater-dismissed') === '1') {
      setDismissed(true);
      return;
    }
    fetch('/api/inbox/count')
      .then((r) => r.json())
      .then((j) => setUrgent(j.urgent || 0))
      .catch(() => {});
  }, []);

  if (dismissed || urgent < 1) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
      <div className="flex items-center gap-2 rounded-full bg-red-600/95 backdrop-blur px-3 py-2 shadow-lg border border-red-400/50">
        <Link
          href="/inbox"
          className="flex items-center gap-2 text-xs font-bold text-white"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
          {urgent} urgent action{urgent === 1 ? '' : 's'} →
        </Link>
        <button
          onClick={() => {
            sessionStorage.setItem('nr-floater-dismissed', '1');
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="text-white/70 hover:text-white text-xs px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
