'use client';
import { useEffect, useState } from 'react';

type Resp = {
  id: string;
  author_name: string;
  author_role?: string | null;
  body: string;
  source_url?: string | null;
  verified: boolean;
  posted_at: string;
};

export function MinisterResponseForm({
  commitmentId,
  itemId,
}: {
  commitmentId?: string;
  itemId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [body, setBody] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const [responses, setResponses] = useState<Resp[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (commitmentId) params.set('commitment_id', commitmentId);
    if (itemId) params.set('item_id', itemId);
    fetch(`/api/responses?${params}`)
      .then((r) => r.json())
      .then((j) => setResponses(j.responses || []))
      .catch(() => {});
  }, [commitmentId, itemId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commitmentId, itemId, authorName: name, authorRole: role, body, sourceUrl }),
      });
      const j = await res.json();
      if (!res.ok) {
        setState('err');
        setMsg(j.error || 'failed');
        return;
      }
      setState('ok');
      setBody('');
      setSourceUrl('');
    } catch {
      setState('err');
    }
  }

  const field =
    'w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500';

  return (
    <div className="space-y-3">
      {responses.length > 0 && (
        <ul className="space-y-2">
          {responses.map((r) => (
            <li key={r.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-zinc-100">{r.author_name}</span>
                {r.verified && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    ✓ VERIFIED
                  </span>
                )}
                {r.author_role && <span className="text-xs text-zinc-500">· {r.author_role}</span>}
              </div>
              <div className="text-sm text-zinc-300 whitespace-pre-wrap">{r.body}</div>
              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-400 hover:underline mt-1 inline-block"
                >
                  Source →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {state === 'ok' ? (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-300">
          ✓ Response submitted. Editors will verify and mark official replies.
        </div>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-zinc-400 hover:text-emerald-400 underline"
        >
          + Submit official response
        </button>
      ) : (
        <form onSubmit={submit} className="rounded-xl bg-zinc-900 border border-emerald-500/30 p-4 space-y-2">
          <div className="text-sm font-bold text-emerald-300">Submit a response</div>
          <div className="grid grid-cols-2 gap-2">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role / title" className={field} />
          </div>
          <textarea
            required
            minLength={20}
            maxLength={5000}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Your response (20+ chars)"
            className={`${field} resize-none`}
          />
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Source URL (official statement)" className={field} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={state === 'loading'}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {state === 'loading' ? 'Sending…' : 'Submit'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300">
              Cancel
            </button>
          </div>
          {state === 'err' && <div className="text-xs text-red-400">Error: {msg}</div>}
        </form>
      )}
    </div>
  );
}
