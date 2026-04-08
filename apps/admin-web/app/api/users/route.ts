import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminPromotionEnabled, isOwnerUser } from '@/lib/auth/owner';
import { isAdminRole, isElevatedRole, isValidAppRole, normalizeAppRole } from '@/lib/auth/roles';

/**
 * Helper: verify the calling user is an admin.
 * Uses the SSR client (cookie-based session) to identify the caller,
 * then checks their profile role via the service-role client.
 */
async function requireAdmin(): Promise<{ error?: NextResponse; userId?: string }> {
  try {
    const ssrClient = await createSupabaseServerClient();
    const { data: { user }, error } = await ssrClient.auth.getUser();

    if (error || !user) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (!profile || !isAdminRole(profile.role)) {
      return { error: NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 }) };
    }

    if (!isOwnerUser({ id: user.id, email: user.email || profile.email })) {
      return { error: NextResponse.json({ error: 'Forbidden — owner access required' }, { status: 403 }) };
    }

    return { userId: user.id };
  } catch {
    return { error: NextResponse.json({ error: 'Auth check failed' }, { status: 500 }) };
  }
}

/**
 * GET /api/users
 * List all user profiles. Admin-only.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email, phone, role, province, district, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/users
 * Create a new user. Admin-only.
 * Body: { email: string, display_name?: string, role?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { email, display_name, role } = body as {
      email?: string;
      display_name?: string;
      role?: string;
    };

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Create user via Supabase Auth admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: display_name || '' },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (role && !isValidAppRole(role)) {
      return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
    }

    const requestedRole = role ? normalizeAppRole(role) : null;

    if (requestedRole && isElevatedRole(requestedRole) && !isAdminPromotionEnabled()) {
      return NextResponse.json(
        { error: 'Elevated-role promotions are locked. Set ADMIN_ROLE_PROMOTION_ENABLED=true to allow.' },
        { status: 403 },
      );
    }

    let finalRole = 'citizen';

    if (newUser.user) {
      const { data: createdProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', newUser.user.id)
        .maybeSingle();
      finalRole = normalizeAppRole(createdProfile?.role, 'citizen');

      if (requestedRole && requestedRole !== finalRole) {
        const { error: roleErr } = await supabase
          .from('profiles')
          .update({ role: requestedRole })
          .eq('id', newUser.user.id);

        if (roleErr) {
          return NextResponse.json({ error: roleErr.message }, { status: 400 });
        }
        finalRole = requestedRole;
      }
    }

    return NextResponse.json(
      {
        id: newUser.user.id,
        email,
        display_name: display_name || '',
        role: finalRole,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
