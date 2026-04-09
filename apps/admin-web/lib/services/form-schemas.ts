export type FormField = {
  key: string;
  label: string;
  label_ne?: string;
  type?: 'text' | 'date' | 'number' | 'select' | 'textarea' | 'tel' | 'email';
  required?: boolean;
  options?: string[];
  profileKey?: string;
};
export type FormSchema = {
  slug: string;
  title: string;
  title_ne?: string;
  sections: Array<{ title: string; fields: FormField[] }>;
};

const NAMES_SECTION = {
  title: 'Applicant',
  fields: [
    { key: 'full_name_en', label: 'Full name (English)', required: true, profileKey: 'full_name_en' },
    { key: 'full_name_ne', label: 'पूरा नाम', profileKey: 'full_name_ne' },
    { key: 'father_name_en', label: "Father's name", profileKey: 'father_name_en' },
    { key: 'mother_name_en', label: "Mother's name", profileKey: 'mother_name_en' },
    { key: 'date_of_birth', label: 'Date of birth', type: 'date' as const, required: true, profileKey: 'date_of_birth' },
    { key: 'gender', label: 'Gender', type: 'select' as const, options: ['male','female','other'], profileKey: 'gender' },
    { key: 'citizenship_no', label: 'Citizenship no.', required: true, profileKey: 'citizenship_no' },
  ],
};
const ADDRESS_SECTION = {
  title: 'Permanent address',
  fields: [
    { key: 'permanent_province', label: 'Province', required: true, profileKey: 'permanent_province' },
    { key: 'permanent_district', label: 'District', required: true, profileKey: 'permanent_district' },
    { key: 'permanent_municipality', label: 'Municipality / VDC', required: true, profileKey: 'permanent_municipality' },
    { key: 'permanent_ward', label: 'Ward no.', required: true, profileKey: 'permanent_ward' },
    { key: 'permanent_tole', label: 'Tole / street', profileKey: 'permanent_tole' },
  ],
};
const CONTACT_SECTION = {
  title: 'Contact',
  fields: [
    { key: 'mobile', label: 'Mobile', type: 'tel' as const, required: true, profileKey: 'mobile' },
    { key: 'email', label: 'Email', type: 'email' as const, profileKey: 'email' },
  ],
};

export const FORM_SCHEMAS: Record<string, FormSchema> = {
  'new-passport': {
    slug: 'new-passport', title: 'Passport application', title_ne: 'राहदानी आवेदन',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Passport-specific', fields: [
        { key: 'emergency_contact_name', label: 'Emergency contact name', profileKey: 'emergency_contact_name' },
        { key: 'emergency_contact_phone', label: 'Emergency contact phone', type: 'tel', profileKey: 'emergency_contact_phone' },
        { key: 'purpose', label: 'Purpose of travel', type: 'textarea' },
      ]},
    ],
  },
  'citizenship-by-descent': {
    slug: 'citizenship-by-descent', title: 'Citizenship by descent',
    sections: [
      NAMES_SECTION,
      { title: 'Parents', fields: [
        { key: 'father_citizenship_no', label: "Father's citizenship no." },
        { key: 'mother_citizenship_no', label: "Mother's citizenship no." },
        { key: 'grandfather_name_en', label: "Grandfather's name", profileKey: 'grandfather_name_en' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'pan-individual': {
    slug: 'pan-individual', title: 'PAN registration (individual)',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Income', fields: [
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'employer', label: 'Employer', profileKey: 'employer' },
        { key: 'annual_income_npr', label: 'Annual income (NPR)', type: 'number', profileKey: 'annual_income_npr' },
      ]},
    ],
  },
  'drivers-license-renewal': {
    slug: 'drivers-license-renewal', title: "Driver's license renewal",
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'License', fields: [
        { key: 'driving_license_no', label: 'License no.', required: true, profileKey: 'driving_license_no' },
        { key: 'license_category', label: 'Category (A/B/K)' },
        { key: 'license_expiry', label: 'Current expiry', type: 'date' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
      ]},
    ],
  },
  'voter-registration': {
    slug: 'voter-registration', title: 'Voter registration',
    sections: [NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION],
  },
  'national-id': {
    slug: 'national-id', title: 'National ID registration',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Other', fields: [
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'religion', label: 'Religion', profileKey: 'religion' },
        { key: 'ethnicity', label: 'Ethnicity / caste', profileKey: 'ethnicity' },
      ]},
    ],
  },
};

export function getOrBuildSchema(slug: string, titleEn: string): FormSchema {
  if (FORM_SCHEMAS[slug]) return FORM_SCHEMAS[slug];
  return { slug, title: titleEn, sections: [NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION] };
}
