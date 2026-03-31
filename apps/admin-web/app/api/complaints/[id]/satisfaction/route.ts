import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { getComplaintAuthContext, isComplaintOwner } from '@/lib/complaints/access';
import type { ComplaintCase } from '@/lib/complaints/types';

type RouteContext = { params: Promise<{ id: string }> };

interface SatisfactionBody {
  rating?: number;
  note?: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getComplaintAuthContext();
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: SatisfactionBody;
  try {
    body = (await request.json()) as SatisfactionBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rating = body.rating;
  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 });
  }

  const db = getSupabase();
  const { data: complaintData, error: complaintError } = await db
    .from('civic_complaints')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (complaintError) {
    return NextResponse.json({ error: complaintError.message }, { status: 500 });
  }
  if (!complaintData) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }
  const complaint = complaintData as ComplaintCase;

  if (!isComplaintOwner(complaint, auth.user.id)) {
    return NextResponse.json({ error: 'Only complaint owner can submit satisfaction' }, { status: 403 });
  }
  if (!['resolved', 'closed'].includes(complaint.status)) {
    return NextResponse.json(
      { error: 'Satisfaction can only be submitted after resolution/closure' },
      { status: 400 },
    );
  }

  const note = body.note?.trim() || null;
  if (note && note.length > 1000) {
    return NextResponse.json({ error: 'note cannot exceed 1000 characters' }, { status: 400 });
  }

  const { data, error } = await db
    .from('civic_complaints')
    .update({
      citizen_satisfaction: rating,
      citizen_satisfaction_note: note,
      satisfaction_submitted_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to save satisfaction' }, { status: 500 });
  }

  await db.from('complaint_events').insert({
    complaint_id: id,
    actor_id: auth.user.id,
    actor_type: 'citizen',
    event_type: 'citizen_update',
    visibility: 'public',
    message: note
      ? `Citizen satisfaction rating: ${rating}/5. ${note}`
      : `Citizen satisfaction rating: ${rating}/5.`,
    metadata: {
      satisfaction_rating: rating,
      has_note: Boolean(note),
    },
  });

  return NextResponse.json({ success: true, complaint: data });
}
