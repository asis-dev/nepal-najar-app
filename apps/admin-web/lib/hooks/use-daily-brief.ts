'use client';

import { useEffect, useState } from 'react';
import type { DailyBrief } from '@/lib/data/landing-types';

export function useDailyBrief() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/daily-brief', { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) setBrief(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  return { brief, isLoading };
}
