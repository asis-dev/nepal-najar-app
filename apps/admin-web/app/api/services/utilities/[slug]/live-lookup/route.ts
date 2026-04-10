import { NextRequest, NextResponse } from 'next/server';
import { performLiveUtilityLookup } from '@/lib/integrations/utilities/live-lookup';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await performLiveUtilityLookup(params.slug, {
    customerId: typeof body.customerId === 'string' ? body.customerId : '',
    serviceOffice: typeof body.serviceOffice === 'string' ? body.serviceOffice : '',
    branch: typeof body.branch === 'string' ? body.branch : '',
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
