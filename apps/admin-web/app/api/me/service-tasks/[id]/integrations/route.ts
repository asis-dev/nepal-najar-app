import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listTaskIntegrationsBestEffort } from '@/lib/integrations/payment-task-bridge';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: task } = await supabase
    .from('service_tasks')
    .select('id')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const integrations = await listTaskIntegrationsBestEffort(supabase, params.id);
  return NextResponse.json({ integrations });
}
