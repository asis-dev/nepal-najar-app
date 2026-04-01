import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE } from '@/lib/intelligence/knowledge-base';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

/** Build name variants for fuzzy matching (first name, last name, full name, Nepali name) */
function nameVariants(name: string, nameNe?: string | null): string[] {
  const parts = name.toLowerCase().trim().split(/\s+/);
  const variants = [name.toLowerCase().trim()];
  // Last name alone (if 2+ parts)
  if (parts.length >= 2) variants.push(parts[parts.length - 1]);
  // Handle parenthetical aliases like "Balendra Shah (Balen)"
  const aliasMatch = name.match(/\(([^)]+)\)/);
  if (aliasMatch) variants.push(aliasMatch[1].toLowerCase().trim());
  // Nepali name
  if (nameNe) variants.push(nameNe.trim());
  return variants;
}

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get('days') || '7');
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch current ministers from roster
  const { data: roster } = await supabase
    .from('government_roster')
    .select('name, name_ne, title, title_ne, ministry, ministry_slug, appointed_date, confidence, metadata')
    .eq('is_current', true)
    .order('ministry_slug');

  // 2. Fetch recent signals
  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('id, title, title_ne, content_summary, url, source_id, signal_type, discovered_at, matched_promise_ids, classification, extracted_data')
    .gte('discovered_at', cutoff)
    .gte('relevance_score', 0.2)
    .order('discovered_at', { ascending: false })
    .limit(3000);

  const ministers = (roster || []).map(minister => {
    const variants = nameVariants(minister.name, minister.name_ne);

    // Method 1: Structured extracted_data.officials match
    const officialMatched = new Set<string>();
    for (const s of signals || []) {
      const officials = s.extracted_data?.officials;
      if (!Array.isArray(officials)) continue;
      if (officials.some((o: any) => {
        const n = typeof o === 'string' ? o : o?.name;
        return n && variants.some(v => n.toLowerCase().trim().includes(v));
      })) {
        officialMatched.add(s.id);
      }
    }

    // Method 2: Title/content text search for minister name
    const textMatched = new Set<string>();
    for (const s of signals || []) {
      if (officialMatched.has(s.id)) continue; // already matched
      const haystack = [s.title, s.title_ne, s.content_summary].filter(Boolean).join(' ').toLowerCase();
      if (variants.some(v => v.length >= 4 && haystack.includes(v))) {
        textMatched.add(s.id);
      }
    }

    // Method 3: Commitment ownership match (via knowledge base keyOfficials)
    const ownedCommitmentIds = PROMISES_KNOWLEDGE
      .filter(k => k.keyOfficials.some(o => o.toLowerCase() === minister.title?.toLowerCase()))
      .map(k => k.id);

    const commitmentMatched = new Set<string>();
    if (ownedCommitmentIds.length > 0) {
      for (const s of signals || []) {
        if (officialMatched.has(s.id) || textMatched.has(s.id)) continue;
        const matched = s.matched_promise_ids;
        if (Array.isArray(matched) && matched.some((id: number) => ownedCommitmentIds.includes(id))) {
          commitmentMatched.add(s.id);
        }
      }
    }

    // Merge all matched signals
    const allSignalIds = new Set([...officialMatched, ...textMatched, ...commitmentMatched]);
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
        directMentions: officialMatched.size + textMatched.size,
        commitmentSignals: commitmentMatched.size,
        confirming,
        contradicting,
        topSignals,
      },
      ownedCommitmentIds,
      profile: minister.metadata?.profile ?? null,
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
