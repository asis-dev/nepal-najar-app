/**
 * Smart multi-channel notification delivery for service task events.
 *
 * Determines which channels (in-app, email, push) to use based on:
 *   1. Event priority (high → all channels, low → in-app only)
 *   2. User preferences (email_alerts, push_enabled)
 *   3. Rate limiting (no more than 1 email per task per hour)
 *
 * Usage: called from notifyServiceTaskUsers() after in-app notification is created.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationPriority = 'high' | 'medium' | 'low';

export type NotificationChannel = 'in_app' | 'email' | 'push';

export type CaseNotificationEvent =
  | 'accepted'
  | 'assigned'
  | 'transferred'
  | 'requested_info'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'public_update'
  | 'task_created'
  | 'sla_warning'
  | 'sla_breach';

type ChannelConfig = {
  priority: NotificationPriority;
  channels: NotificationChannel[];
  /** If true, citizen gets notified. If false, only staff. */
  notifyCitizen: boolean;
  /** If true, assigned staff gets notified */
  notifyStaff: boolean;
};

// ---------------------------------------------------------------------------
// Channel routing rules — what goes where
// ---------------------------------------------------------------------------

const EVENT_CHANNEL_MAP: Record<CaseNotificationEvent, ChannelConfig> = {
  // HIGH — citizen should know immediately
  approved:       { priority: 'high',   channels: ['in_app', 'email', 'push'], notifyCitizen: true,  notifyStaff: false },
  rejected:       { priority: 'high',   channels: ['in_app', 'email', 'push'], notifyCitizen: true,  notifyStaff: false },
  resolved:       { priority: 'high',   channels: ['in_app', 'email', 'push'], notifyCitizen: true,  notifyStaff: false },
  requested_info: { priority: 'high',   channels: ['in_app', 'email', 'push'], notifyCitizen: true,  notifyStaff: false },
  sla_breach:     { priority: 'high',   channels: ['in_app', 'email', 'push'], notifyCitizen: true,  notifyStaff: true },

  // MEDIUM — citizen should know, but not urgent
  escalated:      { priority: 'medium', channels: ['in_app', 'push'],          notifyCitizen: true,  notifyStaff: true },
  closed:         { priority: 'medium', channels: ['in_app', 'email'],         notifyCitizen: true,  notifyStaff: false },
  public_update:  { priority: 'medium', channels: ['in_app', 'push'],          notifyCitizen: true,  notifyStaff: false },
  sla_warning:    { priority: 'medium', channels: ['in_app', 'push'],          notifyCitizen: true,  notifyStaff: true },
  task_created:   { priority: 'medium', channels: ['in_app', 'email'],         notifyCitizen: true,  notifyStaff: false },

  // LOW — internal ops, citizen doesn't need to know
  accepted:       { priority: 'low',    channels: ['in_app'],                  notifyCitizen: false, notifyStaff: true },
  assigned:       { priority: 'low',    channels: ['in_app'],                  notifyCitizen: false, notifyStaff: true },
  transferred:    { priority: 'low',    channels: ['in_app'],                  notifyCitizen: false, notifyStaff: true },
};

export function getChannelConfig(event: string): ChannelConfig {
  return EVENT_CHANNEL_MAP[event as CaseNotificationEvent] || {
    priority: 'low',
    channels: ['in_app'],
    notifyCitizen: false,
    notifyStaff: false,
  };
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

type UserNotifPrefs = {
  email_alerts: boolean;
  push_enabled: boolean;
};

async function getUserNotifPrefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserNotifPrefs> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('email_alerts, push_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    email_alerts: data?.email_alerts ?? false,
    push_enabled: data?.push_enabled ?? false,
  };
}

// ---------------------------------------------------------------------------
// Rate limiting — max 1 email per task per hour
// ---------------------------------------------------------------------------

async function wasEmailSentRecently(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  withinMinutes: number = 60,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinMinutes * 60_000).toISOString();

  const { count } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('metadata->>service_task_id', taskId)
    .eq('metadata->>email_sent', 'true')
    .gte('created_at', cutoff);

  return (count || 0) > 0;
}

