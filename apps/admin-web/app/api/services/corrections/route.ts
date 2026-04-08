import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 15;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const VALID_FIELDS = new Set([
  'title',
  'summary',
  'documents',
  'fees',
  'steps',
  'offices',
  'contact',
  'officialUrl',
  'general',
  'other',
]);

// Simple in-memory per-IP rate limit (best-effort only; resets on cold start)
const BUCKET = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX = 5;

function rateLimit(ip: string) {
  const now = Date.now();
  const arr = (BUCKET.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX) return false;
  arr.push(now);
  BUCKET.set(ip, arr);
  return true;
}

function hashIp(ip: string) {
  return crypto.createHash('sha256').update(ip + ':np-corrections').digest('hex').slice(0, 32);
}

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
    const { serviceSlug, field, message, suggestedValue, contactEmail } = body || {};

    if (!serviceSlug || typeof serviceSlug !== 'string' || serviceSlug.length > 200) {
      return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
    }
    if (!field || !VALID_FIELDS.has(field)) {
      return NextResponse.json({ error: 'invalid_field' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.length < 5 || message.length > 2000) {
      return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const supabase = createClient(SUPA_URL, KEY, { auth: { persistSession: false } });
    const { error } = await supabase.from('service_corrections').insert({
      service_slug: serviceSlug,
      field,
      message: message.trim(),
      suggested_value: suggestedValue?.toString().slice(0, 2000) ?? null,
      contact_email: contactEmail || null,
      ip_hash: hashIp(ip),
      user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    });

    if (error) {
      console.error('corrections insert error', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'bad_request', detail: e?.message }, { status: 400 });
  }
}
