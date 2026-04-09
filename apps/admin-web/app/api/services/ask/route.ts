import { NextRequest, NextResponse } from 'next/server';
import { ask } from '@/lib/services/ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Simple in-memory rate limit per IP (best-effort; resets per lambda cold-start).
const RATE: Map<string, { count: number; reset: number }> = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function rateKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  );
}

function checkRate(key: string): boolean {
  const now = Date.now();
  const e = RATE.get(key);
  if (!e || e.reset < now) {
    RATE.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (e.count >= RATE_LIMIT) return false;
  e.count++;
  return true;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const question = (body?.question || '').toString().slice(0, 500);
  const locale = body?.locale === 'ne' ? 'ne' : 'en';

  if (!question.trim()) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }

  if (!checkRate(rateKey(req))) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  try {
    const result = await ask(question, locale);
    return NextResponse.json({
      answer: result.answer,
      cached: result.cached,
      model: result.model,
      topServiceConfidence: result.topServiceConfidence,
      topService: result.topService
        ? {
            id: result.topService.id,
            slug: result.topService.slug,
            category: result.topService.category,
            title: result.topService.title,
            providerName: result.topService.providerName,
          }
        : null,
      cited: result.cited.map((s) => ({
        id: s.id,
        slug: s.slug,
        category: s.category,
        title: s.title,
        providerName: s.providerName,
      })),
    });
  } catch (err: any) {
    console.error('[api/services/ask]', err);
    return NextResponse.json({ error: 'internal', message: err?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'services-ask', runtime: 'nodejs' });
}
