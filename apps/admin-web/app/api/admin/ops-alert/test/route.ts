import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/auth/admin';
import { sendOpsAlert } from '@/lib/intelligence/ops-alerts';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : 'Manual ops alert test';
  const message =
    typeof body.message === 'string' && body.message.trim()
      ? body.message.trim()
      : 'This is a manual production-readiness test alert from NepalRepublic.';

  await sendOpsAlert({
    severity: 'info',
    source: 'ops',
    title,
    message,
    details: {
      manual: true,
      route: '/api/admin/ops-alert/test',
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true, delivered: true });
}
