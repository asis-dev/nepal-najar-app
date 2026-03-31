/**
 * Authority Routing Rules Engine
 *
 * Routes civic complaints to the correct government authority based on:
 *   category + geography + issue type → authority
 *
 * This is a deterministic rules engine, NOT AI. AI suggests the category,
 * but routing itself follows hard-coded rules that reflect Nepal's
 * actual government structure.
 */

import type { ComplaintIssueType } from './types';

/* ─── Types ─── */

export interface AuthorityRoute {
  /** Primary authority responsible */
  authority: string;
  authorityNe: string;
  /** Government level */
  level: 'federal' | 'provincial' | 'local';
  /** Department key for internal routing */
  departmentKey: string;
  /** Contact/office description */
  office: string;
  officeNe: string;
  /** Why this authority was chosen */
  routingReason: string;
}

export interface RoutingInput {
  issueType: ComplaintIssueType;
  severity: string;
  province?: string | null;
  district?: string | null;
  municipality?: string | null;
  wardNumber?: string | null;
  /** Free text for keyword-based sub-routing */
  description?: string;
}

/* ─── Nepal Government Structure ─── */

/**
 * Nepal has three tiers of government:
 * 1. Federal — ministries, national agencies
 * 2. Provincial — provincial ministries and directorates
 * 3. Local — municipalities (metropolitan, sub-metropolitan, municipality, rural municipality), wards
 *
 * Most civic issues go to local level first.
 * Provincial/federal highways, national infrastructure, and federal agencies are exceptions.
 */

/* ─── Geography Detection Helpers ─── */

const METROPOLITAN_CITIES = [
  'kathmandu', 'lalitpur', 'bhaktapur', 'pokhara', 'bharatpur', 'biratnagar',
];

const PROVINCIAL_HIGHWAY_KEYWORDS = [
  /provincial\s*highway/i, /प्रदेश\s*राजमार्ग/,
  /provincial\s*road/i, /प्रदेश\s*सडक/,
];

const FEDERAL_HIGHWAY_KEYWORDS = [
  /national\s*highway/i, /राष्ट्रिय\s*राजमार्ग/,
  /federal\s*highway/i, /संघीय\s*राजमार्ग/,
  /highway/i, /राजमार्ग/,
];

const RIVER_KEYWORDS = [
  /\briver\b/i, /\bnadi\b/i, /नदी/, /खोला/, /\bflood\b/i, /बाढी/,
];

