'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  FileText,
  MessageSquare,
  Bell,
  AlertTriangle,
  User,
  Settings,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TimelineEvent {
  id: string;
  type:
    | 'status_change'
    | 'document_added'
    | 'note_added'
    | 'reminder_sent'
    | 'escalation'
    | 'user_action'
    | 'system';
  title: string;
  description?: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
  actor?: string;
}

interface CaseSummary {
  headline: string;
  detail: string;
  actionNeeded?: string;
  status: string;
  submittedAt: string;
  sla: {
    totalDays: number;
    remainingDays: number;
    overdue: boolean;
  };
}

interface CaseStatusResponse {
  summary: CaseSummary;
  timeline: TimelineEvent[];
}

export interface CaseTimelineProps {
  taskId: string;
  serviceTitle?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const EVENT_ICONS: Record<string, typeof ArrowRight> = {
  status_change: ArrowRight,
  document_added: FileText,
  note_added: MessageSquare,
  reminder_sent: Bell,
  escalation: AlertTriangle,
  user_action: User,
  system: Settings,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CaseTimeline({ taskId, serviceTitle }: CaseTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (serviceTitle) params.set('title', serviceTitle);

    fetch(`/api/me/service-tasks/${taskId}/status?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load status (${res.status})`);
        return res.json() as Promise<CaseStatusResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setSummary(data.summary);
        setTimeline(data.timeline);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [taskId, serviceTitle]);

  async function handleEscalate() {
    setEscalating(true);
    try {
      const res = await fetch(`/api/me/service-tasks/${taskId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'SLA overdue' }),
      });
      if (!res.ok) throw new Error('Escalation failed');
      // Refresh timeline after escalation
      const params = new URLSearchParams();
      if (serviceTitle) params.set('title', serviceTitle);
      const updated = await fetch(
        `/api/me/service-tasks/${taskId}/status?${params.toString()}`
      );
      if (updated.ok) {
        const data = (await updated.json()) as CaseStatusResponse;
        setSummary(data.summary);
        setTimeline(data.timeline);
      }
    } catch {
      // Silently handle — user sees no change
    } finally {
      setEscalating(false);
    }
  }

  /* ----- Loading state ----- */
  if (loading) {
    return (
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6">
        <div className="flex items-center justify-center gap-2 py-12 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading case status...</span>
        </div>
      </div>
    );
  }

  /* ----- Error state ----- */
  if (error) {
    return (
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6">
        <div className="flex flex-col items-center gap-2 py-12 text-zinc-400">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { sla } = summary;

  return (
    <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
      {/* ---- Header ---- */}
      <div className="p-5 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
          Case Status
        </h3>

        {/* Title + status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-lg font-bold text-zinc-100">
            {summary.headline}
          </p>
          <StatusBadge status={summary.status} />
        </div>

        {/* Detail */}
        <p className="text-sm text-zinc-400 mb-3">{summary.detail}</p>

        {/* SLA */}
        <div className="mb-3">
          {sla.overdue ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400 ring-1 ring-red-500/30">
              <AlertTriangle className="h-3.5 w-3.5" />
              OVERDUE by {Math.abs(sla.remainingDays)} day
              {Math.abs(sla.remainingDays) !== 1 && 's'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
              <Clock className="h-3.5 w-3.5" />
              {sla.remainingDays} day{sla.remainingDays !== 1 && 's'} remaining
            </span>
          )}
        </div>

        {/* Action needed */}
        {summary.actionNeeded && (
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">
              Action needed
            </p>
            <p className="text-sm text-zinc-300">{summary.actionNeeded}</p>
          </div>
        )}
      </div>

      {/* ---- Timeline ---- */}
      <div className="p-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4 hover:text-zinc-200 transition-colors"
        >
          Timeline
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {expanded && (
          <div className="relative ml-3">
            {timeline.map((event, i) => {
              const isLast = i === timeline.length - 1;
              const Icon = EVENT_ICONS[event.type] ?? Settings;

              return (
                <div key={event.id} className="relative flex gap-4 pb-6">
                  {/* Vertical line */}
                  {!isLast && (
                    <div className="absolute left-[9px] top-6 bottom-0 w-px bg-zinc-700" />
                  )}

                  {/* Dot */}
                  <div className="relative z-10 flex-shrink-0 mt-0.5">
                    <TimelineDot status={event.status} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
                        <span
                          className={`text-sm font-medium truncate ${
                            event.status === 'pending'
                              ? 'text-zinc-500'
                              : 'text-zinc-200'
                          }`}
                        >
                          {event.title}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0 whitespace-nowrap">
                        {event.status === 'pending'
                          ? '(pending)'
                          : formatDate(event.timestamp)}
                      </span>
                    </div>

                    {event.description && event.status !== 'pending' && (
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                        {event.description}
                      </p>
                    )}

                    {event.actor && event.status !== 'pending' && (
                      <p className="text-xs text-zinc-600 mt-0.5">
                        by {event.actor}
                      </p>
                    )}

                    {event.status === 'completed' && event.timestamp && (
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        {timeAgo(event.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Escalation button ---- */}
      {sla.overdue && (
        <div className="px-5 pb-5">
          <button
            onClick={handleEscalate}
            disabled={escalating}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600/20 border border-amber-600/40 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {escalating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {escalating ? 'Escalating...' : 'Escalate Case'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TimelineDot({ status }: { status: 'completed' | 'current' | 'pending' }) {
  if (status === 'completed') {
    return (
      <div className="h-[18px] w-[18px] rounded-full bg-emerald-500 border-2 border-emerald-400/30" />
    );
  }

  if (status === 'current') {
    return (
      <div className="relative h-[18px] w-[18px]">
        <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30" />
        <div className="relative h-[18px] w-[18px] rounded-full bg-blue-500 border-2 border-blue-400/30" />
      </div>
    );
  }

  // pending
  return (
    <div className="h-[18px] w-[18px] rounded-full border-2 border-zinc-600 bg-transparent" />
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, '_');

  let bg = 'bg-zinc-700/50 text-zinc-300';
  if (normalized === 'submitted' || normalized === 'pending')
    bg = 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30';
  if (normalized === 'in_progress' || normalized === 'processing')
    bg = 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30';
  if (normalized === 'approved' || normalized === 'completed' || normalized === 'delivered')
    bg = 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30';
  if (normalized === 'rejected' || normalized === 'failed')
    bg = 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg}`}
    >
      {status}
    </span>
  );
}

export default CaseTimeline;
