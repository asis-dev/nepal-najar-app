/**
 * GET /api/accountability
 * Public aggregation endpoint for the Government Accountability Report Card.
 * Returns: whatsWorking, whatsNotWorking, transparencyScore, voteAggregates
 *
 * All data comes from Supabase (real scraped evidence). Falls back to static
 * data only when Supabase is not configured.
 *
 * Cached for 5 minutes via Next.js revalidate.
 */
import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { promises as staticPromises } from '@/lib/data/promises';
import { publicGovUnits } from '@/lib/data/government-accountability';

export const revalidate = 300; // 5 min cache

interface WorkingPromise {
  id: string;
  title: string;
  title_ne: string;
  category: string;
  status: string;
  progress: number;
  articleCount: number;
  latestHeadline: string | null;
  latestDate: string | null;
  confidence: string | null;
}

interface DownSource {
  name: string;
  url: string;
  type: 'government_portal' | 'data_source';
  status: 'down' | 'blocked' | 'stale' | 'unreachable';
  lastChecked: string | null;
}

interface SilentPromise {
  id: string;
  title: string;
  title_ne: string;
  category: string;
}

interface TransparencyScore {
  overall: number;
  sourceHealth: number;
  govPortalStatus: number;
  dataFreshness: number;
  promiseCoverage: number;
}

interface VoteAggregate {
  topicId: string;
  up: number;
  down: number;
  net: number;
}

interface AccountabilityArticleRow {
  id: string;
  headline: string;
  headline_ne: string | null;
  published_at: string | null;
  scraped_at: string | null;
  promise_ids: string[] | null;
  confidence: string | number | null;
  classification: string | null;
  source_name: string;
}

