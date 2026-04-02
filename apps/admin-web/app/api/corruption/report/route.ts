import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';
import { triageCorruptionReport } from '@/lib/intelligence/corruption-triage';
import type { CorruptionType } from '@/lib/data/corruption-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

async function getCurrentUser() {
  try {
    const ssr = await createSupabaseServerClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

interface CreateCorruptionReportBody {
  title?: string;
  description: string;
  corruption_type?: CorruptionType;
  municipality?: string;
  district?: string;
  province?: string;
  is_anonymous?: boolean;
  evidence_url?: string;
  evidence_note?: string;
  language?: string;
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 per hour per IP (corruption reports are sensitive)
  const ip = getClientIp(request);
  const { success } = await rateLimit(`corruption-report:${ip}`, 5, 3600000);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You may submit up to 5 corruption reports per hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  // Require authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Parse body
  let body: CreateCorruptionReportBody;
  try {
    body = (await request.json()) as CreateCorruptionReportBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate description
  const description = body.description?.trim() || '';
  if (description.length < 20) {
    return NextResponse.json(
      { error: 'Description must be at least 20 characters' },
      { status: 400 },
    );
  }
  if (description.length > 10000) {
    return NextResponse.json(
      { error: 'Description must be under 10,000 characters' },
      { status: 400 },
    );
  }

  // Run AI triage
  const triage = await triageCorruptionReport({
    title: body.title,
    description,
    language: body.language || 'ne',
    municipality: body.municipality || null,
    evidence_url: body.evidence_url || null,
  });

  const db = getSupabase();
  const now = new Date().toISOString();

  // Determine corruption type: user override or AI classification
  const corruptionType = body.corruption_type || triage.corruption_type;
  const caseTitle = body.title?.trim() || triage.title;
  const slug = slugify(caseTitle) + '-' + Date.now().toString(36);

  // Insert into corruption_cases
  const caseInsert = {
    title: caseTitle,
    title_ne: triage.titleNe,
    slug,
    corruption_type: corruptionType,
    status: 'alleged' as const,
    severity: triage.severity,
    summary: triage.summary,
    summary_ne: null,
    verified: false,
    source_quality: 'alleged' as const,
    tags: triage.suggested_tags.length > 0 ? triage.suggested_tags : null,
    related_commitment_ids: null,
    related_body_slugs: null,
    cover_image_url: null,
    estimated_amount_npr: null,
    created_at: now,
    updated_at: now,
  };

  const { data: createdCase, error: caseError } = await db
    .from('corruption_cases')
    .insert(caseInsert)
    .select('id, slug')
    .single();

  if (caseError || !createdCase) {
    console.error('[CorruptionReport] Failed to create case:', caseError?.message);
    return NextResponse.json(
      { error: caseError?.message || 'Failed to create corruption case' },
      { status: 500 },
    );
  }

  const caseId = createdCase.id as string;

  // Create timeline event: complaint_filed
  await db.from('corruption_timeline').insert({
    case_id: caseId,
    event_date: now,
    event_date_precision: 'exact',
    event_type: 'complaint_filed',
    title: 'Citizen report submitted',
    title_ne: 'नागरिक उजुरी दर्ता भयो',
    description: body.is_anonymous
      ? 'An anonymous citizen submitted a corruption report via Nepal Republic.'
      : 'A citizen submitted a corruption report via Nepal Republic.',
    entity_ids: null,
    evidence_ids: null,
    created_at: now,
  });

  // If evidence provided, create corruption_evidence record
  let evidence = null;
  const evidenceUrl = body.evidence_url?.trim() || null;
  const evidenceNote = body.evidence_note?.trim() || null;

  if (evidenceUrl || evidenceNote) {
    const { data: insertedEvidence } = await db
      .from('corruption_evidence')
      .insert({
        case_id: caseId,
        evidence_type: evidenceUrl ? 'social_media' as const : 'whistleblower' as const,
        title: evidenceNote ? evidenceNote.slice(0, 200) : 'Citizen-submitted evidence',
        url: evidenceUrl,
        source_name: 'Citizen Report',
        content_summary: evidenceNote || description.slice(0, 500),
        published_at: now,
        reliability: 'low' as const,
        signal_id: null,
        file_url: null,
        metadata: {
          submitted_by: body.is_anonymous ? 'anonymous' : user.id,
          municipality: body.municipality || null,
          district: body.district || null,
          province: body.province || null,
        },
        created_at: now,
      })
      .select('id, evidence_type, url, title')
      .single();

    evidence = insertedEvidence || null;
  }

  return NextResponse.json(
    {
      success: true,
      case: {
        id: caseId,
        slug: createdCase.slug,
      },
      triage: {
        corruption_type: triage.corruption_type,
        severity: triage.severity,
        confidence: triage.confidence,
        summary: triage.summary,
        suggested_entities: triage.suggested_entities,
        suggested_tags: triage.suggested_tags,
        reasoning: triage.reasoning,
        title: triage.title,
        titleNe: triage.titleNe,
      },
      evidence,
    },
    { status: 201 },
  );
}
