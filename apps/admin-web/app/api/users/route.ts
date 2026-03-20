import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';

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
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { error: NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 }) };
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
 * Body: { email: string, display_name?: string, role?: 'citizen' | 'admin' }
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

    // If a role was specified (and it's valid), update the profile
    if (role && ['citizen', 'admin'].includes(role) && newUser.user) {
      await supabase
        .from('profiles')
        .update({ role })
        .eq('id', newUser.user.id);
    }

    return NextResponse.json(
      { id: newUser.user.id, email, display_name: display_name || '', role: role || 'citizen' },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
