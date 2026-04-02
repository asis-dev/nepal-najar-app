import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import { buildOrIlikeClause } from '@/lib/supabase/filter-utils';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';
import { triageComplaintInput } from '@/lib/intelligence/complaint-triage';
import { checkForDuplicateOnCreate } from '@/lib/intelligence/complaint-dedup';
import type { ComplaintCase, ComplaintEvidence, ComplaintIssueType, ComplaintSeverity, ComplaintStatus } from '@/lib/complaints/types';
import { getComplaintSlaState, refreshComplaintSla } from '@/lib/complaints/sla';
import { autoClusterDuplicate } from '@/lib/complaints/clusters';

function parseBooleanParam(value: string | null): boolean {
  if (!value) return false;
  return value === '1' || value.toLowerCase() === 'true';
}

async function getCurrentUser() {
  try {
    const ssr = await createSupabaseServerClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

async function getRole(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const db = getSupabase();
  const { data } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  return (data?.role as string | undefined) ?? null;
}

export async function GET(request: NextRequest) {
  const db = getSupabase();
  const searchParams = request.nextUrl.searchParams;
  const user = await getCurrentUser();
  const role = await getRole(user?.id ?? null);
  const isElevated = role === 'admin' || role === 'verifier';

  const mine = parseBooleanParam(searchParams.get('mine'));
  const followed = parseBooleanParam(searchParams.get('followed'));

  if ((mine || followed) && !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const status = searchParams.get('status');
  const issueType = searchParams.get('issue_type');
  const departmentKey = searchParams.get('department_key');
  const province = searchParams.get('province');
  const district = searchParams.get('district');
  const municipality = searchParams.get('municipality');
  const q = searchParams.get('q');
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  let followedIds: string[] | null = null;
  if (followed && user) {
    const { data: rows, error } = await db
      .from('complaint_followers')
      .select('complaint_id')
      .eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    followedIds = (rows || []).map((row) => row.complaint_id as string);
    if (followedIds.length === 0) {
      return NextResponse.json({ complaints: [], total: 0, limit, offset });
    }
  }

  let query = db
    .from('civic_complaints')
    .select('*', { count: 'exact' })
    .order('last_activity_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (mine && user) {
    query = query.eq('user_id', user.id);
  } else if (!isElevated) {
    query = query.eq('is_public', true);
  }

  if (followedIds) {
    query = query.in('id', followedIds);
  }

  if (status) query = query.eq('status', status);
  if (issueType) query = query.eq('issue_type', issueType);
  if (departmentKey) query = query.eq('department_key', departmentKey);
  if (province) query = query.eq('province', province);
  if (district) query = query.eq('district', district);
  if (municipality) query = query.eq('municipality', municipality);
  if (q && q.trim().length > 0) {
    const searchClause = buildOrIlikeClause(['title', 'description'], q);
    if (searchClause) {
      query = query.or(searchClause);
    }
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as ComplaintCase[];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));

  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    for (const profile of profiles || []) {
      profileMap.set(profile.id as string, (profile.display_name as string) || 'Citizen');
    }
  }

  let followingSet = new Set<string>();
  if (user) {
    const { data: follows } = await db
      .from('complaint_followers')
      .select('complaint_id')
      .eq('user_id', user.id)
      .in('complaint_id', rows.map((row) => row.id));
    followingSet = new Set((follows || []).map((item) => item.complaint_id as string));
  }

  const complaints = rows.map((row) => ({
    ...(() => {
      const sla = getComplaintSlaState(row);
      return {
        sla_state: sla.state,
        minutes_to_due: sla.minutesToDue,
      };
    })(),
    ...row,
    reporter_name: row.is_anonymous ? 'Anonymous' : profileMap.get(row.user_id) || 'Citizen',
    is_following: followingSet.has(row.id),
  }));

  return NextResponse.json({
    complaints,
    total: count ?? complaints.length,
    limit,
    offset,
  });
}

interface CreateComplaintBody {
  title?: string;
  description?: string;
  raw_transcript?: string;
  input_mode?: 'text' | 'voice' | 'mixed';
  language?: string;
  issue_type?: ComplaintIssueType;
  severity?: ComplaintSeverity;
  province?: string;
  district?: string;
  municipality?: string;
  ward_number?: string;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  is_public?: boolean;
  is_anonymous?: boolean;
  media_urls?: string[];
  source_url?: string;
  evidence_note?: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { success } = await rateLimit(`complaints:${ip}`, 12, 60000);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: CreateComplaintBody;
  try {
    body = (await request.json()) as CreateComplaintBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const description = body.description?.trim() || '';
  if (description.length < 10 || description.length > 5000) {
    return NextResponse.json(
      { error: 'Description must be between 10 and 5000 characters' },
      { status: 400 },
    );
  }

  const db = getSupabase();
  const triage = await triageComplaintInput({
    title: body.title,
    description,
    language: body.language || 'ne',
    province: body.province || null,
    district: body.district || null,
    municipality: body.municipality || null,
    wardNumber: body.ward_number || null,
  });

  // Duplicate detection (non-blocking — always creates the complaint)
  const dedupResult = await checkForDuplicateOnCreate({
    title: body.title?.trim() || triage.title,
    description,
    issue_type: body.issue_type || triage.issueType,
    municipality: body.municipality || null,
    ward_number: body.ward_number || null,
    district: body.district || null,
    province: body.province || null,
  });

  const initialStatus: ComplaintStatus =
    dedupResult.isDuplicate && dedupResult.confidence >= 0.8
      ? 'duplicate'
      : triage.confidence >= 0.7
        ? 'routed'
        : 'triaged';

  const normalizedTitle = body.title?.trim() || triage.title;

  const complaintInsert = {
    user_id: user.id,
    title: normalizedTitle,
    title_ne: triage.titleNe,
    description,
    description_ne: triage.descriptionNe,
    raw_transcript: body.raw_transcript?.trim() || null,
    input_mode: body.input_mode || (body.raw_transcript ? 'voice' : 'text'),
    language: body.language || 'ne',
    issue_type: body.issue_type || triage.issueType,
    severity: body.severity || triage.severity,
    status: initialStatus,
    province: body.province || null,
    district: body.district || null,
    municipality: body.municipality || null,
    ward_number: body.ward_number || null,
    location_text: body.location_text || null,
    latitude: typeof body.latitude === 'number' ? body.latitude : null,
    longitude: typeof body.longitude === 'number' ? body.longitude : null,
    department_key: triage.departmentKey,
    duplicate_of: dedupResult.duplicateOf || null,
    ai_route_confidence: triage.confidence,
    ai_triage: {
      summary: triage.summary,
      reasoning: triage.reasoning,
      suggestedTags: triage.suggestedTags,
      modelConfidence: triage.confidence,
      authorityRoute: triage.authorityRoute,
    },
    is_public: body.is_public !== false,
    is_anonymous: body.is_anonymous === true,
    last_activity_at: new Date().toISOString(),
  };

  const { data: complaint, error } = await db
    .from('civic_complaints')
    .insert(complaintInsert)
    .select('*')
    .single();

  if (error || !complaint) {
    return NextResponse.json({ error: error?.message || 'Failed to create complaint' }, { status: 500 });
  }

  const complaintId = complaint.id as string;
  const now = new Date().toISOString();

  await db.from('complaint_followers').upsert({
    complaint_id: complaintId,
    user_id: user.id,
    notify: true,
    created_at: now,
  });

  const events: Array<{
    complaint_id: string;
    actor_id: string | null;
    actor_type: 'citizen' | 'ai';
    event_type: string;
    visibility: 'public' | 'internal';
    message: string;
    metadata: Record<string, unknown>;
  }> = [
    {
      complaint_id: complaintId,
      actor_id: user.id,
      actor_type: 'citizen',
      event_type: 'submitted',
      visibility: 'public',
      message: 'Complaint submitted by citizen.',
      metadata: {
        input_mode: complaintInsert.input_mode,
        language: complaintInsert.language,
      },
    },
    {
      complaint_id: complaintId,
      actor_id: null,
      actor_type: 'ai',
      event_type: 'triaged',
      visibility: 'public',
      message: triage.summary,
      metadata: {
        issue_type: complaintInsert.issue_type,
        severity: complaintInsert.severity,
        confidence: triage.confidence,
        department_key: triage.departmentKey,
      },
    },
  ];

  if (initialStatus === 'routed') {
    const route = triage.authorityRoute;
    events.push({
      complaint_id: complaintId,
      actor_id: null,
      actor_type: 'ai',
      event_type: 'routed',
      visibility: 'public',
      message: `AI routing suggestion: ${route.authority} (${route.level} level). ${route.routingReason}`,
      metadata: {
        department_key: triage.departmentKey,
        confidence: triage.confidence,
        authority: route.authority,
        authority_ne: route.authorityNe,
        authority_level: route.level,
        office: route.office,
        routing_reason: route.routingReason,
      },
    });
  }

  if (initialStatus === 'duplicate' && dedupResult.duplicateOf) {
    events.push({
      complaint_id: complaintId,
      actor_id: null,
      actor_type: 'ai',
      event_type: 'duplicate_marked',
      visibility: 'public',
      message: `Marked as duplicate of complaint ${dedupResult.duplicateOf}. ${dedupResult.reasoning}`,
      metadata: {
        duplicate_of: dedupResult.duplicateOf,
        confidence: dedupResult.confidence,
        reasoning: dedupResult.reasoning,
      },
    });
  }

  await db.from('complaint_events').insert(events);

  const mediaUrls = Array.isArray(body.media_urls)
    ? body.media_urls.filter((url) => typeof url === 'string' && url.trim().length > 0).slice(0, 8)
    : [];
  const sourceUrl = body.source_url?.trim() || null;
  const evidenceNote = body.evidence_note?.trim() || null;

  let evidence: ComplaintEvidence | null = null;
  if (mediaUrls.length > 0 || sourceUrl || evidenceNote) {
    const evidenceType: ComplaintEvidence['evidence_type'] =
      mediaUrls.length > 0 ? 'photo' : sourceUrl ? 'link' : 'text';
    const { data: insertedEvidence } = await db
      .from('complaint_evidence')
      .insert({
        complaint_id: complaintId,
        user_id: user.id,
        evidence_type: evidenceType,
        media_urls: mediaUrls,
        source_url: sourceUrl,
        note: evidenceNote,
        language: body.language || 'ne',
      })
      .select('*')
      .single();

    evidence = (insertedEvidence as ComplaintEvidence | null) || null;

    await db.from('complaint_events').insert({
      complaint_id: complaintId,
      actor_id: user.id,
      actor_type: 'citizen',
      event_type: 'evidence_added',
      visibility: 'public',
      message: 'Citizen added supporting evidence.',
      metadata: {
        media_count: mediaUrls.length,
        has_source_url: Boolean(sourceUrl),
      },
    });
  }

  // Auto-cluster duplicates
  let clusterId: string | null = null;
  if (initialStatus === 'duplicate' && dedupResult.duplicateOf) {
    clusterId = await autoClusterDuplicate(db, complaintId, dedupResult.duplicateOf);
  }

  const complaintWithSla = await refreshComplaintSla(db, complaint as ComplaintCase);

  return NextResponse.json(
    {
      success: true,
      complaint: complaintWithSla,
      triage,
      evidence,
      duplicate_check: {
        isDuplicate: dedupResult.isDuplicate,
        duplicateOf: dedupResult.duplicateOf || null,
        confidence: dedupResult.confidence,
        reasoning: dedupResult.reasoning,
        potential_duplicates: dedupResult.potentialDuplicates,
      },
    },
    { status: 201 },
  );
}
