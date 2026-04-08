'use client';
import { useState } from 'react';

export function UpvoteButton({ id, initial }: { id: string; initial: number }) {
  const [count, setCount] = useState(initial);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function vote() {
    if (voted || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/inbox/${id}/upvote`, { method: 'POST' });
      if (res.ok) {
        setCount((c) => c + 1);
        setVoted(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={vote}
      disabled={voted || busy}
      className={`shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-lg border transition ${
        voted
          ? 'bg-red-500/15 border-red-500/40 text-red-300'
          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
      }`}
      aria-label="Upvote"
    >
      <span className="text-sm leading-none">▲</span>
      <span className="text-xs font-bold mt-0.5">{count}</span>
    </button>
  );
}
