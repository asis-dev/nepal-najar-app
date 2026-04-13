/**
 * Phase 4 — Form Drafter
 * Creates pre-filled draft applications by combining profile data,
 * document extractions, and AI inference.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrBuildSchema } from './form-schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldStatus =
  | 'known'
  | 'inferred'
  | 'extracted_from_doc'
  | 'user_confirmed'
  | 'missing';

export interface DraftFieldValue {
  key: string;
  label: string;
  value: string | null;
  status: FieldStatus;
  source: string; // e.g. 'profile', 'citizenship-doc', 'ai-inference'
  confidence: number;
  requiresReview: boolean;
}

export interface ServiceDraft {
  serviceSlug: string;
  serviceTitle: string;
  fields: DraftFieldValue[];
  completeness: number; // 0-100
  readyForReview: boolean;
  missingRequired: string[];
  warnings: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate completeness as filled-required / total-required * 100 */
export function calculateCompleteness(draft: ServiceDraft): number {
  const schema = getOrBuildSchema(draft.serviceSlug, draft.serviceTitle);
  const allFields = schema.sections.flatMap((s) => s.fields);
  const requiredKeys = new Set(
    allFields.filter((f) => f.required).map((f) => f.key),
  );

  if (requiredKeys.size === 0) return 100;

  const filled = draft.fields.filter(
    (f) => requiredKeys.has(f.key) && f.value !== null && f.value !== '',
  ).length;

  return Math.round((filled / requiredKeys.size) * 100);
}

function deriveMissing(draft: ServiceDraft): string[] {
  const schema = getOrBuildSchema(draft.serviceSlug, draft.serviceTitle);
  const allFields = schema.sections.flatMap((s) => s.fields);
  const requiredKeys = allFields.filter((f) => f.required).map((f) => f.key);
  return requiredKeys.filter((k) => {
    const field = draft.fields.find((f) => f.key === k);
    return !field || field.value === null || field.value === '';
  });
}

// ---------------------------------------------------------------------------
// Generate draft
// ---------------------------------------------------------------------------

export async function generateDraft(
  supabase: SupabaseClient,
  userId: string,
  serviceSlug: string,
): Promise<ServiceDraft> {
  // 1. Get form schema
  const schema = getOrBuildSchema(serviceSlug, serviceSlug);

  // 2. Load user profile (graceful if table missing)
  let profile: Record<string, string | null> = {};
  try {
    const { data } = await supabase
      .from('user_identity_profile')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();
    if (data) {
      profile = data as Record<string, string | null>;
    }
  } catch {
    // Table may not exist yet — proceed with empty profile
  }

  // 3. Map fields
  const allFields = schema.sections.flatMap((s) => s.fields);
  const fields: DraftFieldValue[] = allFields.map((f) => {
    const profileKey = f.profileKey;
    const profileValue =
      profileKey && profile[profileKey] != null
        ? String(profile[profileKey])
        : null;

    if (profileValue) {
      return {
        key: f.key,
        label: f.label,
        value: profileValue,
        status: 'known' as FieldStatus,
        source: 'profile',
        confidence: 0.95,
        requiresReview: false,
      };
    }

    return {
      key: f.key,
      label: f.label,
      value: null,
      status: 'missing' as FieldStatus,
      source: '',
      confidence: 0,
      requiresReview: false,
    };
  });

  // 4. Build draft
  const draft: ServiceDraft = {
    serviceSlug,
    serviceTitle: schema.title,
    fields,
    completeness: 0,
    readyForReview: false,
    missingRequired: [],
    warnings: [],
    createdAt: new Date().toISOString(),
  };

  draft.completeness = calculateCompleteness(draft);
  draft.missingRequired = deriveMissing(draft);
  draft.readyForReview =
    draft.completeness >= 80 && draft.missingRequired.length <= 2;

  return draft;
}

// ---------------------------------------------------------------------------
// Mutate draft fields
// ---------------------------------------------------------------------------

export function updateDraftField(
  draft: ServiceDraft,
  fieldKey: string,
  value: string,
): ServiceDraft {
  const updated: ServiceDraft = {
    ...draft,
    fields: draft.fields.map((f) =>
      f.key === fieldKey
        ? {
            ...f,
            value,
            status: 'user_confirmed' as FieldStatus,
            source: 'user_input',
            confidence: 1,
            requiresReview: false,
          }
        : f,
    ),
  };

  updated.completeness = calculateCompleteness(updated);
  updated.missingRequired = deriveMissing(updated);
  updated.readyForReview =
    updated.completeness >= 80 && updated.missingRequired.length <= 2;

  return updated;
}

export function confirmDraftField(
  draft: ServiceDraft,
  fieldKey: string,
): ServiceDraft {
  const updated: ServiceDraft = {
    ...draft,
    fields: draft.fields.map((f) =>
      f.key === fieldKey
        ? {
            ...f,
            status: 'user_confirmed' as FieldStatus,
            requiresReview: false,
          }
        : f,
    ),
  };
  return updated;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export async function storeDraft(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  draft: ServiceDraft,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('service_task_drafts').upsert(
      {
        user_id: userId,
        task_id: taskId,
        service_slug: draft.serviceSlug,
        service_title: draft.serviceTitle,
        draft_data: draft,
        completeness: draft.completeness,
        ready_for_review: draft.readyForReview,
        missing_required: draft.missingRequired,
        warnings: draft.warnings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,task_id' },
    );
    return !error;
  } catch {
    // Table may not exist yet
    return false;
  }
}

export async function loadDraft(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<ServiceDraft | null> {
  try {
    const { data } = await supabase
      .from('service_task_drafts')
      .select('draft_data')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .maybeSingle();

    if (data?.draft_data) {
      return data.draft_data as ServiceDraft;
    }
    return null;
  } catch {
    return null;
  }
}
