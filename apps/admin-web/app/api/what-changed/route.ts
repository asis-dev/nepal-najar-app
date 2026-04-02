import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

/**
 * GET /api/what-changed?days=7
 *
 * Returns three feeds:
 * 1. National — commitment updates, score changes, government signals
 * 2. Community — new civic issues, resolved issues, evidence activity
 * 3. Integrity — corruption reports, disputed claims, contradiction flags
 */

interface ChangeItem {
  id: string;
  feed: 'national' | 'community' | 'integrity';
  type: string;
  title: string;
  title_ne?: string;
  summary: string;
  where?: string;
  affects?: string;
  source_count: number;
  confidence?: number;
  created_at: string;
  link?: string;
}

/** Detect if a string contains Devanagari script (Nepali) */
const HAS_DEVANAGARI = /[\u0900-\u097F]/;

/**
 * Normalize title/title_ne: if `title` is actually in Nepali (contains Devanagari),
 * move it to title_ne and use a fallback for English title.
 */
function normalizeTitles(title: string | null, titleNe: string | null, fallback?: string | null): { title: string; title_ne?: string } {
  const t = (title as string) || '';
  const tNe = (titleNe as string) || '';

  if (HAS_DEVANAGARI.test(t)) {
    // title is in Nepali — swap
    return {
      title: tNe && !HAS_DEVANAGARI.test(tNe) ? tNe : (fallback || t).slice(0, 200),
      title_ne: t,
    };
  }

  return {
    title: t || fallback || 'Update',
    title_ne: tNe || undefined,
  };
}

