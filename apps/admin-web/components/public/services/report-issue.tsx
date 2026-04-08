'use client';

import { useState } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

interface Props {
  serviceSlug: string;
}

const FIELDS = [
  { value: 'general', label: 'General issue' },
  { value: 'title', label: 'Title / name' },
  { value: 'summary', label: 'Description' },
  { value: 'documents', label: 'Required documents' },
  { value: 'fees', label: 'Fees' },
  { value: 'steps', label: 'Steps / process' },
  { value: 'offices', label: 'Offices / locations' },
  { value: 'contact', label: 'Contact info' },
  { value: 'officialUrl', label: 'Official website' },
  { value: 'other', label: 'Other' },
];

export function ReportIssue({ serviceSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (message.trim().length < 5) {
      setErr('Please describe the issue (at least 5 characters).');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/services/corrections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceSlug,
          field,
          message: message.trim(),
          contactEmail: email.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'submit_failed');
      }
      setDone(true);
      setMessage('');
      setEmail('');
    } catch (e: any) {
      setErr(e.message === 'rate_limited' ? 'Too many reports. Try again later.' : 'Could not send. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-amber-500/40 hover:text-amber-300"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Report an issue
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-zinc-100">Report an issue with this page</span>
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setDone(false);
            setErr(null);
          }}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {done ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-xs text-emerald-300">
          <Check className="h-4 w-4" />
          Thanks! We&apos;ll review and update the page.
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">
              What&apos;s wrong?
            </label>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-amber-500/40 focus:outline-none"
            >
              {FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">
              Describe the issue
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="e.g. The fee is now Rs. 2,500 not Rs. 2,000 — verified at the counter last week."
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
            />
            <div className="mt-0.5 text-right text-[10px] text-zinc-600">{message.length}/2000</div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">
              Email (optional — we&apos;ll follow up)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>

          {err && <div className="text-xs text-red-400">{err}</div>}

          <button
            onClick={submit}
            disabled={loading || message.trim().length < 5}
            className="w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Submit report'}
          </button>
        </div>
      )}
    </div>
  );
}
