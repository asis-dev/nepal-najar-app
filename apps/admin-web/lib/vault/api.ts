/**
 * Vault client API — browser-side helpers for the logged-in user.
 * All writes go through Supabase with the user's session token, not service role.
 * RLS on vault_documents + storage.objects enforces owner-only access.
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { VaultDoc, VaultDocType } from './types';
import { DOC_TYPE_META } from './types';

const VAULT_BUCKET = 'user-vault';

function browser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, key);
}

function rowToDoc(r: any): VaultDoc {
  return {
    id: r.id,
    ownerId: r.owner_id,
    docType: r.doc_type,
    title: r.title,
    number: r.number || undefined,
    issuedOn: r.issued_on || undefined,
    expiresOn: r.expires_on || undefined,
    storagePath: r.storage_path || undefined,
    fileName: r.file_name || undefined,
    fileSize: r.file_size || undefined,
    mimeType: r.mime_type || undefined,
    notes: r.notes || undefined,
    tags: r.tags || [],
    linkedServiceSlugs: r.linked_service_slugs || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listMyVault(): Promise<VaultDoc[]> {
  const s = browser();
  const { data, error } = await s
    .from('vault_documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToDoc);
}

export interface CreateVaultDocInput {
  docType: VaultDocType;
  title?: string;
  number?: string;
  issuedOn?: string;
  expiresOn?: string;
  notes?: string;
  file?: File | null;
}

export async function createVaultDoc(input: CreateVaultDocInput): Promise<VaultDoc> {
  const s = browser();
  const { data: userData, error: userErr } = await s.auth.getUser();
  if (userErr || !userData?.user) throw new Error('Not signed in');
  const uid = userData.user.id;

  let storagePath: string | undefined;
  let fileName: string | undefined;
  let fileSize: number | undefined;
  let mimeType: string | undefined;

  if (input.file) {
    const safe = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${uid}/${input.docType}/${Date.now()}_${safe}`;
    const { error: upErr } = await s.storage.from(VAULT_BUCKET).upload(path, input.file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (upErr) throw upErr;
    storagePath = path;
    fileName = input.file.name;
    fileSize = input.file.size;
    mimeType = input.file.type;
  }

  const title = input.title?.trim() || DOC_TYPE_META[input.docType].title.en;

  const { data, error } = await s
    .from('vault_documents')
    .insert({
      owner_id: uid,
      doc_type: input.docType,
      title,
      number: input.number || null,
      issued_on: input.issuedOn || null,
      expires_on: input.expiresOn || null,
      notes: input.notes || null,
      storage_path: storagePath || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      mime_type: mimeType || null,
    })
    .select('*')
    .single();
  if (error) throw error;

  // Auto-create a 30-day expiry reminder if relevant
  if (input.expiresOn && DOC_TYPE_META[input.docType].hasExpiry) {
    const remind = new Date(input.expiresOn);
    remind.setDate(remind.getDate() - 30);
    await s.from('vault_reminders').insert({
      owner_id: uid,
      document_id: data.id,
      reminder_type: 'expiry',
      remind_on: remind.toISOString().slice(0, 10),
      days_before: 30,
      channel: 'in_app',
      message: `${title} expires in 30 days`,
    });
  }

  return rowToDoc(data);
}

export async function deleteVaultDoc(id: string, storagePath?: string) {
  const s = browser();
  if (storagePath) {
    await s.storage.from(VAULT_BUCKET).remove([storagePath]).catch(() => {});
  }
  const { error } = await s.from('vault_documents').delete().eq('id', id);
  if (error) throw error;
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const s = browser();
  const { data, error } = await s.storage.from(VAULT_BUCKET).createSignedUrl(storagePath, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
