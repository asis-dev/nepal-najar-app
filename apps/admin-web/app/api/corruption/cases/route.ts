import { NextRequest, NextResponse } from 'next/server';
import { getCorruptionCases } from '@/lib/data/corruption-data';
import type { CaseFilters } from '@/lib/data/corruption-data';
import type {
  CorruptionType,
  CaseStatus,
  Severity,
  EntityType,
  EntityRole,
  EvidenceType,
  EvidenceReliability,
  TimelineEventType,
  DatePrecision,
} from '@/lib/data/corruption-types';
import { getSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const filters: CaseFilters = {};
  if (searchParams.get('corruption_type')) filters.corruption_type = searchParams.get('corruption_type') as CorruptionType;
  if (searchParams.get('status')) filters.status = searchParams.get('status') as CaseStatus;
  if (searchParams.get('severity')) filters.severity = searchParams.get('severity') as Severity;
  if (searchParams.get('search')) filters.search = searchParams.get('search')!;
  if (searchParams.get('page')) filters.page = Number(searchParams.get('page'));
  if (searchParams.get('pageSize')) filters.pageSize = Number(searchParams.get('pageSize'));

  const result = await getCorruptionCases(filters);

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}

/**
 * POST /api/corruption/cases
 *
 * Create a corruption case programmatically with full related data.
 * Used by the discovery approval flow and manual case creation.
 *
 * Auth: Bearer SCRAPE_SECRET or ADMIN_SECRET
 */
export async function POST(req: NextRequest) {
  // Auth check
  const secret = process.env.SCRAPE_SECRET || process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Server secret not configured' },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      slug,
      corruption_type,
      status,
      severity,
      summary,
      estimated_amount_npr,
      entities,
      timeline_events,
      evidence,
      tags,
      related_commitment_ids,
      related_body_slugs,
    } = body as {
      title: string;
      slug?: string;
      corruption_type: CorruptionType;
      status?: CaseStatus;
      severity?: Severity;
      summary?: string;
      estimated_amount_npr?: number;
      entities?: Array<{
        name: string;
        entity_type: EntityType;
        role: EntityRole;
        title?: string;
        party_affiliation?: string;
        involvement_status?: string;
      }>;
      timeline_events?: Array<{
        event_date: string;
        event_type: TimelineEventType;
        title: string;
        description?: string;
        event_date_precision?: DatePrecision;
      }>;
      evidence?: Array<{
        evidence_type: EvidenceType;
        title?: string;
        url?: string;
        source_name?: string;
        content_summary?: string;
        published_at?: string;
        reliability?: EvidenceReliability;
        signal_id?: string;
      }>;
      tags?: string[];
      related_commitment_ids?: number[];
      related_body_slugs?: string[];
    };

    if (!title || !corruption_type) {
      return NextResponse.json(
        { error: 'title and corruption_type are required' },
        { status: 400 },
      );
    }

    const supabase = getSupabase();

    // Generate slug if not provided
    const caseSlug = slug || slugify(title) || `case-${Date.now()}`;

    // 1. Create the case
    const { data: caseRow, error: caseError } = await supabase
      .from('corruption_cases')
      .insert({
        slug: caseSlug,
        title,
        corruption_type,
        status: status || 'alleged',
        severity: severity || null,
        summary: summary || null,
        estimated_amount_npr: estimated_amount_npr || null,
        source_quality: 'reported',
        tags: tags || [],
        related_commitment_ids: related_commitment_ids || null,
        related_body_slugs: related_body_slugs || null,
      })
      .select('id, slug')
      .single();

    if (caseError || !caseRow) {
      throw new Error(caseError?.message || 'Failed to create case');
    }

    const caseId = caseRow.id as string;
    const createdEntityIds: string[] = [];

    // 2. Create entities + links
    if (Array.isArray(entities)) {
      for (const entity of entities) {
        const entitySlug = slugify(entity.name);
        if (!entitySlug) continue;

        // Upsert
        const { data: existing } = await supabase
          .from('corruption_entities')
          .select('id')
          .eq('slug', entitySlug)
          .maybeSingle();

        let entityId: string;
        if (existing) {
          entityId = existing.id as string;
        } else {
          const { data: newEntity, error: entityErr } = await supabase
            .from('corruption_entities')
            .insert({
              slug: entitySlug,
              name: entity.name,
              entity_type: entity.entity_type || 'person',
              title: entity.title || null,
              party_affiliation: entity.party_affiliation || null,
            })
            .select('id')
            .single();

          if (entityErr || !newEntity) continue;
          entityId = newEntity.id as string;
        }

        createdEntityIds.push(entityId);

        await supabase.from('corruption_case_entities').insert({
          case_id: caseId,
          entity_id: entityId,
          role: entity.role || 'accused',
          involvement_status: entity.involvement_status || null,
        });
      }
    }

    // 3. Create timeline events
    if (Array.isArray(timeline_events)) {
      for (const event of timeline_events) {
        await supabase.from('corruption_timeline_events').insert({
          case_id: caseId,
          event_date: event.event_date,
          event_date_precision: event.event_date_precision || 'exact',
          event_type: event.event_type,
          title: event.title,
          description: event.description || null,
        });
      }
    }

    // 4. Create evidence
    if (Array.isArray(evidence)) {
      for (const ev of evidence) {
        await supabase.from('corruption_evidence').insert({
          case_id: caseId,
          evidence_type: ev.evidence_type || 'news_article',
          title: ev.title || null,
          url: ev.url || null,
          source_name: ev.source_name || null,
          content_summary: ev.content_summary || null,
          published_at: ev.published_at || null,
          reliability: ev.reliability || 'medium',
          signal_id: ev.signal_id || null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      case: {
        id: caseId,
        slug: caseRow.slug,
      },
      entitiesCreated: createdEntityIds.length,
      timelineEventsCreated: (timeline_events || []).length,
      evidenceCreated: (evidence || []).length,
    });
  } catch (err) {
    console.error('[API] Corruption cases POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
