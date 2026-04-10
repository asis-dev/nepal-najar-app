'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock3, Loader2, Siren, TimerReset } from 'lucide-react';

type DepartmentStat = {
  department_key: string;
  department_name: string;
  total: number;
  open: number;
  overdue: number;
  waiting_on_citizen: number;
  escalated: number;
};

type StatsResponse = {
  totals: {
    total: number;
    open: number;
    overdue: number;
    due_soon: number;
    waiting_on_citizen: number;
    escalated: number;
  };
  by_department: DepartmentStat[];
  overdue_cases: Array<{
    id: string;
    service_title: string;
    assigned_department_name?: string | null;
    resolution_due_at?: string | null;
    queue_state: string;
  }>;
};

export default function ServiceOpsSlaPage() {
  const { data, isLoading, error } = useQuery<StatsResponse>({
    queryKey: ['service-ops-stats'],
    queryFn: async () => {
      const res = await fetch('/api/ops/service-tasks/stats');
      if (!res.ok) throw new Error('Failed to load service ops SLA data');
      return res.json();
    },
  });

  const totals = data?.totals || {
    total: 0,
    open: 0,
    overdue: 0,
    due_soon: 0,
    waiting_on_citizen: 0,
    escalated: 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Clock3 className="w-5 h-5 text-amber-400" />
          </div>
          Service Ops SLA
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track overdue queues, due-soon cases, and where departments are getting stuck.
        </p>
      </div>

      {isLoading ? (
        <div className="glass-card p-10 text-center text-gray-400">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-sm text-red-400">{(error as Error).message}</div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            <Metric label="Open" value={totals.open} icon={<Clock3 className="h-4 w-4 text-blue-400" />} />
            <Metric label="Overdue" value={totals.overdue} icon={<Siren className="h-4 w-4 text-red-400" />} />
            <Metric label="Due Soon" value={totals.due_soon} icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} />
            <Metric label="Waiting on Citizen" value={totals.waiting_on_citizen} icon={<TimerReset className="h-4 w-4 text-cyan-400" />} />
            <Metric label="Escalated" value={totals.escalated} icon={<AlertTriangle className="h-4 w-4 text-fuchsia-400" />} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-card overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <h2 className="text-base font-semibold text-white">Department heatmap</h2>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {(data?.by_department || []).map((row) => (
                  <div key={row.department_key} className="grid gap-3 px-5 py-4 md:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
                    <div>
                      <div className="text-sm font-semibold text-white">{row.department_name}</div>
                      <div className="mt-1 text-xs text-gray-500">{row.department_key}</div>
                    </div>
                    <MiniMetric label="Open" value={row.open} />
                    <MiniMetric label="Overdue" value={row.overdue} tone="text-red-300" />
                    <MiniMetric label="Waiting" value={row.waiting_on_citizen} tone="text-cyan-300" />
                    <MiniMetric label="Escalated" value={row.escalated} tone="text-fuchsia-300" />
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <h2 className="text-base font-semibold text-white">Most urgent cases</h2>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {(data?.overdue_cases || []).length === 0 ? (
                  <div className="px-5 py-6 text-sm text-gray-400">No overdue cases right now.</div>
                ) : (
                  data?.overdue_cases.map((row) => (
                    <div key={row.id} className="px-5 py-4">
                      <div className="text-sm font-semibold text-white">{row.service_title}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {row.assigned_department_name || 'Unassigned'} · {row.queue_state.replace(/_/g, ' ')}
                      </div>
                      <div className="mt-2 text-sm text-red-300">
                        Due {row.resolution_due_at ? new Date(row.resolution_due_at).toLocaleString() : '—'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value, tone = 'text-gray-200' }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
