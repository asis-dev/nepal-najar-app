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
    { key: 'father_name_ne', label: "बुबाको नाम", profileKey: 'father_name_ne' },
    { key: 'mother_name_en', label: "Mother's name", profileKey: 'mother_name_en' },
    { key: 'mother_name_ne', label: "आमाको नाम", profileKey: 'mother_name_ne' },
    { key: 'grandfather_name_en', label: "Grandfather's name", profileKey: 'grandfather_name_en' },
    { key: 'spouse_name_en', label: "Spouse's name", profileKey: 'spouse_name_en' },
    { key: 'date_of_birth', label: 'Date of birth', type: 'date' as const, required: true, profileKey: 'date_of_birth' },
    { key: 'gender', label: 'Gender', type: 'select' as const, options: ['male','female','other'], profileKey: 'gender' },
    { key: 'nationality', label: 'Nationality', profileKey: 'nationality' },
    { key: 'marital_status', label: 'Marital status', type: 'select' as const, options: ['unmarried','married','divorced','widowed'], profileKey: 'marital_status' },
    { key: 'citizenship_no', label: 'Citizenship no.', required: true, profileKey: 'citizenship_no' },
    { key: 'citizenship_issue_date', label: 'Citizenship issue date', type: 'date' as const, profileKey: 'citizenship_issue_date' },
    { key: 'citizenship_issue_district', label: 'Citizenship issue district', profileKey: 'citizenship_issue_district' },
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
const TEMP_ADDRESS_SECTION = {
  title: 'Temporary address',
  fields: [
    { key: 'temporary_province', label: 'Province', profileKey: 'temporary_province' },
    { key: 'temporary_district', label: 'District', profileKey: 'temporary_district' },
    { key: 'temporary_municipality', label: 'Municipality / VDC', profileKey: 'temporary_municipality' },
    { key: 'temporary_ward', label: 'Ward no.', profileKey: 'temporary_ward' },
    { key: 'temporary_tole', label: 'Tole / street', profileKey: 'temporary_tole' },
  ],
};
const CONTACT_SECTION = {
  title: 'Contact',
  fields: [
    { key: 'mobile', label: 'Mobile', type: 'tel' as const, required: true, profileKey: 'mobile' },
    { key: 'email', label: 'Email', type: 'email' as const, profileKey: 'email' },
    { key: 'emergency_contact_name', label: 'Emergency contact name', profileKey: 'emergency_contact_name' },
    { key: 'emergency_contact_phone', label: 'Emergency contact phone', type: 'tel' as const, profileKey: 'emergency_contact_phone' },
  ],
};

