/**
 * Phase 4 — Form Drafter
 * Creates pre-filled draft applications by combining profile data,
 * document extractions, prior submissions, and provenance-ranked fields.
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
// Source candidate — represents one possible value for a field
// ---------------------------------------------------------------------------

interface SourceCandidate {
  value: string;
  source: string;
  confidence: number;
  status: FieldStatus;
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

  // 2. Load all data sources in parallel (each gracefully handles missing tables)
  const [profile, docExtractions, priorSubmission, provenanceMap] =
    await Promise.all([
      loadUserProfile(supabase, userId),
      loadDocumentExtractions(supabase, userId),
      loadPriorSubmission(supabase, userId, serviceSlug),
      loadProvenanceMap(supabase, userId),
    ]);

  // 3. For each schema field, pick the best value from all sources
  const allFields = schema.sections.flatMap((s) => s.fields);
  const fields: DraftFieldValue[] = allFields.map((f) => {
    const profileKey = f.profileKey;
    const candidates: SourceCandidate[] = [];

    // --- Provenance-backed values (from profile_field_provenance) ---
    if (profileKey && provenanceMap[profileKey]) {
      const prov = provenanceMap[profileKey];
      if (prov.value != null && prov.value !== '') {
        candidates.push({
          value: prov.value,
          source: `provenance:${prov.source}`,
          confidence: mapSourceConfidence(prov.source, prov.confidence),
          status: provenanceSourceToStatus(prov.source),
        });
      }
    }

    // --- Profile table values ---
    if (profileKey && profile[profileKey] != null) {
      const val = String(profile[profileKey]);
      if (val !== '') {
        candidates.push({
          value: val,
          source: 'profile',
          confidence: 0.95,
          status: 'known',
        });
      }
    }

    // --- Document extractions ---
    if (profileKey && docExtractions[profileKey] != null) {
      const val = String(docExtractions[profileKey]);
      if (val !== '') {
        candidates.push({
          value: val,
          source: `document:${docExtractions[`__source_${profileKey}`] ?? 'ocr'}`,
          confidence: 0.9,
          status: 'extracted_from_doc',
        });
      }
    }

    // --- Prior submission values (match by form key) ---
    if (priorSubmission[f.key] != null) {
      const val = String(priorSubmission[f.key]);
      if (val !== '') {
        candidates.push({
          value: val,
          source: 'prior_submission',
          confidence: 0.85,
          status: 'known',
        });
      }
    }
    // Also try matching by profileKey in prior submission
    if (profileKey && profileKey !== f.key && priorSubmission[profileKey] != null) {
      const val = String(priorSubmission[profileKey]);
      if (val !== '') {
        candidates.push({
          value: val,
          source: 'prior_submission',
          confidence: 0.85,
          status: 'known',
        });
      }
    }

    // Pick the best candidate by confidence (highest wins)
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.confidence - a.confidence);
      const best = candidates[0];
      return {
        key: f.key,
        label: f.label,
        value: best.value,
        status: best.status,
        source: best.source,
        confidence: best.confidence,
        requiresReview: best.confidence < 0.9,
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
// Data loaders (each handles missing tables gracefully)
// ---------------------------------------------------------------------------

/** Load user_identity_profile row as a flat key-value map */
async function loadUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, string | null>> {
  try {
    const { data } = await supabase
      .from('user_identity_profile')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();
    if (data) return data as Record<string, string | null>;
  } catch {
    // Table may not exist yet
  }
  return {};
}

/**
 * Load extracted fields from document_extractions joined with vault_documents.
 * Returns a flat map of profileKey -> value, plus __source_<key> metadata.
 */
async function loadDocumentExtractions(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const { data } = await supabase
      .from('document_extractions')
      .select('field_name, field_value, confidence, vault_documents!inner(owner_id, doc_type)')
      .eq('vault_documents.owner_id', userId);

    if (data && Array.isArray(data)) {
      for (const row of data) {
        const fieldName = row.field_name as string;
        const fieldValue = row.field_value as string;
        if (fieldName && fieldValue != null && fieldValue !== '') {
          // Only overwrite if this extraction has higher confidence or is first
          if (!result[fieldName]) {
            result[fieldName] = fieldValue;
            const docType = (row as any).vault_documents?.doc_type;
            if (docType) {
              result[`__source_${fieldName}`] = docType;
            }
          }
        }
      }
    }
  } catch {
    // Table may not exist yet
  }
  return result;
}

/**
 * Load the most recent prior submission for the same service.
 * Returns the submitted_values as a flat key-value map.
 */
async function loadPriorSubmission(
  supabase: SupabaseClient,
  userId: string,
  serviceSlug: string,
): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from('service_submissions')
      .select('submitted_values')
      .eq('user_id', userId)
      .eq('service_slug', serviceSlug)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.submitted_values && typeof data.submitted_values === 'object') {
      return data.submitted_values as Record<string, string>;
    }
  } catch {
    // Table may not exist yet
  }
  return {};
}

/**
 * Load all provenance records for a user into a lookup map.
 * Returns field_name -> { value, source, confidence }.
 */
async function loadProvenanceMap(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, { value: string; source: string; confidence: number }>> {
  const result: Record<string, { value: string; source: string; confidence: number }> = {};
  try {
    const { data } = await supabase
      .from('profile_field_provenance')
      .select('field_name, field_value, source, confidence')
      .eq('user_id', userId);

    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.field_name && row.field_value != null) {
          result[row.field_name] = {
            value: row.field_value,
            source: row.source,
            confidence: row.confidence ?? 0.5,
          };
        }
      }
    }
  } catch {
    // Table may not exist yet
  }
  return result;
}

// ---------------------------------------------------------------------------
// Confidence mapping
// ---------------------------------------------------------------------------

/**
 * Map provenance source type to confidence value.
 * Priority: user_confirmed (1.0) > document_ocr (0.9) > profile (0.95 generic)
 *           > form_submission (0.85) > ai_inferred (use stored confidence)
 */
function mapSourceConfidence(source: string, storedConfidence: number): number {
  switch (source) {
    case 'user_input':
      return 1.0;
    case 'document_ocr':
      return 0.9;
    case 'admin_entry':
      return 0.88;
    case 'form_submission':
      return 0.85;
    case 'ai_inferred':
      return Math.min(storedConfidence, 0.8);
    default:
      return storedConfidence;
  }
}

/** Map provenance source to a DraftFieldValue status */
function provenanceSourceToStatus(source: string): FieldStatus {
  switch (source) {
    case 'user_input':
      return 'user_confirmed';
    case 'document_ocr':
      return 'extracted_from_doc';
    case 'ai_inferred':
      return 'inferred';
    default:
      return 'known';
  }
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
