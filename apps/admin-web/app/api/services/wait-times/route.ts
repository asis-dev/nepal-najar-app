import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 15;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const BUCKET = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX = 8;

function rateLimit(ip: string) {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX) return false;
  arr.push(now);
  BUCKET.set(ip, arr);
  return true;
}

function hashIp(ip: string) {
  return crypto.createHash('sha256').update(ip + ':np-wait').digest('hex').slice(0, 32);
}

/**
 * GET /api/services/wait-times?slug=drivers-license-renewal
 * Returns aggregated stats per office for the service.
 */
export async function GET(req: Request) {
  try {
    const url = new globalThis.URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });

    const supabase = createClient(SUPA_URL, KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('service_wait_stats')
      .select('*')
      .eq('service_slug', slug);

    if (error) {
      console.error('wait-times GET error', error);
      return NextResponse.json({ stats: [] });
    }
    return NextResponse.json({ stats: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ stats: [], error: e?.message }, { status: 200 });
  }
}

/**
 * POST /api/services/wait-times
 * Body: { serviceSlug, officeName, officeIndex?, waitMinutes, visitedOn?, note?, success? }
 */
export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body = await req.json();
    const { serviceSlug, officeName, officeIndex, waitMinutes, visitedOn, note, success } = body || {};

    if (!serviceSlug || typeof serviceSlug !== 'string') {
      return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
    }
    if (!officeName || typeof officeName !== 'string' || officeName.length > 200) {
      return NextResponse.json({ error: 'invalid_office' }, { status: 400 });
    }
    const mins = Number(waitMinutes);
    if (!Number.isFinite(mins) || mins < 0 || mins > 1440) {
      return NextResponse.json({ error: 'invalid_minutes' }, { status: 400 });
    }
    if (note && typeof note === 'string' && note.length > 280) {
      return NextResponse.json({ error: 'note_too_long' }, { status: 400 });
    }

    const supabase = createClient(SUPA_URL, KEY, { auth: { persistSession: false } });
    const { error } = await supabase.from('service_wait_times').insert({
      service_slug: serviceSlug,
      office_name: officeName.trim().slice(0, 200),
      office_index: Number.isFinite(Number(officeIndex)) ? Number(officeIndex) : null,
      wait_minutes: Math.round(mins),
      visited_on: visitedOn || new Date().toISOString().slice(0, 10),
      note: note?.trim()?.slice(0, 280) ?? null,
      success: typeof success === 'boolean' ? success : null,
      ip_hash: hashIp(ip),
    });

    if (error) {
      console.error('wait-times POST error', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'bad_request', detail: e?.message }, { status: 400 });
  }
}