export const FORM_SCHEMAS: Record<string, FormSchema> = {
  'new-passport': {
    slug: 'new-passport', title: 'Passport application', title_ne: 'राहदानी आवेदन',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Passport-specific', fields: [
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'religion', label: 'Religion', profileKey: 'religion' },
        { key: 'ethnicity', label: 'Ethnicity / caste', profileKey: 'ethnicity' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
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
      ]},
      ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'pan-individual': {
    slug: 'pan-individual', title: 'PAN registration (individual)',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Income', fields: [
        { key: 'pan_no', label: 'Existing PAN (if any)', profileKey: 'pan_no' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'employer', label: 'Employer', profileKey: 'employer' },
        { key: 'annual_income_npr', label: 'Annual income (NPR)', type: 'number', profileKey: 'annual_income_npr' },
      ]},
    ],
  },
  'drivers-license-renewal': {
    slug: 'drivers-license-renewal', title: "Driver's license renewal",
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'License', fields: [
        { key: 'driving_license_no', label: 'License no.', required: true, profileKey: 'driving_license_no' },
        { key: 'license_category', label: 'Category (A/B/K)' },
        { key: 'license_expiry', label: 'Current expiry', type: 'date' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
      ]},
    ],
  },
  'voter-registration': {
    slug: 'voter-registration', title: 'Voter registration',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Voter details', fields: [
        { key: 'voter_id_no', label: 'Existing voter ID (if any)', profileKey: 'voter_id_no' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
      ]},
    ],
  },
  'national-id': {
    slug: 'national-id', title: 'National ID registration',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Other', fields: [
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'religion', label: 'Religion', profileKey: 'religion' },
        { key: 'ethnicity', label: 'Ethnicity / caste', profileKey: 'ethnicity' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'voter_id_no', label: 'Voter ID no.', profileKey: 'voter_id_no' },
      ]},
    ],
  },

  // ── More services ──
  'passport-renewal': {
    slug: 'passport-renewal', title: 'Passport renewal', title_ne: 'राहदानी नवीकरण',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Current passport', fields: [
        { key: 'passport_no', label: 'Passport no.', required: true, profileKey: 'passport_no' },
        { key: 'passport_expiry', label: 'Expiry date', type: 'date', profileKey: 'passport_expiry' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
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
        { key: 'birth_place', label: 'Place of birth', profileKey: 'permanent_district' },
        { key: 'birth_hospital', label: 'Hospital / facility' },
      ]},
      { title: 'Father', fields: [
        { key: 'father_name_en', label: "Father's name", profileKey: 'full_name_en' },
        { key: 'father_name_ne', label: "बुबाको नाम", profileKey: 'full_name_ne' },
        { key: 'father_citizenship_no', label: "Father's citizenship no.", profileKey: 'citizenship_no' },
        { key: 'father_citizenship_district', label: "Father's citizenship district", profileKey: 'citizenship_issue_district' },
        { key: 'father_nationality', label: "Father's nationality", profileKey: 'nationality' },
        { key: 'father_occupation', label: "Father's occupation", profileKey: 'occupation' },
      ]},
      { title: 'Mother', fields: [
        { key: 'mother_name_en', label: "Mother's name", profileKey: 'spouse_name_en' },
        { key: 'mother_citizenship_no', label: "Mother's citizenship no." },
        { key: 'mother_nationality', label: "Mother's nationality" },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'marriage-certificate': {
    slug: 'marriage-certificate', title: 'Marriage certificate', title_ne: 'विवाह दर्ता प्रमाणपत्र',
    sections: [
      { title: 'Groom', fields: [
        { key: 'groom_name', label: 'Groom full name', required: true, profileKey: 'full_name_en' },
        { key: 'groom_father_name', label: "Groom's father's name", profileKey: 'father_name_en' },
        { key: 'groom_grandfather_name', label: "Groom's grandfather's name", profileKey: 'grandfather_name_en' },
        { key: 'groom_citizenship', label: "Groom's citizenship no.", profileKey: 'citizenship_no' },
        { key: 'groom_dob', label: "Groom's date of birth", type: 'date', profileKey: 'date_of_birth' },
        { key: 'groom_age', label: "Groom's age at marriage", type: 'number' },
        { key: 'groom_nationality', label: "Groom's nationality", profileKey: 'nationality' },
      ]},
      { title: 'Bride', fields: [
        { key: 'bride_name', label: 'Bride full name', required: true, profileKey: 'spouse_name_en' },
        { key: 'bride_father_name', label: "Bride's father's name" },
        { key: 'bride_citizenship', label: "Bride's citizenship no." },
        { key: 'bride_dob', label: "Bride's date of birth", type: 'date' },
        { key: 'bride_age', label: "Bride's age at marriage", type: 'number' },
        { key: 'bride_nationality', label: "Bride's nationality" },
      ]},
      { title: 'Marriage details', fields: [
        { key: 'marriage_date', label: 'Date of marriage', type: 'date', required: true },
        { key: 'marriage_place', label: 'Place of marriage' },
        { key: 'witness_1_name', label: 'Witness 1 name' },
        { key: 'witness_1_citizenship', label: 'Witness 1 citizenship no.' },
        { key: 'witness_2_name', label: 'Witness 2 name' },
        { key: 'witness_2_citizenship', label: 'Witness 2 citizenship no.' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
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
        { key: 'full_name_ne', label: 'तपाईंको पुरा नाम', profileKey: 'full_name_ne' },
        { key: 'relationship', label: 'Relationship to deceased' },
        { key: 'citizenship_no', label: 'Your citizenship no.', profileKey: 'citizenship_no' },
        { key: 'citizenship_issue_district', label: 'Citizenship issue district', profileKey: 'citizenship_issue_district' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'migration-certificate': {
    slug: 'migration-certificate', title: 'Migration certificate', title_ne: 'बसाइँ सराइ प्रमाणपत्र',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION,
      { title: 'New address (moving to)', fields: [
        { key: 'new_province', label: 'New province', profileKey: 'temporary_province' },
        { key: 'new_district', label: 'New district', profileKey: 'temporary_district' },
        { key: 'new_municipality', label: 'New municipality/VDC', profileKey: 'temporary_municipality' },
        { key: 'new_ward', label: 'New ward no.', profileKey: 'temporary_ward' },
        { key: 'new_tole', label: 'New tole / street', profileKey: 'temporary_tole' },
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
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Employment', fields: [
        { key: 'destination_country', label: 'Destination country', required: true },
        { key: 'employer_name', label: 'Employer name', required: true },
        { key: 'job_type', label: 'Job type / position', profileKey: 'occupation' },
        { key: 'contract_period', label: 'Contract period (months)', type: 'number' },
        { key: 'salary', label: 'Monthly salary (foreign currency)', type: 'number' },
        { key: 'passport_no', label: 'Passport no.', required: true, profileKey: 'passport_no' },
        { key: 'passport_expiry', label: 'Passport expiry', type: 'date', profileKey: 'passport_expiry' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
      ]},
    ],
  },
  'land-ownership-transfer': {
    slug: 'land-ownership-transfer', title: 'Land ownership transfer', title_ne: 'जग्गा नामसारी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION,
      { title: 'Land details', fields: [
        { key: 'kitta_no', label: 'Kitta no. (plot no.)', required: true },
        { key: 'area_ropani', label: 'Area (Ropani-Aana-Paisa-Dam)' },
        { key: 'land_district', label: 'Land district', required: true, profileKey: 'permanent_district' },
        { key: 'land_municipality', label: 'Land municipality / VDC', profileKey: 'permanent_municipality' },
        { key: 'land_ward', label: 'Land ward no.', profileKey: 'permanent_ward' },
      ]},
      { title: 'Transfer', fields: [
        { key: 'transfer_type', label: 'Type', type: 'select', options: ['sale','gift','inheritance','partition'], required: true },
        { key: 'buyer_name', label: 'Buyer / recipient name' },
        { key: 'buyer_citizenship', label: 'Buyer citizenship no.' },
        { key: 'pan_no', label: 'Your PAN no.', profileKey: 'pan_no' },
      ]},
      CONTACT_SECTION,
    ],
  },
  'vehicle-registration': {
    slug: 'vehicle-registration', title: 'Vehicle registration', title_ne: 'सवारी दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
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
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Tax', fields: [
        { key: 'pan_no', label: 'PAN no.', required: true, profileKey: 'pan_no' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'employer', label: 'Employer', profileKey: 'employer' },
        { key: 'annual_income_npr', label: 'Annual income (NPR)', type: 'number', profileKey: 'annual_income_npr' },
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
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Employment', fields: [
        { key: 'pan_no', label: 'Your PAN no.', profileKey: 'pan_no' },
        { key: 'employer', label: 'Employer name', required: true, profileKey: 'employer' },
        { key: 'employer_pan', label: "Employer's PAN no." },
        { key: 'designation', label: 'Designation', profileKey: 'occupation' },
        { key: 'join_date', label: 'Date of joining', type: 'date' },
        { key: 'monthly_salary', label: 'Monthly salary (NPR)', type: 'number' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
      ]},
    ],
  },
  'bluebook-renewal': {
    slug: 'bluebook-renewal', title: 'Bluebook (vehicle) renewal', title_ne: 'ब्लुबुक नवीकरण',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Vehicle', fields: [
        { key: 'registration_no', label: 'Vehicle registration no.', required: true },
        { key: 'vehicle_type', label: 'Type', type: 'select', options: ['motorcycle','scooter','car','jeep','van','bus','truck'] },
        { key: 'bluebook_no', label: 'Current bluebook no.' },
        { key: 'driving_license_no', label: 'Driving license no.', profileKey: 'driving_license_no' },
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

  // ── Citizenship variants ──
  'citizenship-by-birth': {
    slug: 'citizenship-by-birth', title: 'Citizenship by birth', title_ne: 'जन्मको आधारमा नागरिकता',
    sections: [
      NAMES_SECTION,
      { title: 'Parents', fields: [
        { key: 'father_citizenship_no', label: "Father's citizenship no." },
        { key: 'father_citizenship_district', label: "Father's citizenship district", profileKey: 'citizenship_issue_district' },
        { key: 'mother_citizenship_no', label: "Mother's citizenship no." },
      ]},
      { title: 'Birth details', fields: [
        { key: 'birth_place', label: 'Place of birth', profileKey: 'permanent_district' },
        { key: 'birth_hospital', label: 'Hospital / facility' },
      ]},
      ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'citizenship-duplicate': {
    slug: 'citizenship-duplicate', title: 'Duplicate citizenship certificate', title_ne: 'नागरिकता प्रतिलिपि',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Original citizenship', fields: [
        { key: 'original_citizenship_no', label: 'Original citizenship no.', profileKey: 'citizenship_no' },
        { key: 'original_issue_date', label: 'Original issue date', type: 'date', profileKey: 'citizenship_issue_date' },
        { key: 'original_issue_district', label: 'Original issue district', profileKey: 'citizenship_issue_district' },
        { key: 'reason', label: 'Reason for duplicate', type: 'select', options: ['lost','damaged','name_change','other'], required: true },
        { key: 'police_report_no', label: 'Police report no. (if lost)' },
      ]},
    ],
  },

  // ── Civil registration ──
  'birth-registration': {
    slug: 'birth-registration', title: 'Birth registration', title_ne: 'जन्म दर्ता',
    sections: [
      { title: 'Child', fields: [
        { key: 'child_name_en', label: 'Child full name (English)', required: true },
        { key: 'child_name_ne', label: 'बालकको पुरा नाम' },
        { key: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
        { key: 'gender', label: 'Gender', type: 'select', options: ['male','female','other'], required: true },
        { key: 'birth_place', label: 'Place of birth', profileKey: 'permanent_district' },
        { key: 'birth_hospital', label: 'Hospital / facility' },
      ]},
      { title: 'Father', fields: [
        { key: 'father_name_en', label: "Father's name", profileKey: 'full_name_en' },
        { key: 'father_name_ne', label: "बुबाको नाम", profileKey: 'full_name_ne' },
        { key: 'father_citizenship_no', label: "Father's citizenship no.", profileKey: 'citizenship_no' },
        { key: 'father_occupation', label: "Father's occupation", profileKey: 'occupation' },
        { key: 'father_nationality', label: "Father's nationality", profileKey: 'nationality' },
      ]},
      { title: 'Mother', fields: [
        { key: 'mother_name_en', label: "Mother's name", profileKey: 'spouse_name_en' },
        { key: 'mother_citizenship_no', label: "Mother's citizenship no." },
        { key: 'mother_nationality', label: "Mother's nationality" },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'marriage-registration': {
    slug: 'marriage-registration', title: 'Marriage registration', title_ne: 'विवाह दर्ता',
    sections: [
      { title: 'Groom', fields: [
        { key: 'groom_name', label: 'Groom full name', required: true, profileKey: 'full_name_en' },
        { key: 'groom_father_name', label: "Groom's father's name", profileKey: 'father_name_en' },
        { key: 'groom_grandfather_name', label: "Groom's grandfather's name", profileKey: 'grandfather_name_en' },
        { key: 'groom_citizenship', label: "Groom's citizenship no.", profileKey: 'citizenship_no' },
        { key: 'groom_dob', label: "Groom's date of birth", type: 'date', profileKey: 'date_of_birth' },
        { key: 'groom_nationality', label: "Groom's nationality", profileKey: 'nationality' },
      ]},
      { title: 'Bride', fields: [
        { key: 'bride_name', label: 'Bride full name', required: true, profileKey: 'spouse_name_en' },
        { key: 'bride_father_name', label: "Bride's father's name" },
        { key: 'bride_citizenship', label: "Bride's citizenship no." },
        { key: 'bride_dob', label: "Bride's date of birth", type: 'date' },
        { key: 'bride_nationality', label: "Bride's nationality" },
      ]},
      { title: 'Marriage details', fields: [
        { key: 'marriage_date', label: 'Date of marriage', type: 'date', required: true },
        { key: 'marriage_place', label: 'Place of marriage' },
        { key: 'witness_1_name', label: 'Witness 1 name' },
        { key: 'witness_2_name', label: 'Witness 2 name' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'divorce-registration': {
    slug: 'divorce-registration', title: 'Divorce registration', title_ne: 'सम्बन्ध विच्छेद दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Marriage details', fields: [
        { key: 'spouse_name', label: 'Spouse full name', profileKey: 'spouse_name_en' },
        { key: 'marriage_date', label: 'Date of marriage', type: 'date' },
        { key: 'marriage_reg_no', label: 'Marriage registration no.' },
        { key: 'divorce_date', label: 'Date of divorce', type: 'date', required: true },
        { key: 'court_order_no', label: 'Court order no.' },
        { key: 'court_name', label: 'Court name' },
      ]},
    ],
  },
  'death-registration': {
    slug: 'death-registration', title: 'Death registration', title_ne: 'मृत्यु दर्ता',
    sections: [
      { title: 'Deceased', fields: [
        { key: 'deceased_name', label: 'Full name of deceased', required: true },
        { key: 'deceased_name_ne', label: 'मृतकको पुरा नाम' },
        { key: 'deceased_citizenship', label: 'Citizenship no.' },
        { key: 'date_of_death', label: 'Date of death', type: 'date', required: true },
        { key: 'place_of_death', label: 'Place of death' },
        { key: 'cause_of_death', label: 'Cause of death' },
        { key: 'deceased_age', label: 'Age at death', type: 'number' },
        { key: 'deceased_gender', label: 'Gender', type: 'select', options: ['male','female','other'] },
      ]},
      { title: 'Informant (you)', fields: [
        { key: 'full_name_en', label: 'Your full name', required: true, profileKey: 'full_name_en' },
        { key: 'relationship', label: 'Relationship to deceased', required: true },
        { key: 'citizenship_no', label: 'Your citizenship no.', profileKey: 'citizenship_no' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },

  // ── Police ──
  'police-report': {
    slug: 'police-report', title: 'Police report (FIR)', title_ne: 'प्रहरी प्रतिवेदन',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Incident', fields: [
        { key: 'incident_type', label: 'Incident type', type: 'select', options: ['theft','assault','fraud','accident','lost_document','domestic','other'], required: true },
        { key: 'incident_date', label: 'Date of incident', type: 'date', required: true },
        { key: 'incident_time', label: 'Time of incident' },
        { key: 'incident_location', label: 'Location of incident', required: true },
        { key: 'description', label: 'Description of incident', type: 'textarea', required: true },
        { key: 'suspect_info', label: 'Suspect information (if any)', type: 'textarea' },
        { key: 'witnesses', label: 'Witnesses (names, contact)', type: 'textarea' },
        { key: 'items_lost', label: 'Items lost / damaged', type: 'textarea' },
      ]},
    ],
  },

  // ── Transport / Vehicle ──
  'drivers-license-new': {
    slug: 'drivers-license-new', title: 'New driving license', title_ne: 'नयाँ सवारी चालक अनुमतिपत्र',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'License', fields: [
        { key: 'license_category', label: 'Category', type: 'select', options: ['A','B','C','D','E','F','G','H','I','J','K'], required: true },
        { key: 'blood_group', label: 'Blood group', required: true, profileKey: 'blood_group' },
        { key: 'education_level', label: 'Education level' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
      ]},
    ],
  },
  'drivers-license-trial': {
    slug: 'drivers-license-trial', title: 'Driving license trial booking', title_ne: 'ट्रायल बुकिङ',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Trial', fields: [
        { key: 'license_category', label: 'Category', type: 'select', options: ['A','B','C','D','E','F','G','H','I','J','K'], required: true },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'preferred_date', label: 'Preferred trial date', type: 'date' },
        { key: 'trial_center', label: 'Trial center' },
      ]},
    ],
  },
  'bike-bluebook-renewal': {
    slug: 'bike-bluebook-renewal', title: 'Bike bluebook renewal', title_ne: 'मोटरसाइकल ब्लुबुक नवीकरण',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Vehicle', fields: [
        { key: 'registration_no', label: 'Registration no.', required: true },
        { key: 'vehicle_type', label: 'Type', type: 'select', options: ['motorcycle','scooter','electric_bike'] },
        { key: 'bluebook_no', label: 'Current bluebook no.' },
        { key: 'driving_license_no', label: 'Driving license no.', profileKey: 'driving_license_no' },
        { key: 'insurance_company', label: 'Insurance company' },
        { key: 'insurance_policy_no', label: 'Insurance policy no.' },
      ]},
    ],
  },
  'route-permit': {
    slug: 'route-permit', title: 'Vehicle route permit', title_ne: 'रुट परमिट',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Vehicle & route', fields: [
        { key: 'registration_no', label: 'Vehicle registration no.', required: true },
        { key: 'vehicle_type', label: 'Vehicle type', type: 'select', options: ['bus','minibus','microbus','tempo','truck','tanker'], required: true },
        { key: 'route_from', label: 'Route from', required: true },
        { key: 'route_to', label: 'Route to', required: true },
        { key: 'driving_license_no', label: 'Driving license no.', profileKey: 'driving_license_no' },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
      ]},
    ],
  },
  'bus-route-permit': {
    slug: 'bus-route-permit', title: 'Bus route permit', title_ne: 'बस रुट परमिट',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Bus & route', fields: [
        { key: 'registration_no', label: 'Bus registration no.', required: true },
        { key: 'seating_capacity', label: 'Seating capacity', type: 'number' },
        { key: 'route_from', label: 'Route from', required: true },
        { key: 'route_to', label: 'Route to', required: true },
        { key: 'operator_name', label: 'Operator / company name' },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
      ]},
    ],
  },
  'vehicle-tax-payment': {
    slug: 'vehicle-tax-payment', title: 'Vehicle tax payment', title_ne: 'सवारी कर भुक्तानी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Vehicle', fields: [
        { key: 'registration_no', label: 'Vehicle registration no.', required: true },
        { key: 'vehicle_type', label: 'Type', type: 'select', options: ['motorcycle','scooter','car','jeep','van','bus','truck'] },
        { key: 'bluebook_no', label: 'Bluebook no.' },
        { key: 'fiscal_year', label: 'Fiscal year', required: true },
      ]},
    ],
  },
  'pollution-test': {
    slug: 'pollution-test', title: 'Vehicle pollution test', title_ne: 'प्रदूषण परीक्षण',
    sections: [
      NAMES_SECTION, CONTACT_SECTION,
      { title: 'Vehicle', fields: [
        { key: 'registration_no', label: 'Vehicle registration no.', required: true },
        { key: 'vehicle_type', label: 'Type', type: 'select', options: ['motorcycle','scooter','car','jeep','van','bus','truck'] },
        { key: 'engine_type', label: 'Engine type', type: 'select', options: ['petrol','diesel','electric','hybrid'] },
        { key: 'preferred_date', label: 'Preferred test date', type: 'date' },
      ]},
    ],
  },
  'embossed-number-plate': {
    slug: 'embossed-number-plate', title: 'Embossed number plate', title_ne: 'इम्बोस्ड नम्बर प्लेट',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Vehicle', fields: [
        { key: 'registration_no', label: 'Vehicle registration no.', required: true },
        { key: 'vehicle_type', label: 'Type', type: 'select', options: ['motorcycle','scooter','car','jeep','van','bus','truck'], required: true },
        { key: 'bluebook_no', label: 'Bluebook no.', required: true },
        { key: 'chassis_no', label: 'Chassis no.' },
      ]},
    ],
  },

  // ── Tax / Business ──
  'vat-registration': {
    slug: 'vat-registration', title: 'VAT registration', title_ne: 'मूल्य अभिवृद्धि कर दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Business', fields: [
        { key: 'pan_no', label: 'PAN no.', required: true, profileKey: 'pan_no' },
        { key: 'business_name', label: 'Business name', required: true },
        { key: 'business_type', label: 'Business type', type: 'select', options: ['manufacturing','trading','service','import_export'], required: true },
        { key: 'annual_turnover', label: 'Estimated annual turnover (NPR)', type: 'number' },
        { key: 'employer', label: 'Business address / employer', profileKey: 'employer' },
      ]},
    ],
  },
  'income-tax-filing': {
    slug: 'income-tax-filing', title: 'Income tax filing', title_ne: 'आयकर विवरण',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Tax', fields: [
        { key: 'pan_no', label: 'PAN no.', required: true, profileKey: 'pan_no' },
        { key: 'fiscal_year', label: 'Fiscal year', required: true },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'employer', label: 'Employer', profileKey: 'employer' },
        { key: 'annual_income_npr', label: 'Annual income (NPR)', type: 'number', required: true, profileKey: 'annual_income_npr' },
        { key: 'tax_deducted', label: 'Tax deducted at source (NPR)', type: 'number' },
      ]},
    ],
  },
  'pan-business': {
    slug: 'pan-business', title: 'PAN registration (business)', title_ne: 'स्थायी लेखा नम्बर (व्यवसाय)',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Business', fields: [
        { key: 'business_name', label: 'Business name', required: true },
        { key: 'business_type', label: 'Business type', type: 'select', options: ['sole_proprietorship','partnership','pvt_ltd','public_ltd'], required: true },
        { key: 'registration_no', label: 'Company registration no.' },
        { key: 'start_date', label: 'Business start date', type: 'date' },
        { key: 'business_address', label: 'Business address' },
      ]},
    ],
  },
  'house-land-tax': {
    slug: 'house-land-tax', title: 'House & land tax payment', title_ne: 'घर जग्गा कर',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Property', fields: [
        { key: 'kitta_no', label: 'Kitta no. (plot no.)', required: true },
        { key: 'property_district', label: 'Property district', profileKey: 'permanent_district' },
        { key: 'property_municipality', label: 'Property municipality', profileKey: 'permanent_municipality' },
        { key: 'property_ward', label: 'Property ward', profileKey: 'permanent_ward' },
        { key: 'fiscal_year', label: 'Fiscal year', required: true },
        { key: 'property_type', label: 'Type', type: 'select', options: ['residential','commercial','agricultural','mixed'] },
      ]},
    ],
  },
  'ird-taxpayer-portal': {
    slug: 'ird-taxpayer-portal', title: 'IRD taxpayer portal registration', title_ne: 'आन्तरिक राजस्व करदाता पोर्टल',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Tax', fields: [
        { key: 'pan_no', label: 'PAN no.', required: true, profileKey: 'pan_no' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'employer', label: 'Employer', profileKey: 'employer' },
      ]},
    ],
  },
  'customs-declaration': {
    slug: 'customs-declaration', title: 'Customs declaration', title_ne: 'भन्सार घोषणा',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Customs', fields: [
        { key: 'passport_no', label: 'Passport no.', profileKey: 'passport_no' },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
        { key: 'travel_from', label: 'Arriving from', required: true },
        { key: 'items_description', label: 'Items to declare', type: 'textarea', required: true },
        { key: 'total_value', label: 'Total value (NPR)', type: 'number' },
        { key: 'purpose', label: 'Purpose', type: 'select', options: ['personal','commercial','gift','sample'] },
      ]},
    ],
  },

  // ── Business registration ──
  'company-registration-ocr': {
    slug: 'company-registration-ocr', title: 'Company registration (OCR)', title_ne: 'कम्पनी रजिस्ट्रार कार्यालय',
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
  'sole-proprietorship': {
    slug: 'sole-proprietorship', title: 'Sole proprietorship registration', title_ne: 'एकल स्वामित्व दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Business', fields: [
        { key: 'business_name', label: 'Business name', required: true },
        { key: 'business_name_ne', label: 'व्यापार नाम (नेपाली)' },
        { key: 'business_type', label: 'Nature of business', type: 'textarea', required: true },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
        { key: 'investment', label: 'Initial investment (NPR)', type: 'number' },
        { key: 'business_address', label: 'Business address' },
      ]},
    ],
  },
  'trademark-registration': {
    slug: 'trademark-registration', title: 'Trademark registration', title_ne: 'ट्रेडमार्क दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Trademark', fields: [
        { key: 'trademark_name', label: 'Trademark name / word', required: true },
        { key: 'trademark_class', label: 'Class (1-45)', type: 'number' },
        { key: 'description', label: 'Description of goods/services', type: 'textarea', required: true },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
        { key: 'applicant_type', label: 'Applicant type', type: 'select', options: ['individual','company','partnership'] },
      ]},
    ],
  },
  'ngo-registration': {
    slug: 'ngo-registration', title: 'NGO / association registration', title_ne: 'संस्था दर्ता',
    sections: [
      { title: 'Organization', fields: [
        { key: 'org_name', label: 'Organization name', required: true },
        { key: 'org_name_ne', label: 'संस्थाको नाम (नेपाली)' },
        { key: 'org_type', label: 'Type', type: 'select', options: ['ngo','ingo','community_org','trust','cooperative'], required: true },
        { key: 'objective', label: 'Objectives', type: 'textarea', required: true },
        { key: 'working_area', label: 'Working area / sector' },
      ]},
      { title: 'Chief promoter', fields: [
        { key: 'full_name_en', label: 'Chief promoter name', required: true, profileKey: 'full_name_en' },
        { key: 'citizenship_no', label: 'Citizenship no.', required: true, profileKey: 'citizenship_no' },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'industry-registration': {
    slug: 'industry-registration', title: 'Industry registration', title_ne: 'उद्योग दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Industry', fields: [
        { key: 'industry_name', label: 'Industry name', required: true },
        { key: 'industry_type', label: 'Type', type: 'select', options: ['manufacturing','service','tourism','agriculture','it','other'], required: true },
        { key: 'investment', label: 'Total investment (NPR)', type: 'number' },
        { key: 'employment', label: 'Expected employees', type: 'number' },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
        { key: 'location', label: 'Industry location' },
      ]},
    ],
  },
  'cottage-industry': {
    slug: 'cottage-industry', title: 'Cottage / small industry registration', title_ne: 'घरेलु तथा साना उद्योग दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Industry', fields: [
        { key: 'industry_name', label: 'Industry name', required: true },
        { key: 'product_type', label: 'Product / service type', required: true },
        { key: 'investment', label: 'Investment (NPR)', type: 'number' },
        { key: 'workers', label: 'Number of workers', type: 'number' },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
      ]},
    ],
  },
  'fssai-food-license': {
    slug: 'fssai-food-license', title: 'Food business license', title_ne: 'खाद्य व्यवसाय अनुमति',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Food business', fields: [
        { key: 'business_name', label: 'Business name', required: true },
        { key: 'food_type', label: 'Type of food business', type: 'select', options: ['restaurant','hotel','catering','manufacturing','retail','wholesale'], required: true },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
        { key: 'business_address', label: 'Business address' },
        { key: 'employees', label: 'Number of employees', type: 'number' },
      ]},
    ],
  },
  'tourism-trekking-permit': {
    slug: 'tourism-trekking-permit', title: 'Trekking permit', title_ne: 'ट्रेकिङ अनुमति',
    sections: [
      NAMES_SECTION, CONTACT_SECTION,
      { title: 'Trek details', fields: [
        { key: 'passport_no', label: 'Passport no.', required: true, profileKey: 'passport_no' },
        { key: 'nationality', label: 'Nationality', profileKey: 'nationality' },
        { key: 'trekking_area', label: 'Trekking area', type: 'select', options: ['annapurna','everest','langtang','manaslu','mustang','dolpo','kanchenjunga','makalu','other'], required: true },
        { key: 'entry_date', label: 'Entry date', type: 'date', required: true },
        { key: 'exit_date', label: 'Exit date', type: 'date' },
        { key: 'guide_name', label: 'Guide name' },
        { key: 'agency_name', label: 'Trekking agency' },
      ]},
    ],
  },

  // ── Land / Property ──
  'land-registration': {
    slug: 'land-registration', title: 'Land registration', title_ne: 'जग्गा दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Land', fields: [
        { key: 'kitta_no', label: 'Kitta no.', required: true },
        { key: 'area_ropani', label: 'Area (Ropani-Aana-Paisa-Dam)' },
        { key: 'land_district', label: 'District', required: true, profileKey: 'permanent_district' },
        { key: 'land_municipality', label: 'Municipality', profileKey: 'permanent_municipality' },
        { key: 'land_ward', label: 'Ward no.', profileKey: 'permanent_ward' },
        { key: 'land_type', label: 'Land type', type: 'select', options: ['residential','agricultural','commercial','forest','government'] },
      ]},
    ],
  },
  'land-parcha': {
    slug: 'land-parcha', title: 'Land ownership certificate (Lalpurja)', title_ne: 'लालपुर्जा',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Land', fields: [
        { key: 'kitta_no', label: 'Kitta no.', required: true },
        { key: 'land_district', label: 'District', required: true, profileKey: 'permanent_district' },
        { key: 'land_municipality', label: 'Municipality', profileKey: 'permanent_municipality' },
        { key: 'land_ward', label: 'Ward no.', profileKey: 'permanent_ward' },
      ]},
    ],
  },
  'land-mutation': {
    slug: 'land-mutation', title: 'Land mutation (Naam Saari)', title_ne: 'नाम सारी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Land', fields: [
        { key: 'kitta_no', label: 'Kitta no.', required: true },
        { key: 'area_ropani', label: 'Area' },
        { key: 'land_district', label: 'District', required: true, profileKey: 'permanent_district' },
        { key: 'land_municipality', label: 'Municipality', profileKey: 'permanent_municipality' },
        { key: 'land_ward', label: 'Ward no.', profileKey: 'permanent_ward' },
        { key: 'transfer_type', label: 'Transfer type', type: 'select', options: ['sale','gift','inheritance','partition'], required: true },
        { key: 'previous_owner', label: 'Previous owner name' },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
      ]},
    ],
  },
  'land-valuation': {
    slug: 'land-valuation', title: 'Land valuation certificate', title_ne: 'जग्गा मूल्याङ्कन',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Land', fields: [
        { key: 'kitta_no', label: 'Kitta no.', required: true },
        { key: 'land_district', label: 'District', profileKey: 'permanent_district' },
        { key: 'land_municipality', label: 'Municipality', profileKey: 'permanent_municipality' },
        { key: 'land_ward', label: 'Ward no.', profileKey: 'permanent_ward' },
        { key: 'purpose', label: 'Purpose', type: 'select', options: ['bank_loan','sale','insurance','tax','other'] },
      ]},
    ],
  },
  'land-measurement': {
    slug: 'land-measurement', title: 'Land measurement (Napi)', title_ne: 'जग्गा नापी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Land', fields: [
        { key: 'kitta_no', label: 'Kitta no.', required: true },
        { key: 'land_district', label: 'District', profileKey: 'permanent_district' },
        { key: 'land_municipality', label: 'Municipality', profileKey: 'permanent_municipality' },
        { key: 'land_ward', label: 'Ward no.', profileKey: 'permanent_ward' },
        { key: 'reason', label: 'Reason for measurement', type: 'select', options: ['dispute','partition','new_registration','correction'] },
      ]},
    ],
  },
  'land-inheritance': {
    slug: 'land-inheritance', title: 'Land inheritance transfer', title_ne: 'अंशबण्डा / उत्तराधिकार',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Land', fields: [
        { key: 'kitta_no', label: 'Kitta no.', required: true },
        { key: 'land_district', label: 'District', profileKey: 'permanent_district' },
        { key: 'land_municipality', label: 'Municipality', profileKey: 'permanent_municipality' },
        { key: 'deceased_owner', label: 'Deceased owner name', required: true },
        { key: 'relationship', label: 'Your relationship to deceased', required: true },
        { key: 'heirs_count', label: 'Total number of heirs', type: 'number' },
        { key: 'court_order_no', label: 'Court order no. (if applicable)' },
      ]},
    ],
  },

  // ── Utilities ──
  'nea-electricity-bill': {
    slug: 'nea-electricity-bill', title: 'NEA electricity bill payment', title_ne: 'बिजुली महसुल भुक्तानी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Electricity', fields: [
        { key: 'consumer_id', label: 'Consumer ID / SC no.', required: true },
        { key: 'meter_no', label: 'Meter no.' },
        { key: 'branch_office', label: 'NEA branch office' },
      ]},
    ],
  },
  'nea-new-connection': {
    slug: 'nea-new-connection', title: 'NEA new electricity connection', title_ne: 'नयाँ बिजुली जडान (NEA)',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Connection', fields: [
        { key: 'load_kw', label: 'Required load (kW)', type: 'number', required: true },
        { key: 'connection_type', label: 'Type', type: 'select', options: ['domestic','commercial','industrial'], required: true },
        { key: 'nearest_pole', label: 'Nearest pole / transformer' },
        { key: 'house_type', label: 'House type', type: 'select', options: ['permanent','semi_permanent','temporary'] },
      ]},
    ],
  },
  'kukl-water-bill': {
    slug: 'kukl-water-bill', title: 'KUKL water bill payment', title_ne: 'खानेपानी महसुल भुक्तानी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Water', fields: [
        { key: 'consumer_id', label: 'Consumer ID', required: true },
        { key: 'meter_no', label: 'Meter no.' },
        { key: 'branch', label: 'KUKL branch' },
      ]},
    ],
  },
  'kukl-new-connection': {
    slug: 'kukl-new-connection', title: 'KUKL new water connection', title_ne: 'नयाँ खानेपानी जडान',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Connection', fields: [
        { key: 'connection_type', label: 'Type', type: 'select', options: ['domestic','commercial','industrial'], required: true },
        { key: 'pipe_size', label: 'Pipe size', type: 'select', options: ['0.5_inch','0.75_inch','1_inch','1.5_inch','2_inch'] },
        { key: 'house_type', label: 'House type', type: 'select', options: ['permanent','semi_permanent','temporary'] },
      ]},
    ],
  },
  'lpg-booking': {
    slug: 'lpg-booking', title: 'LPG gas cylinder booking', title_ne: 'एलपीजी ग्यास बुकिङ',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'LPG', fields: [
        { key: 'consumer_no', label: 'Consumer no. (if existing)' },
        { key: 'cylinder_size', label: 'Cylinder size', type: 'select', options: ['14.2_kg','5_kg','2_kg'], required: true },
        { key: 'dealer_name', label: 'Dealer / distributor name' },
      ]},
    ],
  },
  'garbage-collection': {
    slug: 'garbage-collection', title: 'Garbage collection registration', title_ne: 'फोहोर संकलन दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Collection', fields: [
        { key: 'house_no', label: 'House no.' },
        { key: 'property_type', label: 'Type', type: 'select', options: ['residential','commercial','institutional'] },
        { key: 'frequency', label: 'Collection frequency', type: 'select', options: ['daily','alternate_days','weekly'] },
      ]},
    ],
  },

  // ── Telecom ──
  'ntc-sim-new': {
    slug: 'ntc-sim-new', title: 'NTC new SIM registration', title_ne: 'नेपाल टेलिकम नयाँ सिम',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'SIM', fields: [
        { key: 'sim_type', label: 'Type', type: 'select', options: ['prepaid','postpaid'], required: true },
        { key: 'plan', label: 'Plan', type: 'select', options: ['voice','data','combo'] },
      ]},
    ],
  },
  'ncell-sim-new': {
    slug: 'ncell-sim-new', title: 'Ncell new SIM registration', title_ne: 'एनसेल नयाँ सिम',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'SIM', fields: [
        { key: 'sim_type', label: 'Type', type: 'select', options: ['prepaid','postpaid'], required: true },
        { key: 'plan', label: 'Plan', type: 'select', options: ['voice','data','combo'] },
      ]},
    ],
  },
  'worldlink-internet': {
    slug: 'worldlink-internet', title: 'WorldLink internet connection', title_ne: 'वर्ल्डलिंक इन्टरनेट',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Internet', fields: [
        { key: 'plan', label: 'Plan', type: 'select', options: ['10mbps','25mbps','40mbps','60mbps','100mbps'] },
        { key: 'existing_customer', label: 'Existing customer?', type: 'select', options: ['yes','no'] },
        { key: 'customer_id', label: 'Customer ID (if existing)' },
      ]},
    ],
  },
  'internet-nt-adsl': {
    slug: 'internet-nt-adsl', title: 'Nepal Telecom internet / FTTH', title_ne: 'नेपाल टेलिकम इन्टरनेट',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Internet', fields: [
        { key: 'connection_type', label: 'Type', type: 'select', options: ['ftth','adsl','wimax'], required: true },
        { key: 'plan', label: 'Plan speed', type: 'select', options: ['10mbps','25mbps','40mbps','60mbps','100mbps'] },
        { key: 'landline_no', label: 'Existing landline no. (if any)' },
      ]},
    ],
  },

  // ── Health ──
  'bir-hospital-opd': {
    slug: 'bir-hospital-opd', title: 'Bir Hospital OPD registration', title_ne: 'वीर अस्पताल OPD',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'OPD', fields: [
        { key: 'department', label: 'Department', type: 'select', options: ['general','surgery','orthopedic','medicine','gynecology','pediatric','ent','eye','dental','dermatology','cardiology','neurology'] },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'existing_reg_no', label: 'Existing registration no. (if any)' },
        { key: 'referred_by', label: 'Referred by (doctor / hospital)' },
      ]},
    ],
  },
  'tuth-opd': {
    slug: 'tuth-opd', title: 'TUTH (Teaching Hospital) OPD', title_ne: 'शिक्षण अस्पताल OPD',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'OPD', fields: [
        { key: 'department', label: 'Department', type: 'select', options: ['general','surgery','orthopedic','medicine','gynecology','pediatric','ent','eye','dental','dermatology','psychiatry'] },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'existing_reg_no', label: 'Existing registration no.' },
      ]},
    ],
  },
  'patan-hospital-opd': {
    slug: 'patan-hospital-opd', title: 'Patan Hospital OPD', title_ne: 'पाटन अस्पताल OPD',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'OPD', fields: [
        { key: 'department', label: 'Department', type: 'select', options: ['general','surgery','medicine','gynecology','pediatric','ent','eye','dermatology'] },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'existing_reg_no', label: 'Existing registration no.' },
      ]},
    ],
  },
  'civil-hospital-opd': {
    slug: 'civil-hospital-opd', title: 'Civil Hospital OPD', title_ne: 'सिभिल अस्पताल OPD',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'OPD', fields: [
        { key: 'department', label: 'Department' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'existing_reg_no', label: 'Existing registration no.' },
      ]},
    ],
  },
  'vaccination-child': {
    slug: 'vaccination-child', title: 'Child vaccination registration', title_ne: 'बाल खोप दर्ता',
    sections: [
      { title: 'Child', fields: [
        { key: 'child_name', label: 'Child full name', required: true },
        { key: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
        { key: 'gender', label: 'Gender', type: 'select', options: ['male','female','other'] },
        { key: 'birth_weight', label: 'Birth weight (kg)', type: 'number' },
      ]},
      { title: 'Parent / Guardian', fields: [
        { key: 'full_name_en', label: 'Parent name', required: true, profileKey: 'full_name_en' },
        { key: 'citizenship_no', label: 'Citizenship no.', profileKey: 'citizenship_no' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'health-insurance-board': {
    slug: 'health-insurance-board', title: 'Health insurance registration', title_ne: 'स्वास्थ्य बीमा दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Insurance', fields: [
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'family_members', label: 'Family members to cover', type: 'number' },
        { key: 'health_facility', label: 'Preferred health facility' },
      ]},
    ],
  },
  'kanti-childrens-hospital': {
    slug: 'kanti-childrens-hospital', title: "Kanti Children's Hospital", title_ne: 'कान्ति बाल अस्पताल',
    sections: [
      { title: 'Child patient', fields: [
        { key: 'child_name', label: 'Child full name', required: true },
        { key: 'child_age', label: 'Age', type: 'number', required: true },
        { key: 'gender', label: 'Gender', type: 'select', options: ['male','female','other'] },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
      ]},
      { title: 'Parent / Guardian', fields: [
        { key: 'full_name_en', label: 'Parent name', required: true, profileKey: 'full_name_en' },
        { key: 'citizenship_no', label: 'Citizenship no.', profileKey: 'citizenship_no' },
      ]},
      ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'maternity-hospital': {
    slug: 'maternity-hospital', title: 'Maternity Hospital (Prasuti Griha)', title_ne: 'प्रसूती गृह',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Registration', fields: [
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'expected_delivery', label: 'Expected delivery date', type: 'date' },
        { key: 'gravida', label: 'Number of pregnancies', type: 'number' },
        { key: 'existing_reg_no', label: 'Existing registration no.' },
      ]},
    ],
  },
  'bharatpur-cancer': {
    slug: 'bharatpur-cancer', title: 'BP Koirala Cancer Hospital', title_ne: 'बी.पी. कोइराला क्यान्सर अस्पताल',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Registration', fields: [
        { key: 'department', label: 'Department', type: 'select', options: ['medical_oncology','surgical_oncology','radiation','pathology','radiology','general'] },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'referred_by', label: 'Referred by' },
        { key: 'existing_reg_no', label: 'Existing registration no.' },
      ]},
    ],
  },
  'ambulance-102': {
    slug: 'ambulance-102', title: 'Ambulance service (102)', title_ne: 'एम्बुलेन्स सेवा',
    sections: [
      { title: 'Patient', fields: [
        { key: 'patient_name', label: 'Patient name', required: true, profileKey: 'full_name_en' },
        { key: 'patient_age', label: 'Age', type: 'number' },
        { key: 'gender', label: 'Gender', type: 'select', options: ['male','female','other'], profileKey: 'gender' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'condition', label: 'Condition / emergency type', type: 'textarea', required: true },
      ]},
      { title: 'Pickup', fields: [
        { key: 'pickup_location', label: 'Pickup location', required: true },
        { key: 'destination_hospital', label: 'Destination hospital' },
      ]},
      CONTACT_SECTION,
    ],
  },

  // ── NRN / Immigration ──
  'nrn-card': {
    slug: 'nrn-card', title: 'Non-Resident Nepali (NRN) card', title_ne: 'गैर आवासीय नेपाली परिचयपत्र',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'NRN details', fields: [
        { key: 'passport_no', label: 'Passport no.', required: true, profileKey: 'passport_no' },
        { key: 'passport_expiry', label: 'Passport expiry', type: 'date', profileKey: 'passport_expiry' },
        { key: 'current_country', label: 'Current country of residence', required: true },
        { key: 'current_address', label: 'Address abroad' },
        { key: 'visa_type', label: 'Visa type', type: 'select', options: ['permanent_resident','work_visa','student_visa','citizen','other'] },
        { key: 'occupation_abroad', label: 'Occupation abroad', profileKey: 'occupation' },
      ]},
    ],
  },

  // ── Finance ──
  'bank-account-opening': {
    slug: 'bank-account-opening', title: 'Bank account opening', title_ne: 'बैंक खाता खोल्ने',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Account', fields: [
        { key: 'account_type', label: 'Account type', type: 'select', options: ['savings','current','fixed_deposit','call_deposit'], required: true },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'employer', label: 'Employer', profileKey: 'employer' },
        { key: 'annual_income_npr', label: 'Annual income (NPR)', type: 'number', profileKey: 'annual_income_npr' },
        { key: 'nominee_name', label: 'Nominee name', profileKey: 'spouse_name_en' },
        { key: 'nominee_relationship', label: 'Nominee relationship' },
      ]},
    ],
  },
  'forex-card-nrb': {
    slug: 'forex-card-nrb', title: 'Foreign exchange / forex card', title_ne: 'विदेशी मुद्रा',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Forex', fields: [
        { key: 'passport_no', label: 'Passport no.', required: true, profileKey: 'passport_no' },
        { key: 'travel_destination', label: 'Travel destination', required: true },
        { key: 'travel_date', label: 'Travel date', type: 'date' },
        { key: 'amount_usd', label: 'Amount (USD)', type: 'number' },
        { key: 'purpose', label: 'Purpose', type: 'select', options: ['travel','education','medical','business','other'] },
        { key: 'pan_no', label: 'PAN no.', profileKey: 'pan_no' },
      ]},
    ],
  },
  'esewa-wallet': {
    slug: 'esewa-wallet', title: 'eSewa wallet registration', title_ne: 'इसेवा वालेट',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'khalti-wallet': {
    slug: 'khalti-wallet', title: 'Khalti wallet registration', title_ne: 'खल्ती वालेट',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
    ],
  },
  'remittance-inward': {
    slug: 'remittance-inward', title: 'Inward remittance collection', title_ne: 'रेमिट्यान्स संकलन',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Remittance', fields: [
        { key: 'sender_name', label: 'Sender name', required: true },
        { key: 'sender_country', label: 'Sender country', required: true },
        { key: 'reference_no', label: 'Reference / control no.', required: true },
        { key: 'remit_company', label: 'Remittance company', type: 'select', options: ['western_union','ime','prabhu','city_express','samsara','other'] },
        { key: 'bank_account', label: 'Bank account no. (if direct deposit)' },
      ]},
    ],
  },

  // ── Education ──
  'see-results': {
    slug: 'see-results', title: 'SEE results check', title_ne: 'SEE नतिजा',
    sections: [
      NAMES_SECTION, CONTACT_SECTION,
      { title: 'Exam', fields: [
        { key: 'symbol_no', label: 'Symbol no.', required: true },
        { key: 'exam_year', label: 'Exam year', required: true },
        { key: 'school_name', label: 'School name' },
        { key: 'district', label: 'District', profileKey: 'permanent_district' },
      ]},
    ],
  },
  'tu-transcript': {
    slug: 'tu-transcript', title: 'TU transcript request', title_ne: 'त्रि.वि. ट्रान्सक्रिप्ट',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Education', fields: [
        { key: 'tu_registration_no', label: 'TU registration no.', required: true },
        { key: 'exam_roll_no', label: 'Exam roll no.' },
        { key: 'faculty', label: 'Faculty', type: 'select', options: ['humanities','management','science','education','law','medicine','engineering','forestry'] },
        { key: 'program', label: 'Program (BA/BSc/MA etc.)' },
        { key: 'campus', label: 'Campus name' },
        { key: 'pass_year', label: 'Year of passing' },
      ]},
    ],
  },
  'noc-foreign-study': {
    slug: 'noc-foreign-study', title: 'NOC for foreign study', title_ne: 'विदेश अध्ययन अनापत्ति',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Study', fields: [
        { key: 'passport_no', label: 'Passport no.', required: true, profileKey: 'passport_no' },
        { key: 'destination_country', label: 'Destination country', required: true },
        { key: 'university', label: 'University / institution name', required: true },
        { key: 'program', label: 'Program / course name', required: true },
        { key: 'study_level', label: 'Level', type: 'select', options: ['bachelors','masters','phd','diploma','language'], required: true },
        { key: 'admission_letter_date', label: 'Admission letter date', type: 'date' },
        { key: 'previous_degree', label: 'Previous highest degree' },
      ]},
    ],
  },
  'scholarship-portal': {
    slug: 'scholarship-portal', title: 'Government scholarship portal', title_ne: 'छात्रवृत्ति पोर्टल',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Education', fields: [
        { key: 'current_level', label: 'Current education level', type: 'select', options: ['+2','bachelors','masters','phd'], required: true },
        { key: 'institution', label: 'Institution name' },
        { key: 'gpa', label: 'GPA / percentage' },
        { key: 'scholarship_type', label: 'Scholarship type', type: 'select', options: ['merit','need_based','research','govt_quota','reserved'] },
        { key: 'study_field', label: 'Field of study' },
        { key: 'ethnicity', label: 'Ethnicity / caste', profileKey: 'ethnicity' },
      ]},
    ],
  },
  'loksewa-application': {
    slug: 'loksewa-application', title: 'Lok Sewa (PSC) application', title_ne: 'लोक सेवा आयोग आवेदन',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Exam', fields: [
        { key: 'post_name', label: 'Post / position name', required: true },
        { key: 'service_group', label: 'Service / group', type: 'select', options: ['admin','judicial','audit','parliament','engineering','health','education','agriculture','forest','misc'] },
        { key: 'level', label: 'Level (officer/non-gazetted)' },
        { key: 'ad_no', label: 'Advertisement no.', required: true },
        { key: 'education_level', label: 'Education level', type: 'select', options: ['slc','+2','bachelors','masters','phd'] },
        { key: 'experience_years', label: 'Experience (years)', type: 'number' },
        { key: 'ethnicity', label: 'Ethnicity', profileKey: 'ethnicity' },
        { key: 'gender', label: 'Gender', profileKey: 'gender' },
      ]},
    ],
  },

  // ── Legal / Complaints ──
  'consumer-complaint': {
    slug: 'consumer-complaint', title: 'Consumer complaint', title_ne: 'उपभोक्ता उजुरी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Complaint', fields: [
        { key: 'against_business', label: 'Business / company name', required: true },
        { key: 'product_service', label: 'Product / service', required: true },
        { key: 'purchase_date', label: 'Purchase date', type: 'date' },
        { key: 'amount_paid', label: 'Amount paid (NPR)', type: 'number' },
        { key: 'complaint_detail', label: 'Complaint details', type: 'textarea', required: true },
        { key: 'relief_sought', label: 'Relief sought', type: 'textarea' },
      ]},
    ],
  },
  'lokpal-complaint': {
    slug: 'lokpal-complaint', title: 'Lokpal (Ombudsman) complaint', title_ne: 'लोकपाल उजुरी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Complaint', fields: [
        { key: 'against_office', label: 'Against which office/official', required: true },
        { key: 'complaint_type', label: 'Type', type: 'select', options: ['service_delay','misconduct','corruption','discrimination','other'] },
        { key: 'incident_date', label: 'Incident date', type: 'date' },
        { key: 'complaint_detail', label: 'Details', type: 'textarea', required: true },
        { key: 'previous_complaints', label: 'Previous complaints filed?', type: 'select', options: ['yes','no'] },
      ]},
    ],
  },
  'court-case-lookup': {
    slug: 'court-case-lookup', title: 'Court case status lookup', title_ne: 'मुद्दा स्थिति खोज',
    sections: [
      NAMES_SECTION, CONTACT_SECTION,
      { title: 'Case', fields: [
        { key: 'case_no', label: 'Case no.', required: true },
        { key: 'court_name', label: 'Court name', required: true },
        { key: 'case_type', label: 'Case type', type: 'select', options: ['civil','criminal','writ','appeal','revision'] },
        { key: 'party_name', label: 'Party name (plaintiff/defendant)' },
        { key: 'filing_date', label: 'Filing date', type: 'date' },
      ]},
    ],
  },
  'legal-aid': {
    slug: 'legal-aid', title: 'Free legal aid application', title_ne: 'निःशुल्क कानूनी सहायता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Legal aid', fields: [
        { key: 'case_type', label: 'Case type', type: 'select', options: ['civil','criminal','family','labor','property','other'], required: true },
        { key: 'case_description', label: 'Brief description of case', type: 'textarea', required: true },
        { key: 'annual_income_npr', label: 'Annual income (NPR)', type: 'number', profileKey: 'annual_income_npr' },
        { key: 'existing_lawyer', label: 'Do you have a lawyer?', type: 'select', options: ['yes','no'] },
      ]},
    ],
  },
  'right-to-information': {
    slug: 'right-to-information', title: 'Right to Information (RTI) request', title_ne: 'सूचनाको हक अनुरोध',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'RTI Request', fields: [
        { key: 'target_office', label: 'Office / authority', required: true },
        { key: 'information_sought', label: 'Information sought', type: 'textarea', required: true },
        { key: 'reason', label: 'Reason for request', type: 'textarea' },
        { key: 'preferred_format', label: 'Preferred format', type: 'select', options: ['photocopy','certified_copy','email','inspect'] },
      ]},
    ],
  },
  'ciaa-complaint': {
    slug: 'ciaa-complaint', title: 'CIAA anti-corruption complaint', title_ne: 'अख्तियार दुरुपयोग उजुरी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Complaint', fields: [
        { key: 'against_official', label: 'Against whom (name/position)', required: true },
        { key: 'against_office', label: 'Office / institution' },
        { key: 'corruption_type', label: 'Type', type: 'select', options: ['bribery','embezzlement','nepotism','abuse_of_authority','forgery','other'], required: true },
        { key: 'incident_date', label: 'Incident date', type: 'date' },
        { key: 'complaint_detail', label: 'Detailed description', type: 'textarea', required: true },
        { key: 'evidence_description', label: 'Evidence available', type: 'textarea' },
      ]},
    ],
  },
  'human-rights-complaint': {
    slug: 'human-rights-complaint', title: 'Human rights complaint (NHRC)', title_ne: 'मानव अधिकार उजुरी',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Complaint', fields: [
        { key: 'violation_type', label: 'Type of violation', type: 'select', options: ['discrimination','torture','disappearance','arbitrary_detention','freedom_of_speech','property_rights','other'], required: true },
        { key: 'against_whom', label: 'Against whom', required: true },
        { key: 'incident_date', label: 'Incident date', type: 'date', required: true },
        { key: 'incident_location', label: 'Incident location', required: true },
        { key: 'complaint_detail', label: 'Detailed description', type: 'textarea', required: true },
        { key: 'victim_name', label: 'Victim name (if different)', profileKey: 'full_name_en' },
      ]},
    ],
  },

  // ── National ID variant ──
  'national-id-nid': {
    slug: 'national-id-nid', title: 'National ID (NID) registration', title_ne: 'राष्ट्रिय परिचयपत्र दर्ता',
    sections: [
      NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION,
      { title: 'Other', fields: [
        { key: 'national_id_no', label: 'Existing NID (if any)', profileKey: 'national_id_no' },
        { key: 'blood_group', label: 'Blood group', profileKey: 'blood_group' },
        { key: 'religion', label: 'Religion', profileKey: 'religion' },
        { key: 'ethnicity', label: 'Ethnicity / caste', profileKey: 'ethnicity' },
        { key: 'occupation', label: 'Occupation', profileKey: 'occupation' },
        { key: 'voter_id_no', label: 'Voter ID no.', profileKey: 'voter_id_no' },
      ]},
    ],
  },
};

export function getOrBuildSchema(slug: string, titleEn: string): FormSchema {
  if (FORM_SCHEMAS[slug]) return FORM_SCHEMAS[slug];
  return { slug, title: titleEn, sections: [NAMES_SECTION, ADDRESS_SECTION, TEMP_ADDRESS_SECTION, CONTACT_SECTION] };
}
