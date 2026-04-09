import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Cron-callable endpoint: sends push notifications for applications
 * with reminder_on dates that are today or overdue.
 * Called by Vercel cron every 6 hours.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'no_db' }, { status: 500 });

    const today = new Date().toISOString().slice(0, 10);

    // Find applications needing reminders
    const { data: apps, error: appErr } = await supabase
      .from('user_applications')
      .select('id, owner_id, service_title, service_slug, reminder_on, status, office_name')
      .lte('reminder_on', today)
      .eq('reminder_sent', false)
      .not('status', 'in', '("completed","cancelled","rejected")')
      .limit(100);

    if (appErr || !apps?.length) {
      return NextResponse.json({ sent: 0, error: appErr?.message });
    }

    // Get push subscriptions for those users
    const ownerIds = [...new Set(apps.map((a) => a.owner_id))];
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('owner_id, subscription')
      .in('owner_id', ownerIds);

    if (!subs?.length) {
      return NextResponse.json({ sent: 0, reason: 'no_push_subs' });
    }

    const subMap = new Map<string, any[]>();
    for (const s of subs) {
      const arr = subMap.get(s.owner_id) || [];
      arr.push(s.subscription);
      subMap.set(s.owner_id, arr);
    }

    let sent = 0;
    const webpush = await import('web-push');
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ sent: 0, reason: 'no_vapid_keys' });
    }

    webpush.setVapidDetails(
      'mailto:hello@nepalrepublic.org',
      vapidPublic,
      vapidPrivate
    );

    for (const app of apps) {
      const userSubs = subMap.get(app.owner_id);
      if (!userSubs) continue;

      const payload = JSON.stringify({
        title: `Reminder: ${app.service_title}`,
        body: app.office_name
          ? `Follow up at ${app.office_name} — your reminder date has arrived.`
          : `Your reminder date for ${app.service_title} has arrived. Check status or visit the office.`,
        icon: '/icon-192.png',
        url: '/me/applications',
      });

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(sub, payload);
          sent++;
        } catch (e: any) {
          // Remove invalid subscriptions (410 Gone)
          if (e.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .match({ owner_id: app.owner_id, subscription: sub });
          }
        }
      }

      // Mark reminder as sent
      await supabase
        .from('user_applications')
        .update({ reminder_sent: true })
        .eq('id', app.id);
    }

    return NextResponse.json({ sent, checked: apps.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
