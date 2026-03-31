/**
 * Government Bodies Scorecard
 *
 * Consolidates the 80+ entities in keyMinistries into ~20 accountable bodies
 * that match Nepal's actual federal ministry structure. Departments, boards,
 * agencies, and commissions roll up to their parent ministry or are grouped
 * as key autonomous bodies.
 *
 * RSP's Bachapatra 2082 pledges 18 ministries (Balen pushing for 16).
 * This mapping reflects the current/proposed structure as of March 2026.
 */

import { type GovernmentPromise } from './promises';
import { computeGhantiScore, type GhantiScore } from './ghanti-score';
import { PROMISES_KNOWLEDGE, type PromiseKnowledge } from '@/lib/intelligence/knowledge-base';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type GovernmentBodyType = 'ministry' | 'autonomous' | 'judiciary';

export interface StatusBreakdown {
  delivered: number;
  in_progress: number;
  stalled: number;
  not_started: number;
}

export interface GovernmentBody {
  slug: string;
  name: string;
  nameNe: string;
  type: GovernmentBodyType;
  /** Plain-language description of what this body does */
  description: string;
  /** Sub-entities that roll up into this body */
  includes: string[];
  commitmentIds: string[];
  commitmentCount: number;
  officials: string[];
  score: GhantiScore;
  statusBreakdown: StatusBreakdown;
  avgProgress: number;
}

/* ═══════════════════════════════════════════════
   CONSOLIDATION MAP
   Maps every keyMinistries value → a parent body key.
   This is the core of the rollup logic.
   ═══════════════════════════════════════════════ */

const ROLLUP: Record<string, string> = {
  // ── Office of PM & Cross-cutting ──
  'Office of PM': 'opm',
  'All ministries': 'opm',
  'Ministry of General Administration': 'opm',
  'Public Service Commission': 'opm',

  // ── Finance & Planning ──
  'Ministry of Finance': 'finance',
  'NPC': 'finance',
  'Inland Revenue Department': 'finance',
  'IRD': 'finance',
  'Social Security Fund': 'finance',

  // ── Law & Justice ──
  'Ministry of Law & Justice': 'law',
  'Attorney General Office': 'law',

  // ── Home Affairs ──
  'Ministry of Home Affairs': 'home',
  'District Administration Offices': 'home',
  'Department of Immigration': 'home',
  'Department of Passports': 'home',

  // ── Foreign Affairs ──
  'Ministry of Foreign Affairs': 'foreign',

  // ── Federal Affairs & Local Bodies ──
  'Ministry of Federal Affairs': 'federal-affairs',
  'Provincial Governments': 'federal-affairs',
  'Kathmandu Metropolitan City': 'federal-affairs',

  // ── Education, Science & Technology ──
  'Ministry of Education': 'education',
  'Department of Education': 'education',
  'CDC': 'education',
  'ERO': 'education',
  'CTEVT': 'education',
  'UGC': 'education',

  // ── Health & Population ──
  'MOHP': 'health',
  'Department of Health Services': 'health',
  'Department of Drug Administration': 'health',
  'Health Insurance Board': 'health',

  // ── Energy, Water Resources & Irrigation ──
  'Ministry of Energy': 'energy',
  'Ministry of Energy, Water Resources': 'energy',
  'NEA': 'energy',
  'DOED': 'energy',
  'Electricity Regulatory Commission': 'energy',
  'Ministry of Water Supply': 'energy',
  'KUKL': 'energy',
  'DWSS': 'energy',
  'DHM': 'energy',
  'High Powered Committee for Bagmati': 'energy',

  // ── Industry, Commerce & Supply ──
  'Ministry of Industry': 'industry',
  'Ministry of Commerce': 'industry',
  'Office of Company Registrar': 'industry',
  'TEPC': 'industry',
  'Ministry of Labour': 'industry',

  // ── Communication & IT ──
  'MOCIT': 'ict',
  'NITC': 'ict',
  'HITP': 'ict',
  'NTA': 'ict',

  // ── Physical Infrastructure & Transport ──
  'Ministry of Physical Infrastructure': 'infrastructure',
  'DOR': 'infrastructure',
  'Department of Railways': 'infrastructure',

  // ── Urban Development ──
  'Ministry of Urban Development': 'urban',

  // ── Agriculture & Livestock ──
  'Ministry of Agriculture': 'agriculture',
  'NARC': 'agriculture',
  'DOA': 'agriculture',
  'MOLMAC': 'agriculture',
  'Department of Cooperatives': 'agriculture',

  // ── Culture, Tourism & Civil Aviation ──
  'Ministry of Culture & Tourism': 'tourism',
  'NTB': 'tourism',
  'CAAN': 'tourism',

  // ── Forests & Environment ──
  'Ministry of Forests & Environment': 'forests',
  'Department of National Parks': 'forests',

  // ── Women, Youth & Social Welfare ──
  'Ministry of Women & Social Welfare': 'social',
  'Ministry of Youth & Sports': 'social',
  'National Sports Council': 'social',
  'National Dalit Commission': 'social',

  // ── Anti-Corruption (CIAA) — autonomous constitutional body ──
  'CIAA': 'ciaa',

  // ── Central Bank (NRB) — autonomous ──
  'Nepal Rastra Bank': 'nrb',
  'NRB': 'nrb',
  'SEBON': 'nrb',
  'NEPSE': 'nrb',

  // ── Parliament — legislative ──
  'Federal Parliament': 'parliament',
  'Election Commission': 'parliament',

  // ── Judiciary — autonomous ──
  'Supreme Court': 'judiciary',
  'Judicial Council': 'judiciary',
  'Truth and Reconciliation Commission': 'judiciary',

  // ── Investment & Special Bodies ──
  'IBN': 'finance',
  'Investment Board Nepal': 'finance',
  'PPMO': 'finance',
  'Survey Department': 'agriculture',
  'NRNA': 'foreign',
  'Land Reform Commission': 'opm',
};

