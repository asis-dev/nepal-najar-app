import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE } from '@/lib/intelligence/knowledge-base';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get('days') || '7');
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch current ministers from roster
  const { data: roster } = await supabase
    .from('government_roster')
    .select('name, name_ne, title, title_ne, ministry, ministry_slug, appointed_date, confidence')
    .eq('is_current', true)
    .order('ministry_slug');

  // 2. Fetch recent signals with extracted_data
  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('id, title, title_ne, url, source_id, signal_type, discovered_at, matched_promise_ids, classification, extracted_data')
    .gte('discovered_at', cutoff)
    .gte('relevance_score', 0.2)
    .order('discovered_at', { ascending: false })
    .limit(2000);

  const ministers = (roster || []).map(minister => {
    // Match signals where extracted_data.officials mentions this minister
    const nameKey = minister.name.toLowerCase().trim();
    const matchedSignals = (signals || []).filter(s => {
      const data = s.extracted_data;
      if (!data) return false;
      const officials = data.officials as Array<{ name: string }> | undefined;
      if (!Array.isArray(officials)) return false;
      return officials.some(o => o.name && o.name.toLowerCase().trim() === nameKey);
    });

    // Also match signals on commitments this minister owns (via knowledge base keyOfficials matching title)
    const ownedCommitmentIds = PROMISES_KNOWLEDGE
      .filter(k => k.keyOfficials.some(o => o.toLowerCase() === minister.title?.toLowerCase()))
      .map(k => k.id);

    const commitmentSignals = ownedCommitmentIds.length > 0
      ? (signals || []).filter(s => {
          const matched = s.matched_promise_ids;
          if (!Array.isArray(matched)) return false;
          return matched.some((id: number) => ownedCommitmentIds.includes(id));
        })
      : [];

    // Merge and deduplicate signals
    const allSignalIds = new Set([
      ...matchedSignals.map(s => s.id),
      ...commitmentSignals.map(s => s.id),
    ]);

    const allSignals = (signals || []).filter(s => allSignalIds.has(s.id));

    // Count classifications
    const confirming = allSignals.filter(s => s.classification === 'confirms').length;
    const contradicting = allSignals.filter(s => s.classification === 'contradicts').length;

    // Top 5 signals sorted by recency
    const topSignals = allSignals.slice(0, 5).map(s => ({
      id: s.id,
      title: s.title,
      titleNe: s.title_ne,
      classification: s.classification,
      discoveredAt: s.discovered_at,
      url: s.url,
      type: s.signal_type,
    }));

    // Generate slug from name
    const slug = minister.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return {
      slug,
      name: minister.name,
      nameNe: minister.name_ne,
      title: minister.title,
      titleNe: minister.title_ne,
      ministry: minister.ministry,
      ministrySlug: minister.ministry_slug,
      appointedDate: minister.appointed_date,
      confidence: minister.confidence,
      weeklyActivity: {
        totalSignals: allSignals.length,
        directMentions: matchedSignals.length,
        commitmentSignals: commitmentSignals.length,
        confirming,
        contradicting,
        topSignals,
      },
      ownedCommitmentIds,
    };
  });

  // Sort by activity (most active first)
  ministers.sort((a, b) => b.weeklyActivity.totalSignals - a.weeklyActivity.totalSignals);

  return NextResponse.json({
    ministers,
    period: { days, from: cutoff, to: new Date().toISOString() },
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
