import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';
import {
  isAdminPromotionEnabled,
  isProtectedOwnerIdentity,
  isOwnerUser,
} from '@/lib/auth/owner';
import { isAdminRole, isElevatedRole, isValidAppRole, normalizeAppRole } from '@/lib/auth/roles';

/**
 * Helper: verify the calling user is an admin.
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
 * PATCH /api/users/[id]
 * Update a user's profile (role, display_name). Admin-only.
 * Body: { role?: string, display_name?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = params;

  try {
    const body = await request.json();
    const updates: Record<string, string> = {};

    if (body.role) {
      if (!isValidAppRole(body.role)) {
        return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
      }

      const targetRole = normalizeAppRole(body.role);

      if (isElevatedRole(targetRole) && !isAdminPromotionEnabled()) {
        return NextResponse.json(
          { error: 'Elevated-role promotions are locked. Set ADMIN_ROLE_PROMOTION_ENABLED=true to allow.' },
          { status: 403 },
        );
      }

      if (targetRole !== 'admin') {
        const { data: targetProfile } = await getSupabase()
          .from('profiles')
          .select('id, email')
          .eq('id', id)
          .maybeSingle();

        if (isProtectedOwnerIdentity({ id, email: targetProfile?.email })) {
          return NextResponse.json(
            { error: 'Cannot demote configured owner account.' },
            { status: 400 },
          );
        }
      }

      if (targetRole !== 'admin' && isProtectedOwnerIdentity({ id })) {
        return NextResponse.json(
          { error: 'Cannot demote configured owner account.' },
          { status: 400 },
        );
      }

      updates.role = targetRole;
    }
    if (typeof body.display_name === 'string') {
      updates.display_name = body.display_name;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, display_name, email, phone, role, province, district, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user entirely (auth + profile cascade). Admin-only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = params;

  // Prevent self-deletion
  if (id === auth.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', id)
    .maybeSingle();

  if (isProtectedOwnerIdentity({ id, email: targetProfile?.email })) {
    return NextResponse.json({ error: 'Cannot delete configured owner account' }, { status: 400 });
  }

  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
