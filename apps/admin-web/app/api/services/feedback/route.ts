/**
 * POST /api/services/feedback
 * Records service routing feedback (route corrections, positive signals).
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

  try {
    await supabase.from('service_feedback').insert({
      user_id: body.userId || '00000000-0000-0000-0000-000000000000',
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
  } catch {
    // Non-critical — table may not exist yet
  }

  return NextResponse.json({ recorded: true });
}
