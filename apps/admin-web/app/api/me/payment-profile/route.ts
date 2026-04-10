import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizePaymentProfile, readStoredPaymentProfile } from '@/lib/services/payment-profile';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthedContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .maybeSingle();

  if (error && error.code !== '42703' && error.code !== '42P01' && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    paymentProfile: readStoredPaymentProfile((data?.preferences as Record<string, unknown> | null) ?? {}),
  });
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuthedContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const paymentProfile = normalizePaymentProfile(body);
  if (!paymentProfile) {
    return NextResponse.json({ error: 'A valid preferred gateway is required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .maybeSingle();

  const currentPreferences = (existing?.preferences as Record<string, unknown> | null) ?? {};
  const nextPreferences = {
    ...currentPreferences,
    payment_profile: paymentProfile,
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        preferences: nextPreferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'payment_profile_updated',
    entity_type: 'profile',
    entity_id: user.id,
    title: 'Updated payment profile',
    summary: `${paymentProfile.preferredGateway} preference saved`,
    meta: {
      preferred_gateway: paymentProfile.preferredGateway,
      wallet_label: paymentProfile.walletLabel,
      require_explicit_approval: paymentProfile.requireExplicitApproval,
    },
  });

  return NextResponse.json({ saved: true, paymentProfile });
}
