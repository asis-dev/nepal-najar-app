import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ drafts: [] }, { status: 401 });
  const url = new globalThis.URL(req.url);
  const slug = url.searchParams.get('service_slug');
  let q = supabase.from('service_form_drafts').select('*').eq('owner_id', user.id);
  if (slug) q = q.eq('service_slug', slug);
  const { data } = await q.order('updated_at', { ascending: false });
  return NextResponse.json({ drafts: data || [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const { serviceSlug, formKey, data, locale, submitted } = await req.json();
    if (!serviceSlug || !formKey) return NextResponse.json({ error: 'missing' }, { status: 400 });
    const row = {
      owner_id: user.id,
      service_slug: serviceSlug,
      form_key: formKey,
      data: data || {},
      locale: locale || 'ne',
      submitted: !!submitted,
      submitted_at: submitted ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from('service_form_drafts')
      .upsert(row, { onConflict: 'owner_id,service_slug,form_key' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}
