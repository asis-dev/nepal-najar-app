import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET || '';
const RESEND_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'Nepal Republic <digest@nepalrepublic.org>';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalrepublic.org';

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function card(title: string, body: string, href: string) {
  return `<tr><td style="padding:12px 0"><a href="${href}" style="display:block;padding:16px;background:#18181b;border:1px solid #27272a;border-radius:12px;text-decoration:none;color:#fafafa"><div style="font-weight:700;font-size:15px;margin-bottom:6px">${title}</div><div style="font-size:13px;color:#a1a1aa">${body}</div></a></td></tr>`;
}

function renderDigest(opts: {
  locale: 'en' | 'ne';
  urgent: any[];
  movers: any[];
  newItems: any[];
  unsubUrl: string;
}) {
  const { urgent, movers, newItems, unsubUrl } = opts;
  const section = (label: string, rows: string[]) =>
    rows.length
      ? `<tr><td style="padding:20px 0 8px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;font-weight:700">${label}</div></td></tr>${rows.join('')}`
      : '';

  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="padding-bottom:24px">
          <div style="font-size:12px;color:#dc143c;font-weight:700;letter-spacing:0.1em">NEPAL REPUBLIC · WEEKLY DIGEST</div>
          <div style="font-size:24px;color:#fafafa;font-weight:900;margin-top:4px">This week in accountability</div>
        </td></tr>
        ${section('🔴 Urgent action items', urgent.map((i) => card(i.title, i.description || '', `${SITE}${i.link || '/inbox'}`)))}
        ${section('📈 Biggest movers', movers.map((i) => card(i.title, i.description || '', `${SITE}${i.link || '/inbox'}`)))}
        ${section('🆕 New this week', newItems.map((i) => card(i.title, i.description || '', `${SITE}${i.link || '/inbox'}`)))}
        <tr><td style="padding:32px 0 8px;text-align:center">
          <a href="${SITE}/inbox" style="display:inline-block;padding:12px 24px;background:#dc143c;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">See full Action Inbox →</a>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;font-size:11px;color:#52525b">
          You are subscribed to the Nepal Republic weekly digest.<br/>
          <a href="${unsubUrl}" style="color:#71717a">Unsubscribe</a> · <a href="${SITE}" style="color:#71717a">nepalrepublic.org</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function fetchContent() {
  const supabase = getSupabase();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: urgent } = await supabase
    .from('party_action_items')
    .select('title,description,link,upvotes')
    .is('resolved_at', null)
    .eq('priority', 1)
    .order('upvotes', { ascending: false })
    .limit(5);

  const { data: movers } = await supabase
    .from('party_action_items')
    .select('title,description,link,upvotes')
    .is('resolved_at', null)
    .gte('upvotes', 1)
    .order('upvotes', { ascending: false })
    .limit(5);

  const { data: newItems } = await supabase
    .from('party_action_items')
    .select('title,description,link,first_seen_at')
    .is('resolved_at', null)
    .gte('first_seen_at', weekAgo)
    .order('first_seen_at', { ascending: false })
    .limit(5);

  return { urgent: urgent || [], movers: movers || [], newItems: newItems || [] };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const qs = req.nextUrl.searchParams.get('key') || '';
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}` && qs !== CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const content = await fetchContent();
  if (!content.urgent.length && !content.newItems.length) {
    return NextResponse.json({ ok: true, skipped: 'no_content' });
  }

  const supabase = getSupabase();
  const { data: subs } = await supabase
    .from('digest_subscriptions')
    .select('email,locale,unsub_token')
    .eq('confirmed', true)
    .limit(1000);

  if (dry) return NextResponse.json({ ok: true, dry: true, subs: subs?.length || 0, content });

  let sent = 0;
  let failed = 0;
  for (const s of subs || []) {
    const unsubUrl = `${SITE}/api/digest/unsubscribe?t=${s.unsub_token}`;
    const html = renderDigest({ locale: s.locale, ...content, unsubUrl });
    const ok = await sendEmail(
      s.email,
      'Nepal Republic · This week in accountability',
      html
    );
    if (ok) {
      sent++;
      await supabase
        .from('digest_subscriptions')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('email', s.email);
    } else failed++;
  }

  return NextResponse.json({ ok: true, sent, failed, subs: subs?.length || 0 });
}
