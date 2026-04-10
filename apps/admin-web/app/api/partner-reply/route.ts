import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Public endpoint for partner reply links.
 * No auth required — token-based access.
 *
 * GET  ?token=xxx        — validate token, return task context
 * POST { token, ... }    — submit a reply (note, status update, document ref, etc.)
 */

export async function GET(request: NextRequest) {
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

  if (replyError) return NextResponse.json({ error: replyError.message }, { status: 500 });

  // Increment token use count
  await db
    .from('service_partner_reply_tokens')
    .update({ use_count: tokenRow.use_count + 1, last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  // If status update, update the task too
  if (newStatus && (tokenRow.scope === 'status_update' || tokenRow.scope === 'full')) {
    await db
      .from('service_tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tokenRow.task_id);
  }

  return NextResponse.json({ ok: true, reply });
}
