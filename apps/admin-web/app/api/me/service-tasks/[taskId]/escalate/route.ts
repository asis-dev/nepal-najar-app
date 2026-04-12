import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { checkAndEscalate } from '@/lib/services/case-operations';

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = await params;

  let body: { serviceSlug: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await checkAndEscalate(supabase, taskId, body.serviceSlug);
    return NextResponse.json({ escalation: result });
  } catch (err) {
    console.error('[escalate] error:', err);
    return NextResponse.json({ error: 'Escalation failed' }, { status: 500 });
  }
}
