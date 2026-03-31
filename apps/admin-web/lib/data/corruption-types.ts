/**
 * Corruption Tracking — Type Definitions & Constants
 *
 * Maps directly to the corruption_* tables defined in
 * supabase/033-corruption-tracking.sql. Provides TypeScript
 * types, display labels, and color constants for the UI.
 */

/* ═══════════════════════════════════════════════
   UNION TYPES (mirror SQL CHECK constraints)
   ═══════════════════════════════════════════════ */

export type CorruptionType =
  | 'bribery'
  | 'embezzlement'
  | 'nepotism'
  | 'money_laundering'
  | 'land_grab'
  | 'procurement_fraud'
  | 'tax_evasion'
  | 'abuse_of_authority'
  | 'kickback'
  | 'other';

export type CaseStatus =
  | 'alleged'
  | 'under_investigation'
  | 'charged'
  | 'trial'
  | 'convicted'
  | 'acquitted'
  | 'asset_recovery'
  | 'closed';

export type Severity = 'minor' | 'major' | 'mega';

export type SourceQuality = 'confirmed' | 'reported' | 'alleged';

export type EntityType =
  | 'person'
  | 'politician'
  | 'official'
  | 'company'
  | 'organization'
  | 'shell_company'
  | 'bank_account'
  | 'property';

export type EntityRole =
  | 'accused'
  | 'witness'
  | 'victim'
  | 'investigator'
  | 'beneficiary'
  | 'whistleblower'
  | 'facilitator'
  | 'accomplice';

export type InvolvementStatus =
  | 'alleged'
  | 'charged'
  | 'convicted'
  | 'acquitted'
  | 'cooperating'
  | 'fugitive';

export type RelationshipType =
  | 'business_partner'
  | 'family'
  | 'appointed_by'
  | 'shell_company_of'
  | 'political_ally'
  | 'employer_employee'
  | 'financial_link'
  | 'co_accused'
  | 'bribe_giver_receiver';

export type RelationshipStrength = 'confirmed' | 'probable' | 'suspected';

export type MoneyFlowType =
  | 'bribe'
  | 'kickback'
  | 'embezzlement'
  | 'transfer'
  | 'purchase'
  | 'investment'
  | 'laundering'
  | 'asset_acquisition';

export type DatePrecision = 'exact' | 'month' | 'year' | 'approximate';

export type VerificationStatus = 'confirmed' | 'reported' | 'alleged';

export type EvidenceType =
  | 'news_article'
  | 'ciaa_report'
  | 'court_filing'
  | 'government_document'
  | 'whistleblower'
  | 'financial_record'
  | 'property_record'
  | 'intelligence_signal'
  | 'social_media'
  | 'interview'
  | 'leaked_document';

export type EvidenceReliability = 'high' | 'medium' | 'low';

export type TimelineEventType =
  | 'allegation'
  | 'complaint_filed'
  | 'investigation_started'
  | 'fir_registered'
  | 'arrested'
  | 'charge_sheet_filed'
  | 'trial_started'
  | 'verdict'
  | 'appeal'
  | 'asset_frozen'
  | 'asset_recovered'
  | 'fugitive_declared'
  | 'extradition'
  | 'acquitted'
  | 'pardoned'
  | 'other';

/* ═══════════════════════════════════════════════
   INTERFACES (mirror DB rows)
   ═══════════════════════════════════════════════ */

