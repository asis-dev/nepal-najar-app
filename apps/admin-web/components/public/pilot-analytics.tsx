'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPilotEvent } from '@/lib/analytics/client';

export function PilotAnalytics() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;
    trackPilotEvent('page_view', { pagePath: pathname });
  }, [pathname]);

  return null;
}

