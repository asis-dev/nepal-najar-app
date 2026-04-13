/**
 * Email Bridge — sends formatted bilingual citizen service requests
 * to responsible government offices via email.
 *
 * Uses Resend as primary email provider, falls back to nodemailer SMTP.
 * Every email sent is logged as a `service_task_events` record.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getGovEmailContact, type GovEmailContact } from './email-bridge-contacts';
import { insertTaskEventBestEffort } from '@/lib/services/task-store';
import {
  insertServiceTaskMessageBestEffort,
  notifyServiceTaskUsers,
} from '@/lib/service-ops/notifications';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceTaskRow = {
  id: string;
  owner_id: string;
  service_slug: string;
  service_title: string;
  service_category?: string;
  status: string;
  progress?: number;
  current_step?: number;
  total_steps?: number;
  summary?: string;
  next_action?: string;
  answers?: Record<string, unknown>;
  action_state?: Record<string, unknown>;
  notes?: string | null;
  locale?: string;
  assigned_department_key?: string;
  assigned_department_name?: string;
  assigned_office_name?: string;
  assigned_role_title?: string;
  missing_docs?: string[];
  ready_docs?: string[];
  created_at?: string;
};

export type EmailBridgeResult = {
  sent: boolean;
  sentTo: string | null;
  replyToken: string | null;
  error?: string;
  messageId?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortCaseId(taskId: string): string {
  return taskId.slice(0, 8).toUpperCase();
}

function formatSla(hours: number): string {
  if (hours < 24) return `${hours} hours`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
}

function formatSlaNe(hours: number): string {
  if (hours < 24) return `${hours} घण्टा`;
  const days = Math.round(hours / 24);
  return `${days} दिन`;
}

function formatAnswersTable(answers: Record<string, unknown>): string {
  const rows = Object.entries(answers)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'unknown')
    .map(([key, value]) => {
      const label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const displayValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `<tr><td style="padding:6px 12px;border:1px solid #dee2e6;font-weight:500;background:#f8f9fa;white-space:nowrap;">${label}</td><td style="padding:6px 12px;border:1px solid #dee2e6;">${displayValue}</td></tr>`;
    });

  if (rows.length === 0) {
    return '<p style="color:#666;font-style:italic;">No form data submitted yet.</p>';
  }

  return `<table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">${rows.join('')}</table>`;
}

function formatDocsList(
  readyDocs?: string[],
  missingDocs?: string[],
): string {
  const parts: string[] = [];
  if (readyDocs && readyDocs.length > 0) {
    parts.push(
      `<p style="margin:4px 0;"><strong>Documents submitted:</strong> ${readyDocs.join(', ')}</p>`,
    );
  }
  if (missingDocs && missingDocs.length > 0) {
    parts.push(
      `<p style="margin:4px 0;color:#dc3545;"><strong>Missing documents:</strong> ${missingDocs.join(', ')}</p>`,
    );
  }
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Email HTML Template
// ---------------------------------------------------------------------------

function buildEmailHtml(opts: {
  task: ServiceTaskRow;
  contact: GovEmailContact;
  caseRef: string;
  replyUrl: string | null;
  siteUrl: string;
}): string {
  const { task, contact, caseRef, replyUrl, siteUrl } = opts;
  const slaEn = formatSla(contact.slaTargetHours);
  const slaNe = formatSlaNe(contact.slaTargetHours);
  const answersHtml = formatAnswersTable(task.answers || {});
  const docsHtml = formatDocsList(task.ready_docs, task.missing_docs);
  const replyButton = replyUrl
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${replyUrl}" style="display:inline-block;padding:14px 32px;background:#003893;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;letter-spacing:0.3px;">
          RESPOND TO THIS CASE / यो केसमा जवाफ दिनुहोस्
        </a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#DC143C 0%,#003893 100%);padding:24px 32px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
    Nepal Republic | नेपाल रिपब्लिक
  </h1>
  <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">
    Citizen Service Request Platform &mdash; nepalrepublic.org
  </p>
</td>
</tr>

<!-- Official notice -->
<tr>
<td style="padding:24px 32px 0;">
  <div style="background:#fff8e1;border-left:4px solid #ffc107;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
    <p style="margin:0;font-size:13px;color:#856404;">
      <strong>Official Citizen Service Request</strong> &mdash; This is a formal service request submitted by a citizen through Nepal Republic (nepalrepublic.org), a civic technology platform.<br/>
      <strong>नागरिक सेवा अनुरोध</strong> &mdash; यो नेपाल रिपब्लिक (nepalrepublic.org) मार्फत नागरिकले पेश गर्नुभएको औपचारिक सेवा अनुरोध हो।
    </p>
  </div>
</td>
</tr>

<!-- Case Reference -->
<tr>
<td style="padding:16px 32px;">
  <div style="background:#e8f0fe;border:2px solid #003893;border-radius:8px;padding:16px 20px;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#003893;text-transform:uppercase;letter-spacing:1px;">Case Reference / केस सन्दर्भ</p>
    <p style="margin:0;font-size:28px;font-weight:800;color:#003893;letter-spacing:2px;">${caseRef}</p>
  </div>
</td>
</tr>

<!-- Service details -->
<tr>
<td style="padding:0 32px 16px;">
  <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a2e;">
    ${task.service_title}
  </h2>
  <p style="margin:0;font-size:14px;color:#555;">
    <strong>To:</strong> ${contact.officeName} (${contact.officeNameNe})<br/>
    <strong>Department:</strong> ${task.assigned_department_name || contact.departmentKey}<br/>
    <strong>Submitted:</strong> ${task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Today'}<br/>
    <strong>Status:</strong> ${task.status}${task.progress != null ? ` (${task.progress}%)` : ''}
  </p>
</td>
</tr>

<!-- Form Data -->
<tr>
<td style="padding:0 32px 16px;">
  <h3 style="margin:0 0 8px;font-size:15px;color:#1a1a2e;border-bottom:1px solid #eee;padding-bottom:6px;">
    Submitted Information / पेश गरिएको जानकारी
  </h3>
  ${answersHtml}
  ${docsHtml}
</td>
</tr>

<!-- SLA -->
<tr>
<td style="padding:0 32px 16px;">
  <div style="background:#f0f7f0;border-left:4px solid #28a745;padding:12px 16px;border-radius:4px;">
    <p style="margin:0;font-size:13px;color:#155724;">
      <strong>Target Response Time:</strong> ${slaEn}<br/>
      <strong>लक्षित प्रतिक्रिया समय:</strong> ${slaNe}
    </p>
  </div>
</td>
</tr>

<!-- Reply Button -->
${replyButton ? `<tr><td style="padding:0 32px;">${replyButton}</td></tr>` : ''}

<!-- Reply Instructions -->
${replyUrl ? `<tr>
<td style="padding:0 32px 24px;">
  <div style="background:#f8f9fa;border-radius:6px;padding:16px;font-size:13px;color:#555;">
    <p style="margin:0 0 8px;"><strong>How to respond / कसरी जवाफ दिने:</strong></p>
    <ol style="margin:0;padding-left:20px;">
      <li>Click the "RESPOND TO THIS CASE" button above</li>
      <li>You can add notes, update the status, or request more information</li>
      <li>The citizen will be notified of your response automatically</li>
    </ol>
    <p style="margin:8px 0 0;font-size:12px;color:#888;">
      Reply link: <a href="${replyUrl}" style="color:#003893;">${replyUrl}</a>
    </p>
  </div>
</td>
</tr>` : ''}

<!-- Footer -->
<tr>
<td style="background:#1a1a2e;padding:20px 32px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.8);">
    Nepal Republic | नेपाल रिपब्लिक
  </p>
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);">
    <a href="${siteUrl}" style="color:rgba(255,255,255,0.7);text-decoration:none;">nepalrepublic.org</a>
    &nbsp;&middot;&nbsp; Civic Accountability Platform
  </p>
  <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">
    This email was sent on behalf of a citizen. If you believe this was sent in error, please disregard.
  </p>
</td>
</tr>

</table>
</td></tr></table>
</body>
</html>`;
}

function buildPlainText(opts: {
  task: ServiceTaskRow;
  contact: GovEmailContact;
  caseRef: string;
  replyUrl: string | null;
}): string {
  const { task, contact, caseRef, replyUrl } = opts;
  const lines: string[] = [
    '=== NEPAL REPUBLIC — CITIZEN SERVICE REQUEST ===',
    '',
    `Case Reference: ${caseRef}`,
    `Service: ${task.service_title}`,
    `To: ${contact.officeName} (${contact.officeNameNe})`,
    `Department: ${task.assigned_department_name || contact.departmentKey}`,
    `Status: ${task.status}`,
    `Target Response: ${formatSla(contact.slaTargetHours)}`,
    '',
    '--- Submitted Information ---',
  ];

  const answers = task.answers || {};
  for (const [key, value] of Object.entries(answers)) {
    if (value == null || value === '' || value === 'unknown') continue;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`${label}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  }

  if (task.ready_docs?.length) {
    lines.push('', `Documents submitted: ${task.ready_docs.join(', ')}`);
  }
  if (task.missing_docs?.length) {
    lines.push(`Missing documents: ${task.missing_docs.join(', ')}`);
  }

  if (replyUrl) {
    lines.push('', '--- RESPOND TO THIS CASE ---', replyUrl);
  }

  lines.push('', '---', 'Nepal Republic | nepalrepublic.org');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Email sending (Resend primary, nodemailer SMTP fallback)
// ---------------------------------------------------------------------------

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo: string;
}): Promise<{ messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: 'RESEND_API_KEY not configured' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: opts.from,
        to: [opts.to],
        reply_to: opts.replyTo,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { error: `Resend API ${res.status}: ${body}` };
    }

    const data = await res.json();
    return { messageId: data.id };
  } catch (err) {
    return { error: `Resend error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo: string;
}): Promise<{ messageId?: string; error?: string }> {
  try {
    // Dynamic import — nodemailer may not be installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = await (Function('return import("nodemailer")')() as Promise<any>);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transport.sendMail({
      from: opts.from,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    return { messageId: info.messageId };
  } catch (err) {
    return { error: `SMTP error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo: string;
}): Promise<{ messageId?: string; error?: string }> {
  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    const result = await sendViaResend(opts);
    if (!result.error) return result;
    console.warn('[email-bridge] Resend failed, trying SMTP fallback:', result.error);
  }

  // Fallback to SMTP
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return sendViaSmtp(opts);
  }

  return { error: 'No email provider configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASS.' };
}

// ---------------------------------------------------------------------------
// Partner reply token creation
// ---------------------------------------------------------------------------

async function ensurePartnerReplyToken(
  supabase: SupabaseClient,
  taskId: string,
  ownerId: string,
  departmentKey: string,
): Promise<string | null> {
  // Check for existing active token
  const { data: existing } = await supabase
    .from('service_partner_reply_tokens')
    .select('token')
    .eq('task_id', taskId)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) return existing.token;

  // Find counterparty for this department
  const { data: counterparty } = await supabase
    .from('service_counterparties')
    .select('id')
    .eq('department_key', departmentKey)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!counterparty?.id) {
    console.warn(`[email-bridge] No counterparty found for department: ${departmentKey}`);
    return null;
  }

  // Create new token — 30 day expiry, 20 uses
  const { data: tokenRow, error } = await supabase
    .from('service_partner_reply_tokens')
    .insert({
      task_id: taskId,
      counterparty_id: counterparty.id,
      scope: 'full',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      max_uses: 20,
      created_by: ownerId,
    })
    .select('token')
    .single();

  if (error) {
    console.warn('[email-bridge] Failed to create reply token:', error.message);
    return null;
  }

  return tokenRow?.token || null;
}

// ---------------------------------------------------------------------------
// Main public API
// ---------------------------------------------------------------------------

/**
 * Send a service task as a formatted email to the responsible government office.
 * Returns the result including whether it was sent, to whom, and the reply token.
 */
