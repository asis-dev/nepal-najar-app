import { NextRequest, NextResponse } from 'next/server';
import { transcribeAndIngest } from '@/lib/intelligence/collectors/audio-transcriber';
import { enqueueTranscriptionJobs } from '@/lib/intelligence/jobs';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

/**
 * POST /api/intelligence/transcribe
 *
 * Accepts a list of audio/video URLs, transcribes them via Groq Whisper,
 * and ingests the transcripts into intelligence_signals.
 *
 * Body: { urls: string[] }
 * Auth: Bearer $SCRAPE_SECRET
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SCRAPE_SECRET;

  if (!bearerMatchesSecret(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || !Array.isArray(body.urls) || body.urls.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include a non-empty "urls" array' },
        { status: 400 },
      );
    }

    // Cap at 20 URLs per request to avoid timeouts
    const urls: string[] = body.urls.slice(0, 20);
    const enqueueOnly = body.async === true;

    if (enqueueOnly) {
      const jobs = await enqueueTranscriptionJobs(urls);
      return NextResponse.json({
        status: 'queued',
        queued: jobs.length,
        urlsReceived: urls.length,
        jobs: jobs.map((job) => ({ id: job.id, status: job.status, payload: job.payload })),
      });
    }

    const result = await transcribeAndIngest(urls);

    return NextResponse.json({
      status: 'ok',
      ...result,
      urlsReceived: urls.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Transcription failed',
      },
      { status: 500 },
    );
  }
}

export const maxDuration = 300; // 5 minutes for Vercel
