import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import { getServiceBySlug } from '@/lib/services/catalog';
import { getHospitalAppointmentPlan, recommendHospitalAppointment } from '@/lib/integrations/hospitals/adapter';
import { createOrUpdatePaymentIntegration } from '@/lib/integrations/payment-task-bridge';
import {
  insertTaskEventBestEffort,
  updateServiceTaskWithCompatibility,
} from '@/lib/services/task-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: task } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const service = await getServiceBySlug(task.service_slug);
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const plan = getHospitalAppointmentPlan(service);
  if (!plan) return NextResponse.json({ error: 'Not a hospital task' }, { status: 400 });

  const recommendation = recommendHospitalAppointment(plan, task.answers?.assistant_intake || null);
  const specialty =
    typeof body.specialty === 'string' && body.specialty.trim()
      ? body.specialty.trim().slice(0, 120)
      : recommendation.specialty;
  const preferredWindow =
    typeof body.preferredWindow === 'string' && body.preferredWindow.trim()
      ? body.preferredWindow.trim().slice(0, 120)
      : recommendation.preferredWindow;
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';

  if (!specialty || !preferredWindow) {
    return NextResponse.json({ error: 'specialty and preferredWindow are required' }, { status: 400 });
  }

  const bookingValue = `${specialty} · ${preferredWindow}`;
  const currentActionState = (task.action_state || {}) as Record<string, { completed: boolean; value?: string; completedAt?: string }>;
  const nextActionState = {
    ...currentActionState,
    appointment_requested: {
      completed: true,
      value: bookingValue,
      completedAt: new Date().toISOString(),
    },
  };

  const nextAction =
    plan.bookingMode === 'external_portal' && plan.bookingUrl
      ? `Complete booking on ${plan.hospitalName} and save the reference.`
      : plan.bookingMode === 'walk_in'
        ? `Reach ${plan.hospitalName} in the selected window and collect the OPD ticket.`
        : `Use the hospital booking process for ${plan.hospitalName} and save the token/reference.`;

  const nextNote = [task.notes, `Hospital appointment preference: ${bookingValue}${note ? ` · ${note}` : ''}`]
    .filter(Boolean)
    .join('\n');

  const { data: updated, error } = await updateServiceTaskWithCompatibility(supabase, task.id, {
    action_state: nextActionState,
    answers: {
      ...(task.answers || {}),
      appointment_request: {
        specialty,
        preferred_window: preferredWindow,
        note: note || null,
        recommendation_rationale: recommendation.rationale,
        updated_at: new Date().toISOString(),
      },
    },
    status: 'in_progress',
    current_step: Math.max(task.current_step || 1, 2),
    progress: Math.max(task.progress || 0, 45),
    next_action: nextAction,
    notes: nextNote,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createOrUpdatePaymentIntegration(supabase, {
    serviceTaskId: task.id,
    ownerId: user.id,
    providerKey: plan.providerKey,
    operation: 'appointment',
    status: plan.bookingMode === 'external_portal' ? 'redirected' : 'pending',
    requestPayload: {
      specialty,
      preferredWindow,
      note,
      bookingMode: plan.bookingMode,
    },
    responsePayload: {
      bookingUrl: plan.bookingUrl || null,
      phone: plan.phone || null,
    },
  });

  await insertTaskEventBestEffort(supabase, {
    task_id: task.id,
    owner_id: user.id,
    event_type: 'appointment_requested',
    note: `Saved hospital appointment preference for ${specialty}`,
    meta: {
      specialty,
      preferred_window: preferredWindow,
      booking_mode: plan.bookingMode,
      booking_url: plan.bookingUrl || null,
    },
  });

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'service_task_appointment_requested',
    entity_type: 'service_task',
    entity_id: task.id,
    title: `Saved appointment preference for ${service.title.en}`,
    summary: bookingValue,
    meta: {
      service_slug: service.slug,
      specialty,
      preferred_window: preferredWindow,
      booking_mode: plan.bookingMode,
    },
  });

  return NextResponse.json({
    task: updated,
    bookingMode: plan.bookingMode,
    bookingUrl: plan.bookingUrl || null,
    confirmationHint: plan.confirmationHint,
    recommendation: {
      specialty: recommendation.specialty,
      preferredWindow: recommendation.preferredWindow,
      rationale: recommendation.rationale,
    },
  });
}
