import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ disputes: [] });
  const url = new globalThis.URL(req.url);
  const cid = url.searchParams.get('commitment_id');
  const status = url.searchParams.get('status');
  try {
    const supabase = getSupabase();
    let q = supabase
      .from('commitment_disputes')
      .select('id, commitment_id, dispute_type, current_value, proposed_value, rationale, evidence_url, status, created_at, claimant_role')
      .order('created_at', { ascending: false })
      .limit(200);
    if (cid) q = q.eq('commitment_id', cid);
    if (status) q = q.eq('status', status);
    const { data } = await q;
    return NextResponse.json(
      { version: 'v1', count: data?.length || 0, disputes: data || [] },
      { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } }
    );
  } catch (e: any) {
    return NextResponse.json({ disputes: [], error: e?.message });
  }
}
