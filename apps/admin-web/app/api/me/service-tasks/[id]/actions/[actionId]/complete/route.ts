import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServiceBySlug } from '@/lib/services/catalog';
import { getWorkflowDefinition } from '@/lib/services/workflow-definitions';
import { mapTaskRow } from '@/lib/services/task-engine';

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } },
) {
  const { supabase, user } = await getAuthedContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {}

  const { data: existing, error: loadError } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const service = await getServiceBySlug(existing.service_slug);
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const workflow = getWorkflowDefinition(service);
  const action = workflow.actions?.find((item) => item.id === params.actionId);
  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 });

  const value = typeof body.value === 'string' ? body.value.trim().slice(0, 500) : '';
  const currentState = (existing.action_state || {}) as Record<string, { completed: boolean; value?: string; completedAt?: string }>;
  const nextState = {
    ...currentState,
    [params.actionId]: {
      completed: true,
      value: value || undefined,
      completedAt: new Date().toISOString(),
    },
  };

  const updates: Record<string, unknown> = {
    action_state: nextState,
    notes: value ? [existing.notes, `${action.label}: ${value}`].filter(Boolean).join('\n') : existing.notes,
  };

  if (action.statusOnComplete) updates.status = action.statusOnComplete;
  if (typeof action.stepOnComplete === 'number') updates.current_step = action.stepOnComplete;
  if (typeof action.progressOnComplete === 'number') updates.progress = action.progressOnComplete;
  if (action.nextActionOnComplete) updates.next_action = action.nextActionOnComplete;
  if (action.statusOnComplete === 'completed') updates.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('service_tasks')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('service_task_events').insert({
    task_id: params.id,
    owner_id: user.id,
    event_type: 'action_completed',
    note: `Completed ${action.label}`,
    meta: {
      action_id: params.actionId,
      value: value || null,
      resulting_status: action.statusOnComplete || existing.status,
    },
  });

  return NextResponse.json({ task: mapTaskRow(data) });
}
