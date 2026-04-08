import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Nepali voice → text via Groq Whisper large-v3-turbo.
 * POST multipart/form-data with field `audio` (webm/mp3/m4a/wav).
 * Returns: { text, language }
 *
 * Cost: $0.04/hour of audio → 1,000 voice queries ≈ $2.
 * Disabled gracefully if GROQ_API_KEY not set.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = process.env.SERVICES_ASR_MODEL || 'whisper-large-v3-turbo';

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'voice disabled', reason: 'no GROQ_API_KEY' }, { status: 503 });
  }

  let audio: File | null = null;
  try {
    const form = await req.formData();
    audio = form.get('audio') as File;
  } catch {
    return NextResponse.json({ error: 'invalid form' }, { status: 400 });
  }
  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: 'audio required' }, { status: 400 });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'audio too large (max 25MB)' }, { status: 413 });
  }

  try {
    const upstreamForm = new FormData();
    upstreamForm.append('file', audio, audio.name || 'audio.webm');
    upstreamForm.append('model', MODEL);
    upstreamForm.append('language', 'ne');
    upstreamForm.append('response_format', 'json');
    upstreamForm.append('temperature', '0');

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: upstreamForm,
    });

    if (!r.ok) {
      const err = await r.text();
      console.warn('[services/voice] groq error', r.status, err);
      return NextResponse.json({ error: 'transcription failed', status: r.status }, { status: 502 });
    }

    const j = await r.json();
    return NextResponse.json({
      text: j.text || '',
      language: j.language || 'ne',
    });
  } catch (e: any) {
    console.error('[services/voice]', e);
    return NextResponse.json({ error: 'internal', message: e.message }, { status: 500 });
  }
}
