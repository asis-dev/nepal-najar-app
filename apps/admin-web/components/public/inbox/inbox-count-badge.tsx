'use client';
import { useEffect, useState } from 'react';

export function InboxCountBadge() {
  const [urgent, setUrgent] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/inbox/count')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setUrgent(j.urgent || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (!urgent) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
      {urgent > 99 ? '99+' : urgent}
    </span>
  );
}
