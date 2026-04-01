import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';

/**
 * GET /api/corruption/reactions?slug=case-slug
 * Returns aggregated reaction counts + user's own reaction
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const db = getSupabase();

  const { data: reactions, error } = await db
    .from('corruption_reactions')
    .select('reaction, user_id')
    .eq('case_slug', slug);

  if (error) {
    console.warn('[reactions] fetch error:', error.message);
    return NextResponse.json({ counts: {}, userReaction: null });
  }

  const counts: Record<string, number> = {};
  for (const r of reactions || []) {
    counts[r.reaction] = (counts[r.reaction] ?? 0) + 1;
  }

  // Get user's own reaction if logged in
  let userReaction: string | null = null;
  try {
    const supabaseUser = await createSupabaseServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (user) {
      const match = (reactions || []).find((r) => r.user_id === user.id);
      userReaction = match?.reaction ?? null;
    }
  } catch { /* not logged in */ }

  return NextResponse.json({ counts, userReaction }, {
    headers: { 'Cache-Control': 'public, max-age=30' },
  });
}

/**
 * POST /api/corruption/reactions
 * Body: { slug: string, reaction: string }
 * Upserts the user's reaction (or removes if same reaction sent again)
 */
export async function POST(request: NextRequest) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { slug, reaction } = body;

  if (!slug || !reaction) {
    return NextResponse.json({ error: 'slug and reaction required' }, { status: 400 });
  }

  const validReactions = ['angry', 'shocked', 'sad', 'clap', 'eyes'];
  if (!validReactions.includes(reaction)) {
    return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
  }

  const db = getSupabase();

  // Check if user already has a reaction on this case
  const { data: existing } = await db
    .from('corruption_reactions')
    .select('id, reaction')
    .eq('case_slug', slug)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.reaction === reaction) {
      // Same reaction = toggle off (remove)
      await db.from('corruption_reactions').delete().eq('id', existing.id);
      return NextResponse.json({ action: 'removed' });
    } else {
      // Different reaction = update
      await db
        .from('corruption_reactions')
        .update({ reaction })
        .eq('id', existing.id);
      return NextResponse.json({ action: 'updated', reaction });
    }
  } else {
    // New reaction
    const { error } = await db.from('corruption_reactions').insert({
      case_slug: slug,
      user_id: user.id,
      reaction,
    });
    if (error) {
      console.warn('[reactions] insert error:', error.message);
      return NextResponse.json({ error: 'Failed to save reaction' }, { status: 500 });
    }
    return NextResponse.json({ action: 'added', reaction });
  }
}
