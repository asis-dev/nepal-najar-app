/**
 * Nepal Republic — Services Directory types.
 * Bilingual (English + Nepali) by design. Every user-visible field has `_en` and `_ne`.
 */

export type ServiceCategory =
  | 'identity'
  | 'transport'
  | 'tax'
  | 'health'
  | 'utilities'
  | 'business'
  | 'land'
  | 'banking'
  | 'education'
  | 'legal';

export type ProviderType =
  | 'gov'
  | 'private'
  | 'bank'
  | 'hospital'
  | 'utility'
  | 'telecom';

export interface Bilingual {
  en: string;
  ne: string;
}

export interface ServiceDocument {
  title: Bilingual;
  required: boolean;
  notes?: Bilingual;
}

export interface ServiceStep {
  order: number;
  title: Bilingual;
  detail: Bilingual;
}

export interface ServiceOffice {
  name: Bilingual;
  address: Bilingual;
  phone?: string;
  lat?: number;
  lng?: number;
  hours?: Bilingual;
  mapsUrl?: string;
}

export interface ServiceProblem {
  problem: Bilingual;
  solution: Bilingual;
}

export interface ServiceFaq {
  q: Bilingual;
  a: Bilingual;
}

export interface Service {
  id?: string;
  slug: string;
  category: ServiceCategory;
  providerType: ProviderType;
  providerName: string;

  title: Bilingual;
  summary: Bilingual;

  estimatedTime?: Bilingual;
  feeRange?: Bilingual;
  officialUrl?: string;

  documents: ServiceDocument[];
  steps: ServiceStep[];
  offices: ServiceOffice[];
  commonProblems: ServiceProblem[];
  faqs: ServiceFaq[];
  tags: string[];

  verifiedAt: string; // ISO
}

export const CATEGORY_LABELS: Record<ServiceCategory, Bilingual> = {
  identity:  { en: 'Identity & Documents', ne: 'नागरिकता र कागजात' },
  transport: { en: 'Transport & License',  ne: 'यातायात र लाइसेन्स' },
  tax:       { en: 'Tax & PAN',            ne: 'कर र प्यान' },
  health:    { en: 'Health & Hospitals',   ne: 'स्वास्थ्य र अस्पताल' },
  utilities: { en: 'Utilities & Bills',    ne: 'उपयोगिता र बिल' },
  business:  { en: 'Business Registration',ne: 'व्यवसाय दर्ता' },
  land:      { en: 'Land & Property',      ne: 'जग्गा र सम्पत्ति' },
  banking:   { en: 'Banking',              ne: 'बैङ्किङ' },
  education: { en: 'Education',            ne: 'शिक्षा' },
  legal:     { en: 'Legal & Courts',       ne: 'कानुनी र अदालत' },
};

export const CATEGORY_ICONS: Record<ServiceCategory, string> = {
  identity: '🪪',
  transport: '🚗',
  tax: '🧾',
  health: '🏥',
  utilities: '💡',
  business: '🏢',
  land: '📜',
  banking: '🏦',
  education: '🎓',
  legal: '⚖️',
};
