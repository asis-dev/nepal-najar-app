import { NextRequest, NextResponse } from 'next/server';
import { getUtilityLookupPlan } from '@/lib/integrations/utilities/adapter';

export const runtime = 'nodejs';
export const maxDuration = 30;

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-2.0-flash';

function buildPrompt(serviceSlug: string, providerName: string) {
  return `You are an OCR + structured extractor for ${providerName} utility bills in Nepal.
Given the image, return ONLY a JSON object. Do not include markdown, backticks, or commentary.

Service slug: ${serviceSlug}

Schema:
{
  "customerId": string | null,
  "serviceOffice": string | null,
  "branch": string | null,
  "dueAmountNpr": number | null,
  "billDate": string | null,
  "accountHolder": string | null,
  "confidence": number
}

Rules:
- Read Nepali or English text.
- If the amount due is visible in NPR, return it as a number without commas or currency symbols.
- Prefer the current bill amount due, not historical totals.
- If a field is unclear, use null.
- If the image is not a utility bill or unreadable, return nulls and confidence 0.`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const plan = getUtilityLookupPlan(params.slug);
  if (!plan) {
    return NextResponse.json({ error: 'Utility bill scan not supported for this service' }, { status: 404 });
  }

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
                { text: buildPrompt(params.slug, plan.providerName) },
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
      console.warn('[utilities/scan-bill] gemini error', r.status, errText);
      return NextResponse.json({ error: 'vision error', status: r.status }, { status: 502 });
    }

    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      return NextResponse.json({ raw: true, text });
    }

    return NextResponse.json({
      ok: true,
      customerId: parsed.customerId || null,
      serviceOffice: parsed.serviceOffice || null,
      branch: parsed.branch || null,
      dueAmountNpr:
        typeof parsed.dueAmountNpr === 'number' && Number.isFinite(parsed.dueAmountNpr)
          ? Math.round(parsed.dueAmountNpr)
          : null,
      billDate: parsed.billDate || null,
      accountHolder: parsed.accountHolder || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
    });
  } catch (e: any) {
    console.error('[utilities/scan-bill]', e);
    return NextResponse.json({ error: 'internal', message: e.message }, { status: 500 });
  }
}
