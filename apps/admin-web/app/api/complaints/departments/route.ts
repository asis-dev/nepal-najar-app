import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export async function GET() {
  const db = getSupabase();
  const { data, error } = await db
    .from('complaint_departments')
    .select('key, name, name_ne, description, level, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ departments: data || [] });
}