// ---------------------------------------------------------------------------
// Push notification — send to specific user
// ---------------------------------------------------------------------------

async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; failed: number }> {
  let webpush: typeof import('web-push');
  try {
    webpush = await import('web-push');
  } catch {
    return { sent: 0, failed: 0 };
  }

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { sent: 0, failed: 0 };

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@nepalrepublic.org',
    pub,
    priv,
  );

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .lt('failed_count', 5);

  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key || s.auth } },
        JSON.stringify({ title: payload.title, body: payload.body, url: payload.url }),
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

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Email — citizen case update
// ---------------------------------------------------------------------------

function buildCaseUpdateEmailHtml(opts: {
  title: string;
  body: string;
  caseRef: string;
  serviceTitle: string;
  departmentName: string;
  action: string;
  link: string;
  siteUrl: string;
}): string {
  const { title, body, caseRef, serviceTitle, departmentName, action, link, siteUrl } = opts;

  const actionColor =
    action === 'approved' || action === 'resolved' ? '#28a745'
    : action === 'rejected' ? '#dc3545'
    : action === 'requested_info' ? '#ffc107'
    : action === 'escalated' ? '#fd7e14'
    : '#003893';

  const actionLabel =
    action === 'approved' ? 'Approved ✓'
    : action === 'rejected' ? 'Not Approved'
    : action === 'resolved' ? 'Resolved ✓'
    : action === 'closed' ? 'Closed'
    : action === 'requested_info' ? 'Information Requested'
    : action === 'escalated' ? 'Escalated'
    : action === 'public_update' ? 'Update'
    : action === 'task_created' ? 'Submitted'
    : 'Update';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#DC143C 0%,#003893 100%);padding:20px 28px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Nepal Republic</h1>
  <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:12px;">Case Update Notification</p>
</td>
</tr>

<!-- Status badge -->
<tr>
<td style="padding:24px 28px 0;text-align:center;">
  <span style="display:inline-block;padding:6px 18px;background:${actionColor}15;color:${actionColor};border:1px solid ${actionColor}30;border-radius:20px;font-size:13px;font-weight:600;">
    ${actionLabel}
  </span>
</td>
</tr>

<!-- Case ref -->
<tr>
<td style="padding:16px 28px 0;text-align:center;">
  <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Case</p>
  <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#003893;">NR-${caseRef}</p>
</td>
</tr>

<!-- Title -->
<tr>
<td style="padding:16px 28px 4px;">
  <h2 style="margin:0;font-size:16px;color:#1a1a2e;">${title}</h2>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:4px 28px 16px;">
  <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">${body}</p>
</td>
</tr>

<!-- Details -->
<tr>
<td style="padding:0 28px 20px;">
  <div style="background:#f8f9fa;border-radius:6px;padding:12px 16px;font-size:13px;color:#666;">
    <strong>Service:</strong> ${serviceTitle}<br/>
    <strong>Department:</strong> ${departmentName}
  </div>
</td>
</tr>

<!-- CTA -->
<tr>
<td style="padding:0 28px 24px;text-align:center;">
  <a href="${siteUrl}${link}" style="display:inline-block;padding:12px 28px;background:#003893;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
    View Case Details
  </a>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background:#1a1a2e;padding:16px 28px;text-align:center;">
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);">
    <a href="${siteUrl}" style="color:rgba(255,255,255,0.7);text-decoration:none;">nepalrepublic.org</a>
  </p>
  <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">
    You're receiving this because you have a case on Nepal Republic.
    <a href="${siteUrl}/me/settings" style="color:rgba(255,255,255,0.5);text-decoration:underline;">Unsubscribe</a>
  </p>
</td>
</tr>

