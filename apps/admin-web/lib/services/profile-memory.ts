import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Canonical profile fields — superset of all service-relevant fields */
export interface CitizenProfile {
  user_id: string;
  // Names
  full_name_en: string | null;
  full_name_ne: string | null;
  father_name_en: string | null;
  father_name_ne: string | null;
  mother_name_en: string | null;
  mother_name_ne: string | null;
  grandfather_name_en: string | null;
  spouse_name_en: string | null;
  // Identity
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  marital_status: string | null;
  blood_group: string | null;
  religion: string | null;
  ethnicity: string | null;
  occupation: string | null;
  // Documents
  citizenship_no: string | null;
  citizenship_issue_date: string | null;
  citizenship_issue_district: string | null;
  passport_no: string | null;
  passport_issue_date: string | null;
  passport_expiry_date: string | null;
  license_no: string | null;
  license_category: string | null;
  pan_no: string | null;
  voter_id: string | null;
  national_id: string | null;
  // Permanent address
  permanent_province: string | null;
  permanent_district: string | null;
  permanent_municipality: string | null;
  permanent_ward: string | null;
  permanent_tole: string | null;
  // Temporary address
  temporary_province: string | null;
  temporary_district: string | null;
  temporary_municipality: string | null;
  temporary_ward: string | null;
  temporary_tole: string | null;
  // Contact
  mobile: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  // Preferences
  preferred_hospital: string | null;
  preferred_language: 'en' | 'ne' | null;
  payment_preference: string | null;
}

export interface FieldProvenance {
  field: string;
  value: string | null;
  source: 'user_input' | 'document_ocr' | 'form_submission' | 'admin_entry' | 'ai_inferred';
  confidence: number; // 0-1
  lastUpdated: string;
  sourceRef?: string; // e.g. "passport-renewal-form-2026-03"
}

export interface ProfileCoverage {
  totalFields: number;
  filledFields: number;
  coveragePercent: number;
  missingFields: string[];
  missingForService: string[]; // fields missing that the target service needs
}

// ---------------------------------------------------------------------------
// Column mapping: CitizenProfile key <-> DB column name
// Some profile keys differ from DB column names.
// ---------------------------------------------------------------------------

const PROFILE_TO_DB: Record<string, string> = {
  user_id: 'owner_id',
  passport_expiry_date: 'passport_expiry',
  license_no: 'driving_license_no',
  voter_id: 'voter_id_no',
  national_id: 'national_id_no',
};

const DB_TO_PROFILE: Record<string, string> = {};
for (const [profileKey, dbCol] of Object.entries(PROFILE_TO_DB)) {
  DB_TO_PROFILE[dbCol] = profileKey;
}

function toDbColumn(profileKey: string): string {
  return PROFILE_TO_DB[profileKey] ?? profileKey;
}

function toProfileKey(dbColumn: string): string {
  return DB_TO_PROFILE[dbColumn] ?? dbColumn;
}

// Fields that only exist on CitizenProfile but NOT in the DB table.
// These are stored client-side or in separate tables.
const VIRTUAL_FIELDS = new Set([
  'passport_issue_date',
  'license_category',
  'preferred_hospital',
  'payment_preference',
]);

// All CitizenProfile field names (excluding user_id)
const ALL_PROFILE_FIELDS: string[] = [
  'full_name_en', 'full_name_ne', 'father_name_en', 'father_name_ne',
  'mother_name_en', 'mother_name_ne', 'grandfather_name_en', 'spouse_name_en',
  'date_of_birth', 'gender', 'nationality', 'marital_status', 'blood_group',
  'religion', 'ethnicity', 'occupation',
  'citizenship_no', 'citizenship_issue_date', 'citizenship_issue_district',
  'passport_no', 'passport_issue_date', 'passport_expiry_date',
  'license_no', 'license_category', 'pan_no', 'voter_id', 'national_id',
  'permanent_province', 'permanent_district', 'permanent_municipality',
  'permanent_ward', 'permanent_tole',
  'temporary_province', 'temporary_district', 'temporary_municipality',
  'temporary_ward', 'temporary_tole',
  'mobile', 'email', 'emergency_contact_name', 'emergency_contact_phone',
  'preferred_hospital', 'preferred_language', 'payment_preference',
];

