'use client';

import { ShieldCheck, ScanSearch, Users, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const LANES = [
  {
    titleKey: 'trustLane.official',
    descKey: 'trustLane.officialDesc',
    icon: ShieldCheck,
    tone: 'from-red-500/20 to-red-500/5 text-red-300 border-red-500/20',
  },
  {
    titleKey: 'trustLane.discovered',
    descKey: 'trustLane.discoveredDesc',
    icon: ScanSearch,
    tone: 'from-cyan-500/20 to-cyan-500/5 text-cyan-300 border-cyan-500/20',
  },
  {
    titleKey: 'trustLane.public',
    descKey: 'trustLane.publicDesc',
    icon: Users,
    tone: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/20',
  },
  {
    titleKey: 'trustLane.inferred',
    descKey: 'trustLane.inferredDesc',
    icon: Sparkles,
    tone: 'from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/20',
  },
];

export function TrustLanes() {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {LANES.map((lane) => {
        const Icon = lane.icon;
        return (
          <div
            key={lane.titleKey}
            className={`rounded-2xl border bg-gradient-to-br px-4 py-4 backdrop-blur-md ${lane.tone}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-xl bg-white/5 p-2">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-base font-semibold tracking-tight text-white">{t(lane.titleKey)}</p>
            </div>
            <p className="text-[15px] leading-7 text-gray-300">{t(lane.descKey)}</p>
          </div>
        );
      })}
    </div>
  );
}
