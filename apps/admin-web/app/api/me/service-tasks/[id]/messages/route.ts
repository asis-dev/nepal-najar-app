import { NextRequest, NextResponse } from 'next/server';
import { notifyServiceTaskUsers } from '@/lib/service-ops/notifications';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import { insertTaskEventBestEffort } from '@/lib/services/task-store';

function isMissingTable(message?: string, table?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  if (table && !normalized.includes(table.toLowerCase())) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('schema cache') ||
    normalized.includes('could not find the table') ||
    normalized.includes('relation')
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: task, error: taskError } = await supabase
    .from('service_tasks')
    .select('id, owner_id')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('service_task_messages')
    .select('*')
    .eq('task_id', params.id)
    .eq('owner_id', user.id)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingTable(error.message, 'service_task_messages')) {
      return NextResponse.json({ messages: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [] });
}

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

  const message = typeof body.body === 'string' ? body.body.trim().slice(0, 2000) : '';
  if (!message) return NextResponse.json({ error: 'body is required' }, { status: 400 });

  const { data: task, error: taskError } = await supabase
    .from('service_tasks')
    .select('id, owner_id, service_title, assigned_department_key, assigned_staff_user_id')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('service_task_messages')
    .insert({
      task_id: task.id,
      owner_id: user.id,
      actor_id: user.id,
      actor_type: 'citizen',
      visibility: 'public',
      message_type: 'note',
      body: message,
      metadata: { source: 'citizen_case_reply' },
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTable(error.message, 'service_task_messages')) {
      return NextResponse.json({ error: 'Service task messaging requires the latest migration' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await insertTaskEventBestEffort(supabase, {
    task_id: task.id,
    owner_id: user.id,
    event_type: 'citizen_message',
    note: `Citizen replied on ${task.service_title}`,
    meta: { message_preview: message.slice(0, 120) },
  });

  await notifyServiceTaskUsers(getSupabase(), {
    taskId: task.id,
    actorUserId: user.id,
    ownerId: user.id,
    departmentKey: task.assigned_department_key || null,
    assignedStaffUserId: task.assigned_staff_user_id || null,
    title: `Citizen replied on ${task.service_title}`,
    body: message.slice(0, 160),
    link: `/service-ops?task=${task.id}`,
    metadata: {
      service_task_id: task.id,
      service_slug: null,
      source: 'citizen_case_reply',
    },
    includeOwner: false,
    includeAssignedStaff: true,
    includeDepartmentMembers: !task.assigned_staff_user_id,
  });

  return NextResponse.json({ message: data });
}
