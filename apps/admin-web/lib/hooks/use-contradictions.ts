'use client';

import { useEffect, useState } from 'react';

export function useContradictions() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/signals?classification=contradicts&days=7', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.commitmentCount === 'number') {
          setCount(data.commitmentCount);
        } else if (data && Array.isArray(data.signals)) {
          // Count unique commitment IDs
          const commitmentIds = new Set<string>();
          for (const s of data.signals) {
            if (s.commitment_id) commitmentIds.add(s.commitment_id);
            if (s.promise_id) commitmentIds.add(s.promise_id);
          }
          setCount(commitmentIds.size);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return count;
}
