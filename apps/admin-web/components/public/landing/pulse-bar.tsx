'use client';

import { useState, useEffect } from 'react';

function getPulseLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Very Active', color: 'text-red-400' };
  if (score >= 50) return { label: 'Active', color: 'text-amber-400' };
  if (score >= 25) return { label: 'Moderate', color: 'text-cyan-400' };
  return { label: 'Calm', color: 'text-gray-400' };
}

export function PulseBar({ score }: { score: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(100, Math.max(0, score))), 300);
    return () => clearTimeout(t);
  }, [score]);

  // Color transitions: blue (calm) -> green -> orange -> red (very active)
  const getGradient = () => {
    if (score >= 75) return 'linear-gradient(90deg, #2563eb, #10b981, #f59e0b, #ef4444)';
    if (score >= 50) return 'linear-gradient(90deg, #2563eb, #10b981, #f59e0b)';
    if (score >= 25) return 'linear-gradient(90deg, #2563eb, #10b981)';
    return 'linear-gradient(90deg, #2563eb, #3b82f6)';
  };

  const { label, color } = getPulseLabel(score);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium shrink-0">
        Pulse
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${width}%`,
            background: getGradient(),
            boxShadow: '0 0 6px rgba(59,130,246,0.2)',
            transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
      <span className={`text-[10px] font-semibold uppercase shrink-0 ${color}`}>
        {label}
      </span>
      <span className="text-xs font-bold text-white tabular-nums min-w-[2ch] text-right">
        {score}
      </span>
    </div>
  );
}