// ---------------------------------------------------------------------------
// Service field requirements
// ---------------------------------------------------------------------------

const SERVICE_FIELD_REQUIREMENTS: Record<string, string[]> = {
  'new-passport': [
    'full_name_en', 'full_name_ne', 'date_of_birth', 'gender', 'citizenship_no',
    'citizenship_issue_date', 'citizenship_issue_district', 'permanent_province',
    'permanent_district', 'permanent_municipality', 'permanent_ward', 'mobile', 'blood_group',
  ],
  'passport-renewal': [
    'full_name_en', 'full_name_ne', 'date_of_birth', 'gender', 'citizenship_no',
    'passport_no', 'passport_expiry_date', 'permanent_province', 'permanent_district',
    'permanent_municipality', 'permanent_ward', 'mobile',
  ],
  'drivers-license-renewal': [
    'full_name_en', 'date_of_birth', 'citizenship_no', 'license_no', 'license_category',
    'permanent_district', 'mobile',
  ],
  'new-drivers-license': [
    'full_name_en', 'date_of_birth', 'gender', 'citizenship_no', 'permanent_district',
    'permanent_municipality', 'mobile', 'blood_group',
  ],
  'nea-bill-payment': ['mobile'],
  'kukl-bill-payment': ['mobile'],
  'bir-hospital-opd': ['full_name_en', 'date_of_birth', 'gender', 'mobile'],
  'tuth-opd': ['full_name_en', 'date_of_birth', 'gender', 'mobile'],
};

// ---------------------------------------------------------------------------
// Source priority (higher = more trusted)
// ---------------------------------------------------------------------------

const SOURCE_PRIORITY: Record<FieldProvenance['source'], number> = {
  user_input: 5,
  document_ocr: 4,
  form_submission: 3,
  admin_entry: 2,
  ai_inferred: 1,
};

// ---------------------------------------------------------------------------
// Helper: convert DB row -> CitizenProfile
// ---------------------------------------------------------------------------

function dbRowToProfile(row: Record<string, any>): CitizenProfile {
  const profile: Record<string, any> = {};
  for (const field of ALL_PROFILE_FIELDS) {
    const dbCol = toDbColumn(field);
    profile[field] = row[dbCol] ?? null;
  }
  profile.user_id = row.owner_id ?? '';
  return profile as CitizenProfile;
}

// ---------------------------------------------------------------------------
// Helper: convert partial CitizenProfile -> DB update object
// ---------------------------------------------------------------------------

function profileToDbUpdate(
  updates: Partial<CitizenProfile>,
): Record<string, any> {
  const dbUpdate: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'user_id') continue;
    if (VIRTUAL_FIELDS.has(key)) continue; // skip fields not in DB
    const dbCol = toDbColumn(key);
    dbUpdate[dbCol] = value;
  }
  return dbUpdate;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Load profile from user_identity_profile table.
 * Returns null if no row exists for this user.
 */
export async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<CitizenProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_identity_profile')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[profile-memory] loadProfile error:', error.message);
      return null;
    }
    if (!data) return null;
    return dbRowToProfile(data);
  } catch (err: any) {
    console.warn('[profile-memory] loadProfile exception:', err?.message);
    return null;
  }
}

/**
 * Save/update profile fields.
 * Only updates non-null fields from the updates object.
 * Creates the row if it doesn't exist (upsert).
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<CitizenProfile>,
): Promise<boolean> {
  try {
    // Filter out null/undefined values — only update fields that have a value
    const filtered: Partial<CitizenProfile> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null) {
        (filtered as any)[key] = value;
      }
    }

    const dbUpdate = profileToDbUpdate(filtered);
    dbUpdate.owner_id = userId;

    const { error } = await supabase
      .from('user_identity_profile')
      .upsert(dbUpdate, { onConflict: 'owner_id' });

    if (error) {
      console.warn('[profile-memory] updateProfile error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[profile-memory] updateProfile exception:', err?.message);
    return false;
  }
}

/**
 * Merge new field values into profile.
 * Only overwrites if the new source confidence >= existing provenance confidence.
 */
