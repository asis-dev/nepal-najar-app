'use client';

import { useEffect, useState } from 'react';

interface TaskIntegration {
  id: string;
  provider_key: string;
  operation: string;
  status: 'pending' | 'redirected' | 'verified' | 'failed';
  provider_reference?: string | null;
  receipt_number?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export function TaskIntegrations({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<TaskIntegration[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/me/service-tasks/${taskId}/integrations`)
      .then((res) => (res.ok ? res.json() : { integrations: [] }))
      .then((data) => {
        if (!active) return;
        setItems(data.integrations || []);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
      });

    return () => {
      active = false;
    };
  }, [taskId]);

  if (items.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl bg-zinc-800/60 p-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Provider activity</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-zinc-700/70 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
              <span className="font-semibold uppercase">{item.provider_key}</span>
              <span className="text-zinc-400">·</span>
              <span>{item.operation}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  item.status === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : item.status === 'failed'
                      ? 'bg-red-500/10 text-red-300'
                      : 'bg-zinc-700 text-zinc-300'
                }`}
              >
                {item.status}
              </span>
            </div>
            {(item.receipt_number || item.provider_reference) && (
              <div className="mt-1 text-xs text-zinc-400">
                Receipt/reference: {item.receipt_number || item.provider_reference}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
