import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { getServiceOpsAuthContext } from '@/lib/service-ops/access';

export async function GET() {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = getSupabase();
  let query = db
    .from('service_departments')
    .select('key, name, name_ne, description, authority_level, default_queue_label, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (!ctx.isElevated && ctx.departmentsScope && ctx.departmentsScope.length > 0) {
    query = query.in('key', ctx.departmentsScope);
  }

  if (!ctx.isElevated && (!ctx.departmentsScope || ctx.departmentsScope.length === 0)) {
    return NextResponse.json({ departments: [] });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ departments: data || [] });
}
