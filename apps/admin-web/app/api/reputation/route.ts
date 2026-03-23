/**
 * /api/reputation — User karma & reputation
 *
 * GET           → current user's full karma breakdown (auth required)
 * GET ?user_id=X → public view: total_karma and level only (no auth)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

function levelFromKarma(karma: number): string {
  if (karma >= 5000) return 'guardian';
  if (karma >= 2000) return 'expert';
  if (karma >= 500) return 'trusted';
  if (karma >= 100) return 'active';
  return 'newcomer';
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      total_karma: 0,
      level: 'newcomer',
      breakdown: null,
    });
  }

  const db = getSupabase();

  // Public view — only total karma + level
  if (userId) {
    const { data, error } = await db
      .from('user_reputation')
      .select('total_karma')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return NextResponse.json({ total_karma: 0, level: 'newcomer' });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalKarma = data?.total_karma ?? 0;
    return NextResponse.json({
      total_karma: totalKarma,
      level: levelFromKarma(totalKarma),
    });
  }

  // Full view — requires auth
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data, error } = await db
    .from('user_reputation')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST116') {
      return NextResponse.json({
        total_karma: 0,
        level: 'newcomer',
        breakdown: {
          evidence_karma: 0,
          verification_karma: 0,
          comment_karma: 0,
          review_karma: 0,
        },
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalKarma = data?.total_karma ?? 0;

  return NextResponse.json({
    total_karma: totalKarma,
    level: levelFromKarma(totalKarma),
    breakdown: {
      evidence_karma: data?.evidence_karma ?? 0,
      verification_karma: data?.verification_karma ?? 0,
      comment_karma: data?.comment_karma ?? 0,
      review_karma: data?.review_karma ?? 0,
    },
  });
}
