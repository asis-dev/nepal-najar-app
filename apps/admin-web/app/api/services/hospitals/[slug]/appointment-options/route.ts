import { NextResponse } from 'next/server';
import { getServiceBySlug } from '@/lib/services/catalog';
import { getHospitalAppointmentPlan } from '@/lib/integrations/hospitals/adapter';

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const service = await getServiceBySlug(params.slug);
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const plan = getHospitalAppointmentPlan(service);
  if (!plan) return NextResponse.json({ error: 'Not a hospital appointment service' }, { status: 400 });

  return NextResponse.json({ plan });
}
