import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { getCaseTimeline, getCaseSummary } from '@/lib/services/case-operations';

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = await params;

  try {
    const timeline = await getCaseTimeline(supabase, taskId);
    const serviceTitle = request.nextUrl.searchParams.get('title') || 'Service';
    const summary = getCaseSummary(timeline, serviceTitle);

    return NextResponse.json({ timeline, summary });
  } catch (err) {
    console.error('[status GET] error:', err);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
