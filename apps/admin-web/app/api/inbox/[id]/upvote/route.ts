import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const BUCKET = new Map<string, number[]>();
function rateLimit(ip: string) {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 20) return false;
  arr.push(now);
  BUCKET.set(ip, arr);
  return true;
}

function hashIp(ip: string) {
  return crypto.createHash('sha256').update(ip + ':np-inbox').digest('hex').slice(0, 32);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (!rateLimit(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

    const supabase = getSupabase();
    const { error } = await supabase
      .from('party_action_votes')
      .insert({ item_id: params.id, ip_hash: hashIp(ip) });
    if (error && !String(error.message).includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}
