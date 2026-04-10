/**
 * POST /api/onboarding/extract-fields
 *
 * Takes raw voice transcript text (e.g. "My name is Ram, I live in Chitwan")
 * and uses Gemini to extract structured identity fields.
 *
 * Body: { transcript: string, locale?: 'en' | 'ne' }
 * Returns: { fields: { full_name_en?, permanent_district?, permanent_municipality?, permanent_ward?, ... } }
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-2.0-flash';

const PROMPT = `You are a smart assistant for Nepal Republic that extracts structured identity fields from spoken text by a Nepali user.

The user may speak in English, Nepali, or a mix (Romanized Nepali). Extract any of these fields if present:

{
  "full_name_en": string | null,
  "full_name_ne": string | null,
  "date_of_birth": string | null (ISO YYYY-MM-DD, convert BS to AD approximately),
  "gender": "male" | "female" | "other" | null,
  "permanent_district": string | null,
  "permanent_municipality": string | null,
  "permanent_ward": string | null,
  "permanent_tole": string | null,
  "temporary_district": string | null,
  "temporary_municipality": string | null,
  "temporary_ward": string | null,
  "citizenship_no": string | null,
  "mobile": string | null,
  "blood_group": string | null,
  "occupation": string | null
}

Rules:
- Return ONLY valid JSON. No markdown, no backticks, no commentary.
- If a field is not mentioned, set it to null.
- For district names, use the official English spelling (e.g., "Kathmandu" not "KTM").
- For municipalities, capitalize properly (e.g., "Bharatpur Metropolitan City").
- If the user says "ward 5" or "5 number ward", extract ward as "5".
- If the user mentions where they live/stay (not "I'm from"), use temporary_district/municipality.
- If the user mentions home/birthplace/permanent, use permanent_district/municipality.
- If ambiguous, set both temporary and permanent to the same value.

Example input: "Mero naam Ram Bahadur Tamang ho, ma Chitwan Bharatpur ma baschu, ward 5"
Example output: {"full_name_en":"Ram Bahadur Tamang","full_name_ne":null,"date_of_birth":null,"gender":"male","permanent_district":"Chitwan","permanent_municipality":"Bharatpur Metropolitan City","permanent_ward":"5","permanent_tole":null,"temporary_district":"Chitwan","temporary_municipality":"Bharatpur Metropolitan City","temporary_ward":"5","citizenship_no":null,"mobile":null,"blood_group":null,"occupation":null}`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  if (!transcript || transcript.length < 3) {
    return NextResponse.json({ error: 'transcript required (min 3 chars)' }, { status: 400 });
  }
  if (transcript.length > 1000) {
    return NextResponse.json({ error: 'transcript too long (max 1000 chars)' }, { status: 400 });
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${PROMPT}\n\nUser said: "${transcript}"` }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        }),
      },
    );

    if (!r.ok) {
      console.error('[extract-fields] Gemini error:', r.status);
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 502 });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response (strip markdown fences if present)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const fields = JSON.parse(cleaned);

    return NextResponse.json({ fields });
  } catch (err: any) {
    console.error('[extract-fields] Error:', err?.message);
    return NextResponse.json({ error: 'Failed to extract fields' }, { status: 500 });
  }
}
