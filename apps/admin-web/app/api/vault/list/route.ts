import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/vault/list
 * Returns all vault documents for the authenticated user.
 * Optional query param: ?doc_type=citizenship  — filter by type.
 * Each doc includes a short-lived signed thumbnail URL.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ docs: [] });
    }

    const url = new URL(req.url);
    const docTypeFilter = url.searchParams.get('doc_type');

    let query = supabase
      .from('vault_documents')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (docTypeFilter) {
      query = query.eq('doc_type', docTypeFilter);
    }

    const { data: docs, error: dbErr } = await query;

    if (dbErr) {
      console.error('[vault/list] db error:', dbErr);
      return NextResponse.json({ docs: [], error: 'Failed to load documents' }, { status: 500 });
    }

    // Generate signed URLs for thumbnails (10 minute expiry)
    const enriched = await Promise.all(
      (docs || []).map(async (doc) => {
        let thumbnailUrl: string | null = null;
        if (doc.storage_path && doc.mime_type?.startsWith('image/')) {
          const { data: signedData } = await supabase.storage
            .from('user-vault')
            .createSignedUrl(doc.storage_path, 600); // 10 min
          thumbnailUrl = signedData?.signedUrl || null;
        }
        return {
          id: doc.id,
          doc_type: doc.doc_type,
          title: doc.title,
          number: doc.number,
          issued_on: doc.issued_on,
          expires_on: doc.expires_on,
          file_name: doc.file_name,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          storage_path: doc.storage_path,
          notes: doc.notes,
          tags: doc.tags,
          linked_service_slugs: doc.linked_service_slugs,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          thumbnail_url: thumbnailUrl,
        };
      }),
    );

    return NextResponse.json({ docs: enriched });
  } catch (e: any) {
    console.error('[vault/list] unexpected error:', e);
    return NextResponse.json({ docs: [], error: 'Internal error' }, { status: 500 });
  }
}
