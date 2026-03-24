/**
 * /api/preferences — Unified user preference persistence
 *
 * GET  → returns { preferences: UserPreferences } from profiles.preferences JSONB
 * PUT  → partial update of preferences. Body: Partial<UserPreferences>
 *
 * Requires authentication. Anonymous users rely on localStorage only.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Helper: get the authenticated user or return a 401 response */
async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      // Column may not exist yet — return empty
      if (error.code === '42703' || error.code === '42P01') {
        return NextResponse.json({ preferences: {} });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: data?.preferences ?? {} });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Whitelist allowed preference keys
  const ALLOWED_KEYS = [
    'locale',
    'province',
    'district',
    'categoriesOfInterest',
    'feedTab',
    'lastSeenTimestamp',
    'onboardingComplete',
    'theme',
  ];

  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      sanitized[key] = body[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: 'No valid preference keys provided' }, { status: 400 });
  }

  try {
    // First read existing preferences to merge
    const { data: existing } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const currentPrefs = (existing?.preferences as Record<string, unknown>) ?? {};
    const merged = { ...currentPrefs, ...sanitized };

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: merged })
      .eq('id', user.id);

    if (error) {
      // Column may not exist yet
      if (error.code === '42703') {
        return NextResponse.json({
          error: 'preferences column not yet added — run migration 025',
          saved: false,
        });
      }
      return NextResponse.json({ error: error.message, saved: false }, { status: 500 });
    }

    return NextResponse.json({ saved: true, preferences: merged });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', saved: false },
      { status: 500 },
    );
  }
}
