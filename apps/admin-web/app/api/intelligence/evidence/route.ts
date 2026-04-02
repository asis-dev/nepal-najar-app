import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { collectSocialEvidence } from '@/lib/intelligence/evidence/social-collector';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

/**
 * Evidence Collection API
 *
 * POST: Trigger evidence collection from existing classified signals
 * GET: Return evidence vault statistics
 */

// POST: Trigger evidence collection
export async function POST(request: NextRequest) {
  const secret = process.env.SCRAPE_SECRET;

  if (!bearerMatchesSecret(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const result = await collectSocialEvidence({
      minRelevance: body.minRelevance ?? 0.5,
      limit: body.limit ?? 50,
      signalTypes: body.signalTypes,
    });

    return NextResponse.json({
      status: 'completed',
      signalsProcessed: result.signalsProcessed,
      evidenceCreated: result.evidenceCreated,
      errors: result.errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Evidence collection failed' },
      { status: 500 },
    );
  }
}

// GET: Return evidence stats
export async function GET() {
  try {
    const supabase = getSupabase();

    // Total evidence count
    const { count: totalCount } = await supabase
      .from('evidence_vault')
      .select('id', { count: 'exact', head: true });

    // By source type
    const { data: bySource } = await supabase
      .from('evidence_vault')
      .select('source_type');

    const sourceTypeCounts: Record<string, number> = {};
    if (bySource) {
      for (const row of bySource) {
        const st = row.source_type as string;
        sourceTypeCounts[st] = (sourceTypeCounts[st] || 0) + 1;
      }
    }

    // By official
    const { data: byOfficial } = await supabase
      .from('evidence_vault')
      .select('official_name');

    const officialCounts: Record<string, number> = {};
    if (byOfficial) {
      for (const row of byOfficial) {
        const name = row.official_name as string;
        officialCounts[name] = (officialCounts[name] || 0) + 1;
      }
    }

    // By promise
    const { data: byPromise } = await supabase
      .from('evidence_vault')
      .select('promise_ids');

    const promiseCounts: Record<number, number> = {};
    if (byPromise) {
      for (const row of byPromise) {
        const pids = (row.promise_ids as number[]) || [];
        for (const pid of pids) {
          promiseCounts[pid] = (promiseCounts[pid] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      total: totalCount ?? 0,
      bySourceType: sourceTypeCounts,
      byOfficial: officialCounts,
      byPromise: promiseCounts,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get evidence stats' },
      { status: 500 },
    );
  }
}

export const maxDuration = 120;
