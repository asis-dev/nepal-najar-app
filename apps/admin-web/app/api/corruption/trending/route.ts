import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * GET /api/corruption/trending
 *
 * Returns the top 10 trending corruption cases scored by engagement.
 *
 * Scoring formula:
 *   - Recent reactions (last 24h) x 3
 *   - Total reactions x 1
 *   - Comment count x 2
 *   - Recency bonus: <24h old = 2x, <72h old = 1.5x
 *   - Severity multiplier: mega = 2x, major = 1.5x
 *   - Evidence count bonus: +10 per evidence item
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

    // 1. Fetch all active cases (not closed/acquitted)
    const { data: cases, error: casesErr } = await supabase
      .from('corruption_cases')
      .select('id, slug, title, title_ne, corruption_type, status, severity, estimated_amount_npr, summary, created_at, updated_at')
      .not('status', 'in', '(closed,acquitted)')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (casesErr || !cases || cases.length === 0) {
      return NextResponse.json({ trending: [], error: casesErr?.message }, {
        headers: { 'Cache-Control': 'public, max-age=120' },
      });
    }

    const slugs = cases.map((c) => c.slug);

    // 2. Fetch all reactions for these cases
    const { data: allReactions } = await supabase
      .from('corruption_reactions')
      .select('case_slug, reaction, created_at')
      .in('case_slug', slugs);

    // 3. Fetch comment counts
    const { data: allComments } = await supabase
      .from('corruption_comments')
      .select('case_slug')
      .in('case_slug', slugs)
      .eq('is_approved', true);

    // 4. Fetch evidence counts per case
    const caseIds = cases.map((c) => c.id);
    const { data: allEvidence } = await supabase
      .from('corruption_evidence')
      .select('case_id')
      .in('case_id', caseIds);

    // Aggregate reactions per slug
    const reactionsBySlug: Record<string, { total: number; recent: number; counts: Record<string, number> }> = {};
    for (const r of allReactions || []) {
      if (!reactionsBySlug[r.case_slug]) {
        reactionsBySlug[r.case_slug] = { total: 0, recent: 0, counts: {} };
      }
      reactionsBySlug[r.case_slug].total++;
      reactionsBySlug[r.case_slug].counts[r.reaction] = (reactionsBySlug[r.case_slug].counts[r.reaction] ?? 0) + 1;
      if (r.created_at && new Date(r.created_at) >= new Date(oneDayAgo)) {
        reactionsBySlug[r.case_slug].recent++;
      }
    }

    // Aggregate comments per slug
    const commentsBySlug: Record<string, number> = {};
    for (const c of allComments || []) {
      commentsBySlug[c.case_slug] = (commentsBySlug[c.case_slug] ?? 0) + 1;
    }

    // Aggregate evidence per case ID
    const evidenceByCase: Record<string, number> = {};
    for (const e of allEvidence || []) {
      evidenceByCase[e.case_id] = (evidenceByCase[e.case_id] ?? 0) + 1;
    }

    // 5. Score each case
    const scored = cases.map((c) => {
      const rx = reactionsBySlug[c.slug] || { total: 0, recent: 0, counts: {} };
      const comments = commentsBySlug[c.slug] || 0;
      const evidence = evidenceByCase[c.id] || 0;

      // Base engagement score
      let score = (rx.recent * 3) + (rx.total * 1) + (comments * 2);

      // Evidence bonus
      score += evidence * 10;

      // Recency bonus
      const caseAge = now.getTime() - new Date(c.created_at).getTime();
      if (caseAge < 24 * 60 * 60 * 1000) {
        score *= 2;
      } else if (caseAge < 72 * 60 * 60 * 1000) {
        score *= 1.5;
      }

      // Severity multiplier
      if (c.severity === 'mega') {
        score *= 2;
      } else if (c.severity === 'major') {
        score *= 1.5;
      }

      return {
        slug: c.slug,
        title: c.title,
        title_ne: c.title_ne,
        corruption_type: c.corruption_type,
        status: c.status,
        severity: c.severity,
        estimated_amount_npr: c.estimated_amount_npr,
        summary: c.summary,
        created_at: c.created_at,
        updated_at: c.updated_at,
        score: Math.round(score * 10) / 10,
        reactions: {
          total: rx.total,
          recent_24h: rx.recent,
          counts: rx.counts,
        },
        comments,
        evidence_count: evidence,
      };
    });

    // Sort by score descending, take top 10
    scored.sort((a, b) => b.score - a.score);
    const trending = scored.slice(0, 10);

    return NextResponse.json({ trending }, {
      headers: { 'Cache-Control': 'public, max-age=120' },
    });
  } catch (err) {
    console.error('[trending] Error:', err);
    return NextResponse.json(
      { trending: [], error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
