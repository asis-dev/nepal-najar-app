import { NextResponse } from 'next/server';
import { getUtilityLookupPlan } from '@/lib/integrations/utilities/adapter';

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const plan = getUtilityLookupPlan(params.slug);
  if (!plan) {
    return NextResponse.json({ error: 'Utility lookup not supported for this service' }, { status: 404 });
  }

  return NextResponse.json({ plan });
}
