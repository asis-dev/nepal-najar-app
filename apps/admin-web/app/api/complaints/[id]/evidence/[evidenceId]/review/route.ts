import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { getComplaintAuthContext } from '@/lib/complaints/access';
import { notifyComplaintUsers } from '@/lib/complaints/notifications';

type RouteContext = { params: Promise<{ id: string; evidenceId: string }> };

interface ReviewBody {
  verification_status?: 'approved' | 'rejected';
  reason?: string;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id, evidenceId } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!auth.isElevated) {
    return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
  }

  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const status = body.verification_status;
  if (!status || (status !== 'approved' && status !== 'rejected')) {
    return NextResponse.json(
      { error: 'verification_status must be approved or rejected' },
      { status: 400 },
    );
  }

  const db = getSupabase();
  const { data: evidence, error: evidenceError } = await db
    .from('complaint_evidence')
    .select('id, complaint_id, verification_status')
    .eq('id', evidenceId)
    .eq('complaint_id', id)
    .maybeSingle();

  if (evidenceError) {
    return NextResponse.json({ error: evidenceError.message }, { status: 500 });
  }
  if (!evidence) {
    return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
  }

  const { data, error } = await db
    .from('complaint_evidence')
    .update({
      verification_status: status,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', evidenceId)
    .eq('complaint_id', id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to review evidence' }, { status: 500 });
  }

  await db.from('complaint_events').insert({
    complaint_id: id,
    actor_id: auth.user.id,
    actor_type: 'admin',
    event_type: 'official_update',
    visibility: 'internal',
    message:
      status === 'approved'
        ? 'Evidence approved by reviewer.'
        : 'Evidence rejected by reviewer.',
    metadata: {
      evidence_id: evidenceId,
      verification_status: status,
      reason: body.reason?.trim() || null,
    },
  });

  await notifyComplaintUsers({
    complaintId: id,
    actorUserId: auth.user.id,
    type: 'complaint_update',
    title:
      status === 'approved'
        ? 'Complaint evidence approved'
        : 'Complaint evidence rejected',
    body:
      status === 'approved'
        ? 'A reviewer approved new evidence on this complaint.'
        : 'A reviewer rejected an evidence submission on this complaint.',
    metadata: {
      evidence_id: evidenceId,
      verification_status: status,
      reason: body.reason?.trim() || null,
    },
  });

  return NextResponse.json({ success: true, evidence: data });
}
