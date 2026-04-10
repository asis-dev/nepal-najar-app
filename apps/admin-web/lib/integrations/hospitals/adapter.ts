import type { Service } from '@/lib/services/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { insertTaskEventBestEffort, updateServiceTaskWithCompatibility } from '@/lib/services/task-store';
import { insertServiceTaskMessageBestEffort, notifyServiceTaskUsers } from '@/lib/service-ops/notifications';
import { createOrUpdatePaymentIntegration } from '@/lib/integrations/payment-task-bridge';
import type { AssistantTaskIntake } from '@/lib/services/task-types';

export type HospitalBookingMode = 'walk_in' | 'external_portal' | 'phone' | 'hybrid';

export interface HospitalAppointmentWindow {
  label: string;
  startsAt: string;
  endsAt: string;
  bookingMode: HospitalBookingMode;
  note: string;
}

export interface HospitalAppointmentPlan {
  providerKey: string;
  hospitalName: string;
  bookingMode: HospitalBookingMode;
  bookingUrl?: string;
  phone?: string | null;
  specialties: string[];
  appointmentWindows: HospitalAppointmentWindow[];
  intakeNote: string;
  confirmationHint: string;
}

export interface HospitalAppointmentRecommendation {
  specialty: string;
  preferredWindow: string;
  rationale: string;
}

const HOSPITAL_OVERRIDES: Record<
  string,
  Partial<Pick<HospitalAppointmentPlan, 'bookingMode' | 'bookingUrl' | 'specialties' | 'intakeNote' | 'confirmationHint'>>
> = {
  'bir-hospital-opd': {
    bookingMode: 'walk_in',
    specialties: ['General medicine', 'ENT', 'Orthopedics', 'Surgery', 'Dermatology'],
    intakeNote: 'Bir still behaves like a queue-first hospital. The best the app can do today is prepare the patient, suggest the best arrival window, and keep the visit tracked.',
    confirmationHint: 'After you get the OPD ticket, save the department or token number in My Tasks so NepalRepublic can keep the trail.',
  },
  'tuth-opd': {
    bookingMode: 'external_portal',
    bookingUrl: 'https://iom.edu.np/tuth',
    specialties: ['General medicine', 'Surgery', 'Pediatrics', 'ENT', 'Orthopedics'],
    intakeNote: 'TUTH is the best first candidate for normalized appointment guidance because it already supports online booking for many departments.',
    confirmationHint: 'Use the portal to complete the booking, then bring the booking reference back into NepalRepublic to track it.',
  },
  'patan-hospital-opd': {
    bookingMode: 'hybrid',
    bookingUrl: 'https://patanhospital.gov.np',
    specialties: ['General medicine', 'Gynecology', 'Orthopedics', 'Dermatology', 'Pediatrics'],
    intakeNote: 'Patan works best as a hybrid flow: prepare the patient digitally, then finish the appointment through the hospital’s own process.',
    confirmationHint: 'Once you have a queue token or reference, record it in NepalRepublic so the task becomes traceable.',
  },
  'civil-hospital-opd': {
    bookingMode: 'hybrid',
    specialties: ['General medicine', 'Internal medicine', 'Orthopedics', 'ENT'],
    intakeNote: 'Civil Hospital is best handled as a structured assisted flow until a cleaner scheduling surface exists.',
    confirmationHint: 'Record the department and token/reference after booking or arrival so the visit can stay synced.',
  },
};

function parseHoursWindow(hours?: string) {
  if (!hours) return { startHour: 8, startMinute: 0, endHour: 12, endMinute: 0 };
  const match = hours.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!match) return { startHour: 8, startMinute: 0, endHour: 12, endMinute: 0 };
  return {
    startHour: Number(match[1]),
    startMinute: Number(match[2]),
    endHour: Number(match[3]),
    endMinute: Number(match[4]),
  };
}

function nextBusinessDays(count: number) {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (dates.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day === 6) continue;
    dates.push(new Date(cursor));
  }

  return dates;
}

function toIso(date: Date, hour: number, minute: number) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}

function buildWindows(service: Service, bookingMode: HospitalBookingMode): HospitalAppointmentWindow[] {
  const office = service.offices[0];
  const hours = parseHoursWindow(office?.hours?.en);
  const dates = nextBusinessDays(4);

  return dates.map((date, index) => {
    const startsAt = toIso(date, hours.startHour, hours.startMinute);
    const endsAt = toIso(date, hours.endHour, hours.endMinute);
    const label = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const note =
      bookingMode === 'walk_in'
        ? index === 0
          ? 'Best for early arrival. Expect queueing.'
          : 'Backup walk-in window.'
        : bookingMode === 'external_portal'
          ? 'Preferred digital booking window.'
          : 'Good fallback hospital window.';

    return {
      label,
      startsAt,
      endsAt,
      bookingMode,
      note,
    };
  });
}

