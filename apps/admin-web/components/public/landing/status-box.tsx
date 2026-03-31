'use client';

import { useState, useEffect } from 'react';
import { GhantiIcon } from '@/components/ui/ghanti-icon';

export function StatusBox({
  status,
  count,
  label,
  glowColor,
}: {
  status: 'in_progress' | 'stalled' | 'not_started' | 'delivered';
  count: number;
  label: string;
  glowColor: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md px-6 py-5 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        boxShadow: `0 0 30px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <GhantiIcon status={status} size="lg" />
      <span className="text-4xl font-bold text-white tabular-nums tracking-tight leading-none">
        {count}
      </span>
      <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  );
}
