import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { getProfileCoverage } from '@/lib/services/profile-memory';

export async function GET(request: NextRequest) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceSlug = request.nextUrl.searchParams.get('service') || '';

  try {
    const coverage = await getProfileCoverage(supabase, user.id, serviceSlug);
    return NextResponse.json({ coverage });
  } catch (err) {
    console.error('[profile/coverage] error:', err);
    return NextResponse.json({ error: 'Failed to get coverage' }, { status: 500 });
  }
}
