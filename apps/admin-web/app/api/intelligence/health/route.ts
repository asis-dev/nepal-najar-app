import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

/**
 * Health check for the intelligence pipeline.
 *
 * Returns:
 *  - last sweep status & age
 *  - per-source signal counts in the last 24h and 7d
 *  - sources that have gone silent (0 signals in 24h despite producing signals in 7d)
 *  - commitment coverage breadth
 *  - overall status: healthy | degraded | critical
 *
 * Public read-only — safe to expose.
 */
export async function GET() {
  const supabase = getSupabase();
  const now = Date.now();
  const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
  const since7d = new Date(now - 7 * 86400 * 1000).toISOString();

  // ── Latest sweep ────────────────────────────────────────────────────────────
  const { data: latestSweeps } = await supabase
    .from('intelligence_sweeps')
    .select('id,sweep_type,started_at,finished_at,status,signals_discovered,sources_checked,summary,error_log')
    .order('started_at', { ascending: false })
    .limit(5);

  const latest = latestSweeps?.[0];
  const lastFinished = latestSweeps?.find((s) => s.status !== 'running');
  const ageMin = lastFinished?.started_at
    ? Math.round((now - new Date(lastFinished.started_at).getTime()) / 60000)
    : null;

  // ── Signal volume by source (24h vs 7d) ────────────────────────────────────
  const fetchAll = async (since: string) => {
    const out: Array<{ source_id: string }> = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from('intelligence_signals')
        .select('source_id')
        .gte('discovered_at', since)
        .order('discovered_at', { ascending: false })
        .range(from, from + 999);
      if (!data?.length) break;
      out.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
    return out;
  };

  const [signals24h, signals7d] = await Promise.all([fetchAll(since24h), fetchAll(since7d)]);

  const tally = (arr: Array<{ source_id: string }>) => {
    const m = new Map<string, number>();
    arr.forEach((s) => m.set(s.source_id || 'unknown', (m.get(s.source_id || 'unknown') || 0) + 1));
    return m;
  };
  const t24 = tally(signals24h);
  const t7 = tally(signals7d);

  // Sources that produced in last 7 days but not in last 24h → "silent"
  const silentSources: Array<{ source_id: string; signals_7d: number }> = [];
  t7.forEach((count7, src) => {
    if (count7 >= 5 && (t24.get(src) || 0) === 0) {
      silentSources.push({ source_id: src, signals_7d: count7 });
    }
  });
  silentSources.sort((a, b) => b.signals_7d - a.signals_7d);

  // ── Channel breakdown ──────────────────────────────────────────────────────
  const channelOf = (id: string): string => {
    if (id.startsWith('rss-')) return 'rss';
    if (id.startsWith('yt-')) return 'youtube';
    if (id.startsWith('fb-')) return 'facebook';
    if (id.startsWith('x-') || id.startsWith('twitter-')) return 'x';
    if (id.startsWith('tiktok-')) return 'tiktok';
    if (id.startsWith('threads-')) return 'threads';
    if (id.startsWith('reddit-')) return 'reddit';
    if (id.startsWith('telegram-')) return 'telegram';
    if (id.startsWith('parliament') || id.startsWith('gazette')) return 'parliament';
    if (id.startsWith('gov-') || id.startsWith('mof-') || id.startsWith('mohp-')) return 'gov';
    if (id === 'corruption-sweep') return 'corruption-sweep';
    return 'other';
  };
  const channels: Record<string, { sources: number; signals_24h: number; signals_7d: number }> = {};
  const ensureCh = (k: string) => (channels[k] ||= { sources: 0, signals_24h: 0, signals_7d: 0 });
  t7.forEach((c7, src) => {
    const ch = ensureCh(channelOf(src));
    ch.sources += 1;
    ch.signals_7d += c7;
    ch.signals_24h += t24.get(src) || 0;
  });

  // ── Commitment coverage ────────────────────────────────────────────────────
  let coveredCommitments = 0;
  let zeroCommitments: number[] = [];
  {
    const out: Array<{ matched_promise_ids: number[] | null }> = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from('intelligence_signals')
        .select('matched_promise_ids')
        .gte('discovered_at', since7d)
        .order('discovered_at', { ascending: false })
        .range(from, from + 999);
      if (!data?.length) break;
      out.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
    const seen = new Set<number>();
    out.forEach((s) => (s.matched_promise_ids || []).forEach((id) => seen.add(id)));
    coveredCommitments = seen.size;
    for (let i = 1; i <= 109; i++) if (!seen.has(i)) zeroCommitments.push(i);
  }

  // ── Overall status ─────────────────────────────────────────────────────────
  const issues: string[] = [];
  if (!latest) issues.push('No sweep records found');
  if (ageMin !== null && ageMin > 60 * 13) issues.push(`Last sweep finished ${ageMin}min ago (>13h)`);
  if (signals24h.length < 200) issues.push(`Only ${signals24h.length} signals in last 24h (expected >500)`);
  if (silentSources.length > 5) issues.push(`${silentSources.length} sources have gone silent`);
  if (zeroCommitments.length > 0) issues.push(`${zeroCommitments.length} commitments have 0 signals: ${zeroCommitments.slice(0, 10).join(',')}`);
  if (Object.keys(channels).length < 3) issues.push('Fewer than 3 distinct channels active');

  const status: 'healthy' | 'degraded' | 'critical' =
    issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'critical';

  return NextResponse.json({
    status,
    issues,
    last_sweep: latest && {
      id: latest.id,
      type: latest.sweep_type,
      status: latest.status,
      started_at: latest.started_at,
      finished_at: latest.finished_at,
      signals_discovered: latest.signals_discovered,
      sources_checked: latest.sources_checked,
      age_minutes: ageMin,
      summary: latest.summary,
    },
    signals: {
      last_24h: signals24h.length,
      last_7d: signals7d.length,
      unique_sources_24h: t24.size,
      unique_sources_7d: t7.size,
    },
    channels,
    silent_sources: silentSources.slice(0, 30),
    commitment_coverage: {
      covered: coveredCommitments,
      total: 109,
      zero_commitments: zeroCommitments,
    },
    recent_sweeps: latestSweeps,
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
