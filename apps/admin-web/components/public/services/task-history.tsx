'use client';

import { useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';

interface TaskHistoryEvent {
  id: string;
  taskId: string;
  eventType: string;
  note: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

interface TaskHistoryProps {
  taskId: string;
}

function formatEventType(eventType: string) {
  switch (eventType) {
    case 'task_started':
      return 'Started';
    case 'task_updated':
      return 'Progress update';
    case 'action_completed':
      return 'Checkpoint done';
    default:
      return eventType.replace(/_/g, ' ');
  }
}

function formatWhen(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function TaskHistory({ taskId }: TaskHistoryProps) {
  const [events, setEvents] = useState<TaskHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/me/service-tasks/${taskId}/events`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setEvents(data?.events || []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  return (
    <div className="rounded-xl bg-zinc-800/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
        <History className="h-3.5 w-3.5" />
        Recent activity
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading activity…
        </div>
      ) : events.length === 0 ? (
        <div className="text-sm text-zinc-400">No task activity yet.</div>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-zinc-200">
                  {event.note || formatEventType(event.eventType)}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {formatWhen(event.createdAt)}
                </div>
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
                {formatEventType(event.eventType)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
