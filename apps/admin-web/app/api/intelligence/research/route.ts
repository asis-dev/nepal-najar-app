import { NextRequest, NextResponse } from 'next/server';
import {
  researchPolitician,
  researchAllPoliticians,
} from '@/lib/intelligence/research/politician-researcher';
import { POLITICIANS } from '@/lib/intelligence/research/politician-profiles';

// POST: Start research on a specific politician or all
export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  const secret = process.env.SCRAPE_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { politicianId, all, maxVideos, dryRun } = body as {
      politicianId?: string;
      all?: boolean;
      maxVideos?: number;
      dryRun?: boolean;
    };

    const options = {
      maxVideos: maxVideos || 50,
      dryRun: dryRun || false,
    };

    if (all) {
      const result = await researchAllPoliticians(POLITICIANS, options);
      return NextResponse.json({
        status: 'completed',
        politicians: result.results.length,
        totalVideos: result.totalVideos,
        totalTranscribed: result.totalTranscribed,
        totalCommitments: result.totalCommitments,
        totalErrors: result.totalErrors,
        results: result.results.map((r) => ({
          id: r.politician.id,
          name: r.politician.name,
          videosFound: r.videosFound,
          videosTranscribed: r.videosTranscribed,
          commitmentsExtracted: r.commitmentsExtracted,
          newCommitments: r.newCommitments,
          matchedExisting: r.matchedExisting,
          errors: r.errors,
        })),
      });
    }

    if (politicianId) {
      const profile = POLITICIANS.find((p) => p.id === politicianId);
      if (!profile) {
        return NextResponse.json(
          {
            error: `Politician not found: ${politicianId}`,
            available: POLITICIANS.map((p) => ({ id: p.id, name: p.name })),
          },
          { status: 404 },
        );
      }

      const result = await researchPolitician(profile, options);
      return NextResponse.json({
        status: 'completed',
        politician: result.politician.name,
        videosFound: result.videosFound,
        videosTranscribed: result.videosTranscribed,
        commitmentsExtracted: result.commitmentsExtracted,
        newCommitments: result.newCommitments,
        matchedExisting: result.matchedExisting,
        speeches: result.speeches.map((s) => ({
          videoId: s.videoId,
          videoTitle: s.videoTitle,
          videoUrl: s.videoUrl,
          channelName: s.channelName,
          publishedAt: s.publishedAt,
          language: s.language,
          transcriptLength: s.transcript.length,
          commitmentCount: s.commitments.length,
          commitments: s.commitments,
          keyStatements: s.keyStatements,
        })),
        errors: result.errors,
      });
    }

    return NextResponse.json(
      { error: 'Provide politicianId or set all: true' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Research failed' },
      { status: 500 },
    );
  }
}

// GET: List available politicians and their research status
export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  const cronSecret =
    request.headers.get('x-vercel-cron-secret') ||
    request.nextUrl.searchParams.get('secret');
  const secret = process.env.SCRAPE_SECRET;

  if (
    (!secret || auth !== `Bearer ${secret}`) &&
    cronSecret !== secret &&
    cronSecret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { getSupabase } = await import('@/lib/supabase/server');
    const supabase = getSupabase();

    // Get last research status for each politician
    const politicians = await Promise.all(
      POLITICIANS.map(async (p) => {
        const sourceId = `research-${p.id}`;

        const { data: source } = await supabase
          .from('intelligence_sources')
          .select('last_checked_at')
          .eq('id', sourceId)
          .maybeSingle();

        const { count } = await supabase
          .from('intelligence_signals')
          .select('id', { count: 'exact', head: true })
          .eq('source_id', sourceId);

        return {
          id: p.id,
          name: p.name,
          nameNe: p.nameNe,
          party: p.party,
          expectedRole: p.expectedRole,
          lastResearched: source?.last_checked_at || null,
          signalCount: count || 0,
        };
      }),
    );

    return NextResponse.json({
      politicians,
      totalPoliticians: politicians.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch status' },
      { status: 500 },
    );
  }
}

export const maxDuration = 300;
