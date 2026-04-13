'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';

interface DepartmentStats {
  department_key: string;
  department_name: string;
  total: number;
  open: number;
  overdue: number;
  waiting_on_citizen: number;
  escalated: number;
}

interface Totals {
  total: number;
  open: number;
  overdue: number;
  due_soon: number;
  waiting_on_citizen: number;
  escalated: number;
}

export default function DepartmentDashboard() {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !user) {
      setLoading(false);
      return;
    }
    fetchStats();
  }, [authReady, user]);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/service-tasks/stats');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Access denied (${res.status})`);
      }
      const data = await res.json();
      setTotals(data.totals || null);
      setDepartments(data.by_department || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!authReady || loading) {
    return <div className="max-w-5xl mx-auto px-4 py-10 text-zinc-400">Loading dashboard…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Department Dashboard</h1>
        <p className="text-zinc-400 mb-6">Sign in with a department or admin account to view your task queue.</p>
        <Link href="/login?next=/department" className="inline-flex rounded-xl bg-[#DC143C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#DC143C]/90">
          Sign in
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Department Dashboard</h1>
        <p className="text-red-400 mb-4">{error}</p>
        <p className="text-zinc-500 text-sm">You need admin or department access to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Department Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Citizen cases assigned to government departments for action
        </p>
      </div>

      {/* Summary stats */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Total Cases" value={totals.total} />
          <StatCard label="Open" value={totals.open} color="text-blue-400" />
          <StatCard label="Overdue" value={totals.overdue} color="text-red-400" alert={totals.overdue > 0} />
          <StatCard label="Due Soon" value={totals.due_soon} color="text-amber-400" />
          <StatCard label="Waiting on Citizen" value={totals.waiting_on_citizen} color="text-cyan-400" />
          <StatCard label="Escalated" value={totals.escalated} color="text-red-400" alert={totals.escalated > 0} />
        </div>
      )}

      {/* Department breakdown */}
      <h2 className="text-lg font-bold text-white mb-4">By Department</h2>
      {departments.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-500 text-center">
          No department data available.
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map((dept) => (
            <Link
              key={dept.department_key}
              href={`/department/tasks?dept=${encodeURIComponent(dept.department_key)}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Department icon/indicator */}
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  dept.overdue > 0 ? 'bg-red-500 animate-pulse' : dept.open > 0 ? 'bg-blue-500' : 'bg-zinc-600'
                }`} />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-100 truncate">{dept.department_name}</div>
                </div>

                {/* Stats pills */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {dept.overdue > 0 && (
                    <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-400">
                      {dept.overdue} overdue
                    </span>
                  )}
                  {dept.escalated > 0 && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                      {dept.escalated} escalated
                    </span>
                  )}
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">
                    {dept.open} open
                  </span>
                  <span className="text-xs text-zinc-600">{dept.total} total</span>
                  <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, alert }: { label: string; value: number; color?: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border bg-zinc-900 p-3 ${alert ? 'border-red-500/30' : 'border-zinc-800'}`}>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color || 'text-zinc-100'}`}>{value}</div>
    </div>
  );
}
