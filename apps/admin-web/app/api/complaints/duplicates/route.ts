import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import { findPotentialDuplicates } from '@/lib/intelligence/complaint-dedup';

export async function GET(request: NextRequest) {
  // Auth check
  let user = null;
  try {
    const ssr = await createSupabaseServerClient();
    const { data } = await ssr.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // no session
  }

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const complaintId = request.nextUrl.searchParams.get('complaint_id');
  if (!complaintId) {
    return NextResponse.json({ error: 'complaint_id query parameter is required' }, { status: 400 });
  }

  const db = getSupabase();
  const { data: complaint, error } = await db
    .from('civic_complaints')
    .select('id, title, description, issue_type, municipality, ward_number, district, province')
    .eq('id', complaintId)
    .single();

  if (error || !complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const matches = await findPotentialDuplicates({
    title: complaint.title as string,
    description: complaint.description as string,
    issue_type: complaint.issue_type as string,
    municipality: complaint.municipality as string | null,
    ward_number: complaint.ward_number as string | null,
    district: complaint.district as string | null,
    province: complaint.province as string | null,
  });

  return NextResponse.json({
    complaint_id: complaintId,
    duplicates: matches,
    count: matches.length,
  });
}
