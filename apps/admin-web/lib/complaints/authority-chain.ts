import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComplaintCase } from '@/lib/complaints/types';
import { routeToAuthority, type AuthorityRoute } from '@/lib/complaints/authority-router';

export type AuthorityChainNodeType =
  | 'primary_authority'
  | 'department_head'
  | 'ministry'
  | 'minister'
  | 'oversight';

export type AuthorityChainLevel =
  | 'local'
  | 'district'
  | 'provincial'
  | 'federal'
  | 'ministry'
  | 'national';

export interface ComplaintAuthorityChainNode {
  node_order: number;
  node_type: AuthorityChainNodeType;
  authority_level: AuthorityChainLevel;
  department_key: string | null;
  authority_name: string;
  authority_name_ne: string | null;
  office: string | null;
  office_ne: string | null;
  ministry_slug: string | null;
  minister_slug: string | null;
  official_name: string | null;
  official_title: string | null;
  facebook_url: string | null;
  confidence: number | null;
  metadata: Record<string, unknown>;
}

interface DepartmentMetadata {
  key: string;
  ministry_slug: string | null;
  ministry_name: string | null;
  ministry_name_ne: string | null;
  department_head_title: string | null;
  department_head_title_ne: string | null;
  facebook_page_url: string | null;
}

interface RosterOfficial {
  name: string;
  name_ne: string | null;
  title: string;
  title_ne: string | null;
  ministry: string;
  ministry_slug: string | null;
  metadata: Record<string, unknown> | null;
}

const FALLBACK_MINISTRY_BY_DEPARTMENT: Record<
  string,
  { slug: string; name: string; nameNe: string; headTitle: string; headTitleNe: string }
