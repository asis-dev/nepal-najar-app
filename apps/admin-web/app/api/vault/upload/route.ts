import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const VAULT_BUCKET = 'user-vault';

/**
 * POST /api/vault/upload
 * Accepts multipart form data: file + metadata fields.
 * Uploads to Supabase Storage, creates vault_documents record.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabaseUser = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse form data
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = form.get('file') as File | null;
    const docType = (form.get('doc_type') as string) || 'other';
    const docTitle = (form.get('doc_title') as string) || '';
    const serviceSlug = (form.get('service_slug') as string) || null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 413 });
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not accepted. Allowed: ${ACCEPTED_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Upload to Supabase Storage using service role (bypasses RLS for storage)
    const supabase = getSupabase();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${docType}/${Date.now()}_${safeName}`;

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const { error: uploadErr } = await supabase.storage
      .from(VAULT_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadErr) {
      console.error('[vault/upload] storage error:', uploadErr);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Create database record
    const title = docTitle.trim() || docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const { data: doc, error: dbErr } = await supabase
      .from('vault_documents')
      .insert({
        owner_id: user.id,
        doc_type: docType,
        title,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        linked_service_slugs: serviceSlug ? [serviceSlug] : [],
      })
      .select('*')
      .single();

    if (dbErr) {
      console.error('[vault/upload] db error:', dbErr);
      // Clean up the uploaded file
      await supabase.storage.from(VAULT_BUCKET).remove([storagePath]).catch(() => {});
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      document: {
        id: doc.id,
        doc_type: doc.doc_type,
        title: doc.title,
        file_name: doc.file_name,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        storage_path: doc.storage_path,
        created_at: doc.created_at,
      },
    });
  } catch (e: any) {
    console.error('[vault/upload] unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
