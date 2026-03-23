/**
 * /api/watchlist — Server-persisted watchlist for authenticated users
 *
 * GET    → returns { promise_ids: string[] }
 * POST   { promise_id }  → add a promise to watchlist
 * DELETE { promise_id }  → remove a promise from watchlist
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Helper: get the authenticated user or return a 401 response */
async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_watchlist')
    .select('promise_id')
    .eq('user_id', user.id)
    .order('added_at', { ascending: true });

  if (error) {
    // Table may not exist yet
    if (error.code === '42P01') {
      return NextResponse.json({ promise_ids: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const promise_ids = (data ?? []).map((row) => row.promise_id);
  return NextResponse.json({ promise_ids });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { promise_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { promise_id } = body;
  if (!promise_id || typeof promise_id !== 'string') {
    return NextResponse.json({ error: 'promise_id is required' }, { status: 400 });
  }

  const { error } = await supabase.from('user_watchlist').upsert(
    {
      user_id: user.id,
      promise_id,
    },
    { onConflict: 'user_id,promise_id' },
  );

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Watchlist table not yet created', saved: false });
    }
    return NextResponse.json({ error: error.message, saved: false }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { promise_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { promise_id } = body;
  if (!promise_id || typeof promise_id !== 'string') {
    return NextResponse.json({ error: 'promise_id is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('promise_id', promise_id);

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Watchlist table not yet created', removed: false });
    }
    return NextResponse.json({ error: error.message, removed: false }, { status: 500 });
  }

  return NextResponse.json({ removed: true });
}
