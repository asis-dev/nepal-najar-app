'use client';
import { useState } from 'react';

export function DisputeForm({ commitmentId }: { commitmentId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('status');
  const [currentValue, setCurrentValue] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [rationale, setRationale] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('citizen');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          commitmentId,
          disputeType: type,
          currentValue,
          proposedValue,
          rationale,
          evidenceUrl,
          claimantName: name,
          claimantRole: role,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setState('err');
        setMsg(j.error || 'failed');
        return;
      }
      setState('ok');
    } catch {
      setState('err');
      setMsg('network');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-400 hover:text-red-400 underline"
      >
        Dispute this
      </button>
    );
  }
  if (state === 'ok') {
    return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-300">
        ✓ Dispute submitted. Our editors will review it.
      </div>
    );
  }

  const field =
    'w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500';

  return (
    <form onSubmit={submit} className="rounded-xl bg-zinc-900 border border-amber-500/30 p-4 space-y-3">
      <div className="text-sm font-bold text-amber-300">Dispute this commitment</div>
      <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
        <option value="status">Wrong status</option>
        <option value="progress">Wrong progress %</option>
        <option value="evidence">Missing/wrong evidence</option>
        <option value="other">Other</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder="Current"
          className={field}
        />
        <input
          value={proposedValue}
          onChange={(e) => setProposedValue(e.target.value)}
          placeholder="Should be"
          className={field}
        />
      </div>
      <textarea
        required
        minLength={20}
        maxLength={2000}
        rows={3}
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder="Why? (required, 20+ chars)"
        className={`${field} resize-none`}
      />
      <input
        value={evidenceUrl}
        onChange={(e) => setEvidenceUrl(e.target.value)}
        placeholder="Evidence URL (optional)"
        className={field}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={field}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
          <option value="citizen">Citizen</option>
          <option value="journalist">Journalist</option>
          <option value="ngo">NGO/CSO</option>
          <option value="ministry">Ministry</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={state === 'loading'}
          className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {state === 'loading' ? 'Submitting…' : 'Submit dispute'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300"
        >
          Cancel
        </button>
      </div>
      {state === 'err' && <div className="text-xs text-red-400">Error: {msg}</div>}
    </form>
  );
}