export async function mergeProfileFields(
  supabase: SupabaseClient,
  userId: string,
  fields: Record<string, string | null>,
  source: FieldProvenance['source'],
  sourceRef?: string,
): Promise<{ updated: string[]; skipped: string[] }> {
  const updated: string[] = [];
  const skipped: string[] = [];

  try {
    const profile = await loadProfile(supabase, userId);
    const toUpdate: Partial<CitizenProfile> = {};

    for (const [field, value] of Object.entries(fields)) {
      if (!ALL_PROFILE_FIELDS.includes(field)) {
        skipped.push(field);
        continue;
      }

      // Check existing provenance to decide whether to overwrite
      const existingProvenance = await getFieldProvenance(supabase, userId, field);
      const existingValue = profile ? (profile as any)[field] : null;

      if (existingValue != null && existingValue !== '' && existingProvenance) {
        // Existing value has provenance — check source priority
        const existingPriority = SOURCE_PRIORITY[existingProvenance.source] ?? 0;
        const newPriority = SOURCE_PRIORITY[source] ?? 0;
        if (newPriority < existingPriority) {
          skipped.push(field);
          continue;
        }
      }

      (toUpdate as any)[field] = value;
      updated.push(field);
    }

    // Write updates to profile
    if (updated.length > 0) {
      const success = await updateProfile(supabase, userId, toUpdate);
      if (!success) {
        return { updated: [], skipped: [...updated, ...skipped] };
      }

      // Record provenance for all updated fields
      const now = new Date().toISOString();
      const provenances: FieldProvenance[] = updated.map((field) => ({
        field,
        value: fields[field] ?? null,
        source,
        confidence: SOURCE_PRIORITY[source] / 5, // normalize to 0-1
        lastUpdated: now,
        sourceRef,
      }));
      await recordProvenance(supabase, userId, provenances);
    }

    return { updated, skipped };
  } catch (err: any) {
    console.warn('[profile-memory] mergeProfileFields exception:', err?.message);
    return { updated: [], skipped: Object.keys(fields) };
  }
}

/**
 * Get coverage report for a specific service.
 * Shows how many fields are filled vs how many are needed.
 */
