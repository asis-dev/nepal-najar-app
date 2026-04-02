import { NextResponse } from 'next/server';
import {
  getDailyBrief,
  generateDailyBrief,
  buildReaderHighlights,
} from '@/lib/intelligence/daily-brief';
import { validateScrapeAuth } from '@/lib/scraper/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Allow up to 5 minutes for brief generation (AI summary + optional audio)
export const maxDuration = 300;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * GET /api/daily-brief
 * GET /api/daily-brief?date=2026-03-24
 *
 * Returns the daily brief for today (or specified date).
 * If not yet generated, generates it on the fly and caches.
 * Public — no auth required.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || undefined;

  try {
    // Try cached brief first (includes quality fallback to most recent good brief)
    let brief = await withTimeout(getDailyBrief(date), 5000, null);

    if (!brief) {
      // No brief at all — only generate on the fly for today, and only via explicit POST
      // GET should not auto-generate to avoid creating garbage briefs
      if (!date || date === new Date().toISOString().slice(0, 10)) {
        // Return 404 — use POST /api/daily-brief to force regeneration
      }
    }

    if (!brief) {
      return NextResponse.json(
        { error: 'No brief available for this date', date: date || new Date().toISOString().slice(0, 10) },
        { status: 404 },
      );
    }

    const readerHighlights = await withTimeout(
      buildReaderHighlights(brief),
      5000,
      [],
    );

    return NextResponse.json(
      {
        ...brief,
        readerHighlights,
      },
      {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
      },
    );
  } catch (err) {
    console.error('[API /daily-brief] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate daily brief' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/daily-brief
 *
 * Force regenerate today's brief. Requires authentication.
 */
export async function POST(request: Request) {
  try {
    // Check auth — accept either user session or scrape/admin service auth
    const hasServiceAuth = await validateScrapeAuth(request);

    if (!hasServiceAuth) {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }
    }

    const url = new URL(request.url);
    const withAudioParam = url.searchParams.get('withAudio');
    const withAudio = withAudioParam == null ? true : withAudioParam !== '0';

    const brief = await generateDailyBrief();

    let audioResult:
      | {
          audioUrl: string | null;
          durationSeconds: number;
          provider: string;
          error?: string;
        }
      | null = null;

    if (withAudio) {
      try {
        const { generateAndStoreDailyAudio } = await import(
          '@/lib/intelligence/brief-narrator'
        );
        audioResult = await generateAndStoreDailyAudio(brief);
      } catch (audioErr) {
        audioResult = {
          audioUrl: null,
          durationSeconds: 0,
          provider: 'none',
          error:
            audioErr instanceof Error
              ? audioErr.message
              : 'audio generation failed',
        };
      }
    }

    // Increment regenerated_count
    const { getSupabase } = await import('@/lib/supabase/server');
    const serviceClient = getSupabase();
    await serviceClient
      .from('daily_briefs')
      .update({ regenerated_count: brief.date ? 1 : 1 })
      .eq('date', brief.date);

    // Increment regen count — non-fatal
    try {
      await serviceClient.rpc('increment_brief_regen_count', { brief_date: brief.date });
    } catch {
      // RPC may not exist — non-fatal
    }

    const readerHighlights = await withTimeout(
      buildReaderHighlights(brief),
      5000,
      [],
    );

    return NextResponse.json({
      ...brief,
      regenerated: true,
      audioResult,
      readerHighlights,
    });
  } catch (err) {
    console.error('[API /daily-brief POST] Error:', err);
    return NextResponse.json(
      { error: 'Failed to regenerate daily brief' },
      { status: 500 },
    );
  }
}
