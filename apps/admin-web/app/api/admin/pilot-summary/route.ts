import { NextRequest, NextResponse } from 'next/server';
import { enqueuePilotSummaryJob } from '@/lib/intelligence/jobs';
import { getLatestPilotSummary, summarizePilotTracker } from '@/lib/intelligence/pilot-summary';

function isAuthed(request: NextRequest): boolean {
  const adminCookie = request.cookies.get('admin_session')?.value;
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  return !!(
    (adminCookie && adminSecret && adminCookie === adminSecret) ||
    (authHeader && adminSecret && authHeader === `Bearer ${adminSecret}`)
  );
}

function parseDays(value: string | null | undefined, fallback = 14) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 90));
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const days = parseDays(request.nextUrl.searchParams.get('days'));
    const summary = await getLatestPilotSummary(days);
    return NextResponse.json({ success: true, summary });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to load pilot summary',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const days =
      typeof body.days === 'number'
        ? Math.max(1, Math.min(body.days, 90))
        : parseDays(undefined);

    if (action === 'queue') {
      const job = await enqueuePilotSummaryJob(days, 'admin');
      return NextResponse.json({ success: true, status: 'queued', job });
    }

    if (action === 'run') {
      const summary = await summarizePilotTracker(days, { trigger: 'admin' });
      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json(
      { error: 'Unsupported action' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to generate pilot summary',
      },
      { status: 500 },
    );
  }
}
