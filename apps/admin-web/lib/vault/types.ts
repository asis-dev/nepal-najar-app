/**
 * Nepal Republic — User Document Vault types.
 * Works alongside lib/services/ — a vault doc can be linked to 1+ services.
 */

export type VaultDocType =
  | 'citizenship'
  | 'passport'
  | 'drivers_license'
  | 'national_id'
  | 'pan'
  | 'voter_id'
  | 'bluebook'
  | 'insurance'
  | 'academic_certificate'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'land_dhani_purja'
  | 'other';

export interface VaultDoc {
  id: string;
  ownerId: string;
  docType: VaultDocType;
  title: string;
  number?: string;
  issuedOn?: string;
  expiresOn?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  notes?: string;
  tags: string[];
  linkedServiceSlugs: string[];
  createdAt: string;
  updatedAt: string;
}

export const DOC_TYPE_META: Record<VaultDocType, { icon: string; title: { en: string; ne: string }; hasExpiry: boolean }> = {
  citizenship:          { icon: '🪪', title: { en: 'Citizenship',        ne: 'नागरिकता' },           hasExpiry: false },
  passport:             { icon: '📘', title: { en: 'Passport',           ne: 'राहदानी' },            hasExpiry: true  },
  drivers_license:      { icon: '🚗', title: { en: "Driver's License",   ne: 'सवारी अनुमतिपत्र' },    hasExpiry: true  },
  national_id:          { icon: '🆔', title: { en: 'National ID',        ne: 'राष्ट्रिय परिचयपत्र' },  hasExpiry: false },
  pan:                  { icon: '🧾', title: { en: 'PAN Card',           ne: 'PAN कार्ड' },          hasExpiry: false },
  voter_id:             { icon: '🗳',  title: { en: 'Voter ID',           ne: 'मतदाता परिचयपत्र' },    hasExpiry: false },
  bluebook:             { icon: '📖', title: { en: 'Vehicle Bluebook',   ne: 'सवारी बिलबुक' },        hasExpiry: true  },
  insurance:            { icon: '🛡', title: { en: 'Insurance',          ne: 'बीमा' },               hasExpiry: true  },
  academic_certificate: { icon: '🎓', title: { en: 'Academic Certificate', ne: 'शैक्षिक प्रमाणपत्र' }, hasExpiry: false },
  birth_certificate:    { icon: '👶', title: { en: 'Birth Certificate',  ne: 'जन्मदर्ता' },           hasExpiry: false },
  marriage_certificate: { icon: '💍', title: { en: 'Marriage Certificate', ne: 'विवाहदर्ता' },        hasExpiry: false },
  land_dhani_purja:     { icon: '📜', title: { en: 'Land Dhani Purja',   ne: 'धनी पुर्जा' },          hasExpiry: false },
  other:                { icon: '📄', title: { en: 'Other Document',     ne: 'अन्य कागजात' },         hasExpiry: true  },
};

export const DOC_TYPE_ORDER: VaultDocType[] = [
  'citizenship','national_id','passport','drivers_license','pan',
  'bluebook','insurance','voter_id','birth_certificate','marriage_certificate',
  'academic_certificate','land_dhani_purja','other',
];

/** Suggest which services a doc is useful for (plain data, no AI needed). */
export const DOC_SERVICE_HINTS: Record<VaultDocType, string[]> = {
  citizenship:          ['new-passport','citizenship-by-descent','pan-individual','drivers-license-renewal','bank-account-opening'],
  passport:             ['forex-card-nrb'],
  drivers_license:      ['drivers-license-renewal','bike-bluebook-renewal'],
  national_id:          [],
  pan:                  ['income-tax-filing','bank-account-opening','vat-registration'],
  voter_id:             [],
  bluebook:             ['bike-bluebook-renewal','vehicle-registration'],
  insurance:            ['bike-bluebook-renewal'],
  academic_certificate: ['tu-transcript','see-results'],
  birth_certificate:    ['citizenship-by-descent','new-passport'],
  marriage_certificate: ['new-passport'],
  land_dhani_purja:     ['land-registration','land-parcha','land-mutation'],
  other:                [],
};
