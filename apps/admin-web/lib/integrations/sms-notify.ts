/**
 * SMS Notification — fires SMS messages on key service task
 * lifecycle events. Each function checks configuration, validates
 * the phone number, sends the templated SMS, and logs an event
 * to the service_task_events table.
 *
 * All calls are best-effort: failures are logged but never thrown.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendSMS, canSendSMS } from './sms';
import * as templates from './sms-templates';
import { insertTaskEventBestEffort } from '@/lib/services/task-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Locale = 'en' | 'ne';

type TaskInfo = {
  id: string;
  owner_id: string;
  service_slug: string;
  service_title: string;
};

function shortCaseRef(taskId: string): string {
  return `NR-${taskId.slice(0, 8).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function sendAndLog(
  supabase: SupabaseClient,
  task: TaskInfo,
  phone: string,
  message: string,
  eventType: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const result = await sendSMS(phone, message);

  await insertTaskEventBestEffort(supabase, {
    task_id: task.id,
    owner_id: task.owner_id,
    event_type: result.sent ? eventType : `${eventType}_failed`,
    note: result.sent
      ? `SMS sent via ${result.provider} to ${phone}`
      : `SMS failed: ${result.error}`,
    meta: {
      sms_provider: result.provider,
      sms_message_id: result.messageId || null,
      sms_phone: phone,
      sms_error: result.error || null,
      ...meta,
    },
  });

  if (!result.sent) {
    console.warn(`[sms-notify] ${eventType} failed for task ${task.id}:`, result.error);
  }
}

// ---------------------------------------------------------------------------
// Public notification functions
// ---------------------------------------------------------------------------

/**
 * Notify the citizen that their service task has been created.
 */
export async function notifyTaskCreated(
  supabase: SupabaseClient,
  task: TaskInfo,
  userPhone: string | null | undefined,
  locale: Locale = 'en',
): Promise<void> {
  if (!canSendSMS() || !userPhone) return;

  const caseRef = shortCaseRef(task.id);
  const message = templates.taskCreated(task.service_title, caseRef, locale);

  await sendAndLog(supabase, task, userPhone, message, 'sms_task_created', {
    case_ref: caseRef,
  });
}

/**
 * Notify the citizen that their request has been sent to a government office.
 */
export async function notifyGovtSent(
  supabase: SupabaseClient,
  task: TaskInfo,
  userPhone: string | null | undefined,
  officeName: string,
  locale: Locale = 'en',
): Promise<void> {
  if (!canSendSMS() || !userPhone) return;

  const caseRef = shortCaseRef(task.id);
  const message = templates.taskSentToGovt(task.service_title, officeName, caseRef, locale);

  await sendAndLog(supabase, task, userPhone, message, 'sms_govt_sent', {
    case_ref: caseRef,
    office_name: officeName,
  });
}

/**
 * Notify the citizen that the government has replied to their request.
 */
export async function notifyGovtReplied(
  supabase: SupabaseClient,
  task: TaskInfo,
  userPhone: string | null | undefined,
  replyType: string,
  locale: Locale = 'en',
): Promise<void> {
  if (!canSendSMS() || !userPhone) return;

  const caseRef = shortCaseRef(task.id);
  const message = templates.govtReplied(task.service_title, replyType, caseRef, locale);

  await sendAndLog(supabase, task, userPhone, message, 'sms_govt_replied', {
    case_ref: caseRef,
    reply_type: replyType,
  });
}

/**
 * Notify the citizen that the SLA deadline for their request is approaching.
 */
export async function notifySLAWarning(
  supabase: SupabaseClient,
  task: TaskInfo,
  userPhone: string | null | undefined,
  hoursRemaining: number,
  locale: Locale = 'en',
): Promise<void> {
  if (!canSendSMS() || !userPhone) return;

  const caseRef = shortCaseRef(task.id);
  const message = templates.slaWarning(task.service_title, hoursRemaining, caseRef, locale);

  await sendAndLog(supabase, task, userPhone, message, 'sms_sla_warning', {
    case_ref: caseRef,
    hours_remaining: hoursRemaining,
  });
}

/**
 * Notify the citizen that the SLA deadline has been breached.
 */
export async function notifySLABreached(
  supabase: SupabaseClient,
  task: TaskInfo,
  userPhone: string | null | undefined,
  locale: Locale = 'en',
): Promise<void> {
  if (!canSendSMS() || !userPhone) return;

  const caseRef = shortCaseRef(task.id);
  const message = templates.slaBreached(task.service_title, caseRef, locale);

  await sendAndLog(supabase, task, userPhone, message, 'sms_sla_breached', {
    case_ref: caseRef,
  });
}

/**
 * Notify the citizen that their payment has been confirmed.
 */
export async function notifyPaymentConfirmed(
  supabase: SupabaseClient,
  task: TaskInfo,
  userPhone: string | null | undefined,
  amount: number,
  locale: Locale = 'en',
): Promise<void> {
  if (!canSendSMS() || !userPhone) return;

  const caseRef = shortCaseRef(task.id);
  const message = templates.paymentConfirmed(task.service_title, amount, caseRef, locale);

  await sendAndLog(supabase, task, userPhone, message, 'sms_payment_confirmed', {
    case_ref: caseRef,
    amount_npr: amount,
  });
}
