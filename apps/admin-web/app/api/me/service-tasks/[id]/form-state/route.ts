import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import {
  insertTaskEventBestEffort,
  updateServiceTaskWithCompatibility,
} from '@/lib/services/task-store';
import { mapTaskRow } from '@/lib/services/task-engine';

export async function PATCH(
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

  const { data: task, error: loadError } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const formKey = typeof body.formKey === 'string' ? body.formKey.trim().slice(0, 160) : task.service_slug;
  const formData =
    body.data && typeof body.data === 'object' && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : {};
  const submitted = body.submitted === true;
  const now = new Date().toISOString();

  const serviceForm = {
    serviceSlug: task.service_slug,
    formKey,
    data: formData,
    submitted,
    submittedAt: submitted ? now : null,
    updatedAt: now,
  };

  const updates: Record<string, unknown> = {
    answers: {
      ...(task.answers || {}),
      service_form: serviceForm,
    },
  };

  if (submitted) {
    updates.status = task.status === 'collecting_docs' ? task.status : 'in_progress';
    updates.progress = Math.max(typeof task.progress === 'number' ? task.progress : 0, 40);
    updates.current_step = Math.max(typeof task.current_step === 'number' ? task.current_step : 1, 1);
    updates.next_action =
      'Review the completed form, confirm any remaining documents, and continue with booking, payment, or office submission.';
    updates.summary = `In-app form completed for ${task.service_title}. Continue the official workflow from the saved case.`;
    updates.last_public_update_at = now;
    if ((task.queue_state || 'new') === 'new') {
      updates.queue_state = 'assigned';
    }
  }

  const { data: updated, error: updateError } = await updateServiceTaskWithCompatibility(
    supabase,
    task.id,
    updates,
  );

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await insertTaskEventBestEffort(supabase, {
    task_id: task.id,
    owner_id: user.id,
    event_type: submitted ? 'service_form_submitted' : 'service_form_saved',
    note: submitted ? 'Completed the in-app service form' : 'Saved the in-app service form draft',
    meta: {
      form_key: formKey,
      submitted,
      field_count: Object.keys(formData).length,
    },
  });

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: submitted ? 'service_form_completed' : 'service_form_saved',
    entity_type: 'service_task',
    entity_id: task.id,
    title: submitted ? `Completed form for ${task.service_title}` : `Saved form for ${task.service_title}`,
    summary: submitted ? 'In-app form completed and attached to the case.' : 'Draft saved on the case.',
    meta: {
      service_slug: task.service_slug,
      form_key: formKey,
      submitted,
    },
  });

  return NextResponse.json({ task: mapTaskRow(updated) });
}
