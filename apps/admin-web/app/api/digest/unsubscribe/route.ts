import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new globalThis.URL(req.url);
  const token = url.searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('digest_subscriptions')
      .update({ confirmed: false })
      .eq('unsub_token', token);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new Response(
      '<html><body style="font-family:system-ui;padding:40px;background:#0a0a0a;color:#fff"><h1>Unsubscribed</h1><p>You will no longer receive the Nepal Republic weekly digest.</p></body></html>',
      { headers: { 'content-type': 'text/html' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
