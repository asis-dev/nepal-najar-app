'use client';

import { Shield, Newspaper, Users, Brain } from 'lucide-react';

export type SignalType = 'official' | 'discovered' | 'reported' | 'inferred';

const signalConfig: Record<SignalType, {
  label: string;
  labelNe: string;
  icon: typeof Shield;
  bg: string;
  text: string;
  border: string;
}> = {
  official: {
    label: 'Official',
    labelNe: 'आधिकारिक',
    icon: Shield,
    bg: 'bg-[#003893]/15',
    text: 'text-blue-300',
    border: 'border-[#003893]/30',
  },
  discovered: {
    label: 'Discovered',
    labelNe: 'खोजिएको',
    icon: Newspaper,
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30',
  },
  reported: {
    label: 'Public Report',
    labelNe: 'सार्वजनिक रिपोर्ट',
    icon: Users,
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
  },
  inferred: {
    label: 'Inferred',
    labelNe: 'अनुमानित',
    icon: Brain,
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
  },
};

interface SignalBadgeProps {
  type: SignalType;
  /** Compact mode: icon only */
  compact?: boolean;
  locale?: 'en' | 'ne';
}

export function SignalBadge({ type, compact = false, locale = 'en' }: SignalBadgeProps) {
  const config = signalConfig[type];
  const Icon = config.icon;
  const label = locale === 'ne' ? config.labelNe : config.label;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${config.bg} ${config.border} border`}
        title={label}
      >
        <Icon className={`w-3 h-3 ${config.text}`} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${config.bg} ${config.text} ${config.border} border`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
