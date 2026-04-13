/**
 * POST /api/services/feedback
 * Records service routing feedback (route corrections, positive signals,
 * document extraction corrections, and draft field corrections).
 * Does not require a task ID — lightweight endpoint for learning loop.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  let body: {
    type: string;
    originalSlug?: string;
    correctedSlug?: string;
    userQuery?: string;
    userId?: string;
    comment?: string;
    triageMethod?: 'ai' | 'keyword';
    // Document extraction correction fields
    docType?: string;
    fieldKey?: string;
    extractedValue?: string;
    correctedValue?: string;
    // Draft correction fields
    taskId?: string;
    originalValue?: string;
    source?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const userId = body.userId || '00000000-0000-0000-0000-000000000000';

  try {
    switch (body.type) {
      case 'route_correction':
        await supabase.from('service_feedback').insert({
          user_id: userId,
          feedback_type: 'route_correction',
          service_slug: body.correctedSlug || body.originalSlug || null,
          original_value: body.originalSlug || '',
          corrected_value: body.correctedSlug || null,
          user_comment: body.userQuery || body.comment || null,
          context: {
            user_query: body.userQuery,
            triage_method: body.triageMethod || 'unknown',
            originalSlug: body.originalSlug,
            correctedSlug: body.correctedSlug,
          },
        });
        break;

      case 'extraction_correction':
        if (!body.fieldKey || !body.extractedValue) {
          return NextResponse.json(
            { error: 'fieldKey and extractedValue are required for extraction_correction' },
            { status: 400 },
          );
        }
        await supabase.from('service_feedback').insert({
          user_id: userId,
          feedback_type: 'extraction_correction',
          service_slug: null,
          original_value: body.extractedValue,
          corrected_value: body.correctedValue || null,
          user_comment: body.comment || null,
          context: {
            doc_type: body.docType || 'unknown',
            field_key: body.fieldKey,
          },
        });
        break;

      case 'draft_correction':
        if (!body.fieldKey || !body.originalValue) {
          return NextResponse.json(
            { error: 'fieldKey and originalValue are required for draft_correction' },
            { status: 400 },
          );
        }
        await supabase.from('service_feedback').insert({
          user_id: userId,
          feedback_type: 'draft_correction',
          task_id: body.taskId || null,
          service_slug: null,
          original_value: body.originalValue,
          corrected_value: body.correctedValue || null,
          user_comment: body.comment || null,
          context: {
            field_key: body.fieldKey,
            source: body.source || 'unknown',
          },
        });
        break;

      default:
        // Generic feedback (positive, answer_wrong, etc.)
        await supabase.from('service_feedback').insert({
          user_id: userId,
          feedback_type: body.type,
          service_slug: body.correctedSlug || body.originalSlug || null,
          original_value: body.originalSlug || body.comment || body.type,
          corrected_value: body.correctedSlug || null,
          user_comment: body.userQuery || body.comment || null,
          context: {
            originalSlug: body.originalSlug,
            correctedSlug: body.correctedSlug,
            userQuery: body.userQuery,
          },
        });
        break;
    }
  } catch {
    // Non-critical — table may not exist yet
  }

  return NextResponse.json({ recorded: true });
}
