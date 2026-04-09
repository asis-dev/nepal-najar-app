import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ petitions: [] });
  const url = new globalThis.URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('petitions')
      .select('id, slug, title, summary, target_name, signature_count, goal, created_at')
      .eq('status', 'published')
      .order('signature_count', { ascending: false })
      .limit(limit);
    return NextResponse.json(
      { version: 'v1', count: data?.length || 0, petitions: data || [] },
      { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } }
    );
  } catch (e: any) {
    return NextResponse.json({ petitions: [], error: e?.message });
  }
}
