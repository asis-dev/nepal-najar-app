'use client';

import { useState, useEffect } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Deadline } from '@/lib/data/promises';

interface CountdownStripProps {
  deadlines: Deadline[];
}

function getTimeRemaining(targetDate: string) {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) {
    const overdueDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
    return { days: -overdueDays, hours: 0, minutes: 0, isOverdue: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isOverdue: false };
}

function getUrgencyStyle(days: number, isOverdue: boolean) {
  if (isOverdue) return {
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    pulse: true,
  };
  if (days <= 7) return {
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    text: 'text-red-400',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    pulse: false,
  };
  if (days <= 30) return {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    text: 'text-amber-400',
    glow: '',
    pulse: false,
  };
  return {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    glow: '',
    pulse: false,
  };
}

function CountdownCard({ deadline }: { deadline: Deadline }) {
  const { t, locale } = useI18n();
  const [time, setTime] = useState(() => getTimeRemaining(deadline.targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(deadline.targetDate));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [deadline.targetDate]);

  const urgency = getUrgencyStyle(time.days, time.isOverdue);
  const label = locale === 'ne' ? deadline.label_ne : deadline.label;
  const desc = locale === 'ne' ? deadline.description_ne : deadline.description;

  return (
    <div
      className={`flex-shrink-0 w-[220px] rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 ${urgency.bg} ${urgency.border} ${urgency.glow} ${urgency.pulse ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {time.isOverdue ? (
          <AlertTriangle className={`w-3.5 h-3.5 ${urgency.text}`} />
        ) : (
          <Timer className={`w-3.5 h-3.5 ${urgency.text}`} />
        )}
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium truncate">
          {deadline.type === 'legal' && (locale === 'ne' ? 'कानूनी' : 'Legal')}
          {deadline.type === 'policy' && (locale === 'ne' ? 'नीति' : 'Policy')}
          {deadline.type === 'budget' && (locale === 'ne' ? 'बजेट' : 'Budget')}
          {deadline.type === 'milestone' && (locale === 'ne' ? 'टप्पा' : 'Milestone')}
          {deadline.type === 'parliamentary' && (locale === 'ne' ? 'संसदीय' : 'Parliamentary')}
        </span>
      </div>

      <p className="text-xs font-medium text-gray-200 line-clamp-2 mb-3 min-h-[2rem]">
        {label}
      </p>

      {/* Countdown numbers */}
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${urgency.text} tabular-nums`}>
          {time.isOverdue ? `+${Math.abs(time.days)}` : time.days}
        </span>
        <span className="text-xs text-gray-500">
          {time.isOverdue
            ? (locale === 'ne' ? 'दिन बितिसक्यो' : 'days overdue')
            : (locale === 'ne' ? 'दिन बाँकी' : 'days left')}
        </span>
      </div>

      {!time.isOverdue && time.days <= 30 && (
        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 tabular-nums">
          <span>{time.hours}h {time.minutes}m</span>
        </div>
      )}

      {desc && (
        <p className="text-[10px] text-gray-600 mt-2 line-clamp-1">{desc}</p>
      )}
    </div>
  );
}

export function CountdownStrip({ deadlines }: CountdownStripProps) {
  const { t, locale } = useI18n();

  // Sort by urgency: overdue first, then nearest deadline
  const sorted = [...deadlines].sort((a, b) => {
    const aTime = new Date(a.targetDate).getTime() - Date.now();
    const bTime = new Date(b.targetDate).getTime() - Date.now();
    // Overdue items first (negative values), then by proximity
    return aTime - bTime;
  });

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-gray-300">
          {locale === 'ne' ? 'प्रमुख समयसीमा' : 'Key Deadlines'}
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {sorted.map((deadline) => (
          <CountdownCard key={deadline.id} deadline={deadline} />
        ))}
      </div>
    </div>
  );
}
