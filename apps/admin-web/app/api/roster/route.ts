import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min

export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('government_roster')
    .select('name, name_ne, title, title_ne, ministry, ministry_slug, appointed_date, confidence')
    .eq('is_current', true)
    .order('ministry_slug');

  if (error) {
    // Table might not exist yet — return empty array
    return NextResponse.json([]);
  }

  return NextResponse.json(data || [], {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
