import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/middleware/rate-limit';
import { getSupabase } from '@/lib/supabase/server';
import type { ComplaintCase, ComplaintEvidence } from '@/lib/complaints/types';
import { canViewComplaint, getComplaintAuthContext, isComplaintOwner } from '@/lib/complaints/access';
import { notifyComplaintUsers } from '@/lib/complaints/notifications';
import { sanitizeEvidenceSubmitterForViewer } from '@/lib/complaints/privacy';

type RouteContext = { params: Promise<{ id: string }> };

interface CreateEvidenceBody {
  evidence_type?: ComplaintEvidence['evidence_type'];
  media_urls?: string[];
  source_url?: string;
  note?: string;
  language?: string;
}

async function getComplaint(complaintId: string): Promise<ComplaintCase | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('civic_complaints')
    .select('*')
    .eq('id', complaintId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ComplaintCase;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const complaint = await getComplaint(id);
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const auth = await getComplaintAuthContext();
  if (!canViewComplaint(complaint, auth)) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const isOwner = isComplaintOwner(complaint, auth.user?.id ?? null);
  const requestedVerification = request.nextUrl.searchParams.get('verification_status');

  const db = getSupabase();
  let query = db
    .from('complaint_evidence')
    .select('*')
    .eq('complaint_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (requestedVerification && !auth.isElevated && !isOwner) {
    return NextResponse.json(
      { error: 'Only complaint owner or reviewer can query non-public evidence states' },
      { status: 403 },
    );
  }

  if (requestedVerification) {
    query = query.eq('verification_status', requestedVerification);
  } else if (!auth.isElevated && !isOwner) {
    query = query.eq('verification_status', 'approved');
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const evidenceRows = (data || []) as ComplaintEvidence[];
  const userIds = Array.from(new Set(evidenceRows.map((row) => row.user_id)));
  const nameMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    for (const profile of profiles || []) {
      nameMap.set(profile.id as string, (profile.display_name as string) || 'Citizen');
    }
  }

  return NextResponse.json({
    evidence: evidenceRows.map((row) =>
      sanitizeEvidenceSubmitterForViewer(
        {
          ...row,
          submitter_name: nameMap.get(row.user_id) || 'Citizen',
        },
        complaint,
        auth,
      ),
    ),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const ip = getClientIp(request);
  const { success } = await rateLimit(`complaint-evidence:${ip}`, 15, 60000);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const complaint = await getComplaint(id);
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  if (!canViewComplaint(complaint, auth) && !auth.isElevated) {
    return NextResponse.json({ error: 'Not authorized to attach evidence' }, { status: 403 });
  }

  let body: CreateEvidenceBody;
  try {
    body = (await request.json()) as CreateEvidenceBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const mediaUrls = Array.isArray(body.media_urls)
    ? body.media_urls
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];
  const sourceUrl = body.source_url?.trim() || null;
  const note = body.note?.trim() || null;

  if (mediaUrls.length === 0 && !sourceUrl && !note) {
    return NextResponse.json(
      { error: 'At least one of media_urls, source_url, or note is required' },
      { status: 400 },
    );
  }
  if (note && note.length > 2000) {
    return NextResponse.json({ error: 'note cannot exceed 2000 characters' }, { status: 400 });
  }

  const evidenceType: ComplaintEvidence['evidence_type'] =
    body.evidence_type ||
    (mediaUrls.length > 0 ? 'photo' : sourceUrl ? 'link' : 'text');

  const db = getSupabase();
  const verificationStatus: ComplaintEvidence['verification_status'] = auth.isElevated
    ? 'approved'
    : 'pending';

  const { data, error } = await db
    .from('complaint_evidence')
    .insert({
      complaint_id: id,
      user_id: auth.user.id,
      evidence_type: evidenceType,
      media_urls: mediaUrls,
      source_url: sourceUrl,
      note,
      language: body.language || 'ne',
      verification_status: verificationStatus,
    })
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to save evidence' }, { status: 500 });
  }

  await db.from('complaint_events').insert({
    complaint_id: id,
    actor_id: auth.user.id,
    actor_type: auth.isElevated ? 'admin' : 'citizen',
    event_type: 'evidence_added',
    visibility: 'public',
    message:
      verificationStatus === 'approved'
        ? 'Evidence added and approved.'
        : 'Evidence submitted for review.',
    metadata: {
      evidence_id: data.id,
      verification_status: verificationStatus,
      media_count: mediaUrls.length,
      has_source_url: Boolean(sourceUrl),
    },
  });

  await notifyComplaintUsers({
    complaintId: id,
    actorUserId: auth.user.id,
    type: 'complaint_update',
    title: 'New complaint evidence submitted',
    body:
      verificationStatus === 'approved'
        ? 'New evidence was added and approved.'
        : 'New evidence was submitted and is pending review.',
    metadata: {
      evidence_id: data.id,
      verification_status: verificationStatus,
    },
  });

  return NextResponse.json(
    { success: true, evidence: data, verification_status: verificationStatus },
    { status: 201 },
  );
}
