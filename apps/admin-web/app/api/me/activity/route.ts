import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listUserActivityBestEffort } from '@/lib/activity/activity-log';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await listUserActivityBestEffort(supabase, user.id, 100);
    return NextResponse.json({
      events: rows.map((row: any) => ({
        id: row.id,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: row.entity_id || null,
        title: row.title,
        summary: row.summary || '',
        meta: row.meta || {},
        createdAt: row.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
