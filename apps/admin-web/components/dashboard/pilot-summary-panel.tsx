'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

type OverallHealth = 'strong' | 'watch' | 'needs_attention';
type ActionPriority = 'low' | 'medium' | 'high';

interface PilotSummaryAction {
  title: string;
  why: string;
  priority: ActionPriority;
}

interface PilotSummary {
  id: string;
  windowDays: number;
  summaryHeadline: string;
  summaryBody: string;
  overallHealth: OverallHealth;
  confidence: number;
  wins: string[];
  watchItems: string[];
  recommendedActions: PilotSummaryAction[];
  provider: string | null;
  model: string | null;
  createdAt: string;
}

const HEALTH_STYLES: Record<OverallHealth, { label: string; tone: string; icon: JSX.Element }> = {
  strong: {
    label: 'Strong',
    tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  watch: {
    label: 'Watch',
    tone: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  needs_attention: {
    label: 'Needs Attention',
    tone: 'border-red-500/20 bg-red-500/10 text-red-300',
    icon: <ShieldAlert className="h-4 w-4" />,
  },
};

const PRIORITY_TONES: Record<ActionPriority, string> = {
  low: 'text-gray-400',
  medium: 'text-amber-300',
  high: 'text-red-300',
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function PilotSummaryPanel({ days = 14 }: { days?: number }) {
  const [summary, setSummary] = useState<PilotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'queue' | 'run' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pilot-summary?days=${days}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to load OpenClaw summary');
      }
      setSummary(payload.summary ?? null);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load OpenClaw summary',
      });
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  async function act(action: 'queue' | 'run') {
    setSubmitting(action);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/pilot-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, days }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || `Failed to ${action} pilot summary`);
      }

      if (action === 'run' && payload.summary) {
        setSummary(payload.summary);
      } else if (action === 'queue') {
        await fetchSummary();
      }

      setMessage({
        type: 'success',
        text:
          action === 'run'
            ? 'OpenClaw generated a fresh pilot summary.'
            : 'Pilot summary refresh queued for OpenClaw.',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : `Failed to ${action} pilot summary`,
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">OpenClaw Pilot Summary</h2>
          </div>
          <p className="max-w-2xl text-sm text-gray-400">
            OpenClaw reads the live pilot tracker facts and turns them into a short operator brief, so you can spot traction and backend risk faster.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => act('queue')}
            disabled={submitting !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.07] disabled:opacity-60"
          >
            {submitting === 'queue' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Queue Refresh
          </button>
          <button
            onClick={() => act('run')}
            disabled={submitting !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-500/20 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-300 transition-colors hover:bg-primary-500/20 disabled:opacity-60"
          >
            {submitting === 'run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Run Now
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary-400" />
        </div>
      ) : summary ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xl font-semibold text-white">{summary.summaryHeadline}</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">{summary.summaryBody}</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${HEALTH_STYLES[summary.overallHealth].tone}`}>
              {HEALTH_STYLES[summary.overallHealth].icon}
              {HEALTH_STYLES[summary.overallHealth].label}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Confidence</p>
              <p className="mt-2 text-2xl font-semibold text-white">{Math.round(summary.confidence * 100)}%</p>
              <p className="mt-1 text-xs text-gray-500">
                {summary.provider || 'fallback'} {summary.model ? `· ${summary.model}` : ''}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Window</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary.windowDays} days</p>
              <p className="mt-1 text-xs text-gray-500">Tracking summary horizon</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Updated</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatDateTime(summary.createdAt)}</p>
              <p className="mt-1 text-xs text-gray-500">Latest OpenClaw readout</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
              <p className="text-sm font-semibold text-white">What’s going well</p>
              {summary.wins.length > 0 ? summary.wins.map((item) => (
                <p key={item} className="text-sm text-gray-300">{item}</p>
              )) : (
                <p className="text-sm text-gray-400">OpenClaw did not flag a major win yet.</p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
              <p className="text-sm font-semibold text-white">What to watch</p>
              {summary.watchItems.length > 0 ? summary.watchItems.map((item) => (
                <p key={item} className="text-sm text-gray-300">{item}</p>
              )) : (
                <p className="text-sm text-gray-400">No major watch items right now.</p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-primary-500/15 bg-primary-500/[0.04] p-4">
              <p className="text-sm font-semibold text-white">What to do next</p>
              {summary.recommendedActions.length > 0 ? summary.recommendedActions.map((item) => (
                <div key={`${item.title}-${item.priority}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-200">{item.title}</p>
                    <span className={`text-xs uppercase tracking-[0.16em] ${PRIORITY_TONES[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{item.why}</p>
                </div>
              )) : (
                <p className="text-sm text-gray-400">No recommended actions right now.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-gray-400">
          No OpenClaw pilot summary yet. Run one now and it will start reading the tracker for you.
        </div>
      )}
    </div>
  );
}
