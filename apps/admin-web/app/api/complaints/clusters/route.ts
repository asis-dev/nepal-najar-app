import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { getComplaintAuthContext } from '@/lib/complaints/access';
import { createCluster, type ComplaintCluster } from '@/lib/complaints/clusters';

/**
 * GET /api/complaints/clusters
 * List clusters with filters.
 */
export async function GET(request: NextRequest) {
  const db = getSupabase();
  const sp = request.nextUrl.searchParams;

  const status = sp.get('status');
  const issueType = sp.get('issue_type');
  const municipality = sp.get('municipality');
  const q = sp.get('q');
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '30', 10)));
  const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10));

  let query = db
    .from('complaint_clusters')
    .select('*', { count: 'exact' })
    .order('report_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (issueType) query = query.eq('issue_type', issueType);
  if (municipality) query = query.eq('municipality', municipality);
  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    clusters: (data || []) as ComplaintCluster[],
    total: count ?? 0,
    limit,
    offset,
  });
}

/**
 * POST /api/complaints/clusters
 * Create a new cluster from selected complaints (admin/verifier only).
 */
export async function POST(request: NextRequest) {
  const ctx = await getComplaintAuthContext();
  if (!ctx.isElevated) {
    return NextResponse.json({ error: 'Admin or verifier access required' }, { status: 403 });
  }

  let body: {
    primary_complaint_id: string;
    additional_complaint_ids?: string[];
    title?: string;
    title_ne?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.primary_complaint_id) {
    return NextResponse.json({ error: 'primary_complaint_id is required' }, { status: 400 });
  }

  const db = getSupabase();
  const cluster = await createCluster(db, {
    primaryComplaintId: body.primary_complaint_id,
    additionalComplaintIds: body.additional_complaint_ids,
    title: body.title,
    titleNe: body.title_ne,
    createdBy: ctx.user!.id,
    mergeMethod: 'manual',
  });

  if (!cluster) {
    return NextResponse.json({ error: 'Failed to create cluster' }, { status: 500 });
  }

  return NextResponse.json({ cluster }, { status: 201 });
}
