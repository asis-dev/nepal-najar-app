import Link from 'next/link';
import { getPromises } from '@/lib/data';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const revalidate = 600;
export const metadata = {
  title: 'What Changed This Week — Nepal Republic',
  description: 'Every government commitment that moved in the last 7 days.',
};

async function getRecentArticles() {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = getSupabase();
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from('scraped_articles')
      .select('title, url, source_name, published_at, promise_ids')
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(60);
    return data || [];
  } catch {
    return [];
  }
}

export default async function WhatChangedWeekPage() {
  const promises = await getPromises();
  const weekAgo = Date.now() - 7 * 86400000;

  const moved = promises
    .filter((p) => {
      const t = p.lastSignalAt ? new Date(p.lastSignalAt).getTime() : 0;
      return t > weekAgo;
    })
    .sort((a, b) => {
      const ta = new Date(a.lastSignalAt || 0).getTime();
      const tb = new Date(b.lastSignalAt || 0).getTime();
      return tb - ta;
    })
    .slice(0, 50);

  const articles = await getRecentArticles();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
        LAST 7 DAYS
      </div>
      <h1 className="text-3xl md:text-4xl font-black mb-2">What Changed This Week</h1>
      <p className="text-zinc-400 mb-8">
        {moved.length} commitments received new signals. {articles.length} news articles tracked.
      </p>

      {moved.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-zinc-200 mb-3 uppercase tracking-wide">
            Commitments that moved
          </h2>
          <ul className="space-y-2">
            {moved.map((p) => {
              const days = Math.max(
                1,
                Math.round((Date.now() - new Date(p.lastSignalAt || 0).getTime()) / 86400000)
              );
              return (
                <li key={p.id}>
                  <Link
                    href={`/explore/first-100-days/${p.slug}`}
                    className="block rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-red-500/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-zinc-100 line-clamp-2">{p.title}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {p.category} · {p.status.replace('_', ' ')} · {p.progress}%
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 shrink-0">{days}d ago</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {articles.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-zinc-200 mb-3 uppercase tracking-wide">
            Recent news articles
          </h2>
          <ul className="space-y-2">
            {articles.slice(0, 30).map((a: any, i: number) => (
              <li key={i}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-zinc-900 border border-zinc-800 p-3 hover:border-red-500/30"
                >
                  <div className="text-sm text-zinc-100 line-clamp-2">{a.title}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    {a.source_name} ·{' '}
                    {new Date(a.published_at).toLocaleDateString()}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