</table>
</td></tr></table>
</body>
</html>`;
}

function buildCaseUpdatePlainText(opts: {
  title: string;
  body: string;
  caseRef: string;
  serviceTitle: string;
  departmentName: string;
  link: string;
  siteUrl: string;
}): string {
  return [
    `NEPAL REPUBLIC — Case Update`,
    ``,
    `Case: NR-${opts.caseRef}`,
    `Service: ${opts.serviceTitle}`,
    `Department: ${opts.departmentName}`,
    ``,
    opts.title,
    opts.body,
    ``,
    `View details: ${opts.siteUrl}${opts.link}`,
    ``,
    `---`,
    `nepalrepublic.org`,
  ].join('\n');
}

async function sendCitizenEmail(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    title: string;
    body: string;
    caseRef: string;
    serviceTitle: string;
    departmentName: string;
    action: string;
    link: string;
  },
): Promise<boolean> {
  // Get user email from auth
  const { data: user } = await supabase.auth.admin.getUserById(opts.userId);
  const email = user?.user?.email;
  if (!email) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalrepublic.org';

  const html = buildCaseUpdateEmailHtml({ ...opts, siteUrl });
  const text = buildCaseUpdatePlainText({ ...opts, siteUrl });
  const subject = `[Nepal Republic] ${opts.title}`;

  // Use Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[notify-channels] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Nepal Republic <noreply@nepalrepublic.org>',
        to: [email],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn('[notify-channels] email send failed:', body);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[notify-channels] email error:', err instanceof Error ? err.message : err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main multi-channel dispatcher
// ---------------------------------------------------------------------------

export type MultiChannelNotifyInput = {
  taskId: string;
  recipientUserIds: string[];
  title: string;
  body: string;
  link?: string;
  action: string;
  serviceTitle?: string;
  departmentName?: string;
  metadata?: Record<string, unknown>;
};

export type MultiChannelResult = {
  emailsSent: number;
  pushesSent: number;
  skippedEmail: number;
  skippedPush: number;
};

/**
 * Sends email + push notifications to specific users based on event type
 * and user preferences. Called AFTER in-app notifications are already created.
 */
export async function dispatchMultiChannel(
  supabase: SupabaseClient,
  input: MultiChannelNotifyInput,
): Promise<MultiChannelResult> {
  const config = getChannelConfig(input.action);
  const result: MultiChannelResult = {
    emailsSent: 0,
    pushesSent: 0,
    skippedEmail: 0,
    skippedPush: 0,
  };

  // If only in-app, nothing more to do
  if (config.channels.length === 1 && config.channels[0] === 'in_app') {
    return result;
  }

  const shouldEmail = config.channels.includes('email');
  const shouldPush = config.channels.includes('push');
  const caseRef = input.taskId.slice(0, 8).toUpperCase();

  for (const userId of input.recipientUserIds) {
    const prefs = await getUserNotifPrefs(supabase, userId);

    // Email
    if (shouldEmail && prefs.email_alerts) {
      const recentlySent = await wasEmailSentRecently(supabase, userId, input.taskId);
      if (recentlySent && config.priority !== 'high') {
        result.skippedEmail++;
      } else {
        const sent = await sendCitizenEmail(supabase, {
          userId,
          title: input.title,
          body: input.body || '',
          caseRef,
          serviceTitle: input.serviceTitle || 'Service Request',
          departmentName: input.departmentName || 'Government Department',
          action: input.action,
          link: input.link || '/me/cases',
        });
        if (sent) {
          result.emailsSent++;
          // Mark this notification as email-sent for rate limiting
          await supabase
            .from('user_notifications')
            .update({ metadata: { ...input.metadata, email_sent: 'true' } })
            .eq('user_id', userId)
            .eq('metadata->>service_task_id', input.taskId)
            .order('created_at', { ascending: false })
            .limit(1);
        } else {
          result.skippedEmail++;
        }
      }
    } else if (shouldEmail) {
      result.skippedEmail++;
    }

    // Push
    if (shouldPush && prefs.push_enabled) {
      const pushResult = await sendPushToUser(supabase, userId, {
        title: input.title,
        body: input.body || '',
        url: input.link || '/me/cases',
      });
      result.pushesSent += pushResult.sent;
      if (pushResult.sent === 0) result.skippedPush++;
    } else if (shouldPush) {
      result.skippedPush++;
    }
  }

  return result;
}
