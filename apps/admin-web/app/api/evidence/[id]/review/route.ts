/**
 * /api/evidence/[id]/review — Review a specific evidence item
 *
 * GET  → review history for this evidence item
 * POST → submit a review action (verifier/admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: evidenceId } = await params;

  if (!evidenceId) {
    return NextResponse.json({ error: 'Evidence ID is required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ reviews: [] });
  }

  const db = getSupabase();

  const { data, error } = await db
    .from('evidence_review_actions')
    .select('*, profiles(display_name)')
    .eq('evidence_id', evidenceId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ reviews: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviews = (data ?? []).map((r: any) => ({
    id: r.id,
    evidence_id: r.evidence_id,
    reviewer_id: r.reviewer_id,
    action: r.action,
    note: r.note,
    proof_url: r.proof_url,
    created_at: r.created_at,
    reviewer_name: (r.profiles as { display_name: string })?.display_name ?? 'Anonymous',
  }));

  return NextResponse.json({ reviews });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: evidenceId } = await params;

  // Rate limit: 10/min per IP
  const ip = getClientIp(req);
  const { success: rateLimitOk } = await rateLimit(`evidence-review:${ip}`, 10, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getSupabase();

  // Check verifier or admin role
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['verifier', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Verifier or admin access required' }, { status: 403 });
  }

  let body: {
    action?: string;
    note?: string;
    proof_url?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, note, proof_url } = body;

  if (!action || !['approve', 'reject', 'request_info'].includes(action)) {
    return NextResponse.json(
      { error: 'action is required and must be approve, reject, or request_info' },
      { status: 400 }
    );
  }

  // Verify the evidence item exists
  const { data: evidence, error: evidenceErr } = await db
    .from('citizen_evidence')
    .select('id, user_id')
    .eq('id', evidenceId)
    .single();

  if (evidenceErr || !evidence) {
    return NextResponse.json({ error: 'Evidence item not found' }, { status: 404 });
  }

  // Update citizen_evidence status
  if (action === 'approve' || action === 'reject') {
    const { error: updateErr } = await db
      .from('citizen_evidence')
      .update({
        is_approved: action === 'approve',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: note?.trim() ?? null,
      })
      .eq('id', evidenceId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  // Insert audit record into evidence_review_actions
  const { data: reviewRecord, error: insertErr } = await db
    .from('evidence_review_actions')
    .insert({
      evidence_id: evidenceId,
      reviewer_id: user.id,
      action,
      note: note?.trim() ?? null,
      proof_url: proof_url?.trim() ?? null,
    })
    .select('id, created_at')
    .single();

  if (insertErr) {
    if (insertErr.code === '42P01') {
      return NextResponse.json({ error: 'Review actions table not yet created', saved: false });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, review: reviewRecord }, { status: 201 });
}
