'use client';

import { Flame } from 'lucide-react';

export function HeatBadge({ count }: { count: number }) {
  const intensity =
    count >= 8 ? 'text-red-400 bg-red-500/15' :
    count >= 5 ? 'text-orange-400 bg-orange-500/15' :
    'text-amber-400 bg-amber-500/15';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${intensity}`}>
      <Flame className="w-3 h-3" />
      {count}
    </span>
  );
}
