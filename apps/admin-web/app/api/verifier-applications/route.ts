/**
 * /api/verifier-applications — Apply to become a community verifier
 *
 * GET   → admin: list all pending applications; regular user: own application status
 * POST  → submit application (auth required, karma >= 200)
 * PATCH → admin approve/reject application
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ applications: [] });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getSupabase();

  // Check if admin
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') {
    // Admin: list all pending applications with applicant profile info
    const { data, error } = await db
      .from('verifier_applications')
      .select('*, profiles(display_name, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ applications: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ applications: data ?? [] });
  }

  // Regular user: return own application status
  const { data, error } = await db
    .from('verifier_applications')
    .select('id, status, reason, expertise_area, province, created_at, reviewed_at, rejection_reason')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ application: null });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ application: data });
}

export async function POST(req: NextRequest) {
  // Rate limit: 5/min per IP
  const ip = getClientIp(req);
  const { success: rateLimitOk } = await rateLimit(`verifier-apply:${ip}`, 5, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: {
    reason?: string;
    expertise_area?: string;
    province?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { reason, expertise_area, province } = body;

  if (!reason || reason.trim().length < 10 || reason.trim().length > 2000) {
    return NextResponse.json(
      { error: 'reason is required and must be between 10 and 2000 characters' },
      { status: 400 }
    );
  }

  const db = getSupabase();

  // Check karma requirement (>= 200)
  const { data: reputation, error: repError } = await db
    .from('user_reputation')
    .select('total_karma')
    .eq('user_id', user.id)
    .single();

  if (repError && repError.code !== '42P01' && repError.code !== 'PGRST116') {
    return NextResponse.json({ error: repError.message }, { status: 500 });
  }

  const karma = reputation?.total_karma ?? 0;
  if (karma < 200) {
    return NextResponse.json(
      { error: `Insufficient karma. You need at least 200 karma to apply (current: ${karma}).` },
      { status: 403 }
    );
  }

  // Check for existing pending application
  const { data: existing } = await db
    .from('verifier_applications')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a pending application' },
      { status: 409 }
    );
  }

  const { data, error } = await db
    .from('verifier_applications')
    .insert({
      user_id: user.id,
      reason: reason.trim(),
      expertise_area: expertise_area?.trim() ?? null,
      province: province?.trim() ?? null,
      status: 'pending',
    })
    .select('id, created_at')
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Applications table not yet created', saved: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, application: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getSupabase();

  // Admin check
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let body: {
    applicationId?: string;
    action?: string;
    rejection_reason?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { applicationId, action, rejection_reason } = body;

  if (!applicationId || !action) {
    return NextResponse.json({ error: 'applicationId and action are required' }, { status: 400 });
  }

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  // Fetch the application
  const { data: application, error: fetchErr } = await db
    .from('verifier_applications')
    .select('id, user_id, status')
    .eq('id', applicationId)
    .single();

  if (fetchErr || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (application.status !== 'pending') {
    return NextResponse.json({ error: 'Application has already been processed' }, { status: 409 });
  }

  // Update the application
  const { error: updateErr } = await db
    .from('verifier_applications')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: action === 'reject' ? (rejection_reason?.trim() ?? null) : null,
    })
    .eq('id', applicationId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // On approve: promote user to verifier role
  if (action === 'approve') {
    const { error: roleErr } = await db
      .from('profiles')
      .update({ role: 'verifier' })
      .eq('id', application.user_id);

    if (roleErr) {
      return NextResponse.json({ error: `Application approved but role update failed: ${roleErr.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    status: action === 'approve' ? 'approved' : 'rejected',
  });
}