export async function getProfileCoverage(
  supabase: SupabaseClient,
  userId: string,
  serviceSlug: string,
): Promise<ProfileCoverage> {
  const profile = await loadProfile(supabase, userId);

  const filledFields: string[] = [];
  const missingFields: string[] = [];

  for (const field of ALL_PROFILE_FIELDS) {
    const value = profile ? (profile as any)[field] : null;
    if (value != null && value !== '') {
      filledFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  const serviceRequired = SERVICE_FIELD_REQUIREMENTS[serviceSlug] ?? [];
  const missingForService = serviceRequired.filter(
    (f) => !filledFields.includes(f),
  );

  return {
    totalFields: ALL_PROFILE_FIELDS.length,
    filledFields: filledFields.length,
    coveragePercent:
      ALL_PROFILE_FIELDS.length > 0
        ? Math.round((filledFields.length / ALL_PROFILE_FIELDS.length) * 100)
        : 0,
    missingFields,
    missingForService,
  };
}

/**
 * Auto-fill form values from profile.
 * Iterates form schema fields, pulls values for any field with a profileKey.
 */
export async function autofillFromProfile(
  supabase: SupabaseClient,
  userId: string,
  formSchema: {
    sections: Array<{
      fields: Array<{ key: string; profileKey?: string; required?: boolean }>;
    }>;
  },
): Promise<{
  values: Record<string, string>;
  filledCount: number;
  totalRequired: number;
  sources: Record<string, string>;
}> {
  const values: Record<string, string> = {};
  const sources: Record<string, string> = {};
  let filledCount = 0;
  let totalRequired = 0;

  try {
    const profile = await loadProfile(supabase, userId);
    if (!profile) {
      // Count totalRequired even if no profile
      for (const section of formSchema.sections) {
        for (const field of section.fields) {
          if (field.required) totalRequired++;
        }
      }
      return { values, filledCount, totalRequired, sources };
    }

    for (const section of formSchema.sections) {
      for (const field of section.fields) {
        if (field.required) totalRequired++;

        if (field.profileKey) {
          const profileValue = (profile as any)[field.profileKey];
          if (profileValue != null && profileValue !== '') {
            values[field.key] = String(profileValue);
            sources[field.key] = field.profileKey;
            filledCount++;
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[profile-memory] autofillFromProfile exception:', err?.message);
  }

  return { values, filledCount, totalRequired, sources };
}

/**
 * Record field provenance entries.
 * Uses the profile_field_provenance table. Gracefully degrades if the table
 * doesn't exist.
 */
export async function recordProvenance(
  supabase: SupabaseClient,
  userId: string,
  provenances: FieldProvenance[],
): Promise<void> {
  if (provenances.length === 0) return;

  try {
    const rows = provenances.map((p) => ({
      user_id: userId,
      field: p.field,
      value: p.value,
      source: p.source,
      confidence: p.confidence,
      last_updated: p.lastUpdated,
      source_ref: p.sourceRef ?? null,
    }));

    const { error } = await supabase
      .from('profile_field_provenance')
      .upsert(rows, { onConflict: 'user_id,field' });

    if (error) {
      // Table may not exist yet — this is expected during early rollout
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.warn('[profile-memory] profile_field_provenance table does not exist yet, skipping provenance write');
      } else {
        console.warn('[profile-memory] recordProvenance error:', error.message);
      }
    }
  } catch (err: any) {
    console.warn('[profile-memory] recordProvenance exception:', err?.message);
  }
}

/**
 * Get provenance for a single field.
 * Returns null if no provenance exists or if the table doesn't exist.
 */
export async function getFieldProvenance(
  supabase: SupabaseClient,
  userId: string,
  field: string,
): Promise<FieldProvenance | null> {
  try {
    const { data, error } = await supabase
      .from('profile_field_provenance')
      .select('*')
      .eq('user_id', userId)
      .eq('field', field)
      .maybeSingle();

    if (error) {
      // Table may not exist — degrade silently
      return null;
    }
    if (!data) return null;

    return {
      field: data.field,
      value: data.value,
      source: data.source,
      confidence: data.confidence ?? 1,
      lastUpdated: data.last_updated ?? data.created_at ?? new Date().toISOString(),
      sourceRef: data.source_ref ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * After a form submission, extract and save any new profile data.
 * Looks at fields with profileKey mappings and merges them into the profile.
 */
export async function learnFromFormSubmission(
  supabase: SupabaseClient,
  userId: string,
  serviceSlug: string,
  formValues: Record<string, string>,
  formSchema: {
    sections: Array<{
      fields: Array<{ key: string; profileKey?: string }>;
    }>;
  },
): Promise<{ newFieldsLearned: string[]; updatedFields: string[] }> {
  const newFieldsLearned: string[] = [];
  const updatedFields: string[] = [];

  try {
    const profile = await loadProfile(supabase, userId);

    // Build a map of profileKey -> value from the submitted form
    const profileUpdates: Record<string, string | null> = {};
    for (const section of formSchema.sections) {
      for (const field of section.fields) {
        if (!field.profileKey) continue;
        const submittedValue = formValues[field.key];
        if (submittedValue == null || submittedValue === '') continue;

        profileUpdates[field.profileKey] = submittedValue;

        // Track whether this is a new field or an update
        const existingValue = profile ? (profile as any)[field.profileKey] : null;
        if (existingValue == null || existingValue === '') {
          newFieldsLearned.push(field.profileKey);
        } else if (existingValue !== submittedValue) {
          updatedFields.push(field.profileKey);
        }
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const sourceRef = `${serviceSlug}-form-${new Date().toISOString().slice(0, 7)}`;
      await mergeProfileFields(
        supabase,
        userId,
        profileUpdates,
        'form_submission',
        sourceRef,
      );
    }
  } catch (err: any) {
    console.warn('[profile-memory] learnFromFormSubmission exception:', err?.message);
  }

  return { newFieldsLearned, updatedFields };
}
