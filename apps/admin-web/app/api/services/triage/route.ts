import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { triageRequest } from '@/lib/services/triage';

export async function POST(request: NextRequest) {
  const { user } = await getRequestUser(request);
  // Allow unauthenticated triage (public endpoint) but pass userId if available

  let body: { message?: string; locale?: 'en' | 'ne' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    const result = await triageRequest({
      userMessage: body.message.trim(),
      locale: body.locale || 'en',
      userId: user?.id,
    });
    return NextResponse.json({ triage: result });
  } catch (err) {
    console.error('[triage] error:', err);
    return NextResponse.json({ error: 'Triage failed' }, { status: 500 });
  }
}
