import type { SupabaseClient } from '@supabase/supabase-js';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import {
  insertServiceTaskMessageBestEffort,
  notifyServiceTaskUsers,
} from '@/lib/service-ops/notifications';
import { insertTaskEventBestEffort, updateServiceTaskWithCompatibility } from '@/lib/services/task-store';

type ServiceTaskRow = {
  id: string;
  owner_id: string;
  service_slug: string;
  service_title: string;
  status: string;
  action_state?: Record<string, { completed: boolean; value?: string; completedAt?: string }>;
  notes?: string | null;
};

type PaymentRow = {
  id: string;
  owner_id: string | null;
  service_slug: string;
  service_title: string;
  transaction_id: string;
  gateway: string;
  gateway_ref: string | null;
  service_task_id: string | null;
  amount_npr: number;
};

const PAYMENT_ACTION_BY_SERVICE: Record<string, string> = {
  'nea-electricity-bill': 'nea_bill_paid',
  'kukl-water-bill': 'pay_bill',
};

function appendNote(existing: string | null | undefined, line: string) {
  return [existing, line].filter(Boolean).join('\n');
}

export async function findTaskForPayment(
  supabase: SupabaseClient,
  ownerId: string | null | undefined,
  serviceSlug: string,
  explicitTaskId?: string | null,
) {
  if (explicitTaskId) {
    const { data } = await supabase.from('service_tasks').select('*').eq('id', explicitTaskId).maybeSingle();
    return data as ServiceTaskRow | null;
  }

  if (!ownerId) return null;

  const { data } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('service_slug', serviceSlug)
    .neq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ServiceTaskRow | null;
}