function isMetro(municipality: string | null | undefined): boolean {
  if (!municipality) return false;
  return METROPOLITAN_CITIES.some((m) => municipality.toLowerCase().includes(m));
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/* ─── Core Rules Engine ─── */

export function routeToAuthority(input: RoutingInput): AuthorityRoute {
  const desc = input.description || '';
  const muni = input.municipality || '';
  const ward = input.wardNumber || '';
  const metro = isMetro(input.municipality);

  // Build location label for office descriptions
  const locationLabel = [muni, ward ? `Ward ${ward}` : ''].filter(Boolean).join(', ') || 'Local area';
  const locationLabelNe = [muni, ward ? `वडा ${ward}` : ''].filter(Boolean).join(', ') || 'स्थानीय क्षेत्र';

  switch (input.issueType) {
    /* ═══ ROADS ═══ */
    case 'roads': {
      // Federal/national highways → Department of Roads (federal)
      if (matchesAny(desc, FEDERAL_HIGHWAY_KEYWORDS)) {
        return {
          authority: 'Department of Roads (DoR)',
          authorityNe: 'सडक विभाग',
          level: 'federal',
          departmentKey: 'infrastructure',
          office: 'Department of Roads, Babarmahal, Kathmandu',
          officeNe: 'सडक विभाग, बबरमहल, काठमाडौँ',
          routingReason: 'National/federal highway — federal jurisdiction under Department of Roads.',
        };
      }
      // Provincial roads → Provincial road authority
      if (matchesAny(desc, PROVINCIAL_HIGHWAY_KEYWORDS)) {
        return {
          authority: `Provincial Road Division, ${input.province || 'Province'}`,
          authorityNe: `प्रदेश सडक डिभिजन, ${input.province || 'प्रदेश'}`,
          level: 'provincial',
          departmentKey: 'infrastructure',
          office: `Provincial Road Division Office, ${input.province || 'Province'}`,
          officeNe: `प्रदेश सडक डिभिजन कार्यालय, ${input.province || 'प्रदेश'}`,
          routingReason: 'Provincial highway — provincial government jurisdiction.',
        };
      }
      // Local/ward roads → Municipality
      return {
        authority: `${muni || 'Municipality'} Infrastructure Division`,
        authorityNe: `${muni || 'नगरपालिका'} पूर्वाधार शाखा`,
        level: 'local',
        departmentKey: 'infrastructure',
        office: `Infrastructure Division, ${locationLabel}`,
        officeNe: `पूर्वाधार शाखा, ${locationLabelNe}`,
        routingReason: `Local road — municipality responsibility under ${locationLabel}.`,
      };
    }

    /* ═══ WATER ═══ */
    case 'water': {
      // Kathmandu Valley → KUKL (Kathmandu Upatyaka Khanepani Limited)
      if (
        muni.toLowerCase().includes('kathmandu') ||
        muni.toLowerCase().includes('lalitpur') ||
        muni.toLowerCase().includes('bhaktapur')
      ) {
        return {
          authority: 'Kathmandu Upatyaka Khanepani Limited (KUKL)',
          authorityNe: 'काठमाडौँ उपत्यका खानेपानी लिमिटेड (KUKL)',
          level: 'federal',
          departmentKey: 'water',
          office: `KUKL Branch Office, ${locationLabel}`,
          officeNe: `KUKL शाखा कार्यालय, ${locationLabelNe}`,
          routingReason: 'Kathmandu Valley water supply — KUKL jurisdiction.',
        };
      }
      // Other metro cities → local water utility
      if (metro) {
        return {
          authority: `${muni} Water Supply Authority`,
          authorityNe: `${muni} खानेपानी प्राधिकरण`,
          level: 'local',
          departmentKey: 'water',
          office: `Water Supply Office, ${locationLabel}`,
          officeNe: `खानेपानी कार्यालय, ${locationLabelNe}`,
          routingReason: `Metropolitan water supply — ${muni} jurisdiction.`,
        };
      }
      // Rural/smaller municipalities → Department of Water Supply
      return {
        authority: `${muni || 'Municipality'} Water Supply Section`,
        authorityNe: `${muni || 'नगरपालिका'} खानेपानी शाखा`,
        level: 'local',
        departmentKey: 'water',
        office: `Water Supply Section, ${locationLabel}`,
        officeNe: `खानेपानी शाखा, ${locationLabelNe}`,
        routingReason: 'Local water supply — municipality responsibility.',
      };
    }

    /* ═══ ELECTRICITY ═══ */
    case 'electricity': {
      // All electricity → Nepal Electricity Authority (NEA)
      return {
        authority: 'Nepal Electricity Authority (NEA)',
        authorityNe: 'नेपाल विद्युत प्राधिकरण',
        level: 'federal',
        departmentKey: 'electricity',
        office: `NEA Distribution Center, ${input.district || locationLabel}`,
        officeNe: `NEA वितरण केन्द्र, ${input.district || locationLabelNe}`,
        routingReason: 'Electricity supply and distribution — NEA jurisdiction nationwide.',
      };
    }

    /* ═══ SANITATION / GARBAGE ═══ */
    case 'sanitation': {
      // Kathmandu → specific waste management
      if (muni.toLowerCase().includes('kathmandu')) {
        return {
          authority: 'Kathmandu Metropolitan City, Environment Department',
          authorityNe: 'काठमाडौँ महानगरपालिका, वातावरण विभाग',
          level: 'local',
          departmentKey: 'sanitation',
          office: `KMC Environment Department, ${ward ? `Ward ${ward}` : 'Kathmandu'}`,
          officeNe: `काठमाडौँ महानगर वातावरण विभाग, ${ward ? `वडा ${ward}` : 'काठमाडौँ'}`,
          routingReason: 'Waste management in Kathmandu — KMC Environment Department.',
        };
      }
      // All other → local municipality sanitation
      return {
        authority: `${muni || 'Municipality'} Sanitation Division`,
        authorityNe: `${muni || 'नगरपालिका'} सरसफाइ शाखा`,
        level: 'local',
        departmentKey: 'sanitation',
        office: `Sanitation Division, ${locationLabel}`,
        officeNe: `सरसफाइ शाखा, ${locationLabelNe}`,
        routingReason: 'Waste management and sanitation — municipality responsibility.',
      };
    }

    /* ═══ HEALTH ═══ */
    case 'health': {
      // Hospital-level complaints → District Health Office
      if (/hospital|अस्पताल/i.test(desc)) {
        return {
          authority: `District Health Office, ${input.district || 'District'}`,
          authorityNe: `जिल्ला स्वास्थ्य कार्यालय, ${input.district || 'जिल्ला'}`,
          level: 'provincial',
          departmentKey: 'health',
          office: `District Health Office, ${input.district || 'District'}`,
          officeNe: `जिल्ला स्वास्थ्य कार्यालय, ${input.district || 'जिल्ला'}`,
          routingReason: 'Hospital/health facility complaint — District Health Office jurisdiction.',
        };
      }
      // Health post / local clinic → municipality health section
      return {
        authority: `${muni || 'Municipality'} Health Section`,
        authorityNe: `${muni || 'नगरपालिका'} स्वास्थ्य शाखा`,
        level: 'local',
        departmentKey: 'health',
        office: `Health Section, ${locationLabel}`,
        officeNe: `स्वास्थ्य शाखा, ${locationLabelNe}`,
        routingReason: 'Local health service complaint — municipality health section.',
      };
    }

    /* ═══ EDUCATION ═══ */
    case 'education': {
      // School-level → local education coordination unit or municipality
      return {
        authority: `${muni || 'Municipality'} Education Section`,
        authorityNe: `${muni || 'नगरपालिका'} शिक्षा शाखा`,
        level: 'local',
        departmentKey: 'education',
        office: `Education Section, ${locationLabel}`,
        officeNe: `शिक्षा शाखा, ${locationLabelNe}`,
        routingReason: 'Education complaint — municipality education section (local level has education authority post-federalization).',
      };
    }

    /* ═══ SAFETY / SECURITY ═══ */
    case 'safety': {
      // Crime/emergency → Nepal Police
      if (/crime|theft|attack|assault|murder|चोरी|हत्या|आक्रमण|लुटपाट/i.test(desc)) {
        return {
          authority: `Nepal Police, ${input.district || 'District'} Police Office`,
          authorityNe: `नेपाल प्रहरी, ${input.district || 'जिल्ला'} प्रहरी कार्यालय`,
          level: 'federal',
          departmentKey: 'safety',
          office: `District Police Office, ${input.district || 'District'}`,
          officeNe: `जिल्ला प्रहरी कार्यालय, ${input.district || 'जिल्ला'}`,
          routingReason: 'Criminal activity — Nepal Police jurisdiction.',
        };
      }
      // Traffic → Traffic Police
      if (/traffic|ट्राफिक|यातायात/i.test(desc)) {
        return {
          authority: 'Traffic Police Division',
          authorityNe: 'ट्राफिक प्रहरी महाशाखा',
          level: 'federal',
          departmentKey: 'safety',
          office: `Traffic Police, ${input.district || 'Area'}`,
          officeNe: `ट्राफिक प्रहरी, ${input.district || 'क्षेत्र'}`,
          routingReason: 'Traffic-related complaint — Traffic Police Division.',
        };
      }
      // Street safety, streetlights → municipality
      return {
        authority: `${muni || 'Municipality'} Ward Office`,
        authorityNe: `${muni || 'नगरपालिका'} वडा कार्यालय`,
        level: 'local',
        departmentKey: 'safety',
        office: `Ward Office, ${locationLabel}`,
        officeNe: `वडा कार्यालय, ${locationLabelNe}`,
        routingReason: 'Public safety/street safety — ward-level responsibility.',
      };
    }

    /* ═══ INTERNET / TELECOM ═══ */
    case 'internet': {
      // Telecom → Nepal Telecommunications Authority (NTA)
      return {
        authority: 'Nepal Telecommunications Authority (NTA)',
        authorityNe: 'नेपाल दूरसञ्चार प्राधिकरण',
        level: 'federal',
        departmentKey: 'internet',
        office: 'NTA, Bluestar Complex, Tripureshwor, Kathmandu',
        officeNe: 'NTA, ब्लुस्टार कम्प्लेक्स, त्रिपुरेश्वर, काठमाडौँ',
        routingReason: 'Internet/telecom complaint — NTA is the federal regulator.',
      };
    }

    /* ═══ ENVIRONMENT ═══ */
    case 'environment': {
      // River pollution → federal/provincial
      if (matchesAny(desc, RIVER_KEYWORDS)) {
        return {
          authority: `Provincial Environment Division, ${input.province || 'Province'}`,
          authorityNe: `प्रदेश वातावरण डिभिजन, ${input.province || 'प्रदेश'}`,
          level: 'provincial',
          departmentKey: 'environment',
          office: `Environment Division, ${input.province || 'Province'}`,
          officeNe: `वातावरण डिभिजन, ${input.province || 'प्रदेश'}`,
          routingReason: 'River/water body pollution — provincial environment authority.',
        };
      }
      // Air quality, noise, local pollution → municipality
      return {
        authority: `${muni || 'Municipality'} Environment Section`,
        authorityNe: `${muni || 'नगरपालिका'} वातावरण शाखा`,
        level: 'local',
        departmentKey: 'environment',
        office: `Environment Section, ${locationLabel}`,
        officeNe: `वातावरण शाखा, ${locationLabelNe}`,
        routingReason: 'Local environmental complaint — municipality environment section.',
      };
    }

    /* ═══ EMPLOYMENT ═══ */
    case 'employment': {
      return {
        authority: 'Department of Labour and Occupational Safety',
        authorityNe: 'श्रम तथा व्यावसायिक सुरक्षा विभाग',
        level: 'federal',
        departmentKey: 'employment',
        office: 'Department of Labour, Kathmandu',
        officeNe: 'श्रम विभाग, काठमाडौँ',
        routingReason: 'Employment/labour complaint — federal Department of Labour jurisdiction.',
      };
    }

    /* ═══ OTHER / GENERAL ═══ */
    case 'other':
    default: {
      // Default to ward office for unclassified issues
      return {
        authority: `${muni || 'Municipality'} Ward Office`,
        authorityNe: `${muni || 'नगरपालिका'} वडा कार्यालय`,
        level: 'local',
        departmentKey: 'local-municipality',
        office: `Ward Office, ${locationLabel}`,
        officeNe: `वडा कार्यालय, ${locationLabelNe}`,
        routingReason: 'General civic issue — routed to local ward office as first point of contact.',
      };
    }
  }
}

/**
 * Returns a human-readable routing explanation for UI display.
 * Labeled as "AI routing suggestion" — not a decision.
 */
export function formatRoutingSuggestion(route: AuthorityRoute, locale: string = 'en'): string {
  if (locale === 'ne') {
    return `${route.authorityNe} (${route.level === 'federal' ? 'संघीय' : route.level === 'provincial' ? 'प्रदेश' : 'स्थानीय'} तह)`;
  }
  return `${route.authority} (${route.level} level)`;
}
