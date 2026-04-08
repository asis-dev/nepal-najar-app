'use client';

import { useEffect } from 'react';
import { trackServiceEvent } from './posthog-provider';

export default function ViewTracker({ slug, category }: { slug: string; category: string }) {
  useEffect(() => {
    trackServiceEvent('service_view', { slug, category });
  }, [slug, category]);
  return null;
}
