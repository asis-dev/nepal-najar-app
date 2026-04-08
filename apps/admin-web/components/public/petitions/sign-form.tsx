'use client';
import { useState } from 'react';

export function SignPetitionForm({
  slug,
  initialCount,
  goal,
}: {
  slug: string;
  initialCount: number;
  goal: number;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err' | 'dup'>('idle');
  const [count, setCount] = useState(initialCount);
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch(`/api/petitions/${slug}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: name, email, comment }),
      });
      const j = await res.json();
      if (res.status === 409) {
        setState('dup');
        return;
      }
      if (!res.ok) {
        setState('err');
        setMsg(j.error || 'failed');
        return;
      }
      setCount(j.count || count + 1);
      setState('ok');
    } catch {
      setState('err');
      setMsg('network');
    }
  }

  if (state === 'ok') {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
        <div className="text-emerald-300 font-bold text-lg mb-1">✓ Signed</div>
        <div className="text-sm text-emerald-200/80">
          Thank you. {count.toLocaleString()} of {goal.toLocaleString()} signatures.
        </div>
      </div>
    );
  }
  if (state === 'dup') {
    return (
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-center text-zinc-400 text-sm">
        You have already signed this petition.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
      <div className="text-sm font-bold text-zinc-100 mb-1">Add your signature</div>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (public)"
        maxLength={100}
        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (optional, private)"
        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Why this matters to you (optional)"
        maxLength={500}
        rows={3}
        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none"
      />
      <button
        type="submit"
        disabled={state === 'loading' || !name}
        className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
      >
        {state === 'loading' ? 'Signing…' : 'Sign petition'}
      </button>
      {state === 'err' && <div className="text-xs text-red-400">Error: {msg}</div>}
    </form>
  );
}