> = {
  infrastructure: {
    slug: 'infrastructure',
    name: 'Ministry of Physical Infrastructure and Transport',
    nameNe: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
    headTitle: 'Director General',
    headTitleNe: 'महानिर्देशक',
  },
  transport: {
    slug: 'infrastructure',
    name: 'Ministry of Physical Infrastructure and Transport',
    nameNe: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
    headTitle: 'Director General',
    headTitleNe: 'महानिर्देशक',
  },
  urban: {
    slug: 'urban',
    name: 'Ministry of Urban Development',
    nameNe: 'सहरी विकास मन्त्रालय',
    headTitle: 'Secretary',
    headTitleNe: 'सचिव',
  },
  water: {
    slug: 'energy',
    name: 'Ministry of Energy, Water Resources and Irrigation',
    nameNe: 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
    headTitle: 'Division Chief',
    headTitleNe: 'शाखा प्रमुख',
  },
  sanitation: {
    slug: 'urban',
    name: 'Ministry of Urban Development',
    nameNe: 'सहरी विकास मन्त्रालय',
    headTitle: 'Division Chief',
    headTitleNe: 'शाखा प्रमुख',
  },
  electricity: {
    slug: 'energy',
    name: 'Ministry of Energy, Water Resources and Irrigation',
    nameNe: 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
    headTitle: 'Executive Director',
    headTitleNe: 'कार्यकारी निर्देशक',
  },
  health: {
    slug: 'health',
    name: 'Ministry of Health and Population',
    nameNe: 'स्वास्थ्य तथा जनसंख्या मन्त्रालय',
    headTitle: 'Secretary',
    headTitleNe: 'सचिव',
  },
  education: {
    slug: 'education',
    name: 'Ministry of Education, Science and Technology',
    nameNe: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
    headTitle: 'Secretary',
    headTitleNe: 'सचिव',
  },
  internet: {
    slug: 'ict',
    name: 'Ministry of Communication and Information Technology',
    nameNe: 'सञ्चार तथा सूचना प्रविधि मन्त्रालय',
    headTitle: 'Secretary',
    headTitleNe: 'सचिव',
  },
  safety: {
    slug: 'home',
    name: 'Ministry of Home Affairs',
    nameNe: 'गृह मन्त्रालय',
    headTitle: 'Chief District Officer / Police Chief',
    headTitleNe: 'प्रमुख जिल्ला अधिकारी / प्रहरी प्रमुख',
  },
  employment: {
    slug: 'industry',
    name: 'Ministry of Labour, Employment and Social Security',
    nameNe: 'श्रम, रोजगार तथा सामाजिक सुरक्षा मन्त्रालय',
    headTitle: 'Secretary',
    headTitleNe: 'सचिव',
  },
  environment: {
    slug: 'forests',
    name: 'Ministry of Forests and Environment',
    nameNe: 'वन तथा वातावरण मन्त्रालय',
    headTitle: 'Secretary',
    headTitleNe: 'सचिव',
  },
  'local-municipality': {
    slug: 'federal-affairs',
    name: 'Ministry of Federal Affairs and General Administration',
    nameNe: 'संघीय मामिला तथा सामान्य प्रशासन मन्त्रालय',
    headTitle: 'Mayor / Chairperson',
    headTitleNe: 'मेयर / अध्यक्ष',
  },
  'home-affairs': {
    slug: 'home',
    name: 'Ministry of Home Affairs',
    nameNe: 'गृह मन्त्रालय',
    headTitle: 'Secretary',
    headTitleNe: 'सचिव',
  },
  other: {
    slug: 'opm',
    name: 'Office of the Prime Minister and Council of Ministers',
    nameNe: 'प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय',
    headTitle: 'Secretary',
    headTitleNe: 'सचिव',
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function slugifyMinisterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function authorityRouteFromComplaint(complaint: ComplaintCase): AuthorityRoute {
  const triage = asRecord(complaint.ai_triage);
  const triageRoute = triage ? asRecord(triage.authorityRoute) : null;
  if (triageRoute) {
    const authority = asString(triageRoute.authority);
    const authorityNe = asString(triageRoute.authorityNe);
    const office = asString(triageRoute.office);
    const officeNe = asString(triageRoute.officeNe);
    const routingReason = asString(triageRoute.routingReason);
    const departmentKey = asString(triageRoute.departmentKey);
    const levelRaw = asString(triageRoute.level);
    const level = levelRaw === 'local' || levelRaw === 'provincial' || levelRaw === 'federal'
      ? levelRaw
      : null;

    if (
      authority &&
      authorityNe &&
      office &&
      officeNe &&
      routingReason &&
      departmentKey &&
      level
    ) {
      return {
        authority,
        authorityNe,
        office,
        officeNe,
        routingReason,
        departmentKey,
        level,
      };
    }
  }

  return routeToAuthority({
    issueType: complaint.issue_type,
    severity: complaint.severity,
    province: complaint.province,
    district: complaint.district,
    municipality: complaint.municipality,
    wardNumber: complaint.ward_number,
    description: `${complaint.title}\n${complaint.description}`.trim(),
  });
}

async function getDepartmentMetadata(
  db: SupabaseClient,
  departmentKey: string | null,
): Promise<DepartmentMetadata | null> {
  if (!departmentKey) return null;
  const { data } = await db
    .from('complaint_departments')
    .select('key, ministry_slug, ministry_name, ministry_name_ne, department_head_title, department_head_title_ne, facebook_page_url')
    .eq('key', departmentKey)
    .maybeSingle();

  return (data as DepartmentMetadata | null) || null;
}

async function getCurrentMinister(
  db: SupabaseClient,
  ministrySlug: string | null,
): Promise<RosterOfficial | null> {
  if (!ministrySlug) return null;
  const { data } = await db
    .from('government_roster')
    .select('name, name_ne, title, title_ne, ministry, ministry_slug, metadata, confidence, updated_at')
    .eq('is_current', true)
    .eq('ministry_slug', ministrySlug)
    .order('confidence', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as RosterOfficial | null) || null;
}

export function buildAuthorityChainNodes(
  complaint: ComplaintCase,
  route: AuthorityRoute,
  departmentMeta: DepartmentMetadata | null,
  minister: RosterOfficial | null,
): ComplaintAuthorityChainNode[] {
  const confidence = normalizeConfidence(complaint.ai_route_confidence);
  const effectiveDepartment = complaint.assigned_department_key || complaint.department_key || route.departmentKey;
  const fallback = FALLBACK_MINISTRY_BY_DEPARTMENT[effectiveDepartment || 'other'] || FALLBACK_MINISTRY_BY_DEPARTMENT.other;

  const ministrySlug = departmentMeta?.ministry_slug || fallback.slug;
  const ministryName = departmentMeta?.ministry_name || fallback.name;
  const ministryNameNe = departmentMeta?.ministry_name_ne || fallback.nameNe;
  const departmentHeadTitle = departmentMeta?.department_head_title || fallback.headTitle;
  const departmentHeadTitleNe = departmentMeta?.department_head_title_ne || fallback.headTitleNe;
  const departmentFacebook = departmentMeta?.facebook_page_url || null;

  const ministerName = minister?.name || null;
  const ministerTitle = minister?.title || null;
  const ministerSlug = ministerName ? slugifyMinisterName(ministerName) : null;
  const ministerMeta = asRecord(minister?.metadata || null);
  const ministerFacebook = asString(ministerMeta?.facebook) || asString(ministerMeta?.facebook_url);

  const nodes: ComplaintAuthorityChainNode[] = [
    {
      node_order: 0,
      node_type: 'primary_authority',
      authority_level: route.level,
      department_key: effectiveDepartment || null,
      authority_name: route.authority,
      authority_name_ne: route.authorityNe,
      office: route.office,
      office_ne: route.officeNe,
      ministry_slug: ministrySlug,
      minister_slug: ministerSlug,
      official_name: null,
      official_title: null,
      facebook_url: departmentFacebook,
      confidence,
      metadata: {
        routing_reason: route.routingReason,
      },
    },
    {
      node_order: 1,
      node_type: 'department_head',
      authority_level: route.level === 'federal' ? 'federal' : route.level === 'provincial' ? 'provincial' : 'local',
      department_key: effectiveDepartment || null,
      authority_name: `${route.authority} — ${departmentHeadTitle}`,
      authority_name_ne: `${route.authorityNe} — ${departmentHeadTitleNe}`,
      office: route.office,
      office_ne: route.officeNe,
      ministry_slug: ministrySlug,
      minister_slug: ministerSlug,
      official_name: null,
      official_title: departmentHeadTitle,
      facebook_url: departmentFacebook,
      confidence,
      metadata: {},
    },
    {
      node_order: 2,
      node_type: 'ministry',
      authority_level: 'ministry',
      department_key: effectiveDepartment || null,
      authority_name: ministryName,
      authority_name_ne: ministryNameNe,
      office: null,
      office_ne: null,
      ministry_slug: ministrySlug,
      minister_slug: ministerSlug,
      official_name: null,
      official_title: 'Ministry',
      facebook_url: departmentFacebook,
      confidence,
      metadata: {},
    },
  ];

  if (ministerName && ministerTitle) {
    nodes.push({
      node_order: 3,
      node_type: 'minister',
      authority_level: 'national',
      department_key: effectiveDepartment || null,
      authority_name: ministerName,
      authority_name_ne: minister?.name_ne || null,
      office: minister?.ministry || null,
      office_ne: null,
      ministry_slug: ministrySlug,
      minister_slug: ministerSlug,
      official_name: ministerName,
      official_title: ministerTitle,
      facebook_url: ministerFacebook || departmentFacebook,
      confidence,
      metadata: {
        roster_title_ne: minister?.title_ne || null,
      },
    });
  }

  if (ministrySlug !== 'opm') {
    nodes.push({
      node_order: nodes.length,
      node_type: 'oversight',
      authority_level: 'national',
      department_key: effectiveDepartment || null,
      authority_name: 'Office of the Prime Minister and Council of Ministers',
      authority_name_ne: 'प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय',
      office: 'Singha Durbar, Kathmandu',
      office_ne: 'सिंहदरबार, काठमाडौँ',
      ministry_slug: 'opm',
      minister_slug: null,
      official_name: null,
      official_title: 'National Oversight',
      facebook_url: null,
      confidence,
      metadata: {},
    });
  }

  return nodes;
}

export async function replaceComplaintAuthorityChain(
  db: SupabaseClient,
  complaintId: string,
  nodes: ComplaintAuthorityChainNode[],
): Promise<void> {
  await db
    .from('complaint_authority_chain')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('complaint_id', complaintId)
    .eq('is_active', true);

  if (nodes.length === 0) return;

  await db.from('complaint_authority_chain').insert(
    nodes.map((node, index) => ({
      complaint_id: complaintId,
      node_order: index,
      node_type: node.node_type,
      authority_level: node.authority_level,
      department_key: node.department_key,
      authority_name: node.authority_name,
      authority_name_ne: node.authority_name_ne,
      office: node.office,
      office_ne: node.office_ne,
      ministry_slug: node.ministry_slug,
      minister_slug: node.minister_slug,
      official_name: node.official_name,
      official_title: node.official_title,
      facebook_url: node.facebook_url,
      confidence: node.confidence,
      is_active: true,
      metadata: node.metadata,
    })),
  );
}

export async function rebuildComplaintAuthorityChain(
  db: SupabaseClient,
  complaint: ComplaintCase,
): Promise<ComplaintAuthorityChainNode[]> {
  const route = authorityRouteFromComplaint(complaint);
  const effectiveDepartment = complaint.assigned_department_key || complaint.department_key || route.departmentKey;
  const departmentMeta = await getDepartmentMetadata(db, effectiveDepartment);
  const fallback = FALLBACK_MINISTRY_BY_DEPARTMENT[effectiveDepartment || 'other'] || FALLBACK_MINISTRY_BY_DEPARTMENT.other;
  const ministrySlug = departmentMeta?.ministry_slug || fallback.slug;
  const minister = await getCurrentMinister(db, ministrySlug);
  const nodes = buildAuthorityChainNodes(complaint, route, departmentMeta, minister);
  await replaceComplaintAuthorityChain(db, complaint.id, nodes);
  return nodes;
}
