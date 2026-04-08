import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 120;

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ items: [] });
  const url = new globalThis.URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 500);
  const kind = url.searchParams.get('kind');
  try {
    const supabase = getSupabase();
    let q = supabase
      .from('party_action_items')
      .select('id, target_type, target_slug, target_name, source_kind, title, description, priority, upvotes, first_seen_at, due_on, link')
      .is('resolved_at', null)
      .order('priority', { ascending: true })
      .order('upvotes', { ascending: false })
      .limit(limit);
    if (kind) q = q.eq('source_kind', kind);
    const { data } = await q;
    return NextResponse.json(
      { version: 'v1', updated_at: new Date().toISOString(), count: data?.length || 0, items: data || [] },
      { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=120' } }
    );
  } catch {
    return NextResponse.json({ items: [] });
  }
}
