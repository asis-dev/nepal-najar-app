import webpush from 'web-push';
import { getSupabase } from '@/lib/supabase/server';

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@nepalrepublic.org';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

export async function sendPushToAll(payload: PushPayload) {
  if (!configure()) return { sent: 0, failed: 0, skipped: 'not_configured' };
  const supabase = getSupabase();
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .lt('failed_count', 5)
    .limit(5000);

  let sent = 0;
  let failed = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      sent++;
      await supabase
        .from('push_subscriptions')
        .update({ last_sent_at: new Date().toISOString(), failed_count: 0 })
        .eq('id', s.id);
    } catch (e: any) {
      failed++;
      const gone = e?.statusCode === 410 || e?.statusCode === 404;
      await supabase
        .from('push_subscriptions')
        .update({ failed_count: gone ? 99 : (s.failed_count || 0) + 1 })
        .eq('id', s.id);
    }
  }
  return { sent, failed, total: subs?.length || 0 };
}
