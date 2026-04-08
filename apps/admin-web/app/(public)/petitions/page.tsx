import Link from 'next/link';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const revalidate = 60;
export const metadata = {
  title: 'Petitions — Nepal Republic',
  description: 'Citizen petitions demanding government action.',
};

async function getPetitions() {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('petitions')
      .select('*')
      .eq('status', 'published')
      .order('signature_count', { ascending: false })
      .limit(100);
    return data || [];
  } catch {
    return [];
  }
}

export default async function PetitionsPage() {
  const petitions = await getPetitions();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-3">
            CITIZEN ACTION · जनआवाज
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Petitions</h1>
          <p className="text-zinc-400 max-w-2xl">
            Demand action. Every petition targets a specific minister, ministry, or commitment.
          </p>
        </div>
        <Link
          href="/petitions/new"
          className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500"
        >
          Start a petition
        </Link>
      </div>

      {petitions.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-10 text-center text-zinc-400">
          No petitions yet. Be the first —{' '}
          <Link href="/petitions/new" className="text-red-400 hover:underline">
            start one
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-3">
          {petitions.map((p: any) => {
            const pct = Math.min(100, Math.round((p.signature_count / p.goal) * 100));
            return (
              <li key={p.id}>
                <Link
                  href={`/petitions/${p.slug}`}
                  className="block rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-red-500/40"
                >
                  <div className="font-bold text-zinc-100 mb-1">{p.title}</div>
                  {p.target_name && (
                    <div className="text-xs text-zinc-500 mb-2">→ {p.target_name}</div>
                  )}
                  <div className="text-sm text-zinc-400 line-clamp-2 mb-3">{p.summary}</div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-zinc-400 shrink-0">
                      <strong className="text-zinc-200">{p.signature_count.toLocaleString()}</strong> / {p.goal.toLocaleString()}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
