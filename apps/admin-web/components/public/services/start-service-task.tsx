'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import type { ServiceTaskRecord } from '@/lib/services/task-types';

interface Props {
  serviceSlug: string;
  serviceTitle: string;
  locale?: 'en' | 'ne';
}

export default function StartServiceTask({ serviceSlug, serviceTitle, locale = 'en' }: Props) {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [task, setTask] = useState<ServiceTaskRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;
    fetch('/api/me/service-tasks')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const match = (data.tasks || []).find((row: ServiceTaskRecord) => row.serviceSlug === serviceSlug && row.status !== 'completed');
        setTask(match || null);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [authReady, user, serviceSlug]);

  async function startTask() {
    setLoading(true);
    try {
      const response = await fetch('/api/me/service-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceSlug, locale }),
      });
      const data = await response.json();
      if (response.ok) setTask(data.task);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-red-400 font-bold mb-1">
            {locale === 'ne' ? 'कार्यप्रवाह' : 'Workflow'}
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">
            {locale === 'ne' ? 'यो सेवा चरणबद्ध रूपमा ट्र्याक गर्नुहोस्' : 'Track this service step by step'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {task
              ? task.nextAction || `Continue ${serviceTitle}`
              : locale === 'ne'
                ? 'कागजात, अर्को कदम, र प्रगति एउटै ठाउँमा राख्नुहोस्।'
                : 'Keep documents, next actions, and progress in one place.'}
          </p>
        </div>

        {!authReady || !user ? (
          <Link
            href={`/login?next=/services`}
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
          >
            {locale === 'ne' ? 'सुरु गर्न साइन इन' : 'Sign in to start'}
          </Link>
        ) : task ? (
          <div className="flex flex-col gap-2 text-right">
            <div className="text-xs text-zinc-400">
              {task.progress}% · {task.status.replace(/_/g, ' ')}
            </div>
            <Link
              href="/me/tasks"
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              {locale === 'ne' ? 'मेरो कार्यहरूमा जारी राख्नुहोस्' : 'Continue in My Tasks'}
            </Link>
          </div>
        ) : (
          <button
            onClick={startTask}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {loading
              ? locale === 'ne' ? 'सुरु गर्दै…' : 'Starting…'
              : locale === 'ne' ? 'यो सेवा सुरु गर्नुहोस्' : 'Start this service'}
          </button>
        )}
      </div>
    </div>
  );
}
