/**
 * /api/upload — File upload endpoint for evidence photos/documents
 *
 * POST  FormData { files: File[] }
 *   - Auth required (user must be logged in)
 *   - Uploads to Supabase Storage bucket "evidence-photos"
 *   - Accepts: jpg, png, webp, gif, pdf
 *   - Max 5MB per file, max 5 files per upload
 *   - Rate limit: 20 uploads per hour per user
 *   - Returns { urls: string[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const BUCKET = 'evidence-photos';

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export async function POST(req: NextRequest) {
  // ── Rate limit: 20 uploads per hour per IP ──
  const ip = getClientIp(req);
  const { success: rateLimitOk } = await rateLimit(`upload:${ip}`, 20, 3600000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Upload rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }

  // ── Auth check ──
  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // ── Parse FormData ──
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many files. Maximum ${MAX_FILES} files per upload.` },
      { status: 400 },
    );
  }

  // ── Validate each file ──
  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `File type "${file.type}" not allowed. Accepted: JPG, PNG, WebP, GIF, PDF.`,
          filename: file.name,
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File "${file.name}" exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
          filename: file.name,
        },
        { status: 400 },
      );
    }
  }

  // ── Upload to Supabase Storage ──
  const db = getSupabase();
  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const ext = MIME_TO_EXT[file.type] || 'bin';
    const timestamp = Date.now();
    const random = generateId();
    const path = `evidence/${user.id}/${timestamp}-${random}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      errors.push(`Failed to upload "${file.name}": ${uploadError.message}`);
      continue;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = db.storage.from(BUCKET).getPublicUrl(path);

    urls.push(publicUrl);
  }

  if (urls.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 500 });
  }

  return NextResponse.json(
    {
      urls,
      ...(errors.length > 0 ? { partial: true, errors } : {}),
    },
    { status: 201 },
  );
}
