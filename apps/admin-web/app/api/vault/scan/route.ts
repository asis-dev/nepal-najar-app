import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Gemini Flash vision — reads an ID photo and extracts structured fields.
 * POST multipart/form-data with field `file` (image).
 * Returns: { title, number, issuedOn, expiresOn, docType, rawText }
 *
 * Cost: ~$0.0001 per image on Gemini Flash free tier.
 * Falls back to { raw: true } on failure — UI lets user fill manually.
 */

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-2.0-flash';

const PROMPT = `You are an OCR + structured extractor for Nepali government ID documents.
Given the image, return ONLY a JSON object. Do not include markdown, backticks, or commentary.

Schema:
{
  "docType": "citizenship" | "passport" | "drivers_license" | "national_id" | "pan" | "voter_id" | "bluebook" | "insurance" | "academic_certificate" | "birth_certificate" | "marriage_certificate" | "land_dhani_purja" | "other",
  "title": string (a short human-readable name of the document),
  "number": string | null (the ID number / passport number / license number / PAN, etc.),
  "issuedOn": string | null (ISO date YYYY-MM-DD if visible),
  "expiresOn": string | null (ISO date YYYY-MM-DD if visible; convert Bikram Sambat to Gregorian approximately),
  "holderName": string | null,
  "confidence": number (0.0 – 1.0)
}

If the image is not a document or is unreadable, return:
{ "docType": "other", "title": "Unknown document", "number": null, "issuedOn": null, "expiresOn": null, "holderName": null, "confidence": 0 }`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'vision disabled' }, { status: 503 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get('file') as File;
  } catch {
    return NextResponse.json({ error: 'invalid form' }, { status: 400 });
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'file too large (max 8MB)' }, { status: 413 });
  }

  const arrayBuf = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuf).toString('base64');

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: file.type || 'image/jpeg', data: base64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            maxOutputTokens: 400,
          },
        }),
      },
    );

    if (!r.ok) {
      const errText = await r.text();
      console.warn('[vault/scan] gemini error', r.status, errText);
      return NextResponse.json({ error: 'vision error', status: r.status }, { status: 502 });
    }

    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      // model slipped out of JSON mode — return raw
      return NextResponse.json({ raw: true, text });
    }

    return NextResponse.json({
      ok: true,
      docType: parsed.docType || 'other',
      title: parsed.title || null,
      number: parsed.number || null,
      issuedOn: parsed.issuedOn || null,
      expiresOn: parsed.expiresOn || null,
      holderName: parsed.holderName || null,
      confidence: parsed.confidence ?? null,
    });
  } catch (e: any) {
    console.error('[vault/scan]', e);
    return NextResponse.json({ error: 'internal', message: e.message }, { status: 500 });
  }
}