export async function GET(request: NextRequest) {
  const db = getSupabase();
  const days = Math.min(30, Math.max(1, parseInt(request.nextUrl.searchParams.get('days') || '7', 10)));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Run ALL 6 queries in parallel
  const [
    { data: signals },
    { data: recentArticles },
    complaintsResult,
    { data: newEvidence },
    { data: corruptionCases },
    { data: disputed },
  ] = await Promise.all([
    // 1. Intelligence signals (national)
    db.from('intelligence_signals')
      .select('id, title, title_ne, source_id, signal_type, matched_promise_ids, discovered_at, confidence, classification, url, content_summary')
      .gte('discovered_at', since)
      .gte('relevance_score', 0.5)
      .order('discovered_at', { ascending: false })
      .limit(30),

    // 2. Scraped articles (national)
    db.from('scraped_articles')
      .select('id, headline, headline_ne, source_name, promise_ids, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20),

    // 3. Civic complaints (community) — may not exist
    Promise.resolve(
      db.from('civic_complaints')
        .select('id, title, title_ne, issue_type, municipality, ward_number, status, created_at')
        .gte('created_at', since)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20)
    ).catch(() => ({ data: null })),

    // 4. Evidence vault (community)
    db.from('evidence_vault')
      .select('id, promise_ids, source_title, quote_summary, created_at, verification_status')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(15),

    // 5. Corruption cases (integrity)
    db.from('corruption_cases')
      .select('id, title, slug, severity, sector, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),

    // 6. Disputed signals (integrity)
    db.from('intelligence_signals')
      .select('id, title, title_ne, source_id, discovered_at, matched_promise_ids')
      .gte('discovered_at', since)
      .eq('classification', 'contradicts')
      .order('discovered_at', { ascending: false })
      .limit(10),
  ]);

  const changes: ChangeItem[] = [];

  // ═══ NATIONAL FEED ═══

  for (const sig of signals || []) {
    const promiseIds: number[] = (sig.matched_promise_ids as number[]) || [];
    const normalized = normalizeTitles(sig.title as string, sig.title_ne as string, sig.content_summary as string);
    changes.push({
      id: `sig-${sig.id}`,
      feed: 'national',
      type: (sig.signal_type as string) || 'news_update',
      title: normalized.title,
      title_ne: normalized.title_ne,
      summary: ((sig.content_summary as string) || normalized.title || '').slice(0, 200),
      source_count: 1,
      confidence: (sig.confidence as number) || undefined,
      created_at: sig.discovered_at as string,
      link: promiseIds.length > 0 ? `/explore/first-100-days/${promiseIds[0]}` : undefined,
      affects: promiseIds.length > 0 ? `${promiseIds.length} commitment${promiseIds.length > 1 ? 's' : ''}` : undefined,
    });
  }

  for (const article of recentArticles || []) {
    const promiseIds = (article.promise_ids as number[]) || [];
    if (promiseIds.length === 0) continue;
    const artNorm = normalizeTitles(article.headline as string, article.headline_ne as string);
    changes.push({
      id: `art-${article.id}`,
      feed: 'national',
      type: 'news_coverage',
      title: artNorm.title,
      title_ne: artNorm.title_ne,
      summary: `${(article.source_name as string) || 'News'} published coverage affecting ${promiseIds.length} commitment${promiseIds.length > 1 ? 's' : ''}.`,
      source_count: 1,
      created_at: article.created_at as string,
      link: `/explore/first-100-days/${promiseIds[0]}`,
      affects: `${promiseIds.length} commitment${promiseIds.length > 1 ? 's' : ''}`,
    });
  }

  // ═══ COMMUNITY FEED ═══

  const newComplaints = (complaintsResult as { data: unknown[] | null })?.data;
  for (const c of (newComplaints || []) as Record<string, unknown>[]) {
    const isResolved = c.status === 'resolved' || c.status === 'closed';
    const compNorm = normalizeTitles(c.title as string, c.title_ne as string);
    changes.push({
      id: `comp-${c.id}`,
      feed: 'community',
      type: isResolved ? 'issue_resolved' : 'new_issue',
      title: compNorm.title || 'Civic issue',
      title_ne: compNorm.title_ne,
      summary: isResolved
        ? `Civic issue resolved: ${compNorm.title || ''}`
        : `New ${(c.issue_type as string) || ''} issue reported`,
      where: [c.municipality, c.ward_number ? `Ward ${c.ward_number}` : ''].filter(Boolean).join(', ') || undefined,
      source_count: 1,
      created_at: c.created_at as string,
      link: `/complaints/${c.id}`,
    });
  }

  for (const ev of newEvidence || []) {
    const evPromiseIds = (ev.promise_ids as number[]) || [];
    changes.push({
      id: `ev-${ev.id}`,
      feed: 'community',
      type: 'evidence_added',
      title: `Evidence submitted: ${(ev.source_title as string) || 'source'}`,
      summary: (ev.quote_summary as string) || 'New evidence added to commitment',
      source_count: 1,
      confidence: ev.verification_status === 'verified' ? 0.9 : 0.5,
      created_at: ev.created_at as string,
      link: evPromiseIds.length > 0 ? `/explore/first-100-days/${evPromiseIds[0]}` : undefined,
    });
  }

  // ═══ INTEGRITY FEED ═══

  for (const cc of corruptionCases || []) {
    changes.push({
      id: `corr-${cc.id}`,
      feed: 'integrity',
      type: 'corruption_report',
      title: (cc.title as string) || 'Corruption case',
      summary: `${(cc.severity as string) || 'Unknown'} severity corruption case in ${(cc.sector as string) || 'unknown'} sector`,
      source_count: 1,
      created_at: cc.created_at as string,
      link: cc.slug ? `/corruption/${cc.slug}` : undefined,
    });
  }

  for (const d of disputed || []) {
    const dPromiseIds = (d.matched_promise_ids as number[]) || [];
    const dispNorm = normalizeTitles(d.title as string, d.title_ne as string);
    changes.push({
      id: `disp-${d.id}`,
      feed: 'integrity',
      type: 'contradiction_flag',
      title: `AI contradiction flag: ${dispNorm.title || 'signal'}`,
      title_ne: dispNorm.title_ne ? `AI विरोधाभास: ${dispNorm.title_ne}` : undefined,
      summary: `Evidence from ${(d.source_id as string) || 'source'} contradicts existing claims`,
      source_count: 1,
      created_at: d.discovered_at as string,
      link: dPromiseIds.length > 0 ? `/explore/first-100-days/${dPromiseIds[0]}` : undefined,
    });
  }

  // Sort each feed by time
  const national = changes
    .filter((c) => c.feed === 'national')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  const community = changes
    .filter((c) => c.feed === 'community')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  const integrity = changes
    .filter((c) => c.feed === 'integrity')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  return NextResponse.json({
    national,
    community,
    integrity,
    period_days: days,
    generated_at: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' },
  });
}
