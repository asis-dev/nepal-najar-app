/**
 * GET /api/conflicts
 *
 * Public endpoint returning commitments with conflicting evidence.
 * Groups signals by promise_id, returns only those with BOTH confirms AND contradicts.
 *
 * Query params:
 *   days=30 (default) — only signals discovered in the last N days
 *   limit=20 (default) — max conflicts returned
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { resolveSourceDisplayName } from '@/lib/utils/source-names';
import { validateDispute } from '@/lib/intelligence/dispute-validator';

interface SignalRow {
  id: string;
  title: string;
  url: string;
  source_id: string;
  confidence: number;
  relevance_score: number;
  matched_promise_ids: number[];
  discovered_at: string;
  reasoning: string;
  extracted_data: {
    officials?: { name: string; title: string; statement: string }[];
    organizations?: string[];
  } | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const days = Math.min(Number(searchParams.get('days')) || 30, 90);
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  // Fetch confirms and contradicts signals in parallel
  const [confirmsRes, contradictsRes, sourcesRes] = await Promise.all([
    supabase
      .from('intelligence_signals')
      .select('id, title, url, source_id, confidence, relevance_score, matched_promise_ids, discovered_at, reasoning, extracted_data')
      .eq('classification', 'confirms')
      .not('matched_promise_ids', 'is', null)
      .gte('discovered_at', cutoff)
      .order('discovered_at', { ascending: false }),
    supabase
      .from('intelligence_signals')
      .select('id, title, url, source_id, confidence, relevance_score, matched_promise_ids, discovered_at, reasoning, extracted_data')
      .eq('classification', 'contradicts')
      .not('matched_promise_ids', 'is', null)
      .gte('discovered_at', cutoff)
      .order('discovered_at', { ascending: false }),
    supabase
      .from('intelligence_sources')
      .select('id, name'),
  ]);

  // Build source name lookup
  const sourceNames: Record<string, string> = {};
  for (const s of sourcesRes.data || []) {
    sourceNames[s.id] = s.name;
  }

  function prettifySourceId(id: string): string {
    if (sourceNames[id]) return sourceNames[id];
    return resolveSourceDisplayName(id);
  }

  /** Extract unique actors (officials + organizations) from a set of signals */
  function extractActors(signals: SignalRow[]): { name: string; title?: string; statement?: string }[] {
    const seen = new Set<string>();
    const actors: { name: string; title?: string; statement?: string }[] = [];

    for (const s of signals) {
      const data = s.extracted_data;
      if (!data) continue;

      for (const official of data.officials || []) {
        const key = official.name.toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          actors.push({
            name: official.name,
            title: official.title || undefined,
            statement: official.statement || undefined,
          });
        }
      }

      for (const org of data.organizations || []) {
        const key = org.toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          actors.push({ name: org });
        }
      }
    }

    return actors.slice(0, 5); // Top 5 actors per side
  }

  // Group by promise_id
  const promiseMap: Record<number, { confirms: SignalRow[]; contradicts: SignalRow[] }> = {};

  for (const s of (confirmsRes.data || []) as SignalRow[]) {
    for (const pid of s.matched_promise_ids || []) {
      if (!promiseMap[pid]) promiseMap[pid] = { confirms: [], contradicts: [] };
      promiseMap[pid].confirms.push(s);
    }
  }

  for (const s of (contradictsRes.data || []) as SignalRow[]) {
    for (const pid of s.matched_promise_ids || []) {
      if (!promiseMap[pid]) promiseMap[pid] = { confirms: [], contradicts: [] };
      promiseMap[pid].contradicts.push(s);
    }
  }

  // Filter to only promises with BOTH confirms AND contradicts
  const rawConflictEntries = Object.entries(promiseMap)
    .filter(([, v]) => v.confirms.length > 0 && v.contradicts.length > 0);

  if (rawConflictEntries.length === 0) {
    return NextResponse.json({ conflicts: [], total_disputed: 0, updated_at: new Date().toISOString() });
  }

  // Validate disputes — filter false positives
  const conflictEntries = rawConflictEntries.filter(([pid, v]) => {
    const validation = validateDispute(Number(pid), v.confirms, v.contradicts);
    return validation.isGenuineDispute;
  });

  if (conflictEntries.length === 0) {
    return NextResponse.json({ conflicts: [], total_disputed: 0, total_raw: rawConflictEntries.length, updated_at: new Date().toISOString() });
  }

  // Compute heat score and sort
  const now = Date.now();
  const conflicts = conflictEntries
    .map(([pid, v]) => {
      const validation = validateDispute(Number(pid), v.confirms, v.contradicts);
      // Recency weight: most recent signal date
      const allDates = [...v.confirms, ...v.contradicts].map((s) => new Date(s.discovered_at).getTime());
      const latest = Math.max(...allDates);
      const daysSinceLatest = (now - latest) / 86400000;
      const recencyWeight = Math.max(0.1, 1 - daysSinceLatest / days);
      const heat = Math.round((v.confirms.length + v.contradicts.length) * recencyWeight * 10) / 10;

      // Extract actors from each side
      const confirms_actors = extractActors(v.confirms);
      const contradicts_actors = extractActors(v.contradicts);

      return {
        promise_id: Number(pid),
        heat,
        dispute_strength: validation.disputeStrength,
        is_internal_discussion: validation.isInternalDiscussion,
        confirms_count: v.confirms.length,
        contradicts_count: v.contradicts.length,
        latest_signal_at: new Date(latest).toISOString(),
        confirms_actors,
        contradicts_actors,
        confirms_signals: v.confirms.slice(0, 3).map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          source_name: prettifySourceId(s.source_id),
          confidence: s.confidence,
          discovered_at: s.discovered_at,
        })),
        contradicts_signals: v.contradicts.slice(0, 3).map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          source_name: prettifySourceId(s.source_id),
          confidence: s.confidence,
          discovered_at: s.discovered_at,
        })),
      };
    })
    .sort((a, b) => b.heat - a.heat)
    .slice(0, limit);

  // Fetch promise details
  const promiseIds = conflicts.map((c) => c.promise_id);
  const { data: promises } = await supabase
    .from('promises')
    .select('id, title, title_ne, status, category')
    .in('id', promiseIds);

  const promiseDetails: Record<number, { title: string; title_ne: string; status: string; category: string }> = {};
  for (const p of promises || []) {
    promiseDetails[p.id] = { title: p.title, title_ne: p.title_ne || '', status: p.status, category: p.category };
  }

  return NextResponse.json({
    conflicts: conflicts.map((c) => ({
      ...c,
      promise_title: promiseDetails[c.promise_id]?.title || `Commitment #${c.promise_id}`,
      promise_title_ne: promiseDetails[c.promise_id]?.title_ne || '',
      category: promiseDetails[c.promise_id]?.category || '',
      status: promiseDetails[c.promise_id]?.status || 'unknown',
    })),
    total_disputed: conflictEntries.length,
    total_raw: rawConflictEntries.length,
    updated_at: new Date().toISOString(),
  });
}
