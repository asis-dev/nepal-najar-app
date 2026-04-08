'use client';
import { useState } from 'react';

export function ShareButton({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `https://nepalrepublic.org/inbox?item=${id}`;
    const text = `${title} — via Nepal Republic`;
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, text, url });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }
  return (
    <button
      onClick={share}
      className="text-[11px] text-zinc-500 hover:text-zinc-200 ml-3"
      aria-label="Share"
    >
      {copied ? '✓ Copied' : 'Share'}
    </button>
  );
}
