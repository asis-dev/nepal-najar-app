'use client';

export function CommitmentCardSkeleton() {
  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col gap-3 animate-pulse">
      {/* Status row */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full skeleton" />
        <div className="h-3 w-20 rounded skeleton" />
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-3/4 rounded skeleton" />
      </div>

      {/* Category + department */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-24 rounded skeleton" />
        <div className="h-3 w-16 rounded skeleton" />
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full skeleton" />
        <div className="h-3 w-8 rounded skeleton" />
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded skeleton" />
        <div className="h-3 w-5/6 rounded skeleton" />
      </div>

      {/* Icon strip */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-16 rounded-full skeleton" />
          <div className="h-3.5 w-8 rounded skeleton" />
          <div className="h-3.5 w-3.5 rounded skeleton" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-7 w-16 rounded-lg skeleton" />
          <div className="h-7 w-7 rounded-lg skeleton" />
        </div>
      </div>
    </div>
  );
}
