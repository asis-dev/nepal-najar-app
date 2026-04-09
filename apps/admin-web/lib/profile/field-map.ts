/**
 * Maps common government form field names to user_identity_profile columns.
 * Any service form can `autofillFromProfile(profile, fields)` to pre-populate.
 */
export const FIELD_SYNONYMS: Record<string, string[]> = {
  full_name_en: ['fullname', 'name', 'applicant_name', 'full_name', 'nameEn'],
  full_name_ne: ['name_ne', 'पुरा_नाम', 'applicant_name_ne'],
  father_name_en: ['father', 'father_name', 'fathersname'],
  mother_name_en: ['mother', 'mother_name', 'mothersname'],
  grandfather_name_en: ['grandfather', 'grandfather_name'],
  spouse_name_en: ['spouse', 'spouse_name', 'husband', 'wife'],
  citizenship_no: ['citizenship', 'citizenship_number', 'citizen_id'],
  citizenship_issue_date: ['citizenship_date', 'citizenship_issued'],
  citizenship_issue_district: ['citizenship_district'],
  passport_no: ['passport', 'passport_number'],
  passport_expiry: ['passport_exp'],
  pan_no: ['pan', 'pan_number'],
  national_id_no: ['nid', 'national_id'],
  voter_id_no: ['voter_id', 'voter'],
  driving_license_no: ['license', 'license_no', 'driving_license'],
  date_of_birth: ['dob', 'birthdate', 'birth_date'],
  gender: ['sex'],
  blood_group: ['bloodgroup'],
  nationality: ['country'],
  religion: [],
  ethnicity: ['caste'],
  marital_status: ['marital'],
  permanent_province: ['p_province', 'perm_province'],
  permanent_district: ['p_district', 'perm_district'],
  permanent_municipality: ['p_municipality', 'perm_municipality', 'p_vdc'],
  permanent_ward: ['p_ward', 'perm_ward'],
  permanent_tole: ['p_tole', 'perm_tole', 'p_street'],
  temporary_province: ['t_province', 'temp_province', 'current_province'],
  temporary_district: ['t_district', 'temp_district', 'current_district'],
  temporary_municipality: ['t_municipality', 'temp_municipality', 'current_municipality'],
  temporary_ward: ['t_ward', 'temp_ward', 'current_ward'],
  temporary_tole: ['t_tole', 'temp_tole', 'current_tole', 'current_street'],
  mobile: ['phone', 'phone_number', 'contact'],
  email: ['email_address'],
  emergency_contact_name: ['emergency_name', 'next_of_kin'],
  emergency_contact_phone: ['emergency_phone'],
  occupation: ['profession', 'job'],
  employer: ['company'],
  annual_income_npr: ['income', 'annual_income'],
};

/**
 * Given a profile row and a list of form field keys, return an object
 * that maps form field -> profile value by matching canonical name or synonym.
 */
export function autofillFromProfile(
  profile: Record<string, any> | null,
  fieldKeys: string[]
): Record<string, any> {
  if (!profile) return {};
  const out: Record<string, any> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const k of fieldKeys) {
    const nk = normalize(k);
    // direct column match
    if (profile[k] != null && profile[k] !== '') {
      out[k] = profile[k];
      continue;
    }
    // canonical column with normalized match
    for (const col of Object.keys(FIELD_SYNONYMS)) {
      if (normalize(col) === nk || FIELD_SYNONYMS[col].some((s) => normalize(s) === nk)) {
        if (profile[col] != null && profile[col] !== '') {
          out[k] = profile[col];
        }
        break;
      }
    }
  }
  return out;
}

/**
 * Profile completeness % — used for gentle nudges.
 */
export function profileCompleteness(p: Record<string, any> | null): number {
  if (!p) return 0;
  const important = [
    'full_name_en','full_name_ne','father_name_en','mother_name_en',
    'citizenship_no','date_of_birth','gender',
    'permanent_province','permanent_district','permanent_municipality','permanent_ward',
    'mobile',
  ];
  const filled = important.filter((k) => p[k] != null && p[k] !== '').length;
  return Math.round((filled / important.length) * 100);
}