interface PromiseRow {
  id: string;
  title: string;
  title_ne: string;
  category: string;
  status: string;
  progress: number;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    // Return static fallback when Supabase isn't configured
    return NextResponse.json({
      whatsWorking: [],
      whatsNotWorking: {
        downSources: [],
        silentPromises: staticPromises.map((p) => ({
          id: p.id,
          title: p.title,
          title_ne: p.title_ne,
          category: p.category,
        })),
      },
      transparencyScore: { overall: 0, sourceHealth: 0, govPortalStatus: 0, dataFreshness: 0, promiseCoverage: 0 },
      voteAggregates: [],
    });
  }

  const supabase = getSupabase();

  // ─── Fetch data in parallel ───
  const [
    { data: articles },
    { data: dataSources },
    { data: govUnits },
    { data: votes },
    { data: dbPromises },
  ] = await Promise.all([
    supabase
      .from('scraped_articles')
      .select('id, headline, headline_ne, published_at, scraped_at, promise_ids, confidence, classification, source_name')
      .not('promise_ids', 'eq', '{}')
      .order('scraped_at', { ascending: false })
      .limit(500),
    supabase.from('data_sources').select('*').limit(200),
    supabase.from('government_org_units').select('*').limit(200),
    supabase.from('public_votes').select('topic_id, vote_type').limit(5000),
    supabase.from('promises').select('id, title, title_ne, category, status, progress').order('id'),
  ]);

  // Use Supabase promises if available, fall back to static
  const allPromises: PromiseRow[] = (dbPromises && dbPromises.length > 0)
    ? (dbPromises as PromiseRow[])
    : staticPromises.map((p) => ({
        id: p.id,
        title: p.title,
        title_ne: p.title_ne,
        category: p.category,
        status: p.status,
        progress: p.progress,
      }));

  // Build promise lookup map
  const promiseLookup = new Map<string, PromiseRow>();
  for (const p of allPromises) {
    promiseLookup.set(p.id, p);
  }

  // ─── What's Working: promises with article evidence ───
  const promiseArticleMap = new Map<string, { count: number; latest: AccountabilityArticleRow }>();

  for (const article of (articles ?? []) as AccountabilityArticleRow[]) {
    const pids = (article.promise_ids as string[]) ?? [];
    for (const pid of pids) {
      const existing = promiseArticleMap.get(pid);
      if (!existing) {
        promiseArticleMap.set(pid, { count: 1, latest: article });
      } else {
        existing.count++;
      }
    }
  }

  const whatsWorking: WorkingPromise[] = [];
  const coveredPromiseIds = new Set<string>();

  for (const [pid, data] of promiseArticleMap) {
    if (data.count < 1) continue;
    coveredPromiseIds.add(pid);
    const promise = promiseLookup.get(pid);
    if (!promise) continue;
    whatsWorking.push({
      id: promise.id,
      title: promise.title,
      title_ne: promise.title_ne,
      category: promise.category,
      status: promise.status,
      progress: promise.progress,
      articleCount: data.count,
      latestHeadline: (data.latest?.headline as string) ?? null,
      latestDate: (data.latest?.published_at as string) ?? (data.latest?.scraped_at as string) ?? null,
      confidence: (data.latest?.confidence as string) ?? null,
    });
  }

  whatsWorking.sort((a, b) => b.articleCount - a.articleCount);

  // ─── What's Not Working ───
  const downSources: DownSource[] = [];

  // Check government portals from gov_units table
  for (const unit of govUnits ?? []) {
    if ((unit.source_status as string) === 'fallback') {
      downSources.push({
        name: unit.name as string,
        url: unit.source_url as string,
        type: 'government_portal',
        status: 'unreachable',
        lastChecked: (unit.source_checked_at as string) ?? null,
      });
    }
  }

  // If no gov_units in DB, check static data
  if (!govUnits || govUnits.length === 0) {
    for (const unit of publicGovUnits) {
      downSources.push({
        name: unit.name,
        url: unit.sourceUrl,
        type: 'government_portal',
        status: 'unreachable',
        lastChecked: null,
      });
    }
  }

  // Check data sources with failures
  for (const source of dataSources ?? []) {
    const failures = (source.consecutive_failures as number) ?? 0;
    const lastSuccess = source.last_success_at as string | null;
    const staleHours = lastSuccess
      ? (Date.now() - new Date(lastSuccess).getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (failures > 0 || staleHours > 48) {
      downSources.push({
        name: source.name as string,
        url: source.url as string,
        type: 'data_source',
        status: failures > 2 ? 'down' : staleHours > 48 ? 'stale' : 'down',
        lastChecked: (source.last_scraped_at as string) ?? null,
      });
    }
  }

  // Silent promises — zero evidence (from Supabase promises, not static)
  const silentPromises: SilentPromise[] = allPromises
    .filter((p) => !coveredPromiseIds.has(p.id))
    .map((p) => ({
      id: p.id,
      title: p.title,
      title_ne: p.title_ne,
      category: p.category,
    }));

  // ─── Transparency Score ───
  const totalSources = (dataSources ?? []).length || 46;
  const healthySources = (dataSources ?? []).filter(
    (s) => ((s.consecutive_failures as number) ?? 0) === 0,
  ).length;

  const totalGovPortals = (govUnits ?? []).length || publicGovUnits.length;
  const verifiedPortals = (govUnits ?? []).filter(
    (u) => (u.source_status as string) === 'verified',
  ).length;

  // Freshness: avg hours since last scrape (lower is better)
  const freshScores = (dataSources ?? [])
    .map((s) => s.last_success_at as string | null)
    .filter(Boolean)
    .map((d) => Math.max(0, 100 - ((Date.now() - new Date(d!).getTime()) / (1000 * 60 * 60)) * 2));
  const avgFreshness = freshScores.length > 0
    ? Math.round(freshScores.reduce((a, b) => a + b, 0) / freshScores.length)
    : 0;

  const sourceHealthPct = totalSources > 0 ? Math.round((healthySources / totalSources) * 100) : 0;
  const govPortalPct = totalGovPortals > 0 ? Math.round((verifiedPortals / totalGovPortals) * 100) : 0;
  const coveragePct = Math.round((coveredPromiseIds.size / allPromises.length) * 100);

  const transparencyScore: TransparencyScore = {
    sourceHealth: sourceHealthPct,
    govPortalStatus: govPortalPct,
    dataFreshness: Math.min(100, Math.max(0, avgFreshness)),
    promiseCoverage: coveragePct,
    overall: Math.round(
      sourceHealthPct * 0.3 + govPortalPct * 0.25 + Math.min(100, avgFreshness) * 0.2 + coveragePct * 0.25,
    ),
  };

  // ─── Vote Aggregates ───
  const voteMap = new Map<string, { up: number; down: number }>();
  for (const vote of votes ?? []) {
    const tid = vote.topic_id as string;
    const vt = vote.vote_type as string;
    if (!voteMap.has(tid)) voteMap.set(tid, { up: 0, down: 0 });
    const entry = voteMap.get(tid)!;
    if (vt === 'up') entry.up++;
    else if (vt === 'down') entry.down++;
  }

  const voteAggregates: VoteAggregate[] = Array.from(voteMap.entries())
    .map(([topicId, counts]) => ({
      topicId,
      up: counts.up,
      down: counts.down,
      net: counts.up - counts.down,
    }))
    .sort((a, b) => b.net - a.net);

  return NextResponse.json({
    whatsWorking,
    whatsNotWorking: { downSources, silentPromises },
    transparencyScore,
    voteAggregates,
  });
}
