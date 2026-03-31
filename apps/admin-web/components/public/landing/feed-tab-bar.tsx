'use client';

import { useI18n } from '@/lib/i18n';
import { InterestFilter } from '@/components/public/interest-filter';
import type { FeedTab } from '@/lib/data/landing-types';

export function FeedTabBar({
  activeTab,
  onTabChange,
  followingCount,
  categoriesOfInterest,
  onCategoriesChange,
  isMobile,
}: {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  followingCount: number;
  categoriesOfInterest: string[];
  onCategoriesChange: (categories: string[]) => void;
  isMobile: boolean;
}) {
  const { t, locale } = useI18n();
  const filterCount = categoriesOfInterest.length;

  const tabs: { id: FeedTab; label: string; badge?: number }[] = [
    { id: 'for-you', label: filterCount > 0 ? `${t('home.forYou')} (${filterCount})` : t('home.forYou') },
    { id: 'following', label: t('home.following'), badge: followingCount > 0 ? followingCount : undefined },
    { id: 'corruption', label: t('home.corruption') },
    { id: 'trending', label: t('home.trending') },
  ];

  return (
    <div
      className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 md:py-3 backdrop-blur-xl"
      style={{
        background: 'linear-gradient(180deg, rgba(8,10,18,0.92) 0%, rgba(8,10,18,0.8) 100%)',
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-1.5 md:gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <div key={tab.id} className="relative flex-1 md:flex-none inline-flex items-center">
                <button
                  onClick={() => onTabChange(tab.id)}
                  suppressHydrationWarning
                  className={`w-full inline-flex items-center justify-center gap-1.5 rounded-full text-xs px-3 py-1.5 md:text-sm md:px-4 md:py-2 font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={isActive ? {
                    background: 'rgba(255,255,255,0.1)',
                    boxShadow: '0 0 12px rgba(96,165,250,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                  } : undefined}
                >
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold tabular-nums px-1 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
                {/* Filter trigger sits next to "For You" tab, outside the button to avoid nesting */}
                {tab.id === 'for-you' && isActive && (
                  <InterestFilter
                    selected={categoriesOfInterest}
                    onChange={onCategoriesChange}
                    isMobile={isMobile}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
