import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { SignPetitionForm } from '@/components/public/petitions/sign-form';

export const revalidate = 30;

async function getPetition(slug: string) {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('petitions')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return data;
  } catch {
    return null;
  }
}

async function getRecentSignatures(petitionId: string) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('petition_signatures')
      .select('display_name, comment, created_at')
      .eq('petition_id', petitionId)
      .not('display_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);
    return data || [];
  } catch {
    return [];
  }
}

export default async function PetitionDetailPage({ params }: { params: { slug: string } }) {
  const p = await getPetition(params.slug);
  if (!p) notFound();
  const sigs = await getRecentSignatures(p.id);
  const pct = Math.min(100, Math.round((p.signature_count / p.goal) * 100));

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/petitions" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← All petitions
      </Link>
      <h1 className="text-3xl md:text-4xl font-black mt-3 mb-2">{p.title}</h1>
      {p.target_name && (
        <div className="text-sm text-zinc-400 mb-6">To: <strong>{p.target_name}</strong></div>
      )}

      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 mb-6">
        <div className="flex items-end justify-between mb-2">
          <div className="text-2xl font-black text-zinc-100">
            {p.signature_count.toLocaleString()}
            <span className="text-sm text-zinc-500 font-normal"> / {p.goal.toLocaleString()}</span>
          </div>
          <div className="text-xs text-zinc-400">{pct}%</div>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 mb-6">
        <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{p.summary}</p>
        {p.body && (
          <p className="mt-4 text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm">{p.body}</p>
        )}
      </div>

      <SignPetitionForm slug={p.slug} initialCount={p.signature_count} goal={p.goal} />

      {sigs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-zinc-200 mb-3">Recent signatures</h2>
          <ul className="space-y-2">
            {sigs.map((s: any, i: number) => (
              <li key={i} className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <div className="text-sm font-semibold text-zinc-100">{s.display_name}</div>
                {s.comment && <div className="text-xs text-zinc-400 mt-1">"{s.comment}"</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
