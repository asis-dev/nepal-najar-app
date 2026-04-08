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
  return crypto.createHash('sha256').update(ip + ':np-dispute').digest('hex').slice(0, 32);
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!rateLimit(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    const b = await req.json();
    const {
      commitmentId,
      disputeType,
      currentValue,
      proposedValue,
      rationale,
      evidenceUrl,
      claimantName,
      claimantRole,
    } = b || {};
    if (!commitmentId || !rationale || rationale.length < 20 || rationale.length > 2000) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    const supabase = getSupabase();
    const { error } = await supabase.from('commitment_disputes').insert({
      commitment_id: String(commitmentId),
      dispute_type: ['status', 'progress', 'evidence', 'other'].includes(disputeType)
        ? disputeType
        : 'other',
      current_value: currentValue?.slice(0, 200) || null,
      proposed_value: proposedValue?.slice(0, 200) || null,
      rationale: rationale.trim(),
      evidence_url: evidenceUrl?.slice(0, 500) || null,
      claimant_name: claimantName?.slice(0, 100) || null,
      claimant_role: claimantRole?.slice(0, 50) || null,
      ip_hash: hashIp(ip),
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
  const supabase = getSupabase();
  let q = supabase
    .from('commitment_disputes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (cid) q = q.eq('commitment_id', cid);
  const { data, error } = await q;
  if (error) return NextResponse.json({ disputes: [], error: error.message });
  return NextResponse.json({ disputes: data || [] });
}
