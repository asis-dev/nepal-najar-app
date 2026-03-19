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
      <div className="nepal-najar-mark" aria-hidden="true">
        <span className="nepal-najar-mark__bar nepal-najar-mark__bar--short" />
        <span className="nepal-najar-mark__bar nepal-najar-mark__bar--tall" />
      </div>
      <div className="flex min-w-0 flex-col leading-none">
        <span className="text-sm font-semibold tracking-[0.02em] text-white sm:text-base">
          Nepal <span className="text-nepal-red">Najar</span>
        </span>
        {!compact && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.24em] text-gray-500">
            Public Development Watch
          </span>
        )}
      </div>
    </div>
  );
}
