import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Vault reminder tick — fires due reminders.
 * Called by Vercel cron daily. Secured with CRON_SECRET header.
 *
 * For MVP: just marks them `sent` and inserts a row into `notifications`
 * (the app already has an in-app notifications infra). Email/SMS later.
 */

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || '';
const RESEND_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'Nepal Republic <reminders@nepalrepublic.org>';

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  // Auth: Vercel cron header or Bearer token only (no query-string fallback).
  const cronHeader = req.headers.get('x-vercel-cron-secret') || '';
  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }

  const isAuthed =
    !!CRON_SECRET &&
    (timingSafeEqual(cronHeader, CRON_SECRET) || timingSafeEqual(bearerToken, CRON_SECRET));
  if (!isAuthed) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!SUPA_URL || !SUPA_KEY) {
    return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });
  }
  const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error } = await supabase
    .from('vault_reminders')
    .select('*, vault_documents!inner(id, title, doc_type, expires_on)')
    .eq('status', 'pending')
    .lte('remind_on', today)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: 'fetch failed', detail: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  let failed = 0;
  let emailsSent = 0;

  for (const r of due) {
    try {
      const title = r.vault_documents?.title || 'Document';
      const expiry = r.vault_documents?.expires_on;
      const body = expiry
        ? `${title} expires on ${expiry}. Tap to renew.`
        : r.message || `Reminder: ${title}`;

      // Write to notifications table if it exists; ignore error (table optional).
      await supabase.from('notifications').insert({
        user_id: r.owner_id,
        type: 'vault_reminder',
        title: `📅 ${title}`,
        body,
        link: '/me/vault',
        metadata: { document_id: r.document_id, reminder_id: r.id },
      }).then(() => {}, () => {});

      // Best-effort email via Resend (requires RESEND_API_KEY)
      if (RESEND_KEY) {
        try {
          const { data: userRow } = await supabase.auth.admin.getUserById(r.owner_id);
          const email = userRow?.user?.email;
          if (email) {
            const html = `
              <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;background:#0b0b0b;color:#fafafa;border-radius:12px">
                <div style="font-size:12px;color:#dc143c;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Nepal Republic · Vault Reminder</div>
                <h2 style="margin:0 0 12px 0;font-size:20px">📅 ${title}</h2>
                <p style="margin:0 0 16px 0;color:#d4d4d8;line-height:1.5">${body}</p>
                <a href="https://nepalrepublic.org/me/vault" style="display:inline-block;background:#dc143c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open My Vault</a>
                <p style="margin:24px 0 0 0;font-size:11px;color:#71717a">You received this because you set a reminder in your Nepal Republic Vault.</p>
              </div>`;
            const ok = await sendEmail(email, `📅 ${title} — Nepal Republic`, html);
            if (ok) emailsSent++;
          }
        } catch {}
      }

      await supabase
        .from('vault_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', r.id);

      sent++;
    } catch (e) {
      failed++;
      await supabase
        .from('vault_reminders')
        .update({ status: 'failed' })
        .eq('id', r.id)
        .then(() => {}, () => {});
    }
  }

  return NextResponse.json({ ok: true, sent, failed, emailsSent, total: due.length });
}
