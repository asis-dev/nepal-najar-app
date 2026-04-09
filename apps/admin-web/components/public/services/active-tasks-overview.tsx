'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, FolderLock, Loader2 } from 'lucide-react';
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
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
            Action Layer
          </div>
          <h2 className="mt-1 text-lg font-bold text-white">
            Continue your tasks
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Pick up the next step without scanning the whole app.
          </p>
        </div>
        <Link
          href="/me/tasks"
          className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/[0.05]"
        >
          Open tasks
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your active tasks...
        </div>
      ) : active.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] px-4 py-4 text-sm text-gray-400">
          No active tasks yet. Start with a service request and NepalRepublic can keep the workflow together for you.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {active.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-white/[0.08] bg-black/10 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">
                    {task.serviceCategory}
                  </div>
                  <div className="truncate text-sm font-semibold text-white">
                    {task.serviceTitle}
                  </div>
                  {task.targetMemberName && (
                    <div className="mt-1 text-[11px] font-medium text-cyan-300">
                      For {task.targetMemberName}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-400">
                    {task.nextAction || 'Continue this workflow.'}
                  </div>
                </div>
                <div className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-gray-300">
                  {task.progress}%
                </div>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-white/[0.06]">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-red-500"
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Step {task.currentStep} of {task.totalSteps}
                </span>
                <span>•</span>
                <span>
                  {task.missingDocs.length === 0
                    ? 'Docs ready'
                    : `${task.missingDocs.length} docs missing`}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/me/tasks"
                  className="inline-flex items-center rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                >
                  Continue task
                </Link>
                {task.missingDocs.length > 0 && (
                  <Link
                    href="/me/vault"
                    className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/[0.05]"
                  >
                    <FolderLock className="h-3.5 w-3.5" />
                    Open vault
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
