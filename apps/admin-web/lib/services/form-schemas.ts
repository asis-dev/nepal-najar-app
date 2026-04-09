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

  // ── More services ──
  'passport-renewal': {
    slug: 'passport-renewal', title: 'Passport renewal', title_ne: 'राहदानी नवीकरण',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Current passport', fields: [
        { key: 'passport_no', label: 'Passport no.', required: true, profileKey: 'passport_no' },
        { key: 'passport_expiry', label: 'Expiry date', type: 'date', profileKey: 'passport_expiry' },
        { key: 'reason', label: 'Reason for renewal', type: 'select', options: ['expired','damaged','pages_full','name_change'] },
      ]},
    ],
  },
  'birth-certificate': {
    slug: 'birth-certificate', title: 'Birth certificate', title_ne: 'जन्म दर्ता प्रमाणपत्र',
    sections: [
      { title: 'Child', fields: [
        { key: 'child_name_en', label: 'Child full name (English)', required: true },
        { key: 'child_name_ne', label: 'बालकको पुरा नाम' },
        { key: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
        { key: 'gender', label: 'Gender', type: 'select', options: ['male','female','other'], required: true },
        { key: 'birth_place', label: 'Place of birth' },
        { key: 'birth_hospital', label: 'Hospital / facility' },
      ]},
      { title: 'Father', fields: [
        { key: 'father_name_en', label: "Father's name", profileKey: 'father_name_en' },
        { key: 'father_citizenship_no', label: "Father's citizenship no." },
      ]},
      { title: 'Mother', fields: [
        { key: 'mother_name_en', label: "Mother's name", profileKey: 'mother_name_en' },
        { key: 'mother_citizenship_no', label: "Mother's citizenship no." },
      ]},
      CONTACT_SECTION,
    ],
  },
  'marriage-certificate': {
    slug: 'marriage-certificate', title: 'Marriage certificate', title_ne: 'विवाह दर्ता प्रमाणपत्र',
    sections: [
      { title: 'Groom', fields: [
        { key: 'groom_name', label: 'Groom full name', required: true },
        { key: 'groom_citizenship', label: "Groom's citizenship no." },
        { key: 'groom_age', label: "Groom's age at marriage", type: 'number' },
      ]},
      { title: 'Bride', fields: [
        { key: 'bride_name', label: 'Bride full name', required: true },
        { key: 'bride_citizenship', label: "Bride's citizenship no." },
        { key: 'bride_age', label: "Bride's age at marriage", type: 'number' },
      ]},
      { title: 'Marriage details', fields: [
        { key: 'marriage_date', label: 'Date of marriage', type: 'date', required: true },
        { key: 'marriage_place', label: 'Place of marriage' },
        { key: 'witness_1_name', label: 'Witness 1 name' },
        { key: 'witness_2_name', label: 'Witness 2 name' },
      ]},
      CONTACT_SECTION,
    ],
  },
  'death-certificate': {
    slug: 'death-certificate', title: 'Death certificate', title_ne: 'मृत्यु दर्ता प्रमाणपत्र',
    sections: [
      { title: 'Deceased', fields: [
        { key: 'deceased_name', label: 'Full name of deceased', required: true },
        { key: 'deceased_citizenship', label: 'Citizenship no.' },
        { key: 'date_of_death', label: 'Date of death', type: 'date', required: true },
        { key: 'place_of_death', label: 'Place of death' },
        { key: 'cause_of_death', label: 'Cause of death' },
      ]},
      { title: 'Informant (you)', fields: [
        { key: 'full_name_en', label: 'Your full name', required: true, profileKey: 'full_name_en' },
        { key: 'relationship', label: 'Relationship to deceased' },
        { key: 'citizenship_no', label: 'Your citizenship no.', profileKey: 'citizenship_no' },
      ]},
      CONTACT_SECTION,
    ],
  },
  'migration-certificate': {
    slug: 'migration-certificate', title: 'Migration certificate', title_ne: 'बसाइँ सराइ प्रमाणपत्र',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION,
      { title: 'Migration details', fields: [
        { key: 'new_province', label: 'New province' },
        { key: 'new_district', label: 'New district' },
        { key: 'new_municipality', label: 'New municipality/VDC' },
        { key: 'new_ward', label: 'New ward no.' },
        { key: 'reason', label: 'Reason for migration', type: 'textarea' },
        { key: 'family_members_count', label: 'Family members moving', type: 'number' },
      ]},
      CONTACT_SECTION,
    ],
  },
  'recommendation-letter': {
    slug: 'recommendation-letter', title: 'Ward recommendation letter', title_ne: 'वडा सिफारिस पत्र',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Recommendation', fields: [
        { key: 'purpose', label: 'Purpose', type: 'select', options: ['bank_account','passport','license','employment','other'], required: true },
        { key: 'purpose_detail', label: 'Details', type: 'textarea' },
      ]},
    ],
  },
  'company-registration': {
    slug: 'company-registration', title: 'Company registration', title_ne: 'कम्पनी दर्ता',
    sections: [
      { title: 'Company', fields: [
        { key: 'company_name', label: 'Proposed company name', required: true },
        { key: 'company_name_ne', label: 'कम्पनी नाम (नेपाली)' },
        { key: 'company_type', label: 'Type', type: 'select', options: ['pvt_ltd','public_ltd','partnership','sole_proprietorship'], required: true },
        { key: 'objective', label: 'Main objective', type: 'textarea', required: true },
        { key: 'capital', label: 'Authorized capital (NPR)', type: 'number' },
      ]},
      { title: 'Promoter', fields: [
        { key: 'full_name_en', label: 'Promoter name', required: true, profileKey: 'full_name_en' },
        { key: 'citizenship_no', label: 'Citizenship no.', required: true, profileKey: 'citizenship_no' },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'labor-permit': {
    slug: 'labor-permit', title: 'Foreign employment labor permit', title_ne: 'श्रम स्वीकृति',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Employment', fields: [
        { key: 'destination_country', label: 'Destination country', required: true },
        { key: 'employer_name', label: 'Employer name', required: true },
        { key: 'job_type', label: 'Job type / position' },
        { key: 'contract_period', label: 'Contract period (months)', type: 'number' },
        { key: 'salary', label: 'Monthly salary (foreign currency)', type: 'number' },
        { key: 'passport_no', label: 'Passport no.', required: true, profileKey: 'passport_no' },
      ]},
    ],
  },
  'land-ownership-transfer': {
    slug: 'land-ownership-transfer', title: 'Land ownership transfer', title_ne: 'जग्गा नामसारी',
    sections: [
      NAMES_SECTION,
      { title: 'Land details', fields: [
        { key: 'kitta_no', label: 'Kitta no. (plot no.)', required: true },
        { key: 'area_ropani', label: 'Area (Ropani-Aana-Paisa-Dam)' },
        { key: 'district', label: 'District', required: true },
        { key: 'municipality', label: 'Municipality / VDC' },
        { key: 'ward', label: 'Ward no.' },
      ]},
      { title: 'Transfer', fields: [
        { key: 'transfer_type', label: 'Type', type: 'select', options: ['sale','gift','inheritance','partition'], required: true },
        { key: 'buyer_name', label: 'Buyer / recipient name' },
        { key: 'buyer_citizenship', label: 'Buyer citizenship no.' },
      ]},
      CONTACT_SECTION,
    ],
  },
  'vehicle-registration': {
    slug: 'vehicle-registration', title: 'Vehicle registration', title_ne: 'सवारी दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Vehicle', fields: [
        { key: 'vehicle_type', label: 'Type', type: 'select', options: ['motorcycle','scooter','car','jeep','van','bus','truck'], required: true },
        { key: 'company', label: 'Make / brand', required: true },
        { key: 'model', label: 'Model' },
        { key: 'engine_no', label: 'Engine no.', required: true },
        { key: 'chassis_no', label: 'Chassis no.', required: true },
        { key: 'cc', label: 'Engine CC', type: 'number' },
        { key: 'color', label: 'Color' },
        { key: 'purchase_date', label: 'Purchase date', type: 'date' },
      ]},
    ],
  },
  'tax-clearance': {
    slug: 'tax-clearance', title: 'Tax clearance certificate', title_ne: 'कर चुक्ता प्रमाणपत्र',
    sections: [
      NAMES_SECTION, CONTACT_SECTION,
      { title: 'Tax', fields: [
        { key: 'pan_no', label: 'PAN no.', required: true, profileKey: 'pan_no' },
        { key: 'fiscal_year', label: 'Fiscal year', required: true },
        { key: 'purpose', label: 'Purpose of clearance', type: 'select', options: ['travel','business','tender','other'] },
      ]},
    ],
  },
  'scholarship-application': {
    slug: 'scholarship-application', title: 'Scholarship application', title_ne: 'छात्रवृत्ति आवेदन',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Education', fields: [
        { key: 'current_level', label: 'Current education level', type: 'select', options: ['+2','bachelors','masters','phd'], required: true },
        { key: 'institution', label: 'Institution name' },
        { key: 'gpa', label: 'GPA / percentage' },
        { key: 'scholarship_type', label: 'Scholarship type', type: 'select', options: ['merit','need_based','research','govt_quota'] },
        { key: 'study_field', label: 'Field of study' },
      ]},
    ],
  },
  'ssf-registration': {
    slug: 'ssf-registration', title: 'Social Security Fund registration', title_ne: 'सामाजिक सुरक्षा कोष दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Employment', fields: [
        { key: 'employer', label: 'Employer name', required: true, profileKey: 'employer' },
        { key: 'employer_pan', label: "Employer's PAN no." },
        { key: 'designation', label: 'Designation' },
        { key: 'join_date', label: 'Date of joining', type: 'date' },
        { key: 'monthly_salary', label: 'Monthly salary (NPR)', type: 'number' },
      ]},
    ],
  },
  'bluebook-renewal': {
    slug: 'bluebook-renewal', title: 'Bluebook (vehicle) renewal', title_ne: 'ब्लुबुक नवीकरण',
    sections: [
      NAMES_SECTION, CONTACT_SECTION,
      { title: 'Vehicle', fields: [
        { key: 'registration_no', label: 'Vehicle registration no.', required: true },
        { key: 'vehicle_type', label: 'Type', type: 'select', options: ['motorcycle','scooter','car','jeep','van','bus','truck'] },
        { key: 'bluebook_no', label: 'Current bluebook no.' },
        { key: 'insurance_company', label: 'Insurance company' },
        { key: 'insurance_policy_no', label: 'Insurance policy no.' },
      ]},
    ],
  },
  'new-electricity-connection': {
    slug: 'new-electricity-connection', title: 'New electricity connection', title_ne: 'नयाँ बिजुली जडान',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Connection', fields: [
        { key: 'load_kw', label: 'Required load (kW)', type: 'number', required: true },
        { key: 'connection_type', label: 'Type', type: 'select', options: ['domestic','commercial','industrial'], required: true },
        { key: 'nearest_pole', label: 'Nearest pole / transformer reference' },
      ]},
    ],
  },
};

export function getOrBuildSchema(slug: string, titleEn: string): FormSchema {
  if (FORM_SCHEMAS[slug]) return FORM_SCHEMAS[slug];
  return { slug, title: titleEn, sections: [NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION] };
}
