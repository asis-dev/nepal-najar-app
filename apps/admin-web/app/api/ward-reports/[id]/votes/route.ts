/**
 * /api/ward-reports/[id]/votes — Agree/disagree with a ward report
 *
 * POST { vote_type: 'agree' | 'disagree' }  → cast vote (auth required)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, isSupabaseConfigured, createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;

  // Rate limit: 30/min per IP
  const ip = getClientIp(request);
  const { success: rateLimitOk } = rateLimit(`ward-votes:${ip}`, 30, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Require authentication
  let userId: string;
  try {
    const ssrClient = await createSupabaseServerClient();
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    userId = user.id;
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { vote_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vote_type } = body;

  if (!vote_type || !['agree', 'disagree'].includes(vote_type)) {
    return NextResponse.json({ error: 'vote_type must be agree or disagree' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Upsert vote (one vote per user per report)
  const { error } = await supabase
    .from('ward_report_votes')
    .upsert(
      {
        report_id: reportId,
        user_id: userId,
        vote_type,
      },
      { onConflict: 'report_id,user_id' }
    );

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Ward report votes table not yet created' }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
