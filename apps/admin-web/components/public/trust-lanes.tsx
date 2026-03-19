'use client';

import { ShieldCheck, ScanSearch, Users, Sparkles } from 'lucide-react';

const LANES = [
  {
    title: 'Official',
    description: 'Government-published projects, milestones, budgets, and formal updates.',
    icon: ShieldCheck,
    tone: 'from-red-500/20 to-red-500/5 text-red-300 border-red-500/20',
  },
  {
    title: 'Discovered',
    description: 'Signals from news, procurement portals, notices, and open web sources.',
    icon: ScanSearch,
    tone: 'from-cyan-500/20 to-cyan-500/5 text-cyan-300 border-cyan-500/20',
  },
  {
    title: 'Public',
    description: 'What people are watching, voting on, and reporting district by district.',
    icon: Users,
    tone: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/20',
  },
  {
    title: 'Inferred',
    description: 'Analytical signals such as trend shifts, confidence, and anomaly warnings.',
    icon: Sparkles,
    tone: 'from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/20',
  },
];

export function TrustLanes() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {LANES.map((lane) => {
        const Icon = lane.icon;
        return (
          <div
            key={lane.title}
            className={`rounded-2xl border bg-gradient-to-br px-4 py-4 backdrop-blur-md ${lane.tone}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-xl bg-white/5 p-2">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold tracking-wide text-white">{lane.title}</p>
            </div>
            <p className="text-sm leading-relaxed text-gray-300">{lane.description}</p>
          </div>
        );
      })}
    </div>
  );
}
