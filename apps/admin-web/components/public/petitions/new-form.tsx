'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewPetitionForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [targetName, setTargetName] = useState('');
  const [goal, setGoal] = useState(1000);
  const [state, setState] = useState<'idle' | 'loading' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/petitions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, summary, body, targetName, goal }),
      });
      const j = await res.json();
      if (!res.ok) {
        setState('err');
        setMsg(j.error || 'failed');
        return;
      }
      router.push(`/petitions/${j.slug}`);
    } catch {
      setState('err');
      setMsg('network');
    }
  }

  const field =
    'w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-zinc-400 block mb-1">Title</label>
        <input required minLength={10} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="What do you want done?" />
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-400 block mb-1">Target (minister or ministry)</label>
        <input value={targetName} onChange={(e) => setTargetName(e.target.value)} className={field} placeholder="e.g. Minister of Energy" />
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-400 block mb-1">
          Summary ({summary.length}/500)
        </label>
        <textarea required minLength={20} maxLength={500} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={`${field} resize-none`} placeholder="One paragraph explaining the ask." />
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-400 block mb-1">
          Full body (optional, {body.length}/5000)
        </label>
        <textarea maxLength={5000} rows={6} value={body} onChange={(e) => setBody(e.target.value)} className={`${field} resize-none`} placeholder="Background, context, evidence…" />
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-400 block mb-1">Signature goal</label>
        <select value={goal} onChange={(e) => setGoal(Number(e.target.value))} className={field}>
          <option value={500}>500</option>
          <option value={1000}>1,000</option>
          <option value={5000}>5,000</option>
          <option value={10000}>10,000</option>
          <option value={50000}>50,000</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
      >
        {state === 'loading' ? 'Publishing…' : 'Publish petition'}
      </button>
      {state === 'err' && <div className="text-xs text-red-400">Error: {msg}</div>}
    </form>
  );
}
