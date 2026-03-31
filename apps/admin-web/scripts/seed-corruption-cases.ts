/**
 * Seed script: Corruption Cases
 *
 * Seeds 12 well-known Nepal corruption cases into Supabase with
 * entities, case-entity junctions, timeline events, and evidence.
 *
 * Usage:
 *   npx tsx scripts/seed-corruption-cases.ts
 *
 * Idempotent — uses ON CONFLICT DO NOTHING via ignoreDuplicates.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Cases ──────────────────────────────────────────────────────────────────

const cases = [
  {
    slug: 'lalita-niwas-land-grab',
    title: 'Lalita Niwas Land Grab',
    title_ne: 'ललिता निवास जग्गा हडप',
    summary: 'Government-owned land in Baluwatar (Lalita Niwas area) illegally transferred to private individuals through forged documents and collusion between land revenue officials, brokers, and politically connected people. One of Nepal\'s largest land corruption scandals involving approximately 114 ropanis of prime government land.',
    corruption_type: 'land_grab' as const,
    status: 'under_investigation' as const,
    severity: 'mega' as const,
    estimated_amount_npr: 18_00_00_00_000, // ~18 billion NPR
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [4, 5, 47],
    related_body_slugs: ['ministry-of-land-management', 'ciaa'],
    tags: ['land', 'baluwatar', 'government-property', 'forgery'],
  },
  {
    slug: 'ncell-capital-gains-tax',
    title: 'Ncell Capital Gains Tax Dispute',
    title_ne: 'एनसेल क्यापिटल गेन्स ट्याक्स विवाद',
    summary: 'When Swedish telecom Telia sold its 80% stake in Ncell to Malaysian Axiata Group in 2016 for $1.365 billion, a capital gains tax of approximately NPR 30 billion was disputed. The Inland Revenue Department, Large Taxpayer Office, and courts were involved in determining tax liability. Axiata eventually paid a reduced amount.',
    corruption_type: 'tax_evasion' as const,
    status: 'trial' as const,
    severity: 'mega' as const,
    estimated_amount_npr: 30_00_00_00_000, // ~30 billion NPR
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [8, 9],
    related_body_slugs: ['ministry-of-finance', 'inland-revenue-department'],
    tags: ['telecom', 'tax', 'foreign-investment', 'ncell', 'axiata', 'telia'],
  },
  {
    slug: 'wide-body-aircraft-purchase',
    title: 'Wide Body Aircraft Purchase Scandal',
    title_ne: 'वाइड बडी विमान खरिद घोटाला',
    summary: 'Nepal Airlines Corporation\'s controversial purchase of two Airbus A330-200 wide-body aircraft in 2017-2018. The deal, worth approximately NPR 22 billion, was marred by allegations of inflated prices, lack of competitive bidding, and kickbacks. CIAA investigated irregularities in the procurement process.',
    corruption_type: 'procurement_fraud' as const,
    status: 'under_investigation' as const,
    severity: 'mega' as const,
    estimated_amount_npr: 22_00_00_00_000, // ~22 billion NPR
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [14],
    related_body_slugs: ['nepal-airlines-corporation', 'ministry-of-culture-tourism-civil-aviation'],
    tags: ['aviation', 'procurement', 'nepal-airlines', 'airbus'],
  },
  {
    slug: 'baluwatar-land-encroachment',
    title: 'Baluwatar Land Encroachment Cases',
    title_ne: 'बालुवाटार जग्गा अतिक्रमण',
    summary: 'Multiple cases of government land encroachment in the Baluwatar area near the Prime Minister\'s residence. Politically connected individuals acquired government land through forged ownership documents. Separate from but related to the Lalita Niwas case, involving different parcels and perpetrators.',
    corruption_type: 'land_grab' as const,
    status: 'under_investigation' as const,
    severity: 'major' as const,
    estimated_amount_npr: 5_00_00_00_000, // ~5 billion NPR
    verified: true,
    source_quality: 'reported' as const,
    related_commitment_ids: [4, 5],
    related_body_slugs: ['ministry-of-land-management'],
    tags: ['land', 'baluwatar', 'encroachment', 'government-property'],
  },
  {
    slug: 'fake-bhutanese-refugee',
    title: 'Fake Bhutanese Refugee Scandal',
    title_ne: 'नक्कली भुटानी शरणार्थी घोटाला',
    summary: 'A large-scale fraud scheme where Nepali citizens obtained fake identity documents posing as Bhutanese refugees to gain resettlement to the US, Canada, Australia, and other countries through UNHCR. Hundreds of fake refugees were resettled before the scandal was uncovered. Several brokers and officials were convicted.',
    corruption_type: 'other' as const,
    status: 'convicted' as const,
    severity: 'major' as const,
    estimated_amount_npr: 2_00_00_00_000, // ~2 billion NPR (estimated broker fees)
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [],
    related_body_slugs: [],
    tags: ['refugee', 'fraud', 'identity', 'resettlement', 'unhcr'],
  },
  {
    slug: 'gold-smuggling-tia',
    title: 'Gold Smuggling Through TIA',
    title_ne: 'त्रिभुवन विमानस्थल सुन तस्करी',
    summary: 'Systematic gold smuggling through Tribhuvan International Airport involving customs officials, airline crew, and organized smuggling networks. Multiple cases uncovered between 2015-2023 with hundreds of kilograms of gold smuggled from Dubai, Hong Kong, and other hubs. Customs officials and security personnel were found complicit.',
    corruption_type: 'other' as const,
    status: 'under_investigation' as const,
    severity: 'mega' as const,
    estimated_amount_npr: 10_00_00_00_000, // ~10 billion NPR
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [4],
    related_body_slugs: ['customs-department'],
    tags: ['gold', 'smuggling', 'airport', 'customs', 'tia'],
  },
  {
    slug: 'melamchi-cost-overruns',
    title: 'Melamchi Water Supply Cost Overruns',
    title_ne: 'मेलम्ची खानेपानी लागत वृद्धि',
    summary: 'The Melamchi Water Supply Project, initiated in 2000, has seen massive cost overruns from an initial estimate of NPR 14 billion to over NPR 50 billion. Multiple contractors abandoned the project. Italian contractor CMC was blacklisted. The Cooperazione Internazionale (CICO) consortium also faced issues. Allegations of procurement irregularities, delayed execution, and mismanagement persist.',
    corruption_type: 'procurement_fraud' as const,
    status: 'under_investigation' as const,
    severity: 'mega' as const,
    estimated_amount_npr: 50_00_00_00_000, // ~50 billion NPR total cost (overrun from 14B)
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [13],
    related_body_slugs: ['ministry-of-water-supply'],
    tags: ['water', 'infrastructure', 'melamchi', 'cost-overrun', 'procurement'],
  },
  {
    slug: 'lokman-singh-karki-ciaa',
    title: 'Lokman Singh Karki CIAA Abuse of Authority',
    title_ne: 'लोकमान सिंह कार्की अख्तियार दुरुपयोग',
    summary: 'Former CIAA Chief Commissioner Lokman Singh Karki was impeached and removed from office in 2016 for abuse of authority. He was accused of threatening judges, illegally pressuring officials, making politically motivated investigations, and accumulating disproportionate assets. The Supreme Court upheld his removal. He was convicted by the Supreme Court in 2018.',
    corruption_type: 'abuse_of_authority' as const,
    status: 'convicted' as const,
    severity: 'major' as const,
    estimated_amount_npr: 1_00_00_00_000, // ~1 billion NPR (estimated assets)
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [4, 47],
    related_body_slugs: ['ciaa'],
    tags: ['ciaa', 'impeachment', 'abuse-of-authority', 'judiciary'],
  },
  {
    slug: 'noc-procurement-irregularities',
    title: 'Nepal Oil Corporation Procurement Irregularities',
    title_ne: 'नेपाल आयल निगम खरिद अनियमितता',
    summary: 'Multiple instances of procurement fraud and financial irregularities at Nepal Oil Corporation including inflated fuel import costs, suspicious deals with Indian Oil Corporation, irregular payments to suppliers, and misuse of petroleum development funds. The state-owned monopoly has been repeatedly flagged by the Auditor General.',
    corruption_type: 'procurement_fraud' as const,
    status: 'under_investigation' as const,
    severity: 'major' as const,
    estimated_amount_npr: 8_00_00_00_000, // ~8 billion NPR
    verified: true,
    source_quality: 'reported' as const,
    related_commitment_ids: [8],
    related_body_slugs: ['ministry-of-industry-commerce-supplies'],
    tags: ['fuel', 'petroleum', 'noc', 'procurement', 'state-enterprise'],
  },
  {
    slug: 'omni-group-scandal',
    title: 'Omni Group Financial Irregularities',
    title_ne: 'ओम्नी ग्रुप आर्थिक अनियमितता',
    summary: 'Omni Business Group, a conglomerate with businesses in banking, media, real estate, and trading, was accused of systematic financial irregularities including loan fraud, money laundering, and using political connections to evade regulations. The group\'s chairman was arrested in 2019. Cases involve multiple banks and regulatory failures.',
    corruption_type: 'money_laundering' as const,
    status: 'under_investigation' as const,
    severity: 'mega' as const,
    estimated_amount_npr: 15_00_00_00_000, // ~15 billion NPR
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [31, 59],
    related_body_slugs: ['nepal-rastra-bank'],
    tags: ['banking', 'money-laundering', 'omni-group', 'conglomerate'],
  },
  {
    slug: 'sudan-arms-deal',
    title: 'Sudan Arms Deal Controversy',
    title_ne: 'सुडान हतियार सम्झौता विवाद',
    summary: 'Controversial procurement of weapons by the Nepal Army from a Sudanese arms dealer during the Maoist insurgency period (2002-2003). The deal bypassed standard procurement processes and the arms were purchased at allegedly inflated prices. Questions were raised about commissions paid and the quality of weapons received.',
    corruption_type: 'procurement_fraud' as const,
    status: 'closed' as const,
    severity: 'major' as const,
    estimated_amount_npr: 3_60_00_00_000, // ~3.6 billion NPR
    verified: true,
    source_quality: 'confirmed' as const,
    related_commitment_ids: [],
    related_body_slugs: ['ministry-of-defence'],
    tags: ['military', 'arms', 'procurement', 'nepal-army', 'sudan'],
  },
  {
    slug: 'fast-track-highway-corruption',
    title: 'Kathmandu-Terai Fast Track Highway Irregularities',
    title_ne: 'काठमाडौं-तराई फास्ट ट्र्याक अनियमितता',
    summary: 'The Kathmandu-Nijgadh Fast Track highway, a national pride project being built by the Nepal Army, has faced allegations of cost overruns, lack of transparency in procurement, and irregularities in land acquisition. The 76 km expressway was initially estimated at NPR 175 billion but costs have escalated significantly.',
    corruption_type: 'procurement_fraud' as const,
    status: 'under_investigation' as const,
    severity: 'mega' as const,
    estimated_amount_npr: 175_00_00_00_000, // ~175 billion NPR total project cost
    verified: false,
    source_quality: 'reported' as const,
    related_commitment_ids: [14, 55],
    related_body_slugs: ['nepal-army', 'ministry-of-physical-infrastructure-transport'],
    tags: ['highway', 'fast-track', 'infrastructure', 'national-pride', 'nepal-army'],
  },
];

// ─── Entities ───────────────────────────────────────────────────────────────

const entities = [
  // Lalita Niwas
  { slug: 'ciaa-nepal', name: 'Commission for Investigation of Abuse of Authority (CIAA)', name_ne: 'अख्तियार दुरुपयोग अनुसन्धान आयोग', entity_type: 'organization' as const, title: 'Anti-corruption constitutional body', bio: 'Nepal\'s constitutional anti-corruption body responsible for investigating abuse of authority and corruption by public officials.' },
  { slug: 'land-revenue-office-kathmandu', name: 'Land Revenue Office, Kathmandu', name_ne: 'मालपोत कार्यालय, काठमाडौं', entity_type: 'organization' as const, title: 'District Land Revenue Office', bio: 'Government office responsible for land registration and revenue collection in Kathmandu district.' },

  // Ncell
  { slug: 'telia-company', name: 'Telia Company (formerly TeliaSonera)', name_ne: 'टेलिया कम्पनी', entity_type: 'company' as const, title: 'Swedish telecom company', bio: 'Swedish multinational telecom company that sold its 80% stake in Ncell to Axiata in 2016.' },
  { slug: 'axiata-group', name: 'Axiata Group Berhad', name_ne: 'एक्सियाटा ग्रुप', entity_type: 'company' as const, title: 'Malaysian telecom company', bio: 'Malaysian telecom conglomerate that acquired 80% of Ncell from Telia for $1.365 billion in 2016.' },
  { slug: 'ncell-pvt-ltd', name: 'Ncell Pvt. Ltd.', name_ne: 'एनसेल प्रा. लि.', entity_type: 'company' as const, title: 'Nepal telecom operator', bio: 'Nepal\'s largest private telecom operator, formerly Mero Mobile, then Ncell under Telia, now under Axiata.' },

  // Wide Body
  { slug: 'nepal-airlines-corporation', name: 'Nepal Airlines Corporation', name_ne: 'नेपाल वायुसेवा निगम', entity_type: 'organization' as const, title: 'National flag carrier', bio: 'Nepal\'s state-owned national flag carrier airline, operator of two A330 wide-body aircraft purchased amid controversy.' },

  // Fake Bhutanese Refugee
  { slug: 'unhcr-nepal', name: 'UNHCR Nepal', name_ne: 'युएनएचसीआर नेपाल', entity_type: 'organization' as const, title: 'UN Refugee Agency Nepal Office', bio: 'United Nations High Commissioner for Refugees Nepal office that managed Bhutanese refugee resettlement program.' },

  // Gold Smuggling
  { slug: 'customs-department-nepal', name: 'Department of Customs', name_ne: 'भन्सार विभाग', entity_type: 'organization' as const, title: 'Government customs authority', bio: 'Nepal government department responsible for customs enforcement at borders and airports.' },

  // Melamchi
  { slug: 'melamchi-water-supply-dev-board', name: 'Melamchi Water Supply Development Board', name_ne: 'मेलम्ची खानेपानी विकास समिति', entity_type: 'organization' as const, title: 'Project implementing body', bio: 'Government body responsible for implementing the Melamchi Water Supply Project for Kathmandu Valley.' },
  { slug: 'cmc-di-ravenna', name: 'Cooperativa Muratori & Cementisti (CMC di Ravenna)', name_ne: 'सीएमसी दि रावेन्ना', entity_type: 'company' as const, title: 'Italian construction company', bio: 'Italian construction company that was the original contractor for the Melamchi tunnel, later blacklisted for abandoning the project.' },

  // Lokman Singh Karki
  { slug: 'lokman-singh-karki', name: 'Lokman Singh Karki', name_ne: 'लोकमान सिंह कार्की', entity_type: 'official' as const, title: 'Former CIAA Chief Commissioner', bio: 'Former Chief Commissioner of CIAA who was impeached in 2016 and convicted by the Supreme Court for abuse of authority, threatening judges, and accumulating disproportionate assets.' },

  // NOC
  { slug: 'nepal-oil-corporation', name: 'Nepal Oil Corporation', name_ne: 'नेपाल आयल निगम', entity_type: 'organization' as const, title: 'State-owned petroleum monopoly', bio: 'Nepal\'s state-owned monopoly for petroleum product import, storage, and distribution.' },

  // Omni Group
  { slug: 'omni-business-group', name: 'Omni Business Group', name_ne: 'ओम्नी बिजनेस ग्रुप', entity_type: 'company' as const, title: 'Nepali business conglomerate', bio: 'Large Nepali business conglomerate with interests in banking, real estate, media, and trading. Chairman arrested in 2019 on charges of financial irregularities.' },
  { slug: 'rajendra-bahadur-shrestha', name: 'Rajendra Bahadur Shrestha', name_ne: 'राजेन्द्र बहादुर श्रेष्ठ', entity_type: 'person' as const, title: 'Chairman, Omni Business Group', bio: 'Chairman of Omni Business Group arrested in 2019 on charges of money laundering and financial fraud.' },

  // Fast Track
  { slug: 'nepal-army', name: 'Nepal Army', name_ne: 'नेपाली सेना', entity_type: 'organization' as const, title: 'National military force', bio: 'Nepal\'s national army, the implementing agency for the Kathmandu-Terai Fast Track highway project.' },

  // Sudan Arms
  { slug: 'ministry-of-defence-nepal', name: 'Ministry of Defence', name_ne: 'रक्षा मन्त्रालय', entity_type: 'organization' as const, title: 'Government defence ministry', bio: 'Nepal\'s Ministry of Defence overseeing the Nepal Army and military procurement.' },

  // Additional key people
  { slug: 'inland-revenue-department', name: 'Inland Revenue Department', name_ne: 'आन्तरिक राजस्व विभाग', entity_type: 'organization' as const, title: 'Tax authority', bio: 'Nepal\'s tax collection and enforcement authority under the Ministry of Finance.' },
  { slug: 'supreme-court-nepal', name: 'Supreme Court of Nepal', name_ne: 'सर्वोच्च अदालत', entity_type: 'organization' as const, title: 'Apex court', bio: 'Nepal\'s highest court, involved in adjudicating major corruption cases.' },
];

// ─── Case-Entity Mappings ────────────────────────────────────────────────────
// We'll build these after inserting cases and entities to get their UUIDs.

interface CaseEntityMapping {
  caseSlug: string;
  entitySlug: string;
  role: string;
  involvement_status: string;
  description: string;
}

const caseEntityMappings: CaseEntityMapping[] = [
  // Lalita Niwas
  { caseSlug: 'lalita-niwas-land-grab', entitySlug: 'ciaa-nepal', role: 'investigator', involvement_status: 'charged', description: 'CIAA investigating the illegal land transfers' },
  { caseSlug: 'lalita-niwas-land-grab', entitySlug: 'land-revenue-office-kathmandu', role: 'facilitator', involvement_status: 'alleged', description: 'Land revenue office officials allegedly facilitated forged transfers' },

  // Ncell
  { caseSlug: 'ncell-capital-gains-tax', entitySlug: 'telia-company', role: 'accused', involvement_status: 'charged', description: 'Seller of Ncell shares, disputed tax liability' },
  { caseSlug: 'ncell-capital-gains-tax', entitySlug: 'axiata-group', role: 'accused', involvement_status: 'charged', description: 'Buyer who assumed partial tax liability' },
  { caseSlug: 'ncell-capital-gains-tax', entitySlug: 'ncell-pvt-ltd', role: 'accused', involvement_status: 'charged', description: 'Company whose shares were sold' },
  { caseSlug: 'ncell-capital-gains-tax', entitySlug: 'inland-revenue-department', role: 'investigator', involvement_status: 'charged', description: 'Tax authority pursuing the capital gains tax' },

  // Wide Body
  { caseSlug: 'wide-body-aircraft-purchase', entitySlug: 'nepal-airlines-corporation', role: 'accused', involvement_status: 'alleged', description: 'Procured aircraft at allegedly inflated prices without competitive bidding' },
  { caseSlug: 'wide-body-aircraft-purchase', entitySlug: 'ciaa-nepal', role: 'investigator', involvement_status: 'charged', description: 'CIAA investigating procurement irregularities' },

  // Fake Bhutanese Refugee
  { caseSlug: 'fake-bhutanese-refugee', entitySlug: 'unhcr-nepal', role: 'victim', involvement_status: 'cooperating', description: 'UN agency whose refugee program was exploited' },

  // Gold Smuggling
  { caseSlug: 'gold-smuggling-tia', entitySlug: 'customs-department-nepal', role: 'facilitator', involvement_status: 'alleged', description: 'Customs officials allegedly complicit in smuggling operations' },
  { caseSlug: 'gold-smuggling-tia', entitySlug: 'ciaa-nepal', role: 'investigator', involvement_status: 'charged', description: 'Investigating gold smuggling networks' },

  // Melamchi
  { caseSlug: 'melamchi-cost-overruns', entitySlug: 'melamchi-water-supply-dev-board', role: 'accused', involvement_status: 'alleged', description: 'Project board overseeing delayed and over-budget project' },
  { caseSlug: 'melamchi-cost-overruns', entitySlug: 'cmc-di-ravenna', role: 'accused', involvement_status: 'charged', description: 'Italian contractor that abandoned the tunnel project' },

  // Lokman Singh Karki
  { caseSlug: 'lokman-singh-karki-ciaa', entitySlug: 'lokman-singh-karki', role: 'accused', involvement_status: 'convicted', description: 'Convicted of abuse of authority as CIAA chief' },
  { caseSlug: 'lokman-singh-karki-ciaa', entitySlug: 'supreme-court-nepal', role: 'investigator', involvement_status: 'charged', description: 'Supreme Court upheld impeachment and delivered verdict' },

  // NOC
  { caseSlug: 'noc-procurement-irregularities', entitySlug: 'nepal-oil-corporation', role: 'accused', involvement_status: 'alleged', description: 'State-owned company with persistent procurement irregularities' },

  // Omni Group
  { caseSlug: 'omni-group-scandal', entitySlug: 'omni-business-group', role: 'accused', involvement_status: 'charged', description: 'Conglomerate accused of money laundering and financial fraud' },
  { caseSlug: 'omni-group-scandal', entitySlug: 'rajendra-bahadur-shrestha', role: 'accused', involvement_status: 'charged', description: 'Chairman arrested on financial irregularity charges' },

  // Sudan Arms Deal
  { caseSlug: 'sudan-arms-deal', entitySlug: 'nepal-army', role: 'accused', involvement_status: 'alleged', description: 'Procured weapons through irregular process' },
  { caseSlug: 'sudan-arms-deal', entitySlug: 'ministry-of-defence-nepal', role: 'facilitator', involvement_status: 'alleged', description: 'Ministry that approved the procurement' },

  // Fast Track
  { caseSlug: 'fast-track-highway-corruption', entitySlug: 'nepal-army', role: 'accused', involvement_status: 'alleged', description: 'Implementing agency facing cost overrun and transparency allegations' },
];

// ─── Timeline Events ────────────────────────────────────────────────────────

interface TimelineEventSeed {
  caseSlug: string;
  event_date: string;
  event_date_precision: string;
  event_type: string;
  title: string;
  description: string;
}

const timelineEvents: TimelineEventSeed[] = [
  // Lalita Niwas
  { caseSlug: 'lalita-niwas-land-grab', event_date: '2014-06-01', event_date_precision: 'month', event_type: 'allegation', title: 'Land transfers discovered', description: 'Illegal transfers of Lalita Niwas government land to private individuals first reported by media.' },
  { caseSlug: 'lalita-niwas-land-grab', event_date: '2019-09-15', event_date_precision: 'month', event_type: 'investigation_started', title: 'CIAA opens formal investigation', description: 'CIAA formally opens investigation into the Lalita Niwas land grab covering 114 ropanis.' },
  { caseSlug: 'lalita-niwas-land-grab', event_date: '2020-01-20', event_date_precision: 'month', event_type: 'charge_sheet_filed', title: 'CIAA files charge sheet against 175 people', description: 'CIAA files corruption charge sheet against 175 individuals including former government secretaries and land officials.' },
  { caseSlug: 'lalita-niwas-land-grab', event_date: '2020-07-01', event_date_precision: 'month', event_type: 'asset_frozen', title: 'Land ownership certificates frozen', description: 'Court orders freezing of illegally transferred land ownership certificates pending trial.' },
  { caseSlug: 'lalita-niwas-land-grab', event_date: '2023-03-01', event_date_precision: 'month', event_type: 'trial_started', title: 'Special Court begins hearings', description: 'Special Court begins hearings on the Lalita Niwas land grab cases.' },

  // Ncell
  { caseSlug: 'ncell-capital-gains-tax', event_date: '2016-04-11', event_date_precision: 'exact', event_type: 'other', title: 'Telia sells Ncell to Axiata', description: 'Telia completes sale of 80% Ncell stake to Axiata for $1.365 billion.' },
  { caseSlug: 'ncell-capital-gains-tax', event_date: '2016-06-01', event_date_precision: 'month', event_type: 'allegation', title: 'Tax evasion allegations surface', description: 'Questions raised about capital gains tax payment on the $1.365 billion deal.' },
  { caseSlug: 'ncell-capital-gains-tax', event_date: '2017-04-01', event_date_precision: 'month', event_type: 'investigation_started', title: 'LTO assesses tax liability', description: 'Large Taxpayer Office assesses capital gains tax liability at NPR 30.55 billion.' },
  { caseSlug: 'ncell-capital-gains-tax', event_date: '2019-11-01', event_date_precision: 'month', event_type: 'trial_started', title: 'Supreme Court hearings begin', description: 'Supreme Court begins hearing petitions related to the Ncell tax dispute.' },
  { caseSlug: 'ncell-capital-gains-tax', event_date: '2022-02-01', event_date_precision: 'month', event_type: 'other', title: 'Axiata pays partial amount', description: 'Axiata pays approximately NPR 21.6 billion in capital gains tax, disputing the remaining amount.' },

  // Wide Body
  { caseSlug: 'wide-body-aircraft-purchase', event_date: '2017-06-01', event_date_precision: 'month', event_type: 'other', title: 'Cabinet approves wide body purchase', description: 'Nepal government cabinet approves purchase of two A330 aircraft for Nepal Airlines.' },
  { caseSlug: 'wide-body-aircraft-purchase', event_date: '2018-06-28', event_date_precision: 'exact', event_type: 'other', title: 'First A330 arrives in Kathmandu', description: 'First Airbus A330-200 delivered to Nepal Airlines at TIA.' },
  { caseSlug: 'wide-body-aircraft-purchase', event_date: '2019-01-01', event_date_precision: 'month', event_type: 'allegation', title: 'Procurement irregularities alleged', description: 'Media reports allege lack of competitive bidding and inflated prices in the aircraft purchase.' },
  { caseSlug: 'wide-body-aircraft-purchase', event_date: '2020-03-01', event_date_precision: 'month', event_type: 'investigation_started', title: 'CIAA begins investigation', description: 'CIAA opens investigation into the wide body aircraft procurement process.' },

  // Fake Bhutanese Refugee
  { caseSlug: 'fake-bhutanese-refugee', event_date: '2008-01-01', event_date_precision: 'year', event_type: 'other', title: 'Resettlement program begins', description: 'UNHCR begins third-country resettlement program for Bhutanese refugees in Nepal.' },
  { caseSlug: 'fake-bhutanese-refugee', event_date: '2012-06-01', event_date_precision: 'month', event_type: 'allegation', title: 'Fake refugee scheme uncovered', description: 'Investigations reveal large-scale fraud with non-refugees using fake documents to gain resettlement.' },
  { caseSlug: 'fake-bhutanese-refugee', event_date: '2014-01-01', event_date_precision: 'year', event_type: 'arrested', title: 'Key brokers arrested', description: 'Multiple brokers and facilitators arrested in connection with the fake refugee scheme.' },
  { caseSlug: 'fake-bhutanese-refugee', event_date: '2016-06-01', event_date_precision: 'month', event_type: 'verdict', title: 'Court convicts multiple accused', description: 'Courts in Nepal convict several brokers and officials involved in the fake refugee resettlement scam.' },

  // Gold Smuggling
  { caseSlug: 'gold-smuggling-tia', event_date: '2015-01-01', event_date_precision: 'year', event_type: 'allegation', title: 'Gold smuggling ring exposed', description: 'First major gold smuggling ring through TIA exposed, involving customs officials.' },
  { caseSlug: 'gold-smuggling-tia', event_date: '2019-03-01', event_date_precision: 'month', event_type: 'arrested', title: 'Customs officials arrested', description: 'Multiple customs officials at TIA arrested for facilitating gold smuggling.' },
  { caseSlug: 'gold-smuggling-tia', event_date: '2020-12-01', event_date_precision: 'month', event_type: 'investigation_started', title: 'CIAA investigates systematic smuggling', description: 'CIAA opens broader investigation into systematic gold smuggling networks at TIA.' },
  { caseSlug: 'gold-smuggling-tia', event_date: '2022-08-01', event_date_precision: 'month', event_type: 'arrested', title: 'Another smuggling network busted', description: 'Police bust another major gold smuggling network, arresting airline crew members and customs staff.' },

  // Melamchi
  { caseSlug: 'melamchi-cost-overruns', event_date: '2000-12-01', event_date_precision: 'year', event_type: 'other', title: 'Melamchi project initiated', description: 'Melamchi Water Supply Project officially initiated with ADB funding. Initial cost estimate: NPR 14 billion.' },
  { caseSlug: 'melamchi-cost-overruns', event_date: '2013-11-01', event_date_precision: 'month', event_type: 'other', title: 'CMC abandons tunnel project', description: 'Italian contractor CMC di Ravenna abandons the Melamchi tunnel construction.' },
  { caseSlug: 'melamchi-cost-overruns', event_date: '2014-06-01', event_date_precision: 'month', event_type: 'other', title: 'CMC blacklisted', description: 'Government blacklists CMC di Ravenna for abandoning the project.' },
  { caseSlug: 'melamchi-cost-overruns', event_date: '2021-03-28', event_date_precision: 'exact', event_type: 'other', title: 'Tunnel water reaches Kathmandu', description: 'Raw water from Melamchi tunnel reaches Kathmandu for the first time after 20 years.' },
  { caseSlug: 'melamchi-cost-overruns', event_date: '2021-06-15', event_date_precision: 'exact', event_type: 'other', title: 'Flood destroys headworks', description: 'Devastating flood in Melamchi river destroys the headworks and intake structures.' },

  // Lokman Singh Karki
  { caseSlug: 'lokman-singh-karki-ciaa', event_date: '2013-05-01', event_date_precision: 'month', event_type: 'other', title: 'Appointed CIAA Chief Commissioner', description: 'Lokman Singh Karki appointed as CIAA Chief Commissioner amid controversy.' },
  { caseSlug: 'lokman-singh-karki-ciaa', event_date: '2016-02-07', event_date_precision: 'exact', event_type: 'allegation', title: 'Impeachment motion filed', description: 'Parliament files impeachment motion against Karki citing abuse of authority.' },
  { caseSlug: 'lokman-singh-karki-ciaa', event_date: '2016-11-16', event_date_precision: 'exact', event_type: 'verdict', title: 'Removed from office by Supreme Court', description: 'Supreme Court upholds impeachment and removes Karki from the CIAA chief position.' },
  { caseSlug: 'lokman-singh-karki-ciaa', event_date: '2018-06-01', event_date_precision: 'month', event_type: 'verdict', title: 'Supreme Court convicts Karki', description: 'Supreme Court convicts Lokman Singh Karki of abuse of authority.' },

  // NOC
  { caseSlug: 'noc-procurement-irregularities', event_date: '2016-01-01', event_date_precision: 'year', event_type: 'allegation', title: 'Auditor General flags NOC irregularities', description: 'Office of the Auditor General flags significant financial irregularities in NOC procurement.' },
  { caseSlug: 'noc-procurement-irregularities', event_date: '2019-07-01', event_date_precision: 'month', event_type: 'investigation_started', title: 'CIAA investigates fuel procurement', description: 'CIAA opens investigation into NOC fuel import procurement irregularities.' },
  { caseSlug: 'noc-procurement-irregularities', event_date: '2022-03-01', event_date_precision: 'month', event_type: 'allegation', title: 'Petroleum fund misuse alleged', description: 'Allegations surface of misuse of petroleum development fund by NOC management.' },

  // Omni Group
  { caseSlug: 'omni-group-scandal', event_date: '2019-06-15', event_date_precision: 'month', event_type: 'arrested', title: 'Omni Group chairman arrested', description: 'Rajendra Bahadur Shrestha, chairman of Omni Business Group, arrested on charges of financial fraud.' },
  { caseSlug: 'omni-group-scandal', event_date: '2019-07-01', event_date_precision: 'month', event_type: 'asset_frozen', title: 'Omni Group assets frozen', description: 'Court orders freezing of Omni Group bank accounts and assets.' },
  { caseSlug: 'omni-group-scandal', event_date: '2020-01-01', event_date_precision: 'month', event_type: 'charge_sheet_filed', title: 'Charge sheet filed against Omni', description: 'CIAA files charge sheet against Omni Business Group and its chairman for money laundering.' },
  { caseSlug: 'omni-group-scandal', event_date: '2021-06-01', event_date_precision: 'month', event_type: 'trial_started', title: 'Special Court trial begins', description: 'Special Court begins trial of Omni Group case involving multiple financial crime charges.' },

  // Sudan Arms Deal
  { caseSlug: 'sudan-arms-deal', event_date: '2002-01-01', event_date_precision: 'year', event_type: 'other', title: 'Arms purchased from Sudan', description: 'Nepal Army procures weapons from Sudanese arms dealer during the Maoist insurgency.' },
  { caseSlug: 'sudan-arms-deal', event_date: '2005-01-01', event_date_precision: 'year', event_type: 'allegation', title: 'Arms deal irregularities alleged', description: 'Media and civil society raise questions about the procurement process and inflated pricing.' },
  { caseSlug: 'sudan-arms-deal', event_date: '2008-01-01', event_date_precision: 'year', event_type: 'investigation_started', title: 'Parliamentary committee investigates', description: 'Parliamentary committee opens investigation into the Sudan arms deal.' },

  // Fast Track
  { caseSlug: 'fast-track-highway-corruption', event_date: '2017-03-01', event_date_precision: 'month', event_type: 'other', title: 'Nepal Army begins Fast Track construction', description: 'Nepal Army begins construction of the 76 km Kathmandu-Nijgadh Fast Track expressway.' },
  { caseSlug: 'fast-track-highway-corruption', event_date: '2019-01-01', event_date_precision: 'year', event_type: 'allegation', title: 'Cost overrun concerns raised', description: 'Civil society and media raise concerns about escalating costs and lack of transparency.' },
  { caseSlug: 'fast-track-highway-corruption', event_date: '2022-06-01', event_date_precision: 'month', event_type: 'allegation', title: 'Environmental concerns flagged', description: 'Environmental groups flag irregularities in environmental impact assessment and forest clearance.' },
  { caseSlug: 'fast-track-highway-corruption', event_date: '2024-01-01', event_date_precision: 'year', event_type: 'other', title: 'Project completion deadline missed', description: 'Fast Track misses yet another completion deadline, with only partial construction complete.' },
];

// ─── Evidence ────────────────────────────────────────────────────────────────

interface EvidenceSeed {
  caseSlug: string;
  evidence_type: string;
  title: string;
  url: string;
  source_name: string;
  content_summary: string;
  published_at: string;
  reliability: string;
}

const evidence: EvidenceSeed[] = [
  // Lalita Niwas
  { caseSlug: 'lalita-niwas-land-grab', evidence_type: 'news_article', title: 'CIAA files charge sheet against 175 in Lalita Niwas land grab case', url: 'https://kathmandupost.com/national/2020/01/20/ciaa-files-charge-sheet-against-175-in-lalita-niwas-land-grab', source_name: 'Kathmandu Post', content_summary: 'CIAA files corruption charge sheets against 175 individuals including former government secretaries and land revenue officials for illegally transferring 114 ropanis of government land in Baluwatar.', published_at: '2020-01-20', reliability: 'high' },
  { caseSlug: 'lalita-niwas-land-grab', evidence_type: 'news_article', title: 'Lalita Niwas land grab: How 114 ropanis of state land were stolen', url: 'https://myrepublica.nagariknetwork.com/news/lalita-niwas-land-grab-investigation/', source_name: 'myRepublica', content_summary: 'Detailed investigation report on how government land in Lalita Niwas area was illegally transferred through forged documents.', published_at: '2019-10-15', reliability: 'high' },

  // Ncell
  { caseSlug: 'ncell-capital-gains-tax', evidence_type: 'news_article', title: 'Ncell capital gains tax: A timeline of Nepal\'s biggest tax dispute', url: 'https://kathmandupost.com/money/2022/02/10/ncell-tax-dispute-timeline', source_name: 'Kathmandu Post', content_summary: 'Comprehensive timeline of the Ncell capital gains tax dispute from the 2016 sale through court proceedings.', published_at: '2022-02-10', reliability: 'high' },
  { caseSlug: 'ncell-capital-gains-tax', evidence_type: 'court_filing', title: 'Supreme Court order on Ncell tax liability', url: 'https://supremecourt.gov.np/', source_name: 'Supreme Court of Nepal', content_summary: 'Supreme Court ruling on capital gains tax liability from the Telia-Axiata share sale transaction.', published_at: '2019-12-01', reliability: 'high' },

  // Wide Body
  { caseSlug: 'wide-body-aircraft-purchase', evidence_type: 'news_article', title: 'Nepal Airlines wide body aircraft purchase under CIAA scanner', url: 'https://kathmandupost.com/national/2020/03/15/wide-body-aircraft-purchase-ciaa', source_name: 'Kathmandu Post', content_summary: 'CIAA opens investigation into Nepal Airlines purchase of two A330-200 aircraft amid allegations of inflated pricing.', published_at: '2020-03-15', reliability: 'high' },
  { caseSlug: 'wide-body-aircraft-purchase', evidence_type: 'government_document', title: 'Auditor General report on NAC procurement', url: 'https://www.oagnep.gov.np/', source_name: 'Office of the Auditor General', content_summary: 'Auditor General report flagging irregularities in NAC wide body aircraft procurement process.', published_at: '2019-07-01', reliability: 'high' },

  // Fake Bhutanese Refugee
  { caseSlug: 'fake-bhutanese-refugee', evidence_type: 'news_article', title: 'Fake Bhutanese refugees: Hundreds resettled abroad with forged papers', url: 'https://kathmandupost.com/national/2014/06/20/fake-bhutanese-refugees', source_name: 'Kathmandu Post', content_summary: 'Investigation reveals hundreds of Nepali citizens were resettled abroad posing as Bhutanese refugees using forged identity documents.', published_at: '2014-06-20', reliability: 'high' },

  // Gold Smuggling
  { caseSlug: 'gold-smuggling-tia', evidence_type: 'news_article', title: 'TIA gold smuggling: Customs officials among arrested', url: 'https://thehimalayantimes.com/kathmandu/gold-smuggling-tia-customs-arrested', source_name: 'Himalayan Times', content_summary: 'Multiple customs officials at Tribhuvan International Airport arrested for facilitating systematic gold smuggling from Dubai and Hong Kong.', published_at: '2019-03-15', reliability: 'high' },

  // Melamchi
  { caseSlug: 'melamchi-cost-overruns', evidence_type: 'news_article', title: 'Melamchi: Two decades, 50 billion rupees, and Kathmandu still thirsts', url: 'https://kathmandupost.com/valley/2021/03/28/melamchi-two-decades-50-billion', source_name: 'Kathmandu Post', content_summary: 'Analysis of Melamchi Water Supply Project cost escalation from NPR 14 billion to over NPR 50 billion over two decades.', published_at: '2021-03-28', reliability: 'high' },
  { caseSlug: 'melamchi-cost-overruns', evidence_type: 'news_article', title: 'Flood destroys Melamchi headworks months after water finally reached Kathmandu', url: 'https://kathmandupost.com/valley/2021/06/16/melamchi-flood-headworks-destroyed', source_name: 'Kathmandu Post', content_summary: 'Devastating flood in Melamchi river destroys headworks just months after tunnel water first reached Kathmandu.', published_at: '2021-06-16', reliability: 'high' },

  // Lokman Singh Karki
  { caseSlug: 'lokman-singh-karki-ciaa', evidence_type: 'news_article', title: 'Lokman Singh Karki impeached: How Nepal\'s anti-graft chief fell', url: 'https://kathmandupost.com/politics/2016/11/16/lokman-karki-impeached', source_name: 'Kathmandu Post', content_summary: 'Supreme Court upholds impeachment of CIAA chief Lokman Singh Karki for abuse of authority including threatening judges and political misuse of investigations.', published_at: '2016-11-16', reliability: 'high' },
  { caseSlug: 'lokman-singh-karki-ciaa', evidence_type: 'court_filing', title: 'Supreme Court verdict on Lokman Singh Karki', url: 'https://supremecourt.gov.np/', source_name: 'Supreme Court of Nepal', content_summary: 'Supreme Court conviction of former CIAA chief Lokman Singh Karki for abuse of authority.', published_at: '2018-06-01', reliability: 'high' },

  // NOC
  { caseSlug: 'noc-procurement-irregularities', evidence_type: 'government_document', title: 'Auditor General annual report on NOC', url: 'https://www.oagnep.gov.np/', source_name: 'Office of the Auditor General', content_summary: 'Auditor General report highlighting persistent financial irregularities in Nepal Oil Corporation procurement and operations.', published_at: '2022-07-01', reliability: 'high' },

  // Omni Group
  { caseSlug: 'omni-group-scandal', evidence_type: 'news_article', title: 'Omni Group chairman arrested on financial fraud charges', url: 'https://kathmandupost.com/money/2019/06/15/omni-group-chairman-arrested', source_name: 'Kathmandu Post', content_summary: 'Rajendra Bahadur Shrestha, chairman of Omni Business Group, arrested on charges of money laundering and financial irregularities.', published_at: '2019-06-15', reliability: 'high' },
  { caseSlug: 'omni-group-scandal', evidence_type: 'news_article', title: 'Inside the Omni Group scandal: Banks, politics, and billions', url: 'https://nepalitimes.com/omni-group-scandal-investigation', source_name: 'Nepali Times', content_summary: 'In-depth investigation into Omni Group\'s financial irregularities including loan fraud across multiple banks.', published_at: '2019-08-01', reliability: 'high' },

  // Sudan Arms Deal
  { caseSlug: 'sudan-arms-deal', evidence_type: 'news_article', title: 'Nepal\'s controversial Sudan arms deal', url: 'https://nepalitimes.com/sudan-arms-deal-nepal-army', source_name: 'Nepali Times', content_summary: 'Investigation into Nepal Army weapons procurement from Sudan during the Maoist insurgency, bypassing standard processes.', published_at: '2005-06-01', reliability: 'medium' },

  // Fast Track
  { caseSlug: 'fast-track-highway-corruption', evidence_type: 'news_article', title: 'Fast Track highway: Escalating costs, shrinking transparency', url: 'https://kathmandupost.com/national/2022/06/01/fast-track-cost-transparency', source_name: 'Kathmandu Post', content_summary: 'Analysis of the Fast Track highway project\'s escalating costs and concerns about lack of transparency in Nepal Army-led procurement.', published_at: '2022-06-01', reliability: 'high' },
  { caseSlug: 'fast-track-highway-corruption', evidence_type: 'news_article', title: 'Why the Fast Track highway faces environmental scrutiny', url: 'https://thehimalayantimes.com/nepal/fast-track-environmental-concerns', source_name: 'Himalayan Times', content_summary: 'Environmental groups question the adequacy of environmental impact assessments for the Fast Track project.', published_at: '2022-08-01', reliability: 'medium' },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Seeding Corruption Cases into Supabase ===\n');

  // 1) Insert cases
  console.log(`[1/5] Inserting ${cases.length} corruption cases...`);
  const { data: insertedCases, error: casesError } = await supabase
    .from('corruption_cases')
    .upsert(cases, { onConflict: 'slug', ignoreDuplicates: true })
    .select('id, slug, title');

  if (casesError) {
    console.error('  ERROR inserting cases:', casesError.message);
    console.error('  Details:', JSON.stringify(casesError, null, 2));
    // Try one-by-one
    console.log('  Retrying individually...');
    for (const c of cases) {
      const { error } = await supabase.from('corruption_cases').upsert(c, { onConflict: 'slug', ignoreDuplicates: true });
      if (error) {
        console.error(`    FAIL: ${c.slug} => ${error.message}`);
      } else {
        console.log(`    OK: ${c.slug}`);
      }
    }
  } else {
    console.log(`  Inserted ${insertedCases?.length ?? 0} cases`);
    insertedCases?.forEach(c => console.log(`    - ${c.title}`));
  }

  // Fetch all cases to get UUIDs
  const { data: allCases } = await supabase.from('corruption_cases').select('id, slug');
  const caseMap = new Map<string, string>();
  allCases?.forEach(c => caseMap.set(c.slug, c.id));

  // 2) Insert entities
  console.log(`\n[2/5] Inserting ${entities.length} corruption entities...`);
  const { data: insertedEntities, error: entitiesError } = await supabase
    .from('corruption_entities')
    .upsert(entities, { onConflict: 'slug', ignoreDuplicates: true })
    .select('id, slug, name');

  if (entitiesError) {
    console.error('  ERROR inserting entities:', entitiesError.message);
    // Try one-by-one
    console.log('  Retrying individually...');
    for (const e of entities) {
      const { error } = await supabase.from('corruption_entities').upsert(e, { onConflict: 'slug', ignoreDuplicates: true });
      if (error) {
        console.error(`    FAIL: ${e.slug} => ${error.message}`);
      } else {
        console.log(`    OK: ${e.slug}`);
      }
    }
  } else {
    console.log(`  Inserted ${insertedEntities?.length ?? 0} entities`);
    insertedEntities?.forEach(e => console.log(`    - ${e.name}`));
  }

  // Fetch all entities to get UUIDs
  const { data: allEntities } = await supabase.from('corruption_entities').select('id, slug');
  const entityMap = new Map<string, string>();
  allEntities?.forEach(e => entityMap.set(e.slug, e.id));

  // 3) Insert case-entity junctions
  console.log(`\n[3/5] Inserting ${caseEntityMappings.length} case-entity links...`);
  let ceSuccessCount = 0;
  let ceSkipCount = 0;
  for (const mapping of caseEntityMappings) {
    const caseId = caseMap.get(mapping.caseSlug);
    const entityId = entityMap.get(mapping.entitySlug);
    if (!caseId || !entityId) {
      console.error(`    SKIP: ${mapping.caseSlug} <-> ${mapping.entitySlug} (missing ID)`);
      ceSkipCount++;
      continue;
    }
    const row = {
      case_id: caseId,
      entity_id: entityId,
      role: mapping.role,
      involvement_status: mapping.involvement_status,
      description: mapping.description,
    };
    const { error } = await supabase.from('corruption_case_entities').upsert(row, {
      onConflict: 'case_id,entity_id,role',
      ignoreDuplicates: true,
    });
    if (error) {
      console.error(`    FAIL: ${mapping.caseSlug} <-> ${mapping.entitySlug} => ${error.message}`);
    } else {
      ceSuccessCount++;
    }
  }
  console.log(`  Linked ${ceSuccessCount} case-entity pairs (${ceSkipCount} skipped)`);

  // 4) Insert timeline events
  console.log(`\n[4/5] Inserting ${timelineEvents.length} timeline events...`);
  let teSuccessCount = 0;
  for (const te of timelineEvents) {
    const caseId = caseMap.get(te.caseSlug);
    if (!caseId) {
      console.error(`    SKIP: timeline for ${te.caseSlug} (missing case ID)`);
      continue;
    }
    const row = {
      case_id: caseId,
      event_date: te.event_date,
      event_date_precision: te.event_date_precision,
      event_type: te.event_type,
      title: te.title,
      description: te.description,
    };
    const { error } = await supabase.from('corruption_timeline_events').insert(row);
    if (error) {
      // Likely duplicate — skip silently if constraint violation
      if (error.message.includes('duplicate') || error.code === '23505') {
        teSuccessCount++; // already exists
      } else {
        console.error(`    FAIL: ${te.title} => ${error.message}`);
      }
    } else {
      teSuccessCount++;
    }
  }
  console.log(`  Inserted ${teSuccessCount} timeline events`);

  // 5) Insert evidence
  console.log(`\n[5/5] Inserting ${evidence.length} evidence items...`);
  let evSuccessCount = 0;
  for (const ev of evidence) {
    const caseId = caseMap.get(ev.caseSlug);
    if (!caseId) {
      console.error(`    SKIP: evidence for ${ev.caseSlug} (missing case ID)`);
      continue;
    }
    const row = {
      case_id: caseId,
      evidence_type: ev.evidence_type,
      title: ev.title,
      url: ev.url,
      source_name: ev.source_name,
      content_summary: ev.content_summary,
      published_at: ev.published_at,
      reliability: ev.reliability,
    };
    const { error } = await supabase.from('corruption_evidence').insert(row);
    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        evSuccessCount++;
      } else {
        console.error(`    FAIL: ${ev.title} => ${error.message}`);
      }
    } else {
      evSuccessCount++;
    }
  }
  console.log(`  Inserted ${evSuccessCount} evidence items`);

  // ── Verification ──
  console.log('\n--- Verification ---');
  const counts = await Promise.all([
    supabase.from('corruption_cases').select('*', { count: 'exact', head: true }),
    supabase.from('corruption_entities').select('*', { count: 'exact', head: true }),
    supabase.from('corruption_case_entities').select('*', { count: 'exact', head: true }),
    supabase.from('corruption_timeline_events').select('*', { count: 'exact', head: true }),
    supabase.from('corruption_evidence').select('*', { count: 'exact', head: true }),
  ]);

  console.log(`Total corruption_cases:           ${counts[0].count}`);
  console.log(`Total corruption_entities:        ${counts[1].count}`);
  console.log(`Total corruption_case_entities:   ${counts[2].count}`);
  console.log(`Total corruption_timeline_events: ${counts[3].count}`);
  console.log(`Total corruption_evidence:        ${counts[4].count}`);

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