export interface CorruptionCase {
  id: string;
  slug: string;
  title: string;
  title_ne: string | null;
  summary: string | null;
  summary_ne: string | null;
  corruption_type: CorruptionType;
  status: CaseStatus;
  severity: Severity | null;
  estimated_amount_npr: number | null;
  verified: boolean;
  source_quality: SourceQuality | null;
  related_commitment_ids: number[] | null;
  related_body_slugs: string[] | null;
  tags: string[] | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorruptionEntity {
  id: string;
  slug: string;
  name: string;
  name_ne: string | null;
  entity_type: EntityType;
  title: string | null;
  title_ne: string | null;
  photo_url: string | null;
  bio: string | null;
  party_affiliation: string | null;
  total_cases: number;
  total_amount_npr: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CaseEntity {
  id: string;
  case_id: string;
  entity_id: string;
  role: EntityRole;
  involvement_status: InvolvementStatus | null;
  description: string | null;
  joined_at: string | null;
}

export interface EntityRelationship {
  id: string;
  entity_a_id: string;
  entity_b_id: string;
  relationship_type: RelationshipType;
  description: string | null;
  strength: RelationshipStrength | null;
  evidence_ids: string[] | null;
  case_ids: string[] | null;
  created_at: string;
}

export interface MoneyFlow {
  id: string;
  case_id: string;
  from_entity_id: string | null;
  to_entity_id: string | null;
  amount_npr: number | null;
  amount_foreign: number | null;
  currency: string;
  purpose: string | null;
  date: string | null;
  date_precision: DatePrecision;
  verification_status: VerificationStatus;
  flow_type: MoneyFlowType | null;
  evidence_ids: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface CorruptionEvidence {
  id: string;
  case_id: string;
  evidence_type: EvidenceType;
  title: string | null;
  url: string | null;
  source_name: string | null;
  content_summary: string | null;
  published_at: string | null;
  reliability: EvidenceReliability;
  signal_id: string | null;
  file_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  event_date: string;
  event_date_precision: DatePrecision;
  event_type: TimelineEventType;
  title: string;
  title_ne: string | null;
  description: string | null;
  entity_ids: string[] | null;
  evidence_ids: string[] | null;
  created_at: string;
}

/* ═══════════════════════════════════════════════
   COMPOSITE TYPES (for views / dashboard)
   ═══════════════════════════════════════════════ */

/** Dashboard card: case summary with aggregated data */
export interface CaseSummary {
  case: CorruptionCase;
  entityCount: number;
  totalMoneyNpr: number;
  latestEvent: TimelineEvent | null;
  evidenceCount: number;
}

/** Entity profile page: entity with all related cases & relationships */
export interface EntityDossier {
  entity: CorruptionEntity;
  cases: Array<{
    case: CorruptionCase;
    role: EntityRole;
    involvement_status: InvolvementStatus | null;
  }>;
  relationships: Array<{
    relationship: EntityRelationship;
    otherEntity: CorruptionEntity;
  }>;
  totalAmountNpr: number;
}

/** Aggregate stats for the corruption dashboard header */
export interface CorruptionStats {
  totalCases: number;
  totalAmountNpr: number;
  activeInvestigations: number;
  convictions: number;
  convictionRate: number;
  casesByType: Partial<Record<CorruptionType, number>>;
  casesByStatus: Partial<Record<CaseStatus, number>>;
  casesBySeverity: Partial<Record<Severity, number>>;
  totalEntities: number;
}

/* ═══════════════════════════════════════════════
   DISPLAY CONSTANTS
   ═══════════════════════════════════════════════ */

export const STATUS_COLORS: Record<CaseStatus, { text: string; bg: string; border: string }> = {
  alleged:             { text: 'text-slate-400',   bg: 'bg-slate-500/15',   border: 'border-slate-500/30' },
  under_investigation: { text: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30' },
  charged:             { text: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30' },
  trial:               { text: 'text-purple-400',  bg: 'bg-purple-500/15',  border: 'border-purple-500/30' },
  convicted:           { text: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30' },
  acquitted:           { text: 'text-green-400',   bg: 'bg-green-500/15',   border: 'border-green-500/30' },
  asset_recovery:      { text: 'text-cyan-400',    bg: 'bg-cyan-500/15',    border: 'border-cyan-500/30' },
  closed:              { text: 'text-zinc-400',    bg: 'bg-zinc-500/15',    border: 'border-zinc-500/30' },
};

export const STATUS_LABELS: Record<CaseStatus, { en: string; ne: string }> = {
  alleged:             { en: 'Alleged',             ne: 'आरोपित' },
  under_investigation: { en: 'Under Investigation', ne: 'अनुसन्धानमा' },
  charged:             { en: 'Charged',             ne: 'अभियुक्त' },
  trial:               { en: 'On Trial',            ne: 'मुद्दा विचाराधीन' },
  convicted:           { en: 'Convicted',           ne: 'दोषी ठहर' },
  acquitted:           { en: 'Acquitted',           ne: 'सफाइ पाएको' },
  asset_recovery:      { en: 'Asset Recovery',      ne: 'सम्पत्ति असुली' },
  closed:              { en: 'Closed',              ne: 'बन्द' },
};

export const CORRUPTION_TYPE_LABELS: Record<CorruptionType, { en: string; ne: string }> = {
  bribery:            { en: 'Bribery',              ne: 'घुस' },
  embezzlement:       { en: 'Embezzlement',         ne: 'अपचलन' },
  nepotism:           { en: 'Nepotism',             ne: 'नातावाद' },
  money_laundering:   { en: 'Money Laundering',     ne: 'मनी लाउन्डरिङ' },
  land_grab:          { en: 'Land Grab',            ne: 'जग्गा कब्जा' },
  procurement_fraud:  { en: 'Procurement Fraud',    ne: 'खरिद भ्रष्टाचार' },
  tax_evasion:        { en: 'Tax Evasion',          ne: 'कर छल्ने' },
  abuse_of_authority: { en: 'Abuse of Authority',   ne: 'अधिकार दुरुपयोग' },
  kickback:           { en: 'Kickback',             ne: 'कमिसन' },
  other:              { en: 'Other',                ne: 'अन्य' },
};

export const SEVERITY_LABELS: Record<Severity, { en: string; ne: string }> = {
  minor: { en: 'Minor',   ne: 'सानो' },
  major: { en: 'Major',   ne: 'ठूलो' },
  mega:  { en: 'Mega',    ne: 'विशाल' },
};

export const SEVERITY_COLORS: Record<Severity, { text: string; bg: string }> = {
  minor: { text: 'text-yellow-400',  bg: 'bg-yellow-500/15' },
  major: { text: 'text-orange-400',  bg: 'bg-orange-500/15' },
  mega:  { text: 'text-red-400',     bg: 'bg-red-500/15' },
};

export const ENTITY_TYPE_LABELS: Record<EntityType, { en: string; ne: string }> = {
  person:        { en: 'Person',         ne: 'व्यक्ति' },
  politician:    { en: 'Politician',     ne: 'राजनीतिज्ञ' },
  official:      { en: 'Official',       ne: 'अधिकारी' },
  company:       { en: 'Company',        ne: 'कम्पनी' },
  organization:  { en: 'Organization',   ne: 'संस्था' },
  shell_company: { en: 'Shell Company',  ne: 'शेल कम्पनी' },
  bank_account:  { en: 'Bank Account',   ne: 'बैंक खाता' },
  property:      { en: 'Property',       ne: 'सम्पत्ति' },
};

export const ROLE_LABELS: Record<EntityRole, { en: string; ne: string }> = {
  accused:       { en: 'Accused',       ne: 'अभियुक्त' },
  witness:       { en: 'Witness',       ne: 'साक्षी' },
  victim:        { en: 'Victim',        ne: 'पीडित' },
  investigator:  { en: 'Investigator',  ne: 'अनुसन्धानकर्ता' },
  beneficiary:   { en: 'Beneficiary',   ne: 'लाभग्राही' },
  whistleblower: { en: 'Whistleblower', ne: 'सुचनादाता' },
  facilitator:   { en: 'Facilitator',   ne: 'सहजकर्ता' },
  accomplice:    { en: 'Accomplice',    ne: 'सहअभियुक्त' },
};

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, { en: string; ne: string }> = {
  business_partner:     { en: 'Business Partner',       ne: 'व्यापारिक साझेदार' },
  family:               { en: 'Family',                 ne: 'परिवार' },
  appointed_by:         { en: 'Appointed By',           ne: 'द्वारा नियुक्त' },
  shell_company_of:     { en: 'Shell Company Of',       ne: 'को शेल कम्पनी' },
  political_ally:       { en: 'Political Ally',         ne: 'राजनीतिक सहयोगी' },
  employer_employee:    { en: 'Employer/Employee',      ne: 'रोजगारदाता/कर्मचारी' },
  financial_link:       { en: 'Financial Link',         ne: 'आर्थिक सम्बन्ध' },
  co_accused:           { en: 'Co-Accused',             ne: 'सह-अभियुक्त' },
  bribe_giver_receiver: { en: 'Bribe Giver/Receiver',  ne: 'घुस दिने/लिने' },
};

export const MONEY_FLOW_TYPE_LABELS: Record<MoneyFlowType, { en: string; ne: string }> = {
  bribe:              { en: 'Bribe',              ne: 'घुस' },
  kickback:           { en: 'Kickback',           ne: 'कमिसन' },
  embezzlement:       { en: 'Embezzlement',       ne: 'अपचलन' },
  transfer:           { en: 'Transfer',           ne: 'स्थानान्तरण' },
  purchase:           { en: 'Purchase',           ne: 'खरिद' },
  investment:         { en: 'Investment',         ne: 'लगानी' },
  laundering:         { en: 'Laundering',         ne: 'शोधन' },
  asset_acquisition:  { en: 'Asset Acquisition',  ne: 'सम्पत्ति अधिग्रहण' },
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, { en: string; ne: string }> = {
  news_article:        { en: 'News Article',        ne: 'समाचार' },
  ciaa_report:         { en: 'CIAA Report',          ne: 'अख्तियार प्रतिवेदन' },
  court_filing:        { en: 'Court Filing',         ne: 'अदालतको फाइल' },
  government_document: { en: 'Government Document',  ne: 'सरकारी कागजात' },
  whistleblower:       { en: 'Whistleblower',        ne: 'सुचनादाता' },
  financial_record:    { en: 'Financial Record',     ne: 'आर्थिक अभिलेख' },
  property_record:     { en: 'Property Record',      ne: 'सम्पत्ति अभिलेख' },
  intelligence_signal: { en: 'Intelligence Signal',  ne: 'इन्टेलिजेन्स सिग्नल' },
  social_media:        { en: 'Social Media',         ne: 'सामाजिक सञ्जाल' },
  interview:           { en: 'Interview',            ne: 'अन्तर्वार्ता' },
  leaked_document:     { en: 'Leaked Document',      ne: 'लिक भएको कागजात' },
};

export const TIMELINE_EVENT_TYPE_LABELS: Record<TimelineEventType, { en: string; ne: string }> = {
  allegation:           { en: 'Allegation',            ne: 'आरोप' },
  complaint_filed:      { en: 'Complaint Filed',       ne: 'उजुरी दर्ता' },
  investigation_started:{ en: 'Investigation Started', ne: 'अनुसन्धान सुरु' },
  fir_registered:       { en: 'FIR Registered',        ne: 'जाहेरी दर्ता' },
  arrested:             { en: 'Arrested',              ne: 'गिरफ्तार' },
  charge_sheet_filed:   { en: 'Charge Sheet Filed',    ne: 'अभियोगपत्र दायर' },
  trial_started:        { en: 'Trial Started',         ne: 'मुद्दा सुरु' },
  verdict:              { en: 'Verdict',               ne: 'फैसला' },
  appeal:               { en: 'Appeal',                ne: 'पुनरावेदन' },
  asset_frozen:         { en: 'Asset Frozen',          ne: 'सम्पत्ति रोक्का' },
  asset_recovered:      { en: 'Asset Recovered',       ne: 'सम्पत्ति असुली' },
  fugitive_declared:    { en: 'Fugitive Declared',     ne: 'फरार घोषित' },
  extradition:          { en: 'Extradition',           ne: 'प्रत्यर्पण' },
  acquitted:            { en: 'Acquitted',             ne: 'सफाइ' },
  pardoned:             { en: 'Pardoned',              ne: 'माफी' },
  other:                { en: 'Other',                 ne: 'अन्य' },
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

/** Format large NPR amounts for display (e.g. 1,50,00,000 -> "1.5 Crore") */
export function formatAmountNpr(amount: number | null): string {
  if (amount == null || amount === 0) return '-';
  if (amount >= 1_00_00_00_000) return `${(amount / 1_00_00_00_000).toFixed(1)} Arab`;
  if (amount >= 1_00_00_000) return `${(amount / 1_00_00_000).toFixed(1)} Crore`;
  if (amount >= 1_00_000) return `${(amount / 1_00_000).toFixed(1)} Lakh`;
  return amount.toLocaleString('en-NP');
}

/** Approximate NPR → USD conversion rate (updated periodically) */
const NPR_TO_USD_RATE = 133.5;

/** Format NPR amount with रू symbol and USD equivalent */
export function formatNprWithUsd(amount: number | null): { npr: string; usd: string } {
  if (amount == null || amount === 0) return { npr: '-', usd: '-' };
  const npr = `रू ${formatAmountNpr(amount)}`;
  const usdAmount = amount / NPR_TO_USD_RATE;
  let usd: string;
  if (usdAmount >= 1_000_000) usd = `$${(usdAmount / 1_000_000).toFixed(1)}M`;
  else if (usdAmount >= 1_000) usd = `$${(usdAmount / 1_000).toFixed(0)}K`;
  else usd = `$${usdAmount.toFixed(0)}`;
  return { npr, usd };
}

/** Check whether a case status represents an "active" (ongoing) case */
export function isActiveCase(status: CaseStatus): boolean {
  return ['alleged', 'under_investigation', 'charged', 'trial', 'asset_recovery'].includes(status);
}