export async function sendTaskEmailToGovt(
  supabase: SupabaseClient,
  task: ServiceTaskRow,
): Promise<EmailBridgeResult> {
  const contact = getGovEmailContact(task.service_slug);

  if (!contact) {
    console.warn(`[email-bridge] No contact entry for service: ${task.service_slug}`);
    return { sent: false, sentTo: null, replyToken: null, error: `No contact mapping for service ${task.service_slug}` };
  }

  if (!contact.email) {
    console.warn(`[email-bridge] No email for ${task.service_slug} (${contact.officeName})`);
    return { sent: false, sentTo: null, replyToken: null, error: `No email address known for ${contact.officeName}` };
  }

  const caseRef = `NR-${shortCaseId(task.id)}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalrepublic.org';
  const fromEmail = process.env.EMAIL_FROM || 'service@nepalrepublic.org';
  const replyToEmail = process.env.EMAIL_REPLY_TO || 'support@nepalrepublic.org';
  const departmentKey = task.assigned_department_key || contact.departmentKey;

  // Generate reply token
  let replyToken: string | null = null;
  let replyUrl: string | null = null;
  try {
    replyToken = await ensurePartnerReplyToken(supabase, task.id, task.owner_id, departmentKey);
    if (replyToken) {
      replyUrl = `${siteUrl}/partner-reply?token=${replyToken}`;
    }
  } catch (err) {
    console.warn('[email-bridge] Reply token creation failed:', err);
  }

  // Build email
  const subject = `[Nepal Republic] ${task.service_title} — Case #${caseRef}`;
  const html = buildEmailHtml({ task, contact, caseRef, replyUrl, siteUrl });
  const text = buildPlainText({ task, contact, caseRef, replyUrl });

  // Send
  const result = await sendEmail({
    to: contact.email,
    subject,
    html,
    text,
    from: `Nepal Republic <${fromEmail}>`,
    replyTo: replyToEmail,
  });

  // Log the event regardless of success/failure
  await insertTaskEventBestEffort(supabase, {
    task_id: task.id,
    owner_id: task.owner_id,
    event_type: result.error ? 'email_bridge_failed' : 'email_bridge_sent',
    note: result.error
      ? `Email to ${contact.email} failed: ${result.error}`
      : `Email sent to ${contact.email} (${contact.officeName})`,
    meta: {
      sent_to: contact.email,
      office_name: contact.officeName,
      case_ref: caseRef,
      message_id: result.messageId || null,
      reply_token: replyToken,
      error: result.error || null,
    },
  });

  if (result.error) {
    console.error(`[email-bridge] Failed to send email for task ${task.id}:`, result.error);
    return { sent: false, sentTo: contact.email, replyToken, error: result.error };
  }

  // Record message on the task thread
  await insertServiceTaskMessageBestEffort(supabase, {
    taskId: task.id,
    ownerId: task.owner_id,
    actorType: 'system',
    visibility: 'public',
    messageType: 'system',
    body: `Your service request has been sent to ${contact.officeName} (${contact.officeNameNe}) via email. Case reference: ${caseRef}.`,
    metadata: {
      email_sent_to: contact.email,
      case_ref: caseRef,
      message_id: result.messageId,
    },
  });

  // Notify the citizen
  await notifyServiceTaskUsers(supabase, {
    taskId: task.id,
    ownerId: task.owner_id,
    title: `Request sent to ${contact.officeName}`,
    body: `Your ${task.service_title} request (${caseRef}) has been emailed to the responsible office.`,
    link: '/me/cases',
    metadata: {
      service_slug: task.service_slug,
      case_ref: caseRef,
      sent_to: contact.email,
    },
  });

  return {
    sent: true,
    sentTo: contact.email,
    replyToken,
    messageId: result.messageId,
  };
}

/**
 * Check if a service task can be sent via the email bridge.
 */
export function canSendEmailBridge(serviceSlug: string): {
  canSend: boolean;
  email: string | null;
  officeName: string | null;
  reason?: string;
} {
  const contact = getGovEmailContact(serviceSlug);
  if (!contact) {
    return { canSend: false, email: null, officeName: null, reason: 'No contact mapping for this service' };
  }
  if (!contact.email) {
    return { canSend: false, email: null, officeName: contact.officeName, reason: `No email known for ${contact.officeName}` };
  }
  return { canSend: true, email: contact.email, officeName: contact.officeName };
}
