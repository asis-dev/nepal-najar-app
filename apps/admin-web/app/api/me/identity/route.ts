import { NextResponse } from 'next/server';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import { getRequestUser } from '@/lib/auth/request-user';

export const runtime = 'nodejs';

const ALLOWED = [
  'full_name_en','full_name_ne','father_name_en','father_name_ne','mother_name_en','mother_name_ne',
  'grandfather_name_en','spouse_name_en','citizenship_no','citizenship_issue_date','citizenship_issue_district',
  'passport_no','passport_expiry','pan_no','national_id_no','voter_id_no','driving_license_no',
  'date_of_birth','gender','blood_group','nationality','religion','ethnicity','marital_status',
  'permanent_province','permanent_district','permanent_municipality','permanent_ward','permanent_tole',
  'temporary_province','temporary_district','temporary_municipality','temporary_ward','temporary_tole',
  'mobile','email','emergency_contact_name','emergency_contact_phone',
  'occupation','employer','annual_income_npr','preferred_language',
  'verification_level','onboarding_completed_at',
];

export async function GET(request: Request) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ profile: null }, { status: 401 });
  const { data } = await supabase
    .from('user_identity_profile')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();
  return NextResponse.json({ profile: data || null });
}

export async function POST(req: Request) {
  const { supabase, user } = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const update: Record<string, any> = { owner_id: user.id };
    for (const k of ALLOWED) if (k in body) update[k] = body[k] === '' ? null : body[k];
    const { error } = await supabase
      .from('user_identity_profile')
      .upsert(update, { onConflict: 'owner_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await recordUserActivityBestEffort(supabase, {
      owner_id: user.id,
      event_type: 'identity_profile_upserted',
      entity_type: 'identity_profile',
      entity_id: user.id,
      title: 'Updated identity profile',
      summary: `${Object.keys(update).filter((key) => key !== 'owner_id').length} identity fields saved`,
      meta: {
        fields: Object.keys(update).filter((key) => key !== 'owner_id'),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}
