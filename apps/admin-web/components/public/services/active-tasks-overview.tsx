'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import type { ServiceTaskRecord } from '@/lib/services/task-types';

interface ActiveTasksOverviewProps {
  variant?: 'compact' | 'full';
}

export function ActiveTasksOverview({ variant = 'compact' }: ActiveTasksOverviewProps) {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [tasks, setTasks] = useState<ServiceTaskRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;
    setLoading(true);

    fetch('/api/me/service-tasks')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setTasks(data?.tasks || []);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  const active = useMemo(
    () => tasks.filter((task) => task.status !== 'completed').slice(0, variant === 'compact' ? 2 : 4),
    [tasks, variant],
  );

  if (!authReady || !user) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-white">Your tasks</h2>
        <Link
          href="/me/tasks"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      ) : active.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">
          No active tasks. Ask the advisor to start one.
        </p>
      ) : (
        <div className="mt-2.5 space-y-2">
          {active.map((task) => (
            <Link
              key={task.id}
              href="/me/tasks"
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/10 p-2.5 transition-colors hover:bg-white/[0.04]"
            >
              {/* Progress ring */}
              <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
                <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="url(#task-grad)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${task.progress * 0.94} 100`} />
                  <defs><linearGradient id="task-grad"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#DC143C" /></linearGradient></defs>
                </svg>
                <span className="absolute text-[10px] font-bold text-gray-300">{task.progress}%</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-white">{task.serviceTitle}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Clock3 className="h-3 w-3" />
                  <span>Step {task.currentStep}/{task.totalSteps}</span>
                  {task.missingDocs.length > 0 && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span className="text-amber-500/80">{task.missingDocs.length} docs needed</span>
                    </>
                  )}
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