export async function createOrUpdatePaymentIntegration(
  supabase: SupabaseClient,
  args: {
    serviceTaskId: string;
    ownerId?: string | null;
    providerKey: string;
    operation: string;
    status: 'pending' | 'redirected' | 'verified' | 'failed';
    paymentId?: string | null;
    requestPayload?: Record<string, unknown>;
    responsePayload?: Record<string, unknown>;
    providerReference?: string | null;
    receiptNumber?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
) {
  const payload = {
    service_task_id: args.serviceTaskId,
    owner_id: args.ownerId || null,
    provider_key: args.providerKey,
    operation: args.operation,
    status: args.status,
    payment_id: args.paymentId || null,
    request_payload: args.requestPayload || {},
    response_payload: args.responsePayload || {},
    provider_reference: args.providerReference || null,
    receipt_number: args.receiptNumber || null,
    error_code: args.errorCode || null,
    error_message: args.errorMessage || null,
    completed_at: args.status === 'verified' || args.status === 'failed' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('service_task_integrations')
    .select('id')
    .eq('service_task_id', args.serviceTaskId)
    .eq('provider_key', args.providerKey)
    .eq('operation', args.operation)
    .eq('payment_id', args.paymentId || null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return supabase
      .from('service_task_integrations')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();
  }

  return supabase.from('service_task_integrations').insert(payload).select('*').single();
}

export async function recordProviderEvent(
  supabase: SupabaseClient,
  args: {
    providerKey: string;
    eventType: string;
    providerReference?: string | null;
    transactionId?: string | null;
    verified: boolean;
    rawPayload: Record<string, unknown>;
    serviceTaskId?: string | null;
    paymentId?: string | null;
  },
) {
  return supabase.from('provider_events').insert({
    provider_key: args.providerKey,
    event_type: args.eventType,
    provider_reference: args.providerReference || null,
    transaction_id: args.transactionId || null,
    verified: args.verified,
    raw_payload: args.rawPayload,
    service_task_id: args.serviceTaskId || null,
    payment_id: args.paymentId || null,
    processed_at: new Date().toISOString(),
  });
}

export async function listTaskIntegrationsBestEffort(
  supabase: SupabaseClient,
  serviceTaskId: string,
) {
  const { data, error } = await supabase
    .from('service_task_integrations')
    .select('*')
    .eq('service_task_id', serviceTaskId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes('service_task_integrations') || normalized.includes('schema cache')) {
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function applyVerifiedPaymentToTask(
  supabase: SupabaseClient,
  payment: PaymentRow,
  providerKey: string,
  rawPayload: Record<string, unknown>,
) {
  const task = await findTaskForPayment(supabase, payment.owner_id, payment.service_slug, payment.service_task_id);
  if (!task) return null;
  const now = new Date().toISOString();

  const actionId = PAYMENT_ACTION_BY_SERVICE[payment.service_slug];
  const currentActionState = (task.action_state || {}) as Record<string, { completed: boolean; value?: string; completedAt?: string }>;
  const receiptValue = payment.gateway_ref || payment.transaction_id;
  const nextActionState = actionId
    ? {
        ...currentActionState,
        [actionId]: {
          completed: true,
          value: receiptValue,
          completedAt: now,
        },
      }
    : currentActionState;

  const noteLine = `Verified ${providerKey} payment: ${receiptValue}`;

  const { data: updated } = await updateServiceTaskWithCompatibility(supabase, task.id, {
    action_state: nextActionState,
    status: 'completed',
    progress: 100,
    current_step: 4,
    next_action: 'Payment verified and recorded.',
    notes: appendNote(task.notes, noteLine),
    completed_at: now,
    queue_state: 'resolved',
    waiting_on_party: null,
    last_public_update_at: now,
    resolution_summary: noteLine,
  });

  await createOrUpdatePaymentIntegration(supabase, {
    serviceTaskId: task.id,
    ownerId: task.owner_id,
    providerKey,
    operation: 'payment',
    status: 'verified',
    paymentId: payment.id,
    responsePayload: rawPayload,
    providerReference: payment.gateway_ref,
    receiptNumber: payment.gateway_ref || payment.transaction_id,
  });

  await recordProviderEvent(supabase, {
    providerKey,
    eventType: 'payment_verified',
    providerReference: payment.gateway_ref,
    transactionId: payment.transaction_id,
    verified: true,
    rawPayload,
    serviceTaskId: task.id,
    paymentId: payment.id,
  });

  await insertTaskEventBestEffort(supabase, {
    task_id: task.id,
    owner_id: task.owner_id,
    event_type: 'payment_verified',
    note: `Verified payment via ${providerKey}`,
    meta: {
      gateway: payment.gateway,
      gateway_ref: payment.gateway_ref,
      transaction_id: payment.transaction_id,
      amount_npr: payment.amount_npr,
    },
  });

  await insertServiceTaskMessageBestEffort(supabase, {
    taskId: task.id,
    ownerId: task.owner_id,
    actorType: 'provider',
    visibility: 'public',
    messageType: 'system',
    body: `Payment verified via ${providerKey}. Receipt/reference: ${receiptValue}.`,
    metadata: {
      provider_key: providerKey,
      gateway_ref: payment.gateway_ref,
      transaction_id: payment.transaction_id,
      amount_npr: payment.amount_npr,
    },
  });

  await recordUserActivityBestEffort(supabase, {
    owner_id: task.owner_id,
    event_type: 'service_task_payment_verified',
    entity_type: 'service_task',
    entity_id: task.id,
    title: `Payment verified for ${task.service_title}`,
    summary: `${providerKey} receipt ${receiptValue}`,
    meta: {
      service_slug: task.service_slug,
      provider_key: providerKey,
      transaction_id: payment.transaction_id,
      gateway_ref: payment.gateway_ref,
    },
  });

  await notifyServiceTaskUsers(supabase, {
    taskId: task.id,
    ownerId: task.owner_id,
    title: `Payment confirmed for ${task.service_title}`,
    body: `We verified your ${providerKey} payment${receiptValue ? ` with receipt ${receiptValue}` : ''}.`,
    link: '/me/cases',
    metadata: {
      service_slug: task.service_slug,
      provider_key: providerKey,
      gateway_ref: payment.gateway_ref,
      transaction_id: payment.transaction_id,
    },
  });

  return updated;
}

export async function applyFailedPaymentToTask(
  supabase: SupabaseClient,
  payment: PaymentRow,
  providerKey: string,
  rawPayload: Record<string, unknown>,
  errorCode: string,
) {
  const task = await findTaskForPayment(supabase, payment.owner_id, payment.service_slug, payment.service_task_id);
  if (!task) return null;
  const now = new Date().toISOString();

  await updateServiceTaskWithCompatibility(supabase, task.id, {
    queue_state: 'waiting_on_citizen',
    waiting_on_party: 'citizen',
    last_public_update_at: now,
    next_action: 'Payment was not verified. Try again or choose another payment method.',
    notes: appendNote(task.notes, `Payment failed via ${providerKey}`),
  });

  await createOrUpdatePaymentIntegration(supabase, {
    serviceTaskId: task.id,
    ownerId: task.owner_id,
    providerKey,
    operation: 'payment',
    status: 'failed',
    paymentId: payment.id,
    responsePayload: rawPayload,
    providerReference: payment.gateway_ref,
    errorCode,
    errorMessage: `Payment failed via ${providerKey}`,
  });

  await recordProviderEvent(supabase, {
    providerKey,
    eventType: 'payment_failed',
    providerReference: payment.gateway_ref,
    transactionId: payment.transaction_id,
    verified: false,
    rawPayload,
    serviceTaskId: task.id,
    paymentId: payment.id,
  });

  await insertTaskEventBestEffort(supabase, {
    task_id: task.id,
    owner_id: task.owner_id,
    event_type: 'payment_failed',
    note: `Payment failed via ${providerKey}`,
    meta: {
      gateway: payment.gateway,
      transaction_id: payment.transaction_id,
      error_code: errorCode,
    },
  });

  await insertServiceTaskMessageBestEffort(supabase, {
    taskId: task.id,
    ownerId: task.owner_id,
    actorType: 'provider',
    visibility: 'public',
    messageType: 'system',
    body: `Payment could not be verified via ${providerKey}. Please try again or use a different payment option.`,
    metadata: {
      provider_key: providerKey,
      transaction_id: payment.transaction_id,
      error_code: errorCode,
    },
  });

  await recordUserActivityBestEffort(supabase, {
    owner_id: task.owner_id,
    event_type: 'service_task_payment_failed',
    entity_type: 'service_task',
    entity_id: task.id,
    title: `Payment failed for ${task.service_title}`,
    summary: `${providerKey} payment needs another attempt`,
    meta: {
      service_slug: task.service_slug,
      provider_key: providerKey,
      transaction_id: payment.transaction_id,
      error_code: errorCode,
    },
  });

  await notifyServiceTaskUsers(supabase, {
    taskId: task.id,
    ownerId: task.owner_id,
    title: `Payment needs attention for ${task.service_title}`,
    body: `Your ${providerKey} payment was not verified. You can retry from My Cases.`,
    link: '/me/cases',
    metadata: {
      service_slug: task.service_slug,
      provider_key: providerKey,
      transaction_id: payment.transaction_id,
      error_code: errorCode,
    },
  });

  return task;
}
