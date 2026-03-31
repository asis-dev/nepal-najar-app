/**
 * Corruption Tracking — Data Access Layer
 *
 * Server-side data fetching functions for the corruption_* tables.
 * Uses getSupabase() service-role client for full DB access.
 * All functions return empty/zero defaults on error — no throws.
 */

import { getSupabase } from '@/lib/supabase/server';
import type {
  CorruptionCase,
  CorruptionEntity,
  CaseEntity,
  EntityRelationship,
  MoneyFlow,
  CorruptionEvidence,
  TimelineEvent,
  CaseSummary,
  EntityDossier,
  CorruptionStats,
  CorruptionType,
  CaseStatus,
  Severity,
  EntityType,
  EntityRole,
} from './corruption-types';
import { isActiveCase } from './corruption-types';

/* ═══════════════════════════════════════════════
   FILTER TYPES
   ═══════════════════════════════════════════════ */

export interface CaseFilters {
  corruption_type?: CorruptionType;
  status?: CaseStatus;
  severity?: Severity;
  verified?: boolean;
  tag?: string;
  related_body_slug?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface EntityFilters {
  entity_type?: EntityType;
  party_affiliation?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

/* ═══════════════════════════════════════════════
   CASES
   ═══════════════════════════════════════════════ */

/**
 * List corruption cases with optional filtering and pagination.
 * Returns newest first by default.
 */
export async function getCorruptionCases(
  filters: CaseFilters = {},
): Promise<{ cases: CorruptionCase[]; total: number }> {
  try {
    const supabase = getSupabase();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('corruption_cases')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (filters.corruption_type) {
      query = query.eq('corruption_type', filters.corruption_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }
    if (filters.tag) {
      query = query.contains('tags', [filters.tag]);
    }
    if (filters.related_body_slug) {
      query = query.contains('related_body_slugs', [filters.related_body_slug]);
    }
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.warn('[corruption-data] getCorruptionCases failed:', error.message);
      return { cases: [], total: 0 };
    }

    return {
      cases: (data ?? []) as CorruptionCase[],
      total: count ?? 0,
    };
  } catch (err) {
    console.warn('[corruption-data] getCorruptionCases error:', err);
    return { cases: [], total: 0 };
  }
}

/**
 * Get a single corruption case by slug, with all related data:
 * entities, timeline, evidence, and money flows.
 */
export async function getCorruptionCase(slug: string): Promise<{
  case: CorruptionCase | null;
  entities: Array<CaseEntity & { entity: CorruptionEntity }>;
  timeline: TimelineEvent[];
  evidence: CorruptionEvidence[];
  moneyFlows: Array<MoneyFlow & { from_entity?: CorruptionEntity; to_entity?: CorruptionEntity }>;
}> {
  try {
    const supabase = getSupabase();

    // Fetch the case
    const { data: caseData, error: caseError } = await supabase
      .from('corruption_cases')
      .select('*')
      .eq('slug', slug)
      .single();

    if (caseError || !caseData) {
      console.warn('[corruption-data] getCorruptionCase not found:', slug);
      return { case: null, entities: [], timeline: [], evidence: [], moneyFlows: [] };
    }

    const caseRow = caseData as CorruptionCase;
    const caseId = caseRow.id;

    // Fetch related data in parallel
    const [entitiesRes, timelineRes, evidenceRes, moneyFlowsRes] = await Promise.all([
      supabase
        .from('corruption_case_entities')
        .select('*, entity:corruption_entities(*)')
        .eq('case_id', caseId)
        .order('role'),
      supabase
        .from('corruption_timeline_events')
        .select('*')
        .eq('case_id', caseId)
        .order('event_date', { ascending: false }),
      supabase
        .from('corruption_evidence')
        .select('*')
        .eq('case_id', caseId)
        .order('published_at', { ascending: false }),
      supabase
        .from('corruption_money_flows')
        .select('*, from_entity:corruption_entities!corruption_money_flows_from_entity_id_fkey(*), to_entity:corruption_entities!corruption_money_flows_to_entity_id_fkey(*)')
        .eq('case_id', caseId)
        .order('date', { ascending: false }),
    ]);

    return {
      case: caseRow,
      entities: (entitiesRes.data ?? []) as Array<CaseEntity & { entity: CorruptionEntity }>,
      timeline: (timelineRes.data ?? []) as TimelineEvent[],
      evidence: (evidenceRes.data ?? []) as CorruptionEvidence[],
      moneyFlows: (moneyFlowsRes.data ?? []) as Array<MoneyFlow & { from_entity?: CorruptionEntity; to_entity?: CorruptionEntity }>,
    };
  } catch (err) {
    console.warn('[corruption-data] getCorruptionCase error:', err);
    return { case: null, entities: [], timeline: [], evidence: [], moneyFlows: [] };
  }
}

/* ═══════════════════════════════════════════════
   ENTITIES
   ═══════════════════════════════════════════════ */

/**
 * List corruption entities with optional filtering and pagination.
 * Returns by total_cases descending (most-involved first).
 */
export async function getCorruptionEntities(
  filters: EntityFilters = {},
): Promise<{ entities: CorruptionEntity[]; total: number }> {
  try {
    const supabase = getSupabase();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('corruption_entities')
      .select('*', { count: 'exact' })
      .order('total_cases', { ascending: false })
      .range(from, to);

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters.party_affiliation) {
      query = query.eq('party_affiliation', filters.party_affiliation);
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,name_ne.ilike.%${filters.search}%,bio.ilike.%${filters.search}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.warn('[corruption-data] getCorruptionEntities failed:', error.message);
      return { entities: [], total: 0 };
    }

    return {
      entities: (data ?? []) as CorruptionEntity[],
      total: count ?? 0,
    };
  } catch (err) {
    console.warn('[corruption-data] getCorruptionEntities error:', err);
    return { entities: [], total: 0 };
  }
}

/**
 * Get a single entity dossier by slug: entity details + all cases + relationships.
 */
export async function getCorruptionEntity(slug: string): Promise<EntityDossier | null> {
  try {
    const supabase = getSupabase();

    // Fetch the entity
    const { data: entityData, error: entityError } = await supabase
      .from('corruption_entities')
      .select('*')
      .eq('slug', slug)
      .single();

    if (entityError || !entityData) {
      console.warn('[corruption-data] getCorruptionEntity not found:', slug);
      return null;
    }

    const entity = entityData as CorruptionEntity;
    const entityId = entity.id;

    // Fetch cases and relationships in parallel
    const [casesRes, relsARes, relsBRes] = await Promise.all([
      supabase
        .from('corruption_case_entities')
        .select('role, involvement_status, case:corruption_cases(*)')
        .eq('entity_id', entityId),
      supabase
        .from('corruption_entity_relationships')
        .select('*, otherEntity:corruption_entities!corruption_entity_relationships_entity_b_id_fkey(*)')
        .eq('entity_a_id', entityId),
      supabase
        .from('corruption_entity_relationships')
        .select('*, otherEntity:corruption_entities!corruption_entity_relationships_entity_a_id_fkey(*)')
        .eq('entity_b_id', entityId),
    ]);

    // Combine cases — Supabase may return joined 'case' as array or object
    const cases = ((casesRes.data ?? []) as unknown as Array<{
      role: EntityRole;
      involvement_status: string | null;
      case: CorruptionCase | CorruptionCase[];
    }>).map((row) => ({
      case: Array.isArray(row.case) ? row.case[0] : row.case,
      role: row.role,
      involvement_status: row.involvement_status as EntityDossier['cases'][number]['involvement_status'],
    })).filter((r) => r.case);

    // Combine relationships from both directions
    const relationshipsA = ((relsARes.data ?? []) as Array<EntityRelationship & { otherEntity: CorruptionEntity }>).map((r) => ({
      relationship: r,
      otherEntity: r.otherEntity,
    }));
    const relationshipsB = ((relsBRes.data ?? []) as Array<EntityRelationship & { otherEntity: CorruptionEntity }>).map((r) => ({
      relationship: r,
      otherEntity: r.otherEntity,
    }));

    // Sum total money from all cases this entity is involved in
    const caseIds = cases.map((c) => c.case.id);
    let totalAmountNpr = 0;
    if (caseIds.length > 0) {
      const { data: flows } = await supabase
        .from('corruption_money_flows')
        .select('amount_npr')
        .in('case_id', caseIds);
      totalAmountNpr = (flows ?? []).reduce(
        (sum, f) => sum + ((f as { amount_npr: number | null }).amount_npr ?? 0),
        0,
      );
    }

    return {
      entity,
      cases,
      relationships: [...relationshipsA, ...relationshipsB],
      totalAmountNpr,
    };
  } catch (err) {
    console.warn('[corruption-data] getCorruptionEntity error:', err);
    return null;
  }
}

/* ═══════════════════════════════════════════════
   AGGREGATE STATS
   ═══════════════════════════════════════════════ */

/**
 * Compute aggregate stats for the corruption dashboard header.
 */
export async function getCorruptionStats(): Promise<CorruptionStats> {
  const empty: CorruptionStats = {
    totalCases: 0,
    totalAmountNpr: 0,
    activeInvestigations: 0,
    convictions: 0,
    convictionRate: 0,
    casesByType: {},
    casesByStatus: {},
    casesBySeverity: {},
    totalEntities: 0,
  };

  try {
    const supabase = getSupabase();

    const [casesRes, entitiesCountRes] = await Promise.all([
      supabase
        .from('corruption_cases')
        .select('corruption_type, status, severity, estimated_amount_npr'),
      supabase
        .from('corruption_entities')
        .select('id', { count: 'exact', head: true }),
    ]);

    if (casesRes.error || !casesRes.data) {
      console.warn('[corruption-data] getCorruptionStats cases failed:', casesRes.error?.message);
      return empty;
    }

    const cases = casesRes.data as Array<{
      corruption_type: CorruptionType;
      status: CaseStatus;
      severity: Severity | null;
      estimated_amount_npr: number | null;
    }>;

    const totalCases = cases.length;
    let totalAmountNpr = 0;
    let activeInvestigations = 0;
    let convictions = 0;
    const casesByType: Partial<Record<CorruptionType, number>> = {};
    const casesByStatus: Partial<Record<CaseStatus, number>> = {};
    const casesBySeverity: Partial<Record<Severity, number>> = {};

    // Count resolved cases (convicted, acquitted, closed) for conviction rate
    let resolvedCases = 0;

    for (const c of cases) {
      totalAmountNpr += c.estimated_amount_npr ?? 0;

      if (isActiveCase(c.status)) {
        activeInvestigations++;
      }
      if (c.status === 'convicted') {
        convictions++;
      }
      if (['convicted', 'acquitted', 'closed'].includes(c.status)) {
        resolvedCases++;
      }

      casesByType[c.corruption_type] = (casesByType[c.corruption_type] ?? 0) + 1;
      casesByStatus[c.status] = (casesByStatus[c.status] ?? 0) + 1;
      if (c.severity) {
        casesBySeverity[c.severity] = (casesBySeverity[c.severity] ?? 0) + 1;
      }
    }

    return {
      totalCases,
      totalAmountNpr,
      activeInvestigations,
      convictions,
      convictionRate: resolvedCases > 0 ? Math.round((convictions / resolvedCases) * 100) : 0,
      casesByType,
      casesByStatus,
      casesBySeverity,
      totalEntities: entitiesCountRes.count ?? 0,
    };
  } catch (err) {
    console.warn('[corruption-data] getCorruptionStats error:', err);
    return empty;
  }
}

/* ═══════════════════════════════════════════════
   TIMELINE
   ═══════════════════════════════════════════════ */

/**
 * Get timeline events, optionally filtered by case ID.
 * Returns newest events first.
 */
export async function getCorruptionTimeline(
  caseId?: string,
): Promise<TimelineEvent[]> {
  try {
    const supabase = getSupabase();

    let query = supabase
      .from('corruption_timeline_events')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(100);

    if (caseId) {
      query = query.eq('case_id', caseId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[corruption-data] getCorruptionTimeline failed:', error.message);
      return [];
    }

    return (data ?? []) as TimelineEvent[];
  } catch (err) {
    console.warn('[corruption-data] getCorruptionTimeline error:', err);
    return [];
  }
}

/* ═══════════════════════════════════════════════
   MONEY FLOWS
   ═══════════════════════════════════════════════ */

/**
 * Get money flows, optionally filtered by case ID.
 * Includes from/to entity names for display.
 */
export async function getMoneyFlows(
  caseId?: string,
): Promise<Array<MoneyFlow & { from_entity?: CorruptionEntity; to_entity?: CorruptionEntity }>> {
  try {
    const supabase = getSupabase();

    let query = supabase
      .from('corruption_money_flows')
      .select(
        '*, from_entity:corruption_entities!corruption_money_flows_from_entity_id_fkey(*), to_entity:corruption_entities!corruption_money_flows_to_entity_id_fkey(*)',
      )
      .order('date', { ascending: false })
      .limit(200);

    if (caseId) {
      query = query.eq('case_id', caseId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[corruption-data] getMoneyFlows failed:', error.message);
      return [];
    }

    return (data ?? []) as Array<MoneyFlow & { from_entity?: CorruptionEntity; to_entity?: CorruptionEntity }>;
  } catch (err) {
    console.warn('[corruption-data] getMoneyFlows error:', err);
    return [];
  }
}

/* ═══════════════════════════════════════════════
   ENTITY RELATIONSHIPS (graph data)
   ═══════════════════════════════════════════════ */

/**
 * Get entity relationships for graph visualization.
 * If entityId is provided, returns only relationships involving that entity.
 * Otherwise returns all relationships (limited to 500).
 */
export async function getEntityRelationships(
  entityId?: string,
): Promise<Array<EntityRelationship & { entity_a: CorruptionEntity; entity_b: CorruptionEntity }>> {
  try {
    const supabase = getSupabase();

    const selectClause =
      '*, entity_a:corruption_entities!corruption_entity_relationships_entity_a_id_fkey(*), entity_b:corruption_entities!corruption_entity_relationships_entity_b_id_fkey(*)';

    if (entityId) {
      // Fetch both directions
      const [resA, resB] = await Promise.all([
        supabase
          .from('corruption_entity_relationships')
          .select(selectClause)
          .eq('entity_a_id', entityId)
          .limit(250),
        supabase
          .from('corruption_entity_relationships')
          .select(selectClause)
          .eq('entity_b_id', entityId)
          .limit(250),
      ]);

      const combined = [
        ...((resA.data ?? []) as Array<EntityRelationship & { entity_a: CorruptionEntity; entity_b: CorruptionEntity }>),
        ...((resB.data ?? []) as Array<EntityRelationship & { entity_a: CorruptionEntity; entity_b: CorruptionEntity }>),
      ];

      // Deduplicate by id
      const seen = new Set<string>();
      return combined.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    }

    // All relationships
    const { data, error } = await supabase
      .from('corruption_entity_relationships')
      .select(selectClause)
      .limit(500);

    if (error) {
      console.warn('[corruption-data] getEntityRelationships failed:', error.message);
      return [];
    }

    return (data ?? []) as Array<EntityRelationship & { entity_a: CorruptionEntity; entity_b: CorruptionEntity }>;
  } catch (err) {
    console.warn('[corruption-data] getEntityRelationships error:', err);
    return [];
  }
}
