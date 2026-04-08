import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ open: 0, urgent: 0 });
  try {
    const supabase = getSupabase();
    const { count: open } = await supabase
      .from('party_action_items')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null);
    const { count: urgent } = await supabase
      .from('party_action_items')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .eq('priority', 1);
    return NextResponse.json(
      { open: open || 0, urgent: urgent || 0 },
      { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch {
    return NextResponse.json({ open: 0, urgent: 0 });
  }
}
