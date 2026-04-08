import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '30', 10)));
  const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get('offset') || '0', 10));
  const db = getSupabase();

  const { data, error, count } = await db
    .from('complaint_authority_chain')
    .select(`
      complaint_id,
      ministry_slug,
      minister_slug,
      official_name,
      official_title,
      authority_name,
      authority_name_ne,
      confidence,
      civic_complaints!inner(
        id,
        title,
        title_ne,
        issue_type,
        status,
        municipality,
        ward_number,
        assigned_department_key,
        department_key,
        last_activity_at,
        is_public
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .eq('node_type', 'minister')
    .eq('minister_slug', slug)
    .eq('civic_complaints.is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const complaints = (data || []).map((row) => {
    const complaint = Array.isArray(row.civic_complaints) ? row.civic_complaints[0] : row.civic_complaints;
    return {
      ...(complaint || {}),
      authority_name: row.authority_name,
      authority_name_ne: row.authority_name_ne,
      ministry_slug: row.ministry_slug,
      minister_slug: row.minister_slug,
      minister_name: row.official_name,
      minister_title: row.official_title,
      routing_confidence: row.confidence,
    };
  }).filter((row) => Boolean(row.id));

  return NextResponse.json({
    complaints,
    total: count ?? complaints.length,
    limit,
    offset,
  });
}
