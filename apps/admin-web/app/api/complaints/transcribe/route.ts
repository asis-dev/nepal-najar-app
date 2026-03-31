import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getClientIp, rateLimit } from '@/lib/middleware/rate-limit';
import { transcribeAudioBuffer } from '@/lib/intelligence/collectors/audio-transcriber';

const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_MEDIA_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/webm',
  'video/mp4',
  'video/webm',
]);

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { success } = rateLimit(`complaints-transcribe:${ip}`, 20, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audio = formData.get('audio');
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'audio file is required' }, { status: 400 });
  }

  if (audio.size <= 0 || audio.size > MAX_AUDIO_FILE_SIZE) {
    return NextResponse.json(
      { error: 'audio file must be between 1 byte and 25MB' },
      { status: 400 },
    );
  }

  if (audio.type && !ALLOWED_MEDIA_TYPES.has(audio.type) && !audio.type.startsWith('audio/')) {
    return NextResponse.json(
      { error: `Unsupported media type: ${audio.type}` },
      { status: 400 },
    );
  }

  const requestedLanguage = formData.get('language');
  const language =
    typeof requestedLanguage === 'string' && requestedLanguage.trim().length > 0
      ? requestedLanguage.trim().slice(0, 8)
      : 'ne';

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const transcription = await transcribeAudioBuffer(buffer, {
      filename: audio.name,
      mimeType: audio.type,
      language,
    });

    if (!transcription.text || transcription.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Unable to transcribe audio' },
        { status: 422 },
      );
    }

    return NextResponse.json({
      transcript: transcription.text.trim(),
      language: transcription.language || language,
      duration_seconds: transcription.durationSeconds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to transcribe audio',
      },
      { status: 500 },
    );
  }
}

export const maxDuration = 120;
