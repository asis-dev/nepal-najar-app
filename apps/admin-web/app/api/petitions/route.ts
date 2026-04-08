import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const BUCKET = new Map<string, number[]>();
function rateLimit(ip: string, max = 3) {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= max) return false;
  arr.push(now);
  BUCKET.set(ip, arr);
  return true;
}
function hashIp(ip: string) {
  return crypto.createHash('sha256').update(ip + ':np-petition').digest('hex').slice(0, 32);
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);
}

export async function GET(req: Request) {
  try {
    const url = new globalThis.URL(req.url);
    const targetSlug = url.searchParams.get('target_slug');
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);
    const supabase = getSupabase();
    let q = supabase
      .from('petitions')
      .select('*')
      .eq('status', 'published')
      .order('signature_count', { ascending: false })
      .limit(limit);
    if (targetSlug) q = q.eq('target_slug', targetSlug);
    const { data, error } = await q;
    if (error) return NextResponse.json({ petitions: [], error: error.message });
    return NextResponse.json({ petitions: data || [] });
  } catch (e: any) {
    return NextResponse.json({ petitions: [], error: e?.message });
  }
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (!rateLimit(ip, 2)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

    const body = await req.json();
    const { title, summary, body: petBody, targetName, targetSlug, goal, creatorEmail } = body || {};

    if (!title || typeof title !== 'string' || title.length < 10 || title.length > 200) {
      return NextResponse.json({ error: 'invalid_title' }, { status: 400 });
    }
    if (!summary || typeof summary !== 'string' || summary.length < 20 || summary.length > 500) {
      return NextResponse.json({ error: 'invalid_summary' }, { status: 400 });
    }
    if (petBody && typeof petBody === 'string' && petBody.length > 5000) {
      return NextResponse.json({ error: 'body_too_long' }, { status: 400 });
    }

    const base = slugify(title);
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('petitions')
      .insert({
        slug,
        title: title.trim(),
        summary: summary.trim(),
        body: petBody?.trim() || null,
        target_name: targetName?.trim() || null,
        target_slug: targetSlug ? slugify(targetSlug) : null,
        goal: Math.max(100, Math.min(1_000_000, Number(goal) || 1000)),
        creator_ip_hash: hashIp(ip),
        creator_email: creatorEmail || null,
        status: 'published',
      })
      .select('slug')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, slug: data?.slug });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}
