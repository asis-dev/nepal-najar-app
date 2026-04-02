import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

// POST: Reset all signals for reclassification, then trigger a sweep
export async function POST(request: NextRequest) {
  const secret = process.env.SCRAPE_SECRET;

  if (!bearerMatchesSecret(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'neutral-only'; // 'neutral-only' | 'all'
    const supabase = getSupabase();

    // Reset tier1_processed to false for signals that need reclassification
    let query = supabase
      .from('intelligence_signals')
      .update({
        tier1_processed: false,
        tier3_processed: false,
        classification: null,
        relevance_score: null,
        matched_promise_ids: null,
        reasoning: null,
        confidence: null,
      });

    if (mode === 'neutral-only') {
      // Only reset signals classified as neutral (the old conservative classifications)
      query = query.eq('classification', 'neutral');
    }
    // mode === 'all' resets everything

    const { data, error } = await query.select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resetCount = data?.length || 0;

    // Also reset unclassified signals
    const { data: unclassifiedData } = await supabase
      .from('intelligence_signals')
      .update({ tier1_processed: false })
      .is('classification', null)
      .select('id');

    const unclassifiedCount = unclassifiedData?.length || 0;

    return NextResponse.json({
      message: `Reset ${resetCount} ${mode} signals + ${unclassifiedCount} unclassified for reclassification`,
      resetCount: resetCount + unclassifiedCount,
      mode,
      nextStep: 'Run POST /api/intelligence/sweep with {"skipCollection": true, "batchSize": 30} to reclassify',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reclassify failed' },
      { status: 500 },
    );
  }
}
