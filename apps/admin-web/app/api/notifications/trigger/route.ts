import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

/**
 * Internal API endpoint for triggering notifications when a promise status changes.
 * Requires admin auth (via Supabase session) or API secret in Authorization header.
 *
 * POST body: { promise_id: string, old_status: string, new_status: string }
 *
 * For now, this queries watchers and logs the event. Actual push sending
 * requires web-push library + VAPID private key which can be added later.
 */
export async function POST(request: NextRequest) {
  // Verify admin auth or API secret
  const apiSecret = process.env.NOTIFICATION_API_SECRET;

  let isAuthorized = false;

  if (bearerMatchesSecret(request, apiSecret)) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    // Fall back to checking Supabase admin session
    const { createSupabaseServerClient } = await import(
      '@/lib/supabase/server'
    );
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminClient = getSupabase();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    isAuthorized = true;
  }

  const { promise_id, old_status, new_status } = await request.json();

  if (!promise_id || !new_status) {
    return NextResponse.json(
      { error: 'Missing promise_id or new_status' },
      { status: 400 }
    );
  }

  const adminClient = getSupabase();

  // Find all users who have push subscriptions and watch this promise's province
  // For now, just get all active push subscriptions as a starting point
  const { data: subscriptions, error: subError } = await adminClient
    .from('push_subscriptions')
    .select('id, user_id, endpoint');

  if (subError) {
    console.error('Failed to query push subscriptions:', subError);
    return NextResponse.json(
      { error: 'Failed to query subscriptions' },
      { status: 500 }
    );
  }

  // Log the trigger event (actual push sending will be implemented
  // when web-push library and VAPID private key are configured)
  console.log(
    `[notifications/trigger] Promise ${promise_id} status changed: ${old_status ?? 'unknown'} → ${new_status}. ` +
      `${subscriptions?.length ?? 0} push subscriptions found.`
  );

  return NextResponse.json({
    success: true,
    promise_id,
    old_status: old_status ?? null,
    new_status,
    subscribers_notified: subscriptions?.length ?? 0,
    note: 'Push delivery not yet implemented — subscriptions logged only.',
  });
}
