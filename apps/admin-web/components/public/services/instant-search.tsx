'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Service } from '@/lib/services/types';
import { CATEGORY_ICONS } from '@/lib/services/types';

interface Props {
  services: Service[];
}

/**
 * Client-side instant search for /services landing.
 * Falls back to /services/search form if JS disabled.
 */
export function ServicesInstantSearch({ services }: Props) {
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const scored = services
      .map((s) => {
        const hay = [
          s.title.en,
          s.title.ne,
          s.summary.en,
          s.summary.ne,
          s.providerName,
          s.category,
          ...(s.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return null;
        // rank title matches higher
        const titleHit = (s.title.en + ' ' + s.title.ne).toLowerCase().includes(needle);
        return { s, score: titleHit ? 2 : 1 };
      })
      .filter(Boolean) as { s: Service; score: number }[];
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((x) => x.s);
  }, [q, services]);

  return (
    <div className="relative">
      <form action="/services/search" method="GET" className="relative">
        <input
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          placeholder="Search: license, passport, PAN, electricity bill…"
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-red-500 focus:outline-none"
        />
      </form>

      {q.trim() && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[60vh] overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-xl">
          {results.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              No matches. Try a broader term.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-900">
              {results.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.category}/${s.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900"
                  >
                    <div className="shrink-0 text-2xl">{CATEGORY_ICONS[s.category]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {s.title.en}
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {s.title.ne} · {s.providerName}
                      </div>
                    </div>
                    <div className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">
                      {s.category}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
