import { NextRequest, NextResponse } from 'next/server';
import { isPilotEventName } from '@/lib/analytics/events';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (value == null) return null;

  if (typeof value === 'string') {
    return value.slice(0, 500);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value) && depth < 1) {
    return value
      .slice(0, 12)
      .map((entry) => sanitizeMetadataValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  if (typeof value === 'object' && depth < 1) {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 12);
    const next: Record<string, unknown> = {};
    for (const [key, entry] of entries) {
      const cleaned = sanitizeMetadataValue(entry, depth + 1);
      if (cleaned !== undefined) {
        next[key.slice(0, 60)] = cleaned;
      }
    }
    return next;
  }

  return undefined;
}

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
    const cleaned = sanitizeMetadataValue(entry);
    if (cleaned !== undefined) {
      next[key.slice(0, 60)] = cleaned;
    }
  }
  return next;
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ saved: false }, { status: 202 });
  }

  let body: {
    eventName?: unknown;
    pagePath?: unknown;
    metadata?: unknown;
    visitorId?: unknown;
    sessionId?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventName = body.eventName;
  if (!isPilotEventName(eventName)) {
    return NextResponse.json({ error: 'Invalid event name' }, { status: 400 });
  }

  const visitorId = cleanString(body.visitorId, 120);
  const sessionId = cleanString(body.sessionId, 120);
  if (!visitorId || !sessionId) {
    return NextResponse.json({ error: 'visitorId and sessionId are required' }, { status: 400 });
  }

  const pagePath = cleanString(body.pagePath, 255);
  const metadata = sanitizeMetadata(body.metadata);

  let userId: string | null = null;
  try {
    const supabaseUser = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const db = getSupabase();
  const { error } = await db.from('pilot_events').insert({
    event_name: eventName,
    page_path: pagePath,
    visitor_id: visitorId,
    session_id: sessionId,
    user_id: userId,
    metadata,
    user_agent: cleanString(req.headers.get('user-agent'), 500),
    referrer: cleanString(req.headers.get('referer'), 500),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true }, { status: 201 });
}

