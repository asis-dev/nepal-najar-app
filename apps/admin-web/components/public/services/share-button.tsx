'use client';

import { useState } from 'react';
import { trackServiceEvent } from './posthog-provider';

interface Props {
  title: string;
  slug: string;
}

export default function ShareButton({ title, slug }: Props) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/services/${slug}`
      : '';
    trackServiceEvent('service_share', { slug });
    if (navigator.share) {
      try {
        await navigator.share({ title, url, text: `${title} — Nepal Republic` });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button
      onClick={onShare}
      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
    >
      {copied ? '✓ Link copied' : '↗ Share'}
    </button>
  );
}
