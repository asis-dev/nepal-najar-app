import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';

/**
 * GET /api/corruption/comments?slug=case-slug
 * Returns approved comments + user's own pending comments
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const db = getSupabase();

  // Approved comments
  const { data: approved, error } = await db
    .from('corruption_comments')
    .select('id, case_slug, user_id, content, is_approved, created_at')
    .eq('case_slug', slug)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('[corruption-comments] fetch error:', error.message);
    return NextResponse.json({ comments: [], pending: [] });
  }

  // Enrich with display names
  const userIds = [...new Set((approved || []).map((c) => c.user_id))];
  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    if (profiles) {
      for (const p of profiles) {
        nameMap[p.id] = p.display_name || 'Citizen';
      }
    }
  }

  const comments = (approved || []).map((c) => ({
    ...c,
    display_name: nameMap[c.user_id] || 'Citizen',
  }));

  // User's pending comments
  let pending: typeof comments = [];
  try {
    const supabaseUser = await createSupabaseServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (user) {
      const { data: userPending } = await db
        .from('corruption_comments')
        .select('id, case_slug, user_id, content, is_approved, created_at')
        .eq('case_slug', slug)
        .eq('user_id', user.id)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      pending = (userPending || []).map((c) => ({
        ...c,
        display_name: nameMap[c.user_id] || 'You',
      }));
    }
  } catch { /* not logged in */ }

  return NextResponse.json({ comments, pending }, {
    headers: { 'Cache-Control': 'public, max-age=30' },
  });
}

/**
 * POST /api/corruption/comments
 * Body: { slug: string, content: string }
 */
export async function POST(request: NextRequest) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { slug, content } = body;

  if (!slug || !content?.trim()) {
    return NextResponse.json({ error: 'slug and content required' }, { status: 400 });
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
  }

  const db = getSupabase();

  // Rate limit: max 10 comments per minute
  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await db
    .from('corruption_comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneMinAgo);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Too many comments. Please wait a minute.' }, { status: 429 });
  }

  const { data, error } = await db.from('corruption_comments').insert({
    case_slug: slug,
    user_id: user.id,
    content: content.trim(),
  }).select('id').single();

  if (error) {
    console.warn('[corruption-comments] insert error:', error.message);
    return NextResponse.json({ error: 'Failed to submit comment' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, status: 'pending' });
}
