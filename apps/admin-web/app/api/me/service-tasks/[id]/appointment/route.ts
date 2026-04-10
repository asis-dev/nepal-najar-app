/**
 * POST /api/me/service-tasks/[id]/appointment
 *
 * Appointment lifecycle actions for hospital service tasks.
 * Body: { action: 'confirm' | 'attend' | 'cancel' | 'reschedule', ... }
 *
 * Actions:
 *  - confirm:    { bookingRef, department?, date?, time? }
 *  - attend:     { notes? }
 *  - cancel:     { reason? }
 *  - reschedule: { reason? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServiceBySlug } from '@/lib/services/catalog';
import {
  confirmAppointmentBooking,
  markAppointmentAttended,
  cancelOrRescheduleAppointment,
} from '@/lib/integrations/hospitals/adapter';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action.trim() : '';
  if (!['confirm', 'attend', 'cancel', 'reschedule'].includes(action)) {
    return NextResponse.json({ error: 'action must be confirm, attend, cancel, or reschedule' }, { status: 400 });
  }

  const { data: task } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const service = await getServiceBySlug(task.service_slug);
  if (!service || service.providerType !== 'hospital') {
    return NextResponse.json({ error: 'Not a hospital service task' }, { status: 400 });
  }

  const providerKey = service.slug;
  const hospitalName = service.providerName;

  try {
    if (action === 'confirm') {
      const bookingRef = typeof body.bookingRef === 'string' ? body.bookingRef.trim() : '';
      if (!bookingRef) {
        return NextResponse.json({ error: 'bookingRef is required for confirm action' }, { status: 400 });
      }
      const result = await confirmAppointmentBooking(supabase, {
        taskId: task.id,
        ownerId: user.id,
        providerKey,
        hospitalName,
        bookingRef,
        department: typeof body.department === 'string' ? body.department : undefined,
        date: typeof body.date === 'string' ? body.date : undefined,
        time: typeof body.time === 'string' ? body.time : undefined,
      });
      return NextResponse.json(result);
    }

    if (action === 'attend') {
      const result = await markAppointmentAttended(supabase, {
        taskId: task.id,
        ownerId: user.id,
        providerKey,
        hospitalName,
        notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : undefined,
      });
      return NextResponse.json(result);
    }

    if (action === 'cancel' || action === 'reschedule') {
      const result = await cancelOrRescheduleAppointment(supabase, {
        taskId: task.id,
        ownerId: user.id,
        providerKey,
        hospitalName,
        action,
        reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : undefined,
      });
      return NextResponse.json(result);
    }
  } catch (err: any) {
    console.error(`[appointment/${action}]`, err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
