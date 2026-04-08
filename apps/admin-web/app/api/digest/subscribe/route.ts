import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const BUCKET = new Map<string, number[]>();
function rateLimit(ip: string) {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 5) return false;
  arr.push(now);
  BUCKET.set(ip, arr);
  return true;
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (!rateLimit(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

    const { email, locale } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    const supabase = getSupabase();
    const { error } = await supabase
      .from('digest_subscriptions')
      .upsert(
        { email: email.toLowerCase().trim(), locale: locale === 'ne' ? 'ne' : 'en', confirmed: true },
        { onConflict: 'email' }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}
