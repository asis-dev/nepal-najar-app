import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = request.nextUrl;

  const part = searchParams.get('part');
  const search = searchParams.get('search');
  const article = searchParams.get('article');
  const promiseId = searchParams.get('promise_id');
  const tag = searchParams.get('tag');
  const amendedOnly = searchParams.get('amended') === 'true';

  // Single article lookup
  if (article) {
    const { data, error } = await supabase
      .from('constitution_articles')
      .select('*')
      .eq('article_number', Number(article))
      .eq('amendment_status', 'current')
      .single();

    if (error) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(data);
  }

  // Build query
  let query = supabase
    .from('constitution_articles')
    .select('id, part_number, part_title, part_title_ne, article_number, article_title, article_title_ne, tags, linked_promise_ids, is_amended, amendment_status, version')
    .eq('amendment_status', 'current')
    .order('article_number', { ascending: true });

  if (part) {
    query = query.eq('part_number', Number(part));
  }

  if (search) {
    query = query.or(`article_title.ilike.%${search}%,body_en.ilike.%${search}%`);
  }

  if (promiseId) {
    query = query.contains('linked_promise_ids', [Number(promiseId)]);
  }

  if (tag) {
    query = query.contains('tags', [tag]);
  }

  if (amendedOnly) {
    query = query.eq('is_amended', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data || [], {
    headers: { 'Cache-Control': 'public, max-age=600' },
  });
}
