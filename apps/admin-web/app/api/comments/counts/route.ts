import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids');
  if (!ids) return NextResponse.json({});

  const promiseIds = ids.split(',').slice(0, 200); // limit to 200
  const supabase = getSupabase();

  // Get comment counts for each promise_id where is_approved = true
  const { data } = await supabase
    .from('comments')
    .select('promise_id')
    .in('promise_id', promiseIds)
    .eq('is_approved', true);

  // Count per promise_id
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.promise_id] = (counts[row.promise_id] || 0) + 1;
  }

  return NextResponse.json(counts, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
