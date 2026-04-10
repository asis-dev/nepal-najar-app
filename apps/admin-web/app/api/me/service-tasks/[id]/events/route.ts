import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listTaskEventsBestEffort } from '@/lib/services/task-store';

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { supabase, user } = await getAuthedContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: task, error: taskError } = await supabase
    .from('service_tasks')
    .select('id')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  let data;
  try {
    data = await listTaskEventsBestEffort(supabase, params.id);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    events: (data || []).map((row: any) => ({
      id: row.id,
      taskId: row.task_id,
      eventType: row.event_type,
      note: row.note || '',
      meta: row.meta || {},
      createdAt: row.created_at,
    })),
  });
}
