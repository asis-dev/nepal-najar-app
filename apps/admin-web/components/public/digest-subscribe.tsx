'use client';
import { useState } from 'react';

export function DigestSubscribe({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/digest/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState('ok');
        setEmail('');
      } else {
        const j = await res.json().catch(() => ({}));
        setMsg(j.error || 'failed');
        setState('err');
      }
    } catch {
      setState('err');
      setMsg('network');
    }
  }

  if (state === 'ok') {
    return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 text-sm">
        ✓ Subscribed. First digest arrives this Sunday.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-2xl bg-zinc-900 border border-zinc-800 ${compact ? 'p-4' : 'p-6'}`}
    >
      {!compact && (
        <>
          <div className="text-sm font-bold text-zinc-100">Weekly accountability digest</div>
          <div className="text-xs text-zinc-400 mt-1 mb-3">
            Every Sunday — top urgent items, biggest movers, what changed. Free. Unsubscribe anytime.
          </div>
        </>
      )}
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 min-w-0 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500/50"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {state === 'loading' ? '…' : 'Subscribe'}
        </button>
      </div>
      {state === 'err' && <div className="mt-2 text-xs text-red-400">Error: {msg}</div>}
    </form>
  );
}
