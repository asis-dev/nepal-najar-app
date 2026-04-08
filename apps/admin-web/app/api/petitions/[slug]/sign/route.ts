import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const BUCKET = new Map<string, number[]>();
function rateLimit(ip: string) {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 10) return false;
  arr.push(now);
  BUCKET.set(ip, arr);
  return true;
}
function hashIp(ip: string) {
  return crypto.createHash('sha256').update(ip + ':np-petition-sig').digest('hex').slice(0, 32);
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (!rateLimit(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

    const { displayName, email, comment } = (await req.json().catch(() => ({}))) || {};
    if (comment && typeof comment === 'string' && comment.length > 500) {
      return NextResponse.json({ error: 'comment_too_long' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: pet } = await supabase
      .from('petitions')
      .select('id,signature_count,goal')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single();
    if (!pet) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { error } = await supabase.from('petition_signatures').insert({
      petition_id: pet.id,
      ip_hash: hashIp(ip),
      display_name: displayName?.toString().slice(0, 100) || null,
      email: email || null,
      comment: comment?.toString().slice(0, 500) || null,
    });
    if (error) {
      if (String(error.message).includes('duplicate')) {
        return NextResponse.json({ error: 'already_signed' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: (pet.signature_count || 0) + 1, goal: pet.goal });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}
