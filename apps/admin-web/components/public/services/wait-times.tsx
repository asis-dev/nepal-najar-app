'use client';

import { useEffect, useState } from 'react';
import { Clock, Check, Users } from 'lucide-react';

interface Stat {
  service_slug: string;
  office_name: string;
  reports: number;
  avg_minutes: number;
  median_minutes: number;
  success_pct: number;
  last_report_at: string;
}

interface Props {
  serviceSlug: string;
  officeName: string;
  officeIndex?: number;
}

export function WaitTimeWidget({ serviceSlug, officeName, officeIndex }: Props) {
  const [stats, setStats] = useState<Stat | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [success, setSuccess] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch(`/api/services/wait-times?slug=${encodeURIComponent(serviceSlug)}`);
      const j = await r.json();
      const match = (j.stats || []).find(
        (s: Stat) => s.office_name.toLowerCase() === officeName.toLowerCase(),
      );
      setStats(match || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceSlug, officeName]);

  async function submit() {
    setErr(null);
    const m = Number(minutes);
    if (!Number.isFinite(m) || m < 0 || m > 1440) {
      setErr('Enter wait time in minutes (0-1440).');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/services/wait-times', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceSlug,
          officeName,
          officeIndex,
          waitMinutes: m,
          success,
          note: note.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'failed');
      }
      setDone(true);
      setMinutes('');
      setNote('');
      setSuccess(null);
      setTimeout(() => {
        load();
        setShowForm(false);
        setDone(false);
      }, 1200);
    } catch (e: any) {
      setErr(e.message === 'rate_limited' ? 'Too many reports. Try later.' : 'Could not send.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 border-t border-zinc-800/80 pt-2">
      {loading ? (
        <div className="text-[10px] text-zinc-600">Loading wait times…</div>
      ) : stats ? (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <div className="inline-flex items-center gap-1 rounded-md border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-blue-300">
            <Clock className="h-3 w-3" />
            <span className="font-semibold tabular-nums">~{stats.median_minutes} min</span>
            <span className="text-blue-400/70">median</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
            <Check className="h-3 w-3" />
            <span className="font-semibold tabular-nums">{stats.success_pct}%</span>
            <span className="text-emerald-400/70">success</span>
          </div>
          <div className="inline-flex items-center gap-1 text-zinc-500">
            <Users className="h-3 w-3" />
            <span className="tabular-nums">{stats.reports} reports</span>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="ml-auto text-[10px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              + Add yours
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>No wait-time reports yet.</span>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
            >
              Be the first to report
            </button>
          )}
        </div>
      )}

      {showForm && (
        <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2">
          {done ? (
            <div className="py-1 text-[11px] text-emerald-400">✓ Thanks for reporting!</div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={1440}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Minutes"
                className="w-24 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-blue-500/40"
              />
              <div className="inline-flex overflow-hidden rounded-md border border-zinc-800">
                <button
                  onClick={() => setSuccess(true)}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                    success === true ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Success
                </button>
                <button
                  onClick={() => setSuccess(false)}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                    success === false ? 'bg-red-500/20 text-red-300' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Failed
                </button>
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={280}
                placeholder="Quick note (optional)"
                className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-blue-500/40"
              />
              <button
                onClick={submit}
                disabled={submitting || !minutes}
                className="rounded-md bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-zinc-950 transition-colors hover:bg-blue-400 disabled:opacity-50"
              >
                {submitting ? '…' : 'Send'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setErr(null);
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
              {err && <div className="w-full text-[10px] text-red-400">{err}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
