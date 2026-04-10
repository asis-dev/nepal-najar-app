import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { notifyGovtReplied } from '@/lib/integrations/sms-notify';
import { canSendSMS } from '@/lib/integrations/sms';

export const runtime = 'nodejs';

/**
 * Public endpoint for partner reply links.
 * No auth required — token-based access.
 *
 * GET  ?token=xxx        — validate token, return task context
 * POST { token, ... }    — submit a reply (note, status update, document ref, etc.)
 */

// Simple in-memory rate limit per IP (best-effort; resets per lambda cold-start).
const RATE: Map<string, { count: number; reset: number }> = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function rateKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  );
}

function checkRate(key: string): boolean {
  const now = Date.now();
  const e = RATE.get(key);
  if (!e || e.reset < now) {
    RATE.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (e.count >= RATE_LIMIT) return false;
  e.count++;
  return true;
}

export async function GET(request: NextRequest) {
  if (!checkRate(rateKey(request))) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const db = getSupabase();
  const { data: tokenRow, error: tokenError } = await db
    .from('service_partner_reply_tokens')
    .select(`
      *,
      counterparty:service_counterparties(id, name, name_ne, kind),
      task:service_tasks(id, service_slug, service_title, status, progress, current_step, next_action)
    `)
    .eq('token', token)
    .eq('is_revoked', false)
    .maybeSingle();

  if (tokenError) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  if (!tokenRow) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });

  // Check expiry
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token has expired', expired: true }, { status: 410 });
  }

  // Check usage limit
  if (tokenRow.use_count >= tokenRow.max_uses) {
    return NextResponse.json({ error: 'Token usage limit reached' }, { status: 429 });
  }

  // Get previous replies for context
  const { data: replies } = await db
    .from('service_partner_replies')
    .select('id, reply_type, content, new_status, created_at')
    .eq('token_id', tokenRow.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    valid: true,
    scope: tokenRow.scope,
    counterparty: tokenRow.counterparty,
    task: {
      id: tokenRow.task?.id,
      service: tokenRow.task?.service_title || tokenRow.task?.service_slug,
      status: tokenRow.task?.status,
      progress: tokenRow.task?.progress,
      currentStep: tokenRow.task?.current_step,
      nextAction: tokenRow.task?.next_action,
    },
    previous_replies: replies || [],
    remaining_uses: tokenRow.max_uses - tokenRow.use_count,
    expires_at: tokenRow.expires_at,
  });
}

export async function POST(request: NextRequest) {
  if (!checkRate(rateKey(request))) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const db = getSupabase();
  const { data: tokenRow, error: tokenError } = await db
    .from('service_partner_reply_tokens')
    .select('*')
    .eq('token', token)
    .eq('is_revoked', false)
    .maybeSingle();

  if (tokenError) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  if (!tokenRow) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token has expired' }, { status: 410 });
  }
  if (tokenRow.use_count >= tokenRow.max_uses) {
    return NextResponse.json({ error: 'Token usage limit reached' }, { status: 429 });
  }

  const replyType = typeof body.reply_type === 'string' ? body.reply_type.trim() : 'note';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const newStatus = typeof body.new_status === 'string' ? body.new_status.trim() : null;

  if (!content && !newStatus) {
    return NextResponse.json({ error: 'Content or status update required' }, { status: 400 });
  }

  // Scope check
  if (tokenRow.scope === 'reply' && replyType !== 'note' && replyType !== 'request_info') {
    return NextResponse.json({ error: `Token scope '${tokenRow.scope}' does not allow '${replyType}'` }, { status: 403 });
  }
  if (tokenRow.scope === 'status_update' && replyType !== 'status_update' && replyType !== 'note') {
    return NextResponse.json({ error: `Token scope '${tokenRow.scope}' does not allow '${replyType}'` }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || null;

  // Insert reply
  const { data: reply, error: replyError } = await db
    .from('service_partner_replies')
    .insert({
      token_id: tokenRow.id,
      task_id: tokenRow.task_id,
      counterparty_id: tokenRow.counterparty_id,
      reply_type: replyType,
      content: content || null,
      new_status: newStatus,
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
      ip_address: ip,
    })
    .select('*')
    .single();

  if (replyError) {
    console.error('[partner-reply] insert error:', replyError.message);
    return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
  }

  // Atomically increment token use count (prevents race conditions)
  await db.rpc('increment_partner_reply_token_use', { token_id: tokenRow.id }).then(
    () => {},
    // Fallback: direct atomic update if RPC doesn't exist
    async () => {
      await db
        .from('service_partner_reply_tokens')
        .update({ use_count: (tokenRow.use_count || 0) + 1, last_used_at: new Date().toISOString() })
        .eq('id', tokenRow.id)
        .lt('use_count', tokenRow.max_uses);
    },
  );

  // If status update, update the task too
  if (newStatus && (tokenRow.scope === 'status_update' || tokenRow.scope === 'full')) {
    await db
      .from('service_tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tokenRow.task_id);
  }

  // Fire-and-forget: SMS notification to task owner about government reply
  if (canSendSMS() && tokenRow.task_id) {
    (async () => {
      try {
        // Look up the task to get owner_id and service details
        const { data: task } = await db
          .from('service_tasks')
          .select('id, owner_id, service_slug, service_title, locale')
          .eq('id', tokenRow.task_id)
          .maybeSingle();

        if (!task?.owner_id) return;

        // Look up the task owner's phone from profiles
        const { data: profile } = await db
          .from('profiles')
          .select('phone')
          .eq('id', task.owner_id)
          .maybeSingle();

        const phone = profile?.phone as string | null;
        if (!phone) return;

        const taskInfo = {
          id: task.id,
          owner_id: task.owner_id,
          service_slug: task.service_slug,
          service_title: task.service_title,
        };

        const locale = (task.locale === 'ne' ? 'ne' : 'en') as 'en' | 'ne';
        await notifyGovtReplied(db, taskInfo, phone, replyType, locale);
      } catch (err) {
        console.error('[partner-reply] SMS notify error (non-blocking):', err);
      }
    })();
  }

  return NextResponse.json({ ok: true, reply });
}
