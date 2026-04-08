import Link from 'next/link';
import { searchServices } from '@/lib/services/catalog';
import { CATEGORY_ICONS } from '@/lib/services/types';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() || '';
  const results = q ? await searchServices(q) : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/services" className="text-sm text-zinc-400 hover:text-zinc-200">← All services</Link>

      <form action="/services/search" method="GET" className="mt-4 mb-6">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search services…"
          className="w-full px-5 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-red-500 focus:outline-none"
        />
      </form>

      {q && (
        <div className="text-sm text-zinc-400 mb-4">
          {results.length} result{results.length === 1 ? '' : 's'} for <span className="text-zinc-200">&quot;{q}&quot;</span>
        </div>
      )}

      <div className="grid gap-3">
        {results.map((s) => (
          <Link
            key={s.slug}
            href={`/services/${s.category}/${s.slug}`}
            className="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-red-500/50"
          >
            <div className="text-2xl shrink-0">{CATEGORY_ICONS[s.category]}</div>
            <div className="min-w-0">
              <div className="font-semibold text-zinc-100 truncate">{s.title.en}</div>
              <div className="text-xs text-zinc-400 truncate">{s.title.ne} · {s.providerName}</div>
            </div>
          </Link>
        ))}
      </div>

      {q && results.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No services found. Try a different keyword.
        </div>
      )}
    </div>
  );
}
