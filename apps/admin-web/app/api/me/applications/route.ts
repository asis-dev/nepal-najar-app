import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ applications: [] }, { status: 401 });
  const { data } = await supabase
    .from('user_applications')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });
  return NextResponse.json({ applications: data || [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
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
      ? supabase.from('user_applications').update(row).eq('id', body.id).eq('owner_id', user.id).select('id').single()
      : supabase.from('user_applications').insert(row).select('id').single();
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new globalThis.URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const { error } = await supabase.from('user_applications').delete().eq('id', id).eq('owner_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