export function getHospitalAppointmentPlan(service: Service): HospitalAppointmentPlan | null {
  if (service.providerType !== 'hospital') return null;

  const override = HOSPITAL_OVERRIDES[service.slug] || {};
  const bookingMode = override.bookingMode || 'hybrid';

  return {
    providerKey: service.slug,
    hospitalName: service.providerName,
    bookingMode,
    bookingUrl: override.bookingUrl || service.officialUrl,
    phone: service.offices[0]?.phone || null,
    specialties: override.specialties || ['General OPD'],
    appointmentWindows: buildWindows(service, bookingMode),
    intakeNote:
      override.intakeNote ||
      'NepalRepublic can narrow the hospital path, suggest windows, and track the booking flow even when the final booking still depends on the provider.',
    confirmationHint:
      override.confirmationHint ||
      'After the booking or ticket is confirmed, record the reference in NepalRepublic so the visit stays traceable.',
  };
}

function pickSpecialty(plan: HospitalAppointmentPlan, intake?: AssistantTaskIntake | null) {
  const specialties = plan.specialties || [];
  if (specialties.length === 0) return 'General OPD';

  const specialtyHint = intake?.health?.specialtyHint || 'unknown';
  const visitGoal = intake?.health?.visitGoal || intake?.care_need || 'unknown';
  const normalized = specialties.map((item) => ({ raw: item, value: item.toLowerCase() }));

  const findBy = (pattern: RegExp) => normalized.find((item) => pattern.test(item.value))?.raw || null;

  if (specialtyHint === 'pediatric' || intake?.subject === 'child') {
    return findBy(/pediatric|paediatric|child/) || specialties[0];
  }

  if (specialtyHint === 'maternity') {
    return findBy(/gyn|obstetric|maternity/) || specialties[0];
  }

  if (specialtyHint === 'specialist' || visitGoal === 'specialist') {
    return (
      normalized.find((item) => !/general|opd|internal medicine/.test(item.value))?.raw ||
      specialties[0]
    );
  }

  if (visitGoal === 'same_day' || specialtyHint === 'general') {
    return findBy(/general|internal medicine|opd/) || specialties[0];
  }

  return specialties[0];
}

function pickWindow(plan: HospitalAppointmentPlan, intake?: AssistantTaskIntake | null) {
  const windows = plan.appointmentWindows || [];
  if (windows.length === 0) return '';

  if (intake?.urgency === 'today' || intake?.health?.visitGoal === 'same_day' || intake?.care_need === 'same_day') {
    return windows[0].label;
  }

  return windows[0].label;
}

export function recommendHospitalAppointment(
  plan: HospitalAppointmentPlan,
  intake?: AssistantTaskIntake | null,
): HospitalAppointmentRecommendation {
  const specialty = pickSpecialty(plan, intake);
  const preferredWindow = pickWindow(plan, intake);

  let rationale = `NepalRepublic recommends ${specialty} as the best starting point.`;
  if (intake?.subject === 'child') {
    rationale = `NepalRepublic picked ${specialty} because this looks like a child health case.`;
  } else if (intake?.health?.specialtyHint === 'maternity') {
    rationale = `NepalRepublic picked ${specialty} because this looks like a maternity-related visit.`;
  } else if (intake?.health?.visitGoal === 'specialist' || intake?.care_need === 'specialist') {
    rationale = `NepalRepublic picked ${specialty} because the request sounds like specialist care.`;
  } else if (intake?.health?.visitGoal === 'same_day' || intake?.care_need === 'same_day' || intake?.urgency === 'today') {
    rationale = `NepalRepublic picked ${specialty} as the fastest same-day starting point.`;
  }

  return {
    specialty,
    preferredWindow,
    rationale,
  };
}

// ── Appointment lifecycle actions ──────────────────────────────────

export type AppointmentAction = 'confirm' | 'attend' | 'cancel' | 'reschedule';

/**
 * Confirm a booking by storing the reference/token from the hospital.
 * Called when the citizen saves a booking reference after visiting the portal
 * or arriving at the hospital and receiving a token.
 */
