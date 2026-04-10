import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeAppRole, type AppRole } from '@/lib/auth/roles';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';

interface ProfileResponse {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: AppRole;
  province: string | null;
  district: string | null;
  avatarUrl: string | null;
}

function normalizeString(value: unknown, maxLen = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function normalizePhone(value: unknown): string | null {
  const raw = normalizeString(value, 32);
  if (!raw) return null;
  // Allow +, numbers, spaces, hyphens, and parentheses.
  if (!/^[+\d\s\-()]+$/.test(raw)) return null;
  return raw;
}

function mapProfileRow(
  row: Record<string, unknown> | null,
  fallback: {
    id: string;
    email: string | null;
    phone: string | null;
    displayName: string;
    avatarUrl: string | null;
  },
): ProfileResponse {
  return {
    id: (row?.id as string) || fallback.id,
    displayName:
      (typeof row?.display_name === 'string' && row.display_name.trim()) ||
      fallback.displayName ||
      '',
    email: (typeof row?.email === 'string' ? row.email : fallback.email) ?? null,
    phone: (typeof row?.phone === 'string' ? row.phone : fallback.phone) ?? null,
    role: normalizeAppRole(row?.role),
    province: (typeof row?.province === 'string' ? row.province : null) ?? null,
    district: (typeof row?.district === 'string' ? row.district : null) ?? null,
    avatarUrl:
      (typeof row?.avatar_url === 'string' ? row.avatar_url : fallback.avatarUrl) ?? null,
  };
}

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthedContext();
  if (!user) {
    return NextResponse.json({ authenticated: false, profile: null });
  }

  const fallback = {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    displayName:
      (typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : '') || '',
    avatarUrl:
      typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : null,
  };

  let profileRow: Record<string, unknown> | null = null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!error) {
    profileRow = (data as Record<string, unknown> | null) ?? null;
  } else if (error.code !== 'PGRST116' && error.code !== '42P01') {
    console.error('[profile] fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }

  // Ensure a row exists for users created before trigger/migration changes.
  if (!profileRow) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        display_name: fallback.displayName,
      },
      { onConflict: 'id' },
    );

    const { data: retryRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    profileRow = (retryRow as Record<string, unknown> | null) ?? null;
  }

  return NextResponse.json({
    authenticated: true,
    profile: mapProfileRow(profileRow, fallback),
  });
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuthedContext();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const displayName = normalizeString(body.displayName, 120);
  const phone = normalizePhone(body.phone);
  const province = normalizeString(body.province, 80);
  const district = normalizeString(body.district, 80);
  const avatarUrl = normalizeString(body.avatarUrl, 2000);

  const updates: Record<string, unknown> = {};

  if ('displayName' in body) updates.display_name = displayName ?? '';
  if ('phone' in body) updates.phone = phone;
  if ('province' in body) updates.province = province;
  if ('district' in body) updates.district = district;
  if ('avatarUrl' in body) updates.avatar_url = avatarUrl;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid profile fields provided' }, { status: 400 });
  }

  // Ensure row exists before updating.
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      display_name:
        (typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name
          : '') || '',
    },
    { onConflict: 'id' },
  );

  // Try update with avatar_url; fallback for DBs without avatar_url column.
  let { error: updateError } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateError && updateError.code === '42703' && 'avatar_url' in updates) {
    const withoutAvatar = { ...updates };
    delete withoutAvatar.avatar_url;
    const retry = await supabase
      .from('profiles')
      .update({ ...withoutAvatar, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    updateError = retry.error ?? null;
  }

  if (updateError) {
    console.error('[profile] update error:', updateError.message);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  // Keep auth metadata aligned for display_name/avatar_url.
  const metadataPatch: Record<string, unknown> = {};
  if ('displayName' in body) metadataPatch.display_name = displayName ?? '';
  if ('avatarUrl' in body && avatarUrl) metadataPatch.avatar_url = avatarUrl;
  if ('avatarUrl' in body && !avatarUrl) metadataPatch.avatar_url = null;

  if (Object.keys(metadataPatch).length > 0) {
    await supabase.auth.updateUser({ data: metadataPatch });
  }

  const { data: latestRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'profile_updated',
    entity_type: 'profile',
    entity_id: user.id,
    title: 'Updated profile details',
    summary: [
      'displayName' in body ? 'display name' : null,
      'phone' in body ? 'phone' : null,
      'province' in body || 'district' in body ? 'location' : null,
      'avatarUrl' in body ? 'avatar' : null,
    ].filter(Boolean).join(', ') || 'Profile fields changed',
    meta: {
      fields: Object.keys(updates),
    },
  });

  const fallback = {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    displayName:
      (typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : '') || '',
    avatarUrl,
  };

  return NextResponse.json({
    saved: true,
    profile: mapProfileRow((latestRow as Record<string, unknown> | null) ?? null, fallback),
  });
}
