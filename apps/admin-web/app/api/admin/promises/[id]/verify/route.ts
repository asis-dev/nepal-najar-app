/**
 * POST /api/admin/promises/[id]/verify
 *
 * Admin-only endpoint to update a promise's verified status/progress.
 * Creates an audit trail in `promise_updates`.
 *
 * Body: { status, progress, source_url, reason }
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  // Auth check — admin cookie or Bearer token
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('admin_session')?.value;
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  const isAuthed =
    (adminCookie && adminSecret && adminCookie === adminSecret) ||
    (authHeader && adminSecret && authHeader === `Bearer ${adminSecret}`);

  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const promiseId = params.id;
  if (!promiseId) {
    return NextResponse.json({ error: 'Missing promise ID' }, { status: 400 });
  }

  // Parse body
  let body: {
    status?: string;
    progress?: number;
    source_url?: string;
    reason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status, progress, source_url, reason } = body;

  if (!source_url || !reason) {
    return NextResponse.json(
      { error: 'source_url and reason are required for audit trail' },
      { status: 400 },
    );
  }

  // Verify the promise exists
  const { data: existing, error: fetchError } = await supabase
    .from('promises')
    .select('id, status, progress, trust_level')
    .eq('id', promiseId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Promise not found' }, { status: 404 });
  }

  // Build update payload
  const updates: Record<string, unknown> = {
    trust_level: 'verified',
    last_update: new Date().toISOString(),
  };

  if (status) updates.status = status;
  if (progress !== undefined && progress !== null) updates.progress = progress;

  // Update promise
  const { error: updateError } = await supabase
    .from('promises')
    .update(updates)
    .eq('id', promiseId);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update promise', detail: updateError.message },
      { status: 500 },
    );
  }

  // Create audit record in promise_updates
  const { error: auditError } = await supabase
    .from('promise_updates')
    .insert({
      promise_id: promiseId,
      update_type: 'status_change',
      update_source: 'admin',
      old_status: existing.status,
      new_status: status || existing.status,
      old_progress: existing.progress,
      new_progress: progress ?? existing.progress,
      source_url,
      notes: reason,
      created_at: new Date().toISOString(),
    });

  if (auditError) {
    console.warn('[verify] Audit insert failed:', auditError.message);
    // Don't fail the request — the promise was already updated
  }

  return NextResponse.json({
    success: true,
    promiseId,
    previousStatus: existing.status,
    newStatus: status || existing.status,
    previousProgress: existing.progress,
    newProgress: progress ?? existing.progress,
    trustLevel: 'verified',
  });
}
