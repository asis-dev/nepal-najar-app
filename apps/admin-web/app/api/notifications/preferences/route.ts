import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabase();

  const { data, error } = await adminClient
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row found — return defaults
    return NextResponse.json({
      email_alerts: false,
      push_enabled: false,
      digest_frequency: 'none',
      watched_provinces: [],
    });
  }

  if (error) {
    console.error('Failed to fetch notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    email_alerts: data.email_alerts,
    push_enabled: data.push_enabled,
    digest_frequency: data.digest_frequency,
    watched_provinces: data.watched_provinces ?? [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.email_alerts === 'boolean') {
    updates.email_alerts = body.email_alerts;
  }
  if (typeof body.push_enabled === 'boolean') {
    updates.push_enabled = body.push_enabled;
  }
  if (
    typeof body.digest_frequency === 'string' &&
    ['none', 'weekly', 'monthly'].includes(body.digest_frequency)
  ) {
    updates.digest_frequency = body.digest_frequency;
  }
  if (Array.isArray(body.watched_provinces)) {
    updates.watched_provinces = body.watched_provinces;
  }

  const adminClient = getSupabase();

  const { error } = await adminClient
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        ...updates,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Failed to update notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
