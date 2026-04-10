import { NextRequest, NextResponse } from 'next/server';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import {
  createOrUpdatePaymentIntegration,
} from '@/lib/integrations/payment-task-bridge';
import { lookupUtilityBill } from '@/lib/integrations/utilities/adapter';
import { insertServiceTaskMessageBestEffort } from '@/lib/service-ops/notifications';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import {
  insertTaskEventBestEffort,
  updateServiceTaskWithCompatibility,
} from '@/lib/services/task-store';

type Body = {
  customerId?: string;
  serviceOffice?: string;
  branch?: string;
  dueAmountNpr?: number;
  source?: 'manual' | 'ocr' | 'live';
  scanMeta?: Record<string, unknown>;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const db = getSupabase();
  const { data: task, error: loadError } = await db
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const result = lookupUtilityBill(task.service_slug, body);
  if (!result) {
    return NextResponse.json({ error: 'Utility lookup is not supported for this service' }, { status: 400 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: 400 });
  }

  const now = new Date().toISOString();
  const utilityLookup = {
    provider_key: result.plan.providerKey,
    source: body.source || 'manual',
    customer_id: result.normalized.customerId,
    service_office: result.normalized.serviceOffice || null,
    branch: result.normalized.branch || null,
    due_amount_npr: result.normalized.dueAmountNpr || null,
    official_lookup_url: result.plan.officialLookupUrl,
    scan_meta: body.scanMeta || null,
    saved_at: now,
  };

  const { data: updated, error: updateError } = await updateServiceTaskWithCompatibility(db, task.id, {
    answers: {
      ...(task.answers || {}),
      utility_lookup: utilityLookup,
    },
    status: result.directPaymentReady ? 'in_progress' : task.status === 'intake' ? 'ready' : task.status,
    progress: Math.max(typeof task.progress === 'number' ? task.progress : 0, result.directPaymentReady ? 55 : 40),
    next_action: result.nextAction,
    summary: result.summary,
    queue_state: result.directPaymentReady ? 'waiting_on_citizen' : 'in_review',
    waiting_on_party: result.directPaymentReady ? 'citizen' : 'provider',
    last_public_update_at: now,
  });

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await createOrUpdatePaymentIntegration(db, {
    serviceTaskId: task.id,
    ownerId: user.id,
    providerKey: result.plan.providerKey,
    operation: 'bill_lookup',
    status: result.directPaymentReady ? 'verified' : 'pending',
    requestPayload: body as Record<string, unknown>,
    responsePayload: utilityLookup,
    providerReference: result.normalized.customerId,
  });

  await insertTaskEventBestEffort(db, {
    task_id: task.id,
    owner_id: user.id,
    event_type: 'utility_lookup_saved',
    note: result.summary,
    meta: utilityLookup,
  });

  await insertServiceTaskMessageBestEffort(db, {
    taskId: task.id,
    ownerId: user.id,
    actorId: user.id,
    actorType: 'citizen',
    visibility: 'public',
    messageType: 'system',
    body: result.directPaymentReady
      ? `Saved ${result.plan.providerName} account details and prepared payment for NPR ${result.normalized.dueAmountNpr?.toLocaleString()}.`
      : `Saved ${result.plan.providerName} account details. Next, confirm the current amount due and continue to payment.`,
    metadata: utilityLookup,
  });

  await recordUserActivityBestEffort(db, {
    owner_id: user.id,
    event_type: 'service_task_utility_lookup_saved',
    entity_type: 'service_task',
    entity_id: task.id,
    title: `Saved bill lookup for ${task.service_title}`,
    summary: result.summary,
    meta: utilityLookup,
  });

  return NextResponse.json({
    task: updated,
    lookup: result,
  });
}
