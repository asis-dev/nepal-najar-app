/**
 * POST /api/me/profile/learn
 * Learns profile fields from form submissions, document extractions, etc.
 * Writes to user_identity_profile table.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { fields?: Record<string, string>; source?: string; sourceRef?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.fields || typeof body.fields !== 'object' || Object.keys(body.fields).length === 0) {
    return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
  }

  // Sanitize: only allow known profile field names, max 200 chars per value
  const ALLOWED_FIELDS = new Set([
    'full_name_en', 'full_name_ne', 'father_name_en', 'father_name_ne',
    'mother_name_en', 'mother_name_ne', 'grandfather_name_en', 'spouse_name_en',
    'date_of_birth', 'gender', 'nationality', 'marital_status',
    'blood_group', 'religion', 'ethnicity', 'occupation',
    'citizenship_no', 'citizenship_issue_date', 'citizenship_issue_district',
    'passport_no', 'passport_expiry',
    'driving_license_no', 'pan_no', 'voter_id_no', 'national_id_no',
    'permanent_province', 'permanent_district', 'permanent_municipality',
    'permanent_ward', 'permanent_tole',
    'temporary_province', 'temporary_district', 'temporary_municipality',
    'temporary_ward', 'temporary_tole',
    'mobile', 'email', 'emergency_contact_name', 'emergency_contact_phone',
  ]);

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.fields)) {
    if (ALLOWED_FIELDS.has(key) && typeof value === 'string' && value.trim()) {
      updates[key] = value.trim().slice(0, 200);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ learned: 0 });
  }

  const adminDb = getSupabase();

  try {
    // Upsert into user_identity_profile (only update non-empty fields, don't overwrite with blanks)
    const { error } = await adminDb.from('user_identity_profile').upsert(
      { owner_id: user.id, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'owner_id' },
    );

    if (error) {
      console.warn('[profile/learn] upsert error:', error.message);
      return NextResponse.json({ error: 'Failed to save profile data' }, { status: 500 });
    }

    // Record provenance for each field (fire-and-forget)
    const source = body.source || 'form_submission';
    const sourceRef = body.sourceRef || undefined;
    for (const [field, value] of Object.entries(updates)) {
      Promise.resolve(
        adminDb
          .from('profile_field_provenance')
          .upsert(
            {
              user_id: user.id,
              field_name: field,
              field_value: value,
              source,
              confidence: source === 'user_input' ? 1.0 : 0.9,
              source_ref: sourceRef,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,field_name' },
          ),
      ).catch(() => {});
    }

    return NextResponse.json({ learned: Object.keys(updates).length, fields: Object.keys(updates) });
  } catch (err) {
    console.error('[profile/learn] error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
