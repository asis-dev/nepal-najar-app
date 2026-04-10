import { NextResponse } from 'next/server';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import { syncApplicationToServiceTaskBestEffort } from '@/lib/services/application-task-bridge';
import { getRequestUser } from '@/lib/auth/request-user';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ applications: [] }, { status: 401 });
  const { data } = await supabase
    .from('user_applications')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  for (const application of data || []) {
    await syncApplicationToServiceTaskBestEffort(supabase, application);
  }

  return NextResponse.json({ applications: data || [] });
}

export async function POST(req: Request) {
  const { supabase, user } = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const row: Record<string, any> = { owner_id: user.id };
    const fields = [
      'service_slug','service_title','service_category','reference_no','office_name','office_url','portal_url',
      'amount_npr','paid','paid_on','receipt_no','submitted_on','expected_on','completed_on',
      'status','last_status_note','reminder_on','notes',
    ];
    for (const k of fields) if (k in body) row[k] = body[k] === '' ? null : body[k];
    if (!row.service_slug || !row.service_title) {
      return NextResponse.json({ error: 'missing_service' }, { status: 400 });
    }
    const q = body.id
      ? supabase.from('user_applications').update(row).eq('id', body.id).eq('owner_id', user.id).select('*').single()
      : supabase.from('user_applications').insert(row).select('*').single();
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data) {
      await syncApplicationToServiceTaskBestEffort(supabase, data);
    }

    await recordUserActivityBestEffort(supabase, {
      owner_id: user.id,
      event_type: body.id ? 'application_updated' : 'application_created',
      entity_type: 'application',
      entity_id: data?.id ?? body.id ?? null,
      title: body.id ? `Updated ${row.service_title}` : `Created ${row.service_title}`,
      summary: row.status ? `Status: ${row.status}` : 'Service application saved',
      meta: {
        service_slug: row.service_slug,
        service_category: row.service_category ?? null,
        status: row.status ?? null,
      },
    });

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { supabase, user } = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new globalThis.URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const { data: existing } = await supabase
    .from('user_applications')
    .select('id, service_title, service_slug, service_category, status')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle();

  const { error } = await supabase.from('user_applications').delete().eq('id', id).eq('owner_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'application_deleted',
    entity_type: 'application',
    entity_id: id,
    title: existing?.service_title ? `Removed ${existing.service_title}` : 'Removed application',
    summary: existing?.status ? `Previous status: ${existing.status}` : 'Application deleted',
    meta: {
      service_slug: existing?.service_slug ?? null,
      service_category: existing?.service_category ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
