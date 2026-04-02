'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ChevronUp,
  ChevronDown,
  MapPin,
  Heart,
  MessageSquare,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { usePreferencesStore, useWatchlistStore, useUserPreferencesStore } from '@/lib/stores/preferences';

interface ChecklistItem {
  id: string;
  labelEn: string;
  labelNe: string;
  descEn: string;
  descNe: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  done: boolean;
}

export function OnboardingChecklist() {
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const { isAuthenticated } = useAuth();
  const { hasSetHometown } = usePreferencesStore();
  const { watchedProjectIds } = useWatchlistStore();
  const { onboardingComplete } = useUserPreferencesStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const shouldHide = !isAuthenticated || !onboardingComplete || isDismissed;

  // Check localStorage for dismissed state
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('nepalrepublic-checklist-dismissed');
      if (dismissed === 'true') setIsDismissed(true);
    } catch { /* SSR */ }
  }, []);

  const items: ChecklistItem[] = [
    {
      id: 'hometown',
      labelEn: 'Set your location',
      labelNe: 'ठाउँ सेट गर्नुहोस्',
      descEn: 'Pick your province to see local commitments',
      descNe: 'स्थानीय प्रतिबद्धता हेर्न तपाईंको प्रदेश छान्नुहोस्',
      icon: MapPin,
      done: hasSetHometown,
    },
    {
      id: 'follow',
      labelEn: 'Follow 3 commitments',
      labelNe: '३ प्रतिबद्धता फलो गर्नुहोस्',
      descEn: 'Tap the heart on commitments you care about',
      descNe: 'तपाईंलाई मनपर्ने प्रतिबद्धताको हृदयमा ट्याप गर्नुहोस्',
      icon: Heart,
      href: '/explore/first-100-days',
      done: watchedProjectIds.length >= 3,
    },
    {
      id: 'verify',
      labelEn: 'Verify a claim',
      labelNe: 'दावी प्रमाणित गर्नुहोस्',
      descEn: 'Vote on whether a commitment\'s progress is accurate',
      descNe: 'प्रतिबद्धताको प्रगति सही हो कि होइन भोट गर्नुहोस्',
      icon: ShieldCheck,
      href: '/explore/first-100-days',
      done: false, // We can't easily check this client-side — will stay unchecked
    },
    {
      id: 'comment',
      labelEn: 'Leave a comment',
      labelNe: 'टिप्पणी गर्नुहोस्',
      descEn: 'Share your perspective on any commitment',
      descNe: 'कुनै पनि प्रतिबद्धतामा तपाईंको विचार साझा गर्नुहोस्',
      icon: MessageSquare,
      href: '/explore/first-100-days',
      done: false,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;

  // Auto-hide when all done
  useEffect(() => {
    if (shouldHide || !allDone || isDismissed) return;
    const timer = window.setTimeout(() => {
      setIsDismissed(true);
      try {
        localStorage.setItem('nepalrepublic-checklist-dismissed', 'true');
      } catch { /* noop */ }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [allDone, isDismissed, shouldHide]);

  if (shouldHide) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('nepalrepublic-checklist-dismissed', 'true');
    } catch { /* noop */ }
  };

  return (
    <div className="fixed bottom-20 right-3 z-[45] w-72 md:bottom-4 md:right-4 md:w-80">
      <div
        className="glass-card overflow-hidden border border-primary-500/20"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between p-3.5 text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/15">
              <Sparkles className="h-4 w-4 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isNe ? 'सुरुवात गाइड' : 'Getting Started'}
              </p>
              <p className="text-[10px] text-gray-500">
                {completedCount}/{items.length} {isNe ? 'पूरा' : 'completed'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="rounded-lg p-1 text-gray-600 transition-colors hover:bg-white/[0.06] hover:text-gray-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </button>

        {/* Progress bar */}
        <div className="px-3.5 pb-1">
          <div className="h-1 w-full rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-primary-400 transition-all duration-500"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Items */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-2">
            <div className="space-y-1">
              {items.map((item) => {
                const content = (
                  <div
                    className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                      item.done
                        ? 'opacity-60'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          item.done ? 'text-gray-500 line-through' : 'text-gray-200'
                        }`}
                      >
                        {isNe ? item.labelNe : item.labelEn}
                      </p>
                      {!item.done && (
                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {isNe ? item.descNe : item.descEn}
                        </p>
                      )}
                    </div>
                  </div>
                );

                if (item.href && !item.done) {
                  return (
                    <Link key={item.id} href={item.href}>
                      {content}
                    </Link>
                  );
                }

                return <div key={item.id}>{content}</div>;
              })}
            </div>

            {allDone && (
              <div className="mt-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-center">
                <p className="text-xs font-semibold text-emerald-400">
                  {isNe ? 'सबै पूरा भयो! बधाई!' : 'All done! You\'re all set!'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
