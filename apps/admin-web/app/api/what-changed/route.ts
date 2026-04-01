import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

/**
 * GET /api/what-changed?days=7
 *
 * Returns three feeds:
 * 1. National — commitment updates, score changes, government signals
 * 2. Community — new civic issues, resolved issues, evidence activity
 * 3. Integrity — corruption reports, disputed claims, contradiction flags
 *
 * Each item says: what changed, where, who it affects, confidence/source count.
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

export async function GET(request: NextRequest) {
  const db = getSupabase();
  const days = Math.min(30, Math.max(1, parseInt(request.nextUrl.searchParams.get('days') || '7', 10)));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const changes: ChangeItem[] = [];

  // ═══ NATIONAL FEED ═══

  // 1. Recent intelligence signals (commitment updates)
  const { data: signals } = await db
    .from('intelligence_signals')
    .select('id, title, title_ne, source_id, signal_type, matched_promise_ids, discovered_at, confidence, classification, url, content_summary')
    .gte('discovered_at', since)
    .gte('relevance_score', 0.5)
    .order('discovered_at', { ascending: false })
    .limit(30);

  for (const sig of signals || []) {
    const promiseIds: number[] = (sig.matched_promise_ids as number[]) || [];
    changes.push({
      id: `sig-${sig.id}`,
      feed: 'national',
      type: (sig.signal_type as string) || 'news_update',
      title: (sig.title as string) || 'Signal detected',
      title_ne: (sig.title_ne as string) || undefined,
      summary: ((sig.content_summary as string) || (sig.title as string) || '').slice(0, 200),
      source_count: 1,
      confidence: (sig.confidence as number) || undefined,
      created_at: sig.discovered_at as string,
      link: promiseIds.length > 0 ? `/explore/first-100-days/${promiseIds[0]}` : undefined,
      affects: promiseIds.length > 0 ? `${promiseIds.length} commitment${promiseIds.length > 1 ? 's' : ''}` : undefined,
    });
  }

  // 2. Promise status changes (from scraped_articles)
  const { data: recentArticles } = await db
    .from('scraped_articles')
    .select('id, headline, headline_ne, source_name, promise_ids, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);

  for (const article of recentArticles || []) {
    const promiseIds = (article.promise_ids as number[]) || [];
    if (promiseIds.length === 0) continue;
    changes.push({
      id: `art-${article.id}`,
      feed: 'national',
      type: 'news_coverage',
      title: (article.headline as string) || 'News article',
      title_ne: (article.headline_ne as string) || undefined,
      summary: `${(article.source_name as string) || 'News'} published coverage affecting ${promiseIds.length} commitment${promiseIds.length > 1 ? 's' : ''}.`,
      source_count: 1,
      created_at: article.created_at as string,
      link: `/explore/first-100-days/${promiseIds[0]}`,
      affects: `${promiseIds.length} commitment${promiseIds.length > 1 ? 's' : ''}`,
    });
  }

  // ═══ COMMUNITY FEED ═══

  // 3. New civic issues (if table exists)
  try {
    const { data: newComplaints } = await db
      .from('civic_complaints')
      .select('id, title, title_ne, issue_type, municipality, ward_number, status, created_at')
      .gte('created_at', since)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);

    for (const c of newComplaints || []) {
      const isResolved = c.status === 'resolved' || c.status === 'closed';
      changes.push({
        id: `comp-${c.id}`,
        feed: 'community',
        type: isResolved ? 'issue_resolved' : 'new_issue',
        title: (c.title as string) || 'Civic issue',
        title_ne: (c.title_ne as string) || undefined,
        summary: isResolved
          ? `Civic issue resolved: ${(c.title as string) || ''}`
          : `New ${(c.issue_type as string) || ''} issue reported`,
        where: [c.municipality, c.ward_number ? `Ward ${c.ward_number}` : ''].filter(Boolean).join(', ') || undefined,
        source_count: 1,
        created_at: c.created_at as string,
        link: `/complaints/${c.id}`,
      });
    }
  } catch { /* civic_complaints table may not exist yet */ }

  // 4. New evidence submissions
  const { data: newEvidence } = await db
    .from('evidence_vault')
    .select('id, promise_ids, source_title, quote_summary, created_at, verification_status')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(15);

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

  // 5. Corruption cases
  const { data: corruptionCases } = await db
    .from('corruption_cases')
    .select('id, title, slug, severity, sector, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);

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

  // 6. Disputed/contradicted signals
  const { data: disputed } = await db
    .from('intelligence_signals')
    .select('id, title, title_ne, source_id, discovered_at, matched_promise_ids')
    .gte('discovered_at', since)
    .eq('classification', 'contradicts')
    .order('discovered_at', { ascending: false })
    .limit(10);

  for (const d of disputed || []) {
    const dPromiseIds = (d.matched_promise_ids as number[]) || [];
    changes.push({
      id: `disp-${d.id}`,
      feed: 'integrity',
      type: 'contradiction_flag',
      title: `AI contradiction flag: ${(d.title as string) || 'signal'}`,
      title_ne: (d.title_ne as string) || undefined,
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
  });
}
