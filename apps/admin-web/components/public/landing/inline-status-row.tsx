import { GhantiBellCount } from '@/components/ui/ghanti-icon';

export function InlineStatusRow({ stats }: { stats: { inProgress: number; stalled: number; notStarted: number; delivered: number } }) {
  return (
    <div className="flex items-center justify-center gap-4 text-sm font-semibold tabular-nums">
      <GhantiBellCount status="in_progress" count={stats.inProgress} />
      <GhantiBellCount status="stalled" count={stats.stalled} />
      <GhantiBellCount status="not_started" count={stats.notStarted} />
      <GhantiBellCount status="delivered" count={stats.delivered} />
    </div>
  );
}