export async function confirmAppointmentBooking(
  supabase: SupabaseClient,
  args: {
    taskId: string;
    ownerId: string;
    providerKey: string;
    hospitalName: string;
    bookingRef: string;
    department?: string;
    date?: string;
    time?: string;
  },
) {
  const { taskId, ownerId, providerKey, hospitalName, bookingRef } = args;
  const now = new Date().toISOString();

  const { data: task } = await supabase
    .from('service_tasks')
    .select('action_state')
    .eq('id', taskId)
    .maybeSingle();

  const currentState = (task?.action_state || {}) as Record<string, any>;

  await updateServiceTaskWithCompatibility(supabase, taskId, {
    action_state: {
      ...currentState,
      appointment_confirmed: {
        completed: true,
        value: bookingRef,
        completedAt: now,
      },
    },
    status: 'in_progress',
    progress: 65,
    next_action: `Appointment confirmed at ${hospitalName}. Reference: ${bookingRef}. Visit on your scheduled date.`,
    queue_state: 'waiting_on_citizen',
    waiting_on_party: 'citizen',
    last_public_update_at: now,
  });

  await createOrUpdatePaymentIntegration(supabase, {
    serviceTaskId: taskId,
    ownerId,
    providerKey,
    operation: 'appointment_confirmation',
    status: 'verified',
    providerReference: bookingRef,
    requestPayload: { department: args.department, date: args.date, time: args.time },
    responsePayload: { bookingRef, confirmedAt: now },
  });

  await insertTaskEventBestEffort(supabase, {
    task_id: taskId,
    owner_id: ownerId,
    event_type: 'appointment_confirmed',
    note: `Booking confirmed at ${hospitalName}: ${bookingRef}`,
    meta: { provider: providerKey, booking_ref: bookingRef },
  });

  await insertServiceTaskMessageBestEffort(supabase, {
    taskId,
    ownerId,
    actorType: 'citizen',
    visibility: 'public',
    messageType: 'status_update',
    body: `Saved booking confirmation for ${hospitalName}. Reference: ${bookingRef}.`,
    metadata: { booking_ref: bookingRef, provider: providerKey },
  });

  return { confirmed: true, bookingRef };
}

/**
 * Mark appointment as attended — completes the task.
 */
export async function markAppointmentAttended(
  supabase: SupabaseClient,
  args: {
    taskId: string;
    ownerId: string;
    providerKey: string;
    hospitalName: string;
    notes?: string;
  },
) {
  const { taskId, ownerId, providerKey, hospitalName, notes } = args;
  const now = new Date().toISOString();

  const { data: task } = await supabase
    .from('service_tasks')
    .select('action_state')
    .eq('id', taskId)
    .maybeSingle();

  const currentState = (task?.action_state || {}) as Record<string, any>;

  await updateServiceTaskWithCompatibility(supabase, taskId, {
    action_state: {
      ...currentState,
      appointment_attended: { completed: true, value: 'attended', completedAt: now },
    },
    status: 'completed',
    progress: 100,
    completed_at: now,
    next_action: 'Appointment completed.',
    queue_state: 'resolved',
    waiting_on_party: null,
    last_public_update_at: now,
    resolution_summary: `Attended appointment at ${hospitalName}.${notes ? ` ${notes}` : ''}`,
  });

  await insertTaskEventBestEffort(supabase, {
    task_id: taskId,
    owner_id: ownerId,
    event_type: 'appointment_attended',
    note: `Attended appointment at ${hospitalName}`,
    meta: { provider: providerKey, notes },
  });

  await insertServiceTaskMessageBestEffort(supabase, {
    taskId,
    ownerId,
    actorType: 'citizen',
    visibility: 'public',
    messageType: 'status_update',
    body: `Marked appointment as attended at ${hospitalName}.${notes ? ` ${notes}` : ''}`,
  });

  return { attended: true };
}

/**
 * Cancel or reschedule an appointment.
 */
export async function cancelOrRescheduleAppointment(
  supabase: SupabaseClient,
  args: {
    taskId: string;
    ownerId: string;
    providerKey: string;
    hospitalName: string;
    action: 'cancel' | 'reschedule';
    reason?: string;
  },
) {
  const { taskId, ownerId, providerKey, hospitalName, action, reason } = args;
  const now = new Date().toISOString();
  const isReschedule = action === 'reschedule';

  await updateServiceTaskWithCompatibility(supabase, taskId, {
    status: isReschedule ? 'in_progress' : 'blocked',
    progress: isReschedule ? 25 : 0,
    next_action: isReschedule
      ? `Rebook your appointment at ${hospitalName}.`
      : `Appointment cancelled.${reason ? ` Reason: ${reason}` : ''}`,
    queue_state: isReschedule ? 'waiting_on_citizen' : 'closed',
    waiting_on_party: isReschedule ? 'citizen' : null,
    last_public_update_at: now,
    ...(isReschedule ? {} : { completed_at: now }),
  });

  await insertTaskEventBestEffort(supabase, {
    task_id: taskId,
    owner_id: ownerId,
    event_type: `appointment_${action}led`,
    note: `Appointment ${action}led at ${hospitalName}`,
    meta: { provider: providerKey, reason },
  });

  await insertServiceTaskMessageBestEffort(supabase, {
    taskId,
    ownerId,
    actorType: 'citizen',
    visibility: 'public',
    messageType: 'status_update',
    body: `Appointment ${action}led at ${hospitalName}.${reason ? ` Reason: ${reason}` : ''}`,
    metadata: { action, reason },
  });

  return { action, done: true };
}