/* ═══════════════════════════════════════════════
   BODY DEFINITIONS
   ═══════════════════════════════════════════════ */

/** Minimum commitments to show by default on overview page */
export const MIN_COMMITMENTS_DEFAULT = 5;

interface BodyDefinition {
  key: string;
  name: string;
  nameNe: string;
  type: GovernmentBodyType;
  /** One-line plain-language description of what this body does */
  description: string;
}

const BODY_DEFS: BodyDefinition[] = [
  { key: 'opm', name: 'Office of the Prime Minister', nameNe: 'प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय', type: 'ministry', description: 'Cross-government coordination, civil service reform, land reform, national-level governance' },
  { key: 'finance', name: 'Ministry of Finance & Planning', nameNe: 'अर्थ तथा योजना मन्त्रालय', type: 'ministry', description: 'Budget, taxation, fiscal federalism, national planning, investment, social security' },
  { key: 'law', name: 'Ministry of Law & Justice', nameNe: 'कानून तथा न्याय मन्त्रालय', type: 'ministry', description: 'Constitutional amendments, legal reform, party finance laws, attorney general' },
  { key: 'home', name: 'Ministry of Home Affairs', nameNe: 'गृह मन्त्रालय', type: 'ministry', description: 'Internal security, immigration, passports, district administration' },
  { key: 'foreign', name: 'Ministry of Foreign Affairs', nameNe: 'परराष्ट्र मन्त्रालय', type: 'ministry', description: 'Diplomacy, treaties, diaspora engagement, foreign employment' },
  { key: 'federal-affairs', name: 'Ministry of Federal Affairs', nameNe: 'संघीय मामिला मन्त्रालय', type: 'ministry', description: 'Provincial & local government coordination, federalism implementation' },
  { key: 'education', name: 'Ministry of Education & Science', nameNe: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय', type: 'ministry', description: 'Schools, universities, free education, skill development, curriculum reform' },
  { key: 'health', name: 'Ministry of Health & Population', nameNe: 'स्वास्थ्य तथा जनसंख्या मन्त्रालय', type: 'ministry', description: 'Hospitals, health insurance, mental health, drug regulation, disease control' },
  { key: 'energy', name: 'Ministry of Energy & Water Resources', nameNe: 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय', type: 'ministry', description: 'Hydropower, electricity, water supply, Melamchi, irrigation, tariff reform' },
  { key: 'industry', name: 'Ministry of Industry, Commerce & Labour', nameNe: 'उद्योग, वाणिज्य तथा श्रम मन्त्रालय', type: 'ministry', description: 'Manufacturing, trade, exports, jobs, cooperatives, investor services' },
  { key: 'ict', name: 'Ministry of Communication & IT', nameNe: 'सञ्चार तथा सूचना प्रविधि मन्त्रालय', type: 'ministry', description: 'Digital services, IT parks, e-governance, telecom, Nagarik App, AI policy' },
  { key: 'infrastructure', name: 'Ministry of Physical Infrastructure', nameNe: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय', type: 'ministry', description: 'Highways, railways, bridges, East-West corridor, national pride projects' },
  { key: 'urban', name: 'Ministry of Urban Development', nameNe: 'सहरी विकास मन्त्रालय', type: 'ministry', description: 'City planning, housing, waste management, urban infrastructure' },
  { key: 'agriculture', name: 'Ministry of Agriculture', nameNe: 'कृषि तथा पशुपन्छी विकास मन्त्रालय', type: 'ministry', description: 'Farming, food security, research, cooperatives, land management' },
  { key: 'tourism', name: 'Ministry of Culture & Tourism', nameNe: 'संस्कृति, पर्यटन तथा नागरिक उड्डयन मन्त्रालय', type: 'ministry', description: 'Tourism promotion, airports, Pokhara & Bhairahawa, cultural heritage' },
  { key: 'forests', name: 'Ministry of Forests & Environment', nameNe: 'वन तथा वातावरण मन्त्रालय', type: 'ministry', description: 'Forest conservation, fire monitoring, national parks, carbon neutrality' },
  { key: 'social', name: 'Ministry of Social Welfare & Youth', nameNe: 'सामाजिक कल्याण तथा युवा मन्त्रालय', type: 'ministry', description: 'Women, youth, sports, disability, Dalit rights, athlete welfare, elder care' },
  { key: 'ciaa', name: 'CIAA (Anti-Corruption Commission)', nameNe: 'अख्तियार दुरुपयोग अनुसन्धान आयोग', type: 'autonomous', description: 'Anti-corruption investigations, asset probes, prosecuting abuse of authority' },
  { key: 'nrb', name: 'Nepal Rastra Bank & Capital Markets', nameNe: 'नेपाल राष्ट्र बैंक तथा पुँजी बजार', type: 'autonomous', description: 'Monetary policy, banking regulation, stock market, cryptocurrency, CBDC' },
  { key: 'parliament', name: 'Federal Parliament & Elections', nameNe: 'संघीय संसद तथा निर्वाचन', type: 'autonomous', description: 'Legislation, constitutional amendments, election reform, political party laws' },
  { key: 'judiciary', name: 'Judiciary & Transitional Justice', nameNe: 'न्यायपालिका तथा संक्रमणकालीन न्याय', type: 'judiciary', description: 'Courts, judicial appointments, transparency, truth & reconciliation' },
];

const BODY_DEF_MAP = new Map(BODY_DEFS.map((d) => [d.key, d]));

/* ═══════════════════════════════════════════════
   SLUG GENERATION
   ═══════════════════════════════════════════════ */

export function bodySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()&,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ═══════════════════════════════════════════════
   BUILD ALL GOVERNMENT BODIES
   ═══════════════════════════════════════════════ */

export function buildGovernmentBodies(
  promises: GovernmentPromise[],
  knowledgeBase?: PromiseKnowledge[],
): GovernmentBody[] {
  const kb = knowledgeBase ?? PROMISES_KNOWLEDGE;
  const promiseMap = new Map(promises.map((p) => [p.id, p]));

  // Step 1: Group commitment IDs and officials by body key
  const bodyGroups = new Map<
    string,
    { commitmentIds: Set<string>; officials: Set<string>; subEntities: Set<string> }
  >();

  for (const entry of kb) {
    for (const rawMinistry of entry.keyMinistries) {
      const bodyKey = ROLLUP[rawMinistry.trim()];
      if (!bodyKey) continue; // Skip unmapped entities

      if (!bodyGroups.has(bodyKey)) {
        bodyGroups.set(bodyKey, {
          commitmentIds: new Set(),
          officials: new Set(),
          subEntities: new Set(),
        });
      }
      const group = bodyGroups.get(bodyKey)!;
      group.commitmentIds.add(String(entry.id));
      group.subEntities.add(rawMinistry.trim());
      for (const official of entry.keyOfficials) {
        group.officials.add(official);
      }
    }
  }

  // Step 2: Build GovernmentBody for each group
  const bodies: GovernmentBody[] = [];

  for (const [key, group] of bodyGroups) {
    const def = BODY_DEF_MAP.get(key);
    if (!def) continue;

    const commitmentIds = Array.from(group.commitmentIds);
    const bodyPromises = commitmentIds
      .map((id) => promiseMap.get(id))
      .filter((p): p is GovernmentPromise => !!p);

    if (bodyPromises.length === 0) continue;

    const statusBreakdown: StatusBreakdown = {
      delivered: 0,
      in_progress: 0,
      stalled: 0,
      not_started: 0,
    };
    let totalProgress = 0;

    for (const p of bodyPromises) {
      if (p.status in statusBreakdown) {
        statusBreakdown[p.status as keyof StatusBreakdown]++;
      }
      totalProgress += p.progress;
    }

    const avgProgress = Math.round(totalProgress / bodyPromises.length);
    const score = computeGhantiScore(bodyPromises);

    bodies.push({
      slug: key,
      name: def.name,
      nameNe: def.nameNe,
      type: def.type,
      description: def.description,
      includes: Array.from(group.subEntities),
      commitmentIds,
      commitmentCount: bodyPromises.length,
      officials: Array.from(group.officials).slice(0, 5),
      score,
      statusBreakdown,
      avgProgress,
    });
  }

  return bodies;
}

/* ═══════════════════════════════════════════════
   SORT OPTIONS
   ═══════════════════════════════════════════════ */

export type BodySortOption = 'worst' | 'best' | 'most' | 'alpha';

export function sortBodies(bodies: GovernmentBody[], sort: BodySortOption): GovernmentBody[] {
  const sorted = [...bodies];
  switch (sort) {
    case 'worst':
      return sorted.sort((a, b) => a.score.score - b.score.score);
    case 'best':
      return sorted.sort((a, b) => b.score.score - a.score.score);
    case 'most':
      return sorted.sort((a, b) => b.commitmentCount - a.commitmentCount);
    case 'alpha':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

/* ═══════════════════════════════════════════════
   BODY TYPE LABELS
   ═══════════════════════════════════════════════ */

export const BODY_TYPE_LABELS: Record<GovernmentBodyType, { en: string; ne: string }> = {
  ministry: { en: 'Ministry', ne: 'मन्त्रालय' },
  autonomous: { en: 'Constitutional Body', ne: 'संवैधानिक निकाय' },
  judiciary: { en: 'Judiciary', ne: 'न्यायपालिका' },
};

/* ═══════════════════════════════════════════════
   ORGANIZATION NAME TRANSLATIONS
   Maps English org names → Nepali equivalents.
   Built from ROLLUP keys + BODY_DEFS + common acronyms.
   ═══════════════════════════════════════════════ */

export const ORG_NEPALI_NAMES: Record<string, string> = {
  // Ministries (from BODY_DEFS)
  'Office of the Prime Minister': 'प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय',
  'Office of PM': 'प्रधानमन्त्री कार्यालय',
  'Ministry of Finance': 'अर्थ मन्त्रालय',
  'Ministry of Finance & Planning': 'अर्थ तथा योजना मन्त्रालय',
  'Ministry of Law & Justice': 'कानून तथा न्याय मन्त्रालय',
  'Ministry of Home Affairs': 'गृह मन्त्रालय',
  'Ministry of Foreign Affairs': 'परराष्ट्र मन्त्रालय',
  'Ministry of Federal Affairs': 'संघीय मामिला मन्त्रालय',
  'Ministry of Education': 'शिक्षा मन्त्रालय',
  'Ministry of Education & Science': 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
  'Ministry of Health & Population': 'स्वास्थ्य तथा जनसंख्या मन्त्रालय',
  'Ministry of Energy': 'ऊर्जा मन्त्रालय',
  'Ministry of Energy, Water Resources': 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
  'Ministry of Energy & Water Resources': 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
  'Ministry of Industry': 'उद्योग मन्त्रालय',
  'Ministry of Commerce': 'वाणिज्य मन्त्रालय',
  'Ministry of Industry, Commerce & Labour': 'उद्योग, वाणिज्य तथा श्रम मन्त्रालय',
  'Ministry of Communication & IT': 'सञ्चार तथा सूचना प्रविधि मन्त्रालय',
  'Ministry of Physical Infrastructure': 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
  'Ministry of Urban Development': 'सहरी विकास मन्त्रालय',
  'Ministry of Agriculture': 'कृषि तथा पशुपन्छी विकास मन्त्रालय',
  'Ministry of Culture & Tourism': 'संस्कृति, पर्यटन तथा नागरिक उड्डयन मन्त्रालय',
  'Ministry of Forests & Environment': 'वन तथा वातावरण मन्त्रालय',
  'Ministry of Women & Social Welfare': 'सामाजिक कल्याण तथा युवा मन्त्रालय',
  'Ministry of Youth & Sports': 'युवा तथा खेलकुद मन्त्रालय',
  'Ministry of Water Supply': 'खानेपानी मन्त्रालय',
  'Ministry of Labour': 'श्रम मन्त्रालय',
  'Ministry of General Administration': 'सामान्य प्रशासन मन्त्रालय',

  // Autonomous / Constitutional Bodies
  'CIAA': 'अख्तियार दुरुपयोग अनुसन्धान आयोग',
  'Nepal Rastra Bank': 'नेपाल राष्ट्र बैंक',
  'NRB': 'नेपाल राष्ट्र बैंक',
  'Federal Parliament': 'संघीय संसद',
  'Supreme Court': 'सर्वोच्च अदालत',
  'Election Commission': 'निर्वाचन आयोग',
  'Public Service Commission': 'लोक सेवा आयोग',
  'Judicial Council': 'न्याय परिषद',
  'Truth and Reconciliation Commission': 'सत्य र मेलमिलाप आयोग',
  'National Dalit Commission': 'राष्ट्रिय दलित आयोग',
  'National Sports Council': 'राष्ट्रिय खेलकुद परिषद',
  'Electricity Regulatory Commission': 'विद्युत नियामक आयोग',
  'Health Insurance Board': 'स्वास्थ्य बीमा बोर्ड',

  // Agencies / Departments / Boards
  'NEA': 'नेपाल विद्युत प्राधिकरण',
  'DOED': 'विद्युत विकास विभाग',
  'IBN': 'लगानी बोर्ड नेपाल',
  'Investment Board Nepal': 'लगानी बोर्ड नेपाल',
  'NPC': 'राष्ट्रिय योजना आयोग',
  'KUKL': 'काठमाडौं उपत्यका खानेपानी लिमिटेड',
  'CAAN': 'नागरिक उड्डयन प्राधिकरण',
  'NTB': 'नेपाल पर्यटन बोर्ड',
  'SEBON': 'नेपाल धितोपत्र बोर्ड',
  'NEPSE': 'नेपाल स्टक एक्सचेन्ज',
  'NARC': 'नेपाल कृषि अनुसन्धान परिषद',
  'CTEVT': 'प्राविधिक शिक्षा तथा व्यावसायिक तालिम परिषद',
  'NTA': 'नेपाल दूरसञ्चार प्राधिकरण',
  'TEPC': 'व्यापार तथा निर्यात प्रवर्धन केन्द्र',
  'DOR': 'सडक विभाग',
  'DWSS': 'खानेपानी तथा सरसफाइ विभाग',
  'DOA': 'कृषि विभाग',
  'DHM': 'जलमौसम विभाग',
  'UGC': 'विश्वविद्यालय अनुदान आयोग',
  'MOCIT': 'सञ्चार तथा सूचना प्रविधि मन्त्रालय',
  'MOHP': 'स्वास्थ्य तथा जनसंख्या मन्त्रालय',
  'NITC': 'राष्ट्रिय सूचना प्रविधि केन्द्र',
  'HITP': 'उच्च प्रविधि पार्क',
  'CDC': 'पाठ्यक्रम विकास केन्द्र',
  'ERO': 'शिक्षा समीक्षा कार्यालय',
  'IRD': 'आन्तरिक राजस्व विभाग',
  'Inland Revenue Department': 'आन्तरिक राजस्व विभाग',
  'PPMO': 'सार्वजनिक खरिद अनुगमन कार्यालय',
  'NRNA': 'गैर आवासीय नेपाली संघ',
  'Social Security Fund': 'सामाजिक सुरक्षा कोष',
  'Attorney General Office': 'महान्यायाधिवक्ताको कार्यालय',
  'Survey Department': 'नापी विभाग',
  'Department of Education': 'शिक्षा विभाग',
  'Department of Health Services': 'स्वास्थ्य सेवा विभाग',
  'Department of Drug Administration': 'औषधि व्यवस्था विभाग',
  'Department of Immigration': 'आप्रवासन विभाग',
  'Department of Passports': 'राहदानी विभाग',
  'Department of Railways': 'रेलवे विभाग',
  'Department of National Parks': 'राष्ट्रिय निकुञ्ज तथा वन्यजन्तु संरक्षण विभाग',
  'Department of Cooperatives': 'सहकारी विभाग',
  'District Administration Offices': 'जिल्ला प्रशासन कार्यालय',
  'Office of Company Registrar': 'कम्पनी रजिस्ट्रारको कार्यालय',
  'Kathmandu Metropolitan City': 'काठमाडौं महानगरपालिका',
  'Provincial Governments': 'प्रदेश सरकार',
  'High Powered Committee for Bagmati': 'बागमती उच्चस्तरीय समिति',
  'Land Reform Commission': 'भूमि सुधार आयोग',
  'MOLMAC': 'भूमि व्यवस्था, सहकारी तथा गरिबी निवारण मन्त्रालय',
};

/** Translate an organization name to Nepali if locale is 'ne' */
export function translateOrg(name: string, locale: string): string {
  if (locale !== 'ne') return name;
  return ORG_NEPALI_NAMES[name] ?? name;
}

/* ═══════════════════════════════════════════════
   LIVE ROSTER OVERLAY
   Replaces generic titles with real names from government_roster table.
   ═══════════════════════════════════════════════ */

interface RosterEntry {
  name: string;
  name_ne: string | null;
  title: string;
  ministry_slug: string | null;
}

/**
 * Enrich government bodies with real minister names from the live roster.
 * Call this after buildGovernmentBodies() with data from getCurrentRoster().
 */
export function overlayRosterNames(
  bodies: GovernmentBody[],
  roster: RosterEntry[],
): GovernmentBody[] {
  if (!roster || roster.length === 0) return bodies;

  const rosterBySlug = new Map<string, RosterEntry[]>();
  for (const entry of roster) {
    if (!entry.ministry_slug) continue;
    const existing = rosterBySlug.get(entry.ministry_slug) || [];
    existing.push(entry);
    rosterBySlug.set(entry.ministry_slug, existing);
  }

  return bodies.map((body) => {
    const rosterEntries = rosterBySlug.get(body.slug);
    if (!rosterEntries || rosterEntries.length === 0) return body;

    // Replace generic titles with "Name (Title)" format
    const namedOfficials = rosterEntries.map(
      (r) => `${r.name} (${r.title})`,
    );

    // Keep any generic titles that don't have a roster match, append after named ones
    const rosterTitlesLower = new Set(
      rosterEntries.map((r) => r.title.toLowerCase()),
    );
    const unmatchedGenerics = body.officials.filter(
      (o) => !rosterTitlesLower.has(o.toLowerCase()) &&
        !rosterEntries.some((r) => o.toLowerCase().includes(r.title.toLowerCase())),
    );

    return {
      ...body,
      officials: [...namedOfficials, ...unmatchedGenerics].slice(0, 5),
    };
  });
}
