import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const revalidate = 300;
export const metadata = {
  title: 'Weekly Scoreboard — Nepal Republic',
  description: 'Auto-drafted weekly government report card for journalists and citizens.',
};

async function getLatest() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('weekly_scoreboards')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(1)
      .single();
    return data;
  } catch {
    return null;
  }
}

export default async function ScoreboardPage() {
  const s = await getLatest();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
        WEEKLY · AUTO-GENERATED
      </div>
      <h1 className="text-3xl md:text-4xl font-black mb-4">Weekly Scoreboard</h1>
      {!s ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-10 text-center text-zinc-400">
          Not generated yet. Run <code className="text-zinc-300">/api/scoreboard/generate</code>.
        </div>
      ) : (
        <>
          <div className="text-xs text-zinc-500 mb-4">Week of {s.week_start}</div>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 mb-6">
            <div className="text-2xl font-black mb-2">{s.headline}</div>
            {s.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Stat label="Grade" v={s.stats.grade} />
                <Stat label="Avg progress" v={`${s.stats.avg_progress}%`} />
                <Stat label="Stalled" v={s.stats.stalled} />
                <Stat label="Delivered" v={s.stats.delivered} />
              </div>
            )}
          </div>
          <div className="space-y-3 mb-6">
            {(s.thread as string[]).map((post, i) => (
              <div key={i} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
                <div className="text-[10px] font-semibold text-zinc-500 mb-2">POST {i + 1} / {(s.thread as string[]).length}</div>
                <div className="whitespace-pre-wrap text-sm text-zinc-200 leading-relaxed">{post}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-zinc-500">
            Copy & paste into X / Bluesky / Facebook. This is a draft — review before posting.
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: any }) {
  return (
    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-2xl font-black text-zinc-100">{v}</div>
    </div>
  );
}
