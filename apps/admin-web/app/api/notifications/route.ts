/**
 * /api/notifications — User notifications
 *
 * GET   → list user's notifications (auth required), paginated, with unread count
 * PATCH { id?, mark_all_read? }  → mark one or all as read (auth required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10);
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10);

  const db = getSupabase();

  // Get notifications
  const { data: notifications, error } = await db
    .from('user_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unread count
  const { count: unreadCount } = await db
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return NextResponse.json({
    notifications: notifications ?? [],
    unread_count: unreadCount ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { id?: string; mark_all_read?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const db = getSupabase();

  if (body.mark_all_read) {
    // Mark all as read
    const { error } = await db
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    // Mark single as read
    const { error } = await db
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Provide id or mark_all_read' }, { status: 400 });
}
