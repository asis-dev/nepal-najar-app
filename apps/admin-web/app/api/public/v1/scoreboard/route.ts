import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 600;

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ scoreboards: [] });
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('weekly_scoreboards')
      .select('week_start, headline, thread, stats')
      .order('week_start', { ascending: false })
      .limit(20);
    return NextResponse.json(
      { version: 'v1', count: data?.length || 0, scoreboards: data || [] },
      { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=600' } }
    );
  } catch (e: any) {
    return NextResponse.json({ scoreboards: [], error: e?.message });
  }
}
