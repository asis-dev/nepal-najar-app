'use client';

export function NepalNajarMark({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        aria-hidden="true"
        className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.12] bg-[linear-gradient(145deg,rgba(220,20,60,0.92),rgba(0,56,147,0.96))] shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
      >
        <span className="absolute inset-[1px] rounded-[14px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
        <span className="relative text-sm font-bold tracking-[-0.08em] text-white">NN</span>
      </div>
      <div className="flex min-w-0 flex-col leading-none">
        <span className="text-sm font-semibold tracking-[0.01em] text-white sm:text-base">
          Nepal <span className="text-nepal-red">Najar</span>
        </span>
        {!compact && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-gray-500">
            Public Development Watch
          </span>
        )}
      </div>
    </div>
  );
}
