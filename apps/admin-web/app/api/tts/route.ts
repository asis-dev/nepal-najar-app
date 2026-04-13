/**
 * Text-to-Speech API — POST { text: string, lang?: 'ne' | 'en' }
 *
 * Returns audio/mpeg stream using Edge TTS.
 * - Nepali: ne-NP-HemkalaNeural (female)
 * - English: en-US-AriaNeural (female)
 *
 * Max 500 characters per request. Rate-limited by IP.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

// Simple in-memory rate limit (per IP)
const RATE: Map<string, { count: number; reset: number }> = new Map();
const MAX_PER_MIN = 20;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = RATE.get(ip);
  if (!entry || now > entry.reset) {
    RATE.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= MAX_PER_MIN) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 500) : '';
  if (!text) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  const lang = body.lang === 'ne' ? 'ne' : 'en';
  const voice = lang === 'ne' ? 'ne-NP-HemkalaNeural' : 'en-US-AriaNeural';

  try {
    const { MsEdgeTTS } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, 'audio-24khz-48kbitrate-mono-mp3' as any);

    const { audioStream } = tts.toStream(text);

    // Collect chunks into buffer
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => resolve());
      audioStream.on('error', (err: Error) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[TTS] Error generating speech:', err.message);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 },
    );
  }
}
