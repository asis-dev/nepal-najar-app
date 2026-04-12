import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { processDocument } from '@/lib/services/document-intelligence';
import { mergeProfileFields } from '@/lib/services/profile-memory';

export async function POST(request: NextRequest) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { imageBase64?: string; text?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.imageBase64 && !body.text) {
    return NextResponse.json({ error: 'Provide imageBase64 or text' }, { status: 400 });
  }

  try {
    const result = await processDocument({
      imageBase64: body.imageBase64,
      text: body.text,
      fileName: body.fileName,
    });

    // Auto-merge suggested profile updates if confidence is decent
    const highConfidenceUpdates: Record<string, string> = {};
    for (const [key, value] of Object.entries(result.suggestedProfileUpdates)) {
      if (value) highConfidenceUpdates[key] = value;
    }

    let merged = { updated: [] as string[], skipped: [] as string[] };
    if (Object.keys(highConfidenceUpdates).length > 0) {
      merged = await mergeProfileFields(supabase, user.id, highConfidenceUpdates, 'document_ocr', body.fileName);
    }

    return NextResponse.json({
      extraction: result,
      profileUpdates: merged,
    });
  } catch (err) {
    console.error('[extract-from-doc] error:', err);
    return NextResponse.json({ error: 'Document processing failed' }, { status: 500 });
  }
}
