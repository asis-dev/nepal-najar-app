import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { canViewComplaint, getComplaintAuthContext } from '@/lib/complaints/access';
import type { ComplaintCase } from '@/lib/complaints/types';

type RouteContext = { params: Promise<{ id: string }> };

async function getComplaint(id: string): Promise<ComplaintCase | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('civic_complaints')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ComplaintCase;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const complaint = await getComplaint(id);
  if (!complaint || !canViewComplaint(complaint, auth)) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const db = getSupabase();
  const { data, error } = await db
    .from('complaint_followers')
    .select('notify, created_at')
    .eq('complaint_id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    following: Boolean(data),
    notify: data?.notify === true,
    followed_at: data?.created_at || null,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const complaint = await getComplaint(id);
  if (!complaint || !canViewComplaint(complaint, auth)) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  let notify = true;
  try {
    const body = (await request.json().catch(() => ({}))) as { notify?: boolean };
    if (typeof body.notify === 'boolean') notify = body.notify;
  } catch {
    notify = true;
  }

  const db = getSupabase();
  const { data, error } = await db
    .from('complaint_followers')
    .upsert(
      {
        complaint_id: id,
        user_id: auth.user.id,
        notify,
      },
      { onConflict: 'complaint_id,user_id' },
    )
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to follow complaint' }, { status: 500 });
  }

  return NextResponse.json({ success: true, following: true, notify: data.notify });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const complaint = await getComplaint(id);
  if (!complaint || !canViewComplaint(complaint, auth)) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const db = getSupabase();
  const { error } = await db
    .from('complaint_followers')
    .delete()
    .eq('complaint_id', id)
    .eq('user_id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, following: false });
}
