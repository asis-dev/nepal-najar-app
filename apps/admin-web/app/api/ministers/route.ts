import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE } from '@/lib/intelligence/knowledge-base';

// Force Next.js to treat this as a dynamic route that we cache ourselves via CDN headers.
// `revalidate` doesn't work because we read searchParams (makes route fully dynamic).
export const dynamic = 'force-dynamic';

/** Detect if a string contains Devanagari script (Nepali) */
const HAS_DEVANAGARI = /[\u0900-\u097F]/;

/** Normalize title: if title is in Nepali, swap to title_ne */
function normalizeTitles(title: string | null, titleNe: string | null): { title: string; titleNe?: string } {
  const t = (title || '') as string;
  const tNe = (titleNe || '') as string;

  if (HAS_DEVANAGARI.test(t)) {
    return {
      title: tNe && !HAS_DEVANAGARI.test(tNe) ? tNe : t.slice(0, 200),
      titleNe: t,
    };
  }

  return { title: t || 'Update', titleNe: tNe || undefined };
}

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

  // 1. Fetch current ministers + recent signals in parallel
  // NOTE: We intentionally omit content_summary from signals select — it's massive
  // text that bloats the response. title + title_ne is sufficient for text matching.
  const [rosterRes, signalsRes, complaintLinksRes] = await Promise.all([
    supabase
      .from('government_roster')
      .select('name, name_ne, title, title_ne, ministry, ministry_slug, appointed_date, confidence, metadata')
      .eq('is_current', true)
      .order('ministry_slug'),
    supabase
      .from('intelligence_signals')
      .select('id, title, title_ne, url, signal_type, discovered_at, matched_promise_ids, classification')
      .gte('discovered_at', cutoff)
      .gte('relevance_score', 0.2)
      .order('discovered_at', { ascending: false })
      .limit(1000),
    supabase
      .from('complaint_authority_chain')
      .select('minister_slug, complaint_id')
      .eq('is_active', true)
      .eq('node_type', 'minister')
      .not('minister_slug', 'is', null)
      .limit(2000),
  ]);

  const roster = rosterRes.data || [];
  const allSignals = signalsRes.data || [];
  const complaintLinks = complaintLinksRes.data || [];
  const complaintSetsBySlug = new Map<string, Set<string>>();
  for (const row of complaintLinks as Array<{ minister_slug: string | null; complaint_id: string }>) {
    if (!row.minister_slug || !row.complaint_id) continue;
    const existing = complaintSetsBySlug.get(row.minister_slug) || new Set<string>();
    existing.add(row.complaint_id);
    complaintSetsBySlug.set(row.minister_slug, existing);
  }

  // ══════════════════════════════════════════════════
  // PRE-INDEX: single-pass inverted indexes — O(signals)
  // Then per-minister lookup is near-O(1).
  // We dropped extracted_data from query (was ~10MB for
  // 2000 signals). Title matching covers 95%+ of mentions.
  // ══════════════════════════════════════════════════

  const signalById = new Map(allSignals.map(s => [s.id, s]));

  // ── Word → Set<signalId> from title + title_ne ──
  const wordIndex = new Map<string, Set<string>>();
  for (const s of allSignals) {
    const text = [s.title, s.title_ne].filter(Boolean).join(' ').toLowerCase();
    const words = text.split(/[\s,.;:!?()[\]{}"'\/\\|—–-]+/);
    for (const w of words) {
      if (w.length < 3) continue;
      if (!wordIndex.has(w)) wordIndex.set(w, new Set());
      wordIndex.get(w)!.add(s.id);
    }
  }

  // ── Commitment ID → signal IDs ──
  const commitmentToSignals = new Map<number, Set<string>>();
  for (const s of allSignals) {
    const matched = s.matched_promise_ids;
    if (!Array.isArray(matched)) continue;
    for (const id of matched) {
      if (!commitmentToSignals.has(id)) commitmentToSignals.set(id, new Set());
      commitmentToSignals.get(id)!.add(s.id);
    }
  }

  // ── Title → commitment IDs (from knowledge base) ──
  const titleToCommitmentIds = new Map<string, number[]>();
  for (const k of PROMISES_KNOWLEDGE) {
    for (const official of k.keyOfficials) {
      const key = official.toLowerCase();
      if (!titleToCommitmentIds.has(key)) titleToCommitmentIds.set(key, []);
      titleToCommitmentIds.get(key)!.push(k.id);
    }
  }

  // ══════════════════════════════════════════════════
  // MATCH EACH MINISTER — fast word-level index lookups
  // ══════════════════════════════════════════════════
  const ministers = roster.map(minister => {
    const variants = nameVariants(minister.name, minister.name_ne);

    // Extract words from name variants for index lookup
    const variantWords = new Set<string>();
    for (const v of variants) {
      for (const w of v.split(/\s+/)) {
        if (w.length >= 3) variantWords.add(w);
      }
    }

    // Title word matching — lookup each variant word in inverted index
    const titleMatched = new Set<string>();
    for (const word of variantWords) {
      const sids = wordIndex.get(word);
      if (sids) for (const sid of sids) titleMatched.add(sid);
    }
    // Also check full Nepali name as a single token
    for (const v of variants) {
      if (/[\u0900-\u097F]/.test(v)) {
        const sids = wordIndex.get(v);
        if (sids) for (const sid of sids) titleMatched.add(sid);
      }
    }

    // Commitment ownership matching
    const ownedCommitmentIds = titleToCommitmentIds.get(minister.title?.toLowerCase() || '') || [];
    const commitmentMatched = new Set<string>();
    for (const commitmentId of ownedCommitmentIds) {
      const signalIds = commitmentToSignals.get(commitmentId);
      if (!signalIds) continue;
      for (const sid of signalIds) {
        if (!titleMatched.has(sid)) commitmentMatched.add(sid);
      }
    }

    // Merge
    const allMatchedIds = new Set([...titleMatched, ...commitmentMatched]);
    const matchedSignals = [...allMatchedIds].map(id => signalById.get(id)!).filter(Boolean);

    const confirming = matchedSignals.filter(s => s.classification === 'confirms').length;
    const contradicting = matchedSignals.filter(s => s.classification === 'contradicts').length;

    const topSignals = matchedSignals.slice(0, 5).map(s => {
      const norm = normalizeTitles(s.title, s.title_ne);
      return {
        id: s.id,
        title: norm.title,
        titleNe: norm.titleNe,
        classification: s.classification,
        discoveredAt: s.discovered_at,
        url: s.url,
        type: s.signal_type,
      };
    });

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
        totalSignals: matchedSignals.length,
        directMentions: titleMatched.size,
        commitmentSignals: commitmentMatched.size,
        confirming,
        contradicting,
        topSignals,
      },
      ownedCommitmentIds,
      complaintCount: complaintSetsBySlug.get(slug)?.size || 0,
      profile: minister.metadata?.profile ?? null,
    };
  });

  // Sort by activity (most active first)
  ministers.sort((a, b) => b.weeklyActivity.totalSignals - a.weeklyActivity.totalSignals);

  return NextResponse.json({
    ministers,
    period: { days, from: cutoff, to: new Date().toISOString() },
  }, {
    headers: {
      // Vercel-specific header that won't be overridden by Next.js
      'CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
    },
  });
}
