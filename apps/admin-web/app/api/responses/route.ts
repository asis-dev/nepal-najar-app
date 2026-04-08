import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
const BUCKET = new Map<string, number[]>();
function rateLimit(ip: string) {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 3) return false;
  arr.push(now);
  BUCKET.set(ip, arr);
  return true;
}
function hashIp(ip: string) {
  return crypto.createHash('sha256').update(ip + ':np-resp').digest('hex').slice(0, 32);
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!rateLimit(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    const b = await req.json();
    const { itemId, commitmentId, authorName, authorRole, body, sourceUrl } = b || {};
    if (!authorName || !body || body.length < 20 || body.length > 5000) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    if (!itemId && !commitmentId) {
      return NextResponse.json({ error: 'missing_target' }, { status: 400 });
    }
    const supabase = getSupabase();
    const { error } = await supabase.from('minister_responses').insert({
      item_id: itemId || null,
      commitment_id: commitmentId ? String(commitmentId) : null,
      author_name: authorName.slice(0, 100),
      author_role: authorRole?.slice(0, 100) || null,
      body: body.trim(),
      source_url: sourceUrl?.slice(0, 500) || null,
      verified: false,
      submitted_ip_hash: hashIp(ip),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const url = new globalThis.URL(req.url);
  const cid = url.searchParams.get('commitment_id');
  const iid = url.searchParams.get('item_id');
  const supabase = getSupabase();
  let q = supabase
    .from('minister_responses')
    .select('*')
    .order('posted_at', { ascending: false })
    .limit(50);
  if (cid) q = q.eq('commitment_id', cid);
  if (iid) q = q.eq('item_id', iid);
  const { data, error } = await q;
  if (error) return NextResponse.json({ responses: [], error: error.message });
  return NextResponse.json({ responses: data || [] });
}
