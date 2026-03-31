'use client';

import { useI18n } from '@/lib/i18n';
import { useState, useEffect } from 'react';

export function RepublicMark({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use 'en' during SSR to match server render, switch after mount
  const isNe = mounted && locale === 'ne';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} suppressHydrationWarning>
      {/* Bold NR monogram */}
      <div
        aria-hidden="true"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9"
        style={{
          background: 'linear-gradient(135deg, #DC143C 0%, #003893 100%)',
        }}
      >
        <span className="text-[13px] font-black leading-none tracking-tight text-white sm:text-[15px]">
          NR
        </span>
      </div>
      <div className="flex min-w-0 flex-col leading-none" suppressHydrationWarning>
        <span className="text-sm font-semibold tracking-[0.01em] text-white sm:text-base" suppressHydrationWarning>
          {isNe ? 'नेपाल' : 'Nepal'}
          <span className="font-bold text-[#DC143C]">
            {isNe ? 'रिपब्लिक' : 'Republic'}
          </span>
        </span>
        {!compact && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-gray-500" suppressHydrationWarning>
            <span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />
            {t('brand.subtitle')}
          </span>
        )}
      </div>
    </div>
  );
}

/** @deprecated Use RepublicMark instead */
export const GhantiCardMark = RepublicMark;
