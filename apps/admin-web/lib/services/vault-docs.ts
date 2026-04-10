import type { SupabaseClient } from '@supabase/supabase-js';
import type { VaultDoc } from '@/lib/vault/types';

export async function listOwnerVaultDocs(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<VaultDoc[]> {
  const { data } = await supabase
    .from('vault_documents')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  return (data || []).map((row: any) => ({
    id: row.id,
    ownerId: row.owner_id,
    docType: row.doc_type,
    title: row.title,
    number: row.number || undefined,
    issuedOn: row.issued_on || undefined,
    expiresOn: row.expires_on || undefined,
    storagePath: row.storage_path || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size || undefined,
    mimeType: row.mime_type || undefined,
    notes: row.notes || undefined,
    tags: row.tags || [],
    linkedServiceSlugs: row.linked_service_slugs || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
