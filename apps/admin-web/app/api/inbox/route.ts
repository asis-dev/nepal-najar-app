import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const url = new globalThis.URL(req.url);
    const targetType = url.searchParams.get('target_type');
    const targetSlug = url.searchParams.get('target_slug');
    const kind = url.searchParams.get('kind');
    const sort = url.searchParams.get('sort') || 'priority';
    const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 500);

    const supabase = getSupabase();
    let q = supabase
      .from('party_action_items')
      .select('*')
      .is('resolved_at', null)
      .limit(limit);

    if (targetType) q = q.eq('target_type', targetType);
    if (targetSlug) q = q.eq('target_slug', targetSlug);
    if (kind) q = q.eq('source_kind', kind);

    if (sort === 'upvotes') q = q.order('upvotes', { ascending: false });
    else if (sort === 'newest') q = q.order('first_seen_at', { ascending: false });
    else q = q.order('priority', { ascending: true }).order('upvotes', { ascending: false });

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ items: [], error: error.message }, { status: 200 });
    }
    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message }, { status: 200 });
  }
}
