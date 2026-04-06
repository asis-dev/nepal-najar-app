import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getDailyBrief,
  generateDailyBrief,
  buildReaderHighlights,
} from '@/lib/intelligence/daily-brief';
import { validateScrapeAuth } from '@/lib/scraper/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Allow up to 5 minutes for brief generation (AI summary + optional audio)
export const maxDuration = 300;

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function nepaliRatio(text: string | null | undefined): number {
  const value = String(text || '');
  if (!value.trim()) return 0;
  const devanagari = value.match(/[\u0900-\u097F]/g)?.length || 0;
  return devanagari / Math.max(1, value.length);
}

function briefNeedsNepaliRepair(brief: {
  summaryNe?: string | null;
  topStories?: Array<{ titleNe?: string; summaryNe?: string }>;
}): boolean {
  if (nepaliRatio(brief.summaryNe) < 0.2) return true;
  const stories = brief.topStories || [];
  if (stories.length === 0) return false;
  return stories.some((story) => {
    const titleScore = nepaliRatio(story.titleNe);
    const summaryScore = nepaliRatio(story.summaryNe);
    return titleScore < 0.2 || summaryScore < 0.2;
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Constant-time string comparison to prevent timing attacks */
function secretsEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function isCronAuthed(request: NextRequest | Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const headerSecret = (request as NextRequest).headers?.get?.('x-vercel-cron-secret')
    || (request.headers as Headers).get('x-vercel-cron-secret');
  return secretsEqual(headerSecret, cronSecret);
}

/**
 * GET /api/daily-brief
 * GET /api/daily-brief?date=2026-03-24
 * GET /api/daily-brief?generate=1  (cron-triggered: regenerate + audio)
 *
 * Returns the daily brief for today (or specified date).
 * When called by Vercel cron with ?generate=1, auto-generates today's brief + audio.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || undefined;
  const shouldGenerate = searchParams.get('generate') === '1';
  const skipAudio = searchParams.get('noaudio') === '1';
  const audioOnly = searchParams.get('audioonly') === '1';
  const videoOnly = searchParams.get('videoonly') === '1';

  // ── Cron-triggered generation ──────────────────────────────────────────────
  if (shouldGenerate || audioOnly || videoOnly) {
    const hasCronAuth = isCronAuthed(request);
    const hasScrapeAuth = await validateScrapeAuth(request);
    if (!hasCronAuth && !hasScrapeAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Audio-only mode: generate FULL 2-min audio brief (NE + EN)
    if (audioOnly) {
      console.log('[DailyBrief] Audio-only: generating 2-min audio brief...');
      try {
        const targetDate = date || todayDateString();
        let existingBrief = await getDailyBrief(targetDate);

        // If fallback returned another date, or Nepali fields are broken, rebuild today's brief.
        if (
          !existingBrief ||
          existingBrief.date !== targetDate ||
          briefNeedsNepaliRepair(existingBrief)
        ) {
          console.warn('[DailyBrief] Audio-only brief missing/stale/needs Nepali repair — regenerating');
          existingBrief = await generateDailyBrief();
        }

        // Skip if local cron (launchd) already generated Sagar audio for today
        if (existingBrief.audioUrl && existingBrief.date === targetDate) {
          console.log(`[DailyBrief] Audio already exists for ${targetDate} — skipping Vercel TTS`);
          return NextResponse.json({
            status: 'ok',
            mode: 'audio',
            date: existingBrief.date,
            audio: 'already-exists',
            audioUrl: existingBrief.audioUrl,
            durationSeconds: existingBrief.audioDurationSeconds || 0,
            provider: 'local-edge-tts',
          });
        }

        const { generateFullAudioBrief } = await import('@/lib/intelligence/brief-narrator');
        const audioResult = await generateFullAudioBrief(existingBrief);
        return NextResponse.json({
          status: 'ok',
          mode: 'audio',
          date: existingBrief.date,
          audio: audioResult.audioUrl ? 'generated' : 'skipped',
          audioUrl: audioResult.audioUrl,
          durationSeconds: audioResult.durationSeconds,
          provider: audioResult.provider,
        });
      } catch (err) {
        console.error('[DailyBrief] Audio-only error:', err);
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Audio generation failed' },
          { status: 500 },
        );
      }
    }

    // Video-only mode: generate 30-sec narration + D-ID video
    if (videoOnly) {
      console.log('[DailyBrief] Video-only: generating 30s video brief...');
      try {
        const targetDate = date || todayDateString();
        let existingBrief = await getDailyBrief(targetDate);
        if (!existingBrief || existingBrief.date !== targetDate) {
          console.warn('[DailyBrief] Video-only brief missing/stale — regenerating');
          existingBrief = await generateDailyBrief();
        }
        const { generateVideoBrief } = await import('@/lib/intelligence/brief-narrator');
        const videoResult = await generateVideoBrief(existingBrief);
        return NextResponse.json({
          status: 'ok',
          mode: 'video',
          date: existingBrief.date,
          video: videoResult.videoUrl ? 'generated' : 'skipped',
          videoUrl: videoResult.videoUrl,
        });
      } catch (err) {
        console.error('[DailyBrief] Video-only error:', err);
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Video generation failed' },
          { status: 500 },
        );
      }
    }

    console.log(`[DailyBrief Cron] Starting brief generation...${skipAudio ? ' (no audio)' : ''}`);
    try {
      const brief = await generateDailyBrief();
      console.log(`[DailyBrief Cron] Brief generated for ${brief.date}, ${brief.topStories?.length ?? 0} stories`);

      let audioResult: { audioUrl: string | null; error?: string } | null = null;
      if (!skipAudio) {
        try {
          const { generateAndStoreDailyAudio } = await import('@/lib/intelligence/brief-narrator');
          audioResult = await generateAndStoreDailyAudio(brief);
          console.log(`[DailyBrief Cron] Audio: ${audioResult.audioUrl ? 'generated' : 'skipped'}`);
        } catch (audioErr) {
          console.warn('[DailyBrief Cron] Audio error:', audioErr instanceof Error ? audioErr.message : 'unknown');
          audioResult = { audioUrl: null, error: audioErr instanceof Error ? audioErr.message : 'failed' };
        }
      }

      return NextResponse.json({
        status: 'ok',
        date: brief.date,
        stories: brief.topStories?.length ?? 0,
        summaryLength: brief.summaryEn?.length ?? 0,
        audio: skipAudio ? 'skipped' : (audioResult?.audioUrl ? 'generated' : 'skipped'),
      });
    } catch (err) {
      console.error('[DailyBrief Cron] Error:', err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Brief generation failed' },
        { status: 500 },
      );
    }
  }

  // ── Normal public GET — return cached brief ────────────────────────────────
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

    // Determine brief quality
    const storiesCount = brief.topStories?.length ?? 0;
    const summaryLen = (brief.summaryEn || '').length;
    const hasGarbageText = /no new.*reported|nothing.*happened|sweep may need attention|sources were scanned/i.test(brief.summaryEn || '');
    const quality = hasGarbageText ? 'empty'
      : storiesCount === 0 || summaryLen < 100 ? 'partial'
      : 'good';

    return NextResponse.json(
      {
        ...brief,
        quality,
        readerHighlights,
      },
      {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'Vercel-CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
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
