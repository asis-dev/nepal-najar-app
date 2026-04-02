/**
 * /api/evidence-vault — Public evidence vault data
 *
 * GET  → list evidence_vault rows with optional filters
 *   ?source_type=youtube
 *   ?statement_type=commitment
 *   ?promise_id=5
 *   ?search=balen
 *   ?sort=newest|importance|official
 *   &limit=100
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
};

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ evidence: [], total: 0 }, { headers: CACHE_HEADERS });
  }

  const db = getSupabase();
  const sp = req.nextUrl.searchParams;

  const sourceType = sp.get('source_type');
  const statementType = sp.get('statement_type');
  const promiseId = sp.get('promise_id');
  const search = sp.get('search')?.trim();
  const sort = sp.get('sort') || 'newest';
  const parsedLimit = parseInt(sp.get('limit') ?? '100', 10);
  const limit = Math.min(Number.isFinite(parsedLimit) ? parsedLimit : 100, 200);

  try {
    let query = db
      .from('evidence_vault')
      .select('*', { count: 'exact' })
      .limit(limit);

    // Sorting
    if (sort === 'newest') {
      query = query.order('spoken_date', { ascending: false, nullsFirst: false });
    } else if (sort === 'importance') {
      query = query.order('importance_score', { ascending: false });
    } else {
      query = query.order('official_name', { ascending: true });
    }

    // Filters
    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }
    if (statementType) {
      query = query.eq('statement_type', statementType);
    }
    if (promiseId) {
      query = query.contains('promise_ids', [Number(promiseId)]);
    }
    if (search) {
      const safe = search
        .replace(/[%_,().'"`;]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      if (safe) {
        query = query.or(
          ['official_name', 'quote_text', 'source_title']
            .map((col) => `${col}.ilike.%${safe}%`)
            .join(','),
        );
      }
    }

    const { data, count, error } = await query;

    if (error) {
      // Table doesn't exist yet — return empty
      if (error.code === '42P01') {
        return NextResponse.json({ evidence: [], total: 0 }, { headers: CACHE_HEADERS });
      }
      console.error('[evidence-vault] Query error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { evidence: data ?? [], total: count ?? 0 },
      { headers: CACHE_HEADERS },
    );
  } catch (err) {
    console.error('[evidence-vault] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
