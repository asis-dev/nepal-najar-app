import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const revalidate = 600;
export const metadata = {
  title: 'Citizen Leaderboard — Nepal Republic',
  description: 'Top contributors holding the government accountable.',
};

async function getLeaderboard() {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('contributor_karma')
      .select('*')
      .limit(100);
    return data || [];
  } catch {
    return [];
  }
}

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
        ⭐ CITIZEN KARMA
      </div>
      <h1 className="text-3xl md:text-4xl font-black mb-2">Citizen Leaderboard</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        People who signed petitions, reported issues, and held the government accountable.
      </p>
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-10 text-center text-zinc-400">
          No contributors yet. Be the first — sign a petition.
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r: any, i: number) => (
            <li
              key={r.name + i}
              className="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 p-3"
            >
              <div className="w-8 text-center text-lg font-black text-zinc-500">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-zinc-100 truncate">{r.name}</div>
                <div className="text-xs text-zinc-500">{r.sign_count} petitions signed</div>
              </div>
              <div className="text-lg font-black text-amber-400">{r.karma}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
