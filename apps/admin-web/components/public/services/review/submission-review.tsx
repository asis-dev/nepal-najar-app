'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  Check,
  X,
  Edit3,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FieldSource = 'profile' | 'document' | 'ai_inferred' | 'user_input';

interface ReviewField {
  key: string;
  label: string;
  value: string;
  source: FieldSource;
  confidence: number;
  requiresApproval: boolean;
  approved?: boolean;
}

interface ReviewDocument {
  name: string;
  required: boolean;
  attached: boolean;
  fileName?: string;
}

interface ReviewDeclaration {
  id: string;
  text: string;
}

interface ReviewWarning {
  message: string;
}

interface ReviewTarget {
  office: string;
  method: string;
}

interface FeeEstimate {
  min: number;
  max: number;
  currency: string;
}

interface ReviewPackage {
  serviceTitle: string;
  target: ReviewTarget;
  fields: ReviewField[];
  documents: ReviewDocument[];
  declarations: ReviewDeclaration[];
  warnings: ReviewWarning[];
  blockingReasons: string[];
  feeEstimate: FeeEstimate | null;
}

interface SubmissionReviewProps {
  taskId: string;
  serviceSlug: string;
  onApprove: () => void;
  onCancel: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SOURCE_STYLES: Record<FieldSource, { bg: string; text: string; label: string }> = {
  profile: { bg: 'bg-blue-900/40', text: 'text-blue-300', label: 'Profile' },
  document: { bg: 'bg-green-900/40', text: 'text-green-300', label: 'Document' },
  ai_inferred: { bg: 'bg-amber-900/40', text: 'text-amber-300', label: 'AI Inferred' },
  user_input: { bg: 'bg-zinc-700/60', text: 'text-zinc-300', label: 'User Input' },
};

function SourceBadge({ source }: { source: FieldSource }) {
  const s = SOURCE_STYLES[source];
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function groupBySource(fields: ReviewField[]): Record<FieldSource, ReviewField[]> {
  const groups: Record<FieldSource, ReviewField[]> = {
    profile: [],
    document: [],
    ai_inferred: [],
    user_input: [],
  };
  for (const f of fields) {
    groups[f.source].push(f);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SubmissionReview({
  taskId,
  serviceSlug,
  onApprove,
  onCancel,
}: SubmissionReviewProps) {
  const [reviewData, setReviewData] = useState<ReviewPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [declarationsChecked, setDeclarationsChecked] = useState<Record<string, boolean>>({});
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  /* ---------- Fetch review package ---------- */

  useEffect(() => {
    let cancelled = false;

    async function fetchReview() {
      try {
        const res = await fetch(`/api/me/service-tasks/${taskId}/review`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to load review (${res.status})`);
        }
        const raw = await res.json();
        if (cancelled) return;

        // Map API response shape → component ReviewPackage shape
        const pkg = raw.review || raw;
        const mapped: ReviewPackage = {
          serviceTitle: pkg.serviceTitle || serviceSlug,
          target: {
            office: pkg.submissionTarget || 'Government office',
            method: pkg.submissionMethod || 'in_person',
          },
          fields: (pkg.items || []).map((item: any) => ({
            key: item.fieldKey,
            label: item.label,
            value: item.value,
            source: item.source || 'user_input',
            confidence: Math.round((item.confidence || 0) * 100),
            requiresApproval: item.requiresExplicitApproval || false,
            approved: false,
          })),
          documents: (pkg.documents || []).map((doc: any) => ({
            name: doc.label || doc.type,
            required: true,
            attached: doc.attached || false,
          })),
          declarations: (pkg.legalDeclarations || []).map((text: string, i: number) => ({
            id: `decl-${i}`,
            text,
          })),
          warnings: (pkg.warnings || []).map((w: string) => ({ message: w })),
          blockingReasons: pkg.blockingReasons || [],
          feeEstimate: pkg.estimatedFee
            ? (() => {
                const match = pkg.estimatedFee.match(/NPR\s*([\d,]+)/);
                const amount = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
                return { min: amount, max: amount, currency: 'NPR' };
              })()
            : null,
        };

        setReviewData(mapped);

        // initialise declaration state
        const decl: Record<string, boolean> = {};
        for (const d of mapped.declarations) {
          decl[d.id] = false;
        }
        setDeclarationsChecked(decl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReview();
    return () => {
      cancelled = true;
    };
  }, [taskId, serviceSlug]);

  /* ---------- Field approval toggles ---------- */

  const toggleFieldApproval = useCallback(
    (key: string) => {
      if (!reviewData) return;
      setReviewData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fields: prev.fields.map((f) =>
            f.key === key ? { ...f, approved: !f.approved } : f,
          ),
        };
      });
    },
    [reviewData],
  );

  /* ---------- Inline editing ---------- */

  const startEdit = useCallback(
    (key: string, currentValue: string) => {
      setEditingField(key);
      setEditValues((prev) => ({ ...prev, [key]: currentValue }));
    },
    [],
  );

  const saveEdit = useCallback(
    (key: string) => {
      if (!reviewData) return;
      const newValue = editValues[key];
      if (newValue === undefined) return;
      setReviewData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fields: prev.fields.map((f) =>
            f.key === key ? { ...f, value: newValue, source: 'user_input' as FieldSource, confidence: 100 } : f,
          ),
        };
      });
      setEditingField(null);
    },
    [reviewData, editValues],
  );

  const cancelEdit = useCallback(() => {
    setEditingField(null);
  }, []);

  /* ---------- Declarations ---------- */

  const toggleDeclaration = useCallback((id: string) => {
    setDeclarationsChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  /* ---------- Submit ---------- */

  const allDeclarationsChecked =
    reviewData?.declarations.every((d) => declarationsChecked[d.id]) ?? false;

  const allApprovalFieldsChecked =
    reviewData?.fields
      .filter((f) => f.requiresApproval)
      .every((f) => f.approved) ?? true;

  const hasBlockingReasons = (reviewData?.blockingReasons.length ?? 0) > 0;

  const canSubmit =
    allDeclarationsChecked && allApprovalFieldsChecked && !hasBlockingReasons && !approving;

  const handleApprove = useCallback(async () => {
    if (!reviewData || !canSubmit) return;
    setApproving(true);
    try {
      // Build editedFields map for fields the user changed
      const editedFields: Record<string, string> = {};
      for (const [key, val] of Object.entries(editValues)) {
        editedFields[key] = val;
      }

      const res = await fetch(`/api/me/service-tasks/${taskId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          editedFields,
          declarationsAccepted: allDeclarationsChecked,
          userNotes: '',
        }),
      });
      if (!res.ok) throw new Error(`Approval failed (${res.status})`);
      setApproved(true);
      onApprove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(false);
    }
  }, [reviewData, canSubmit, taskId, declarationsChecked, onApprove]);

  /* ------------------------------------------------------------------ */
  /*  Render states                                                      */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          <p className="text-sm">Loading review package...</p>
        </div>
      </div>
    );
  }

  if (error && !reviewData) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-zinc-950 p-8">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <button
          onClick={onCancel}
          className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
        <p className="text-sm">No review data available for this task.</p>
        <button
          onClick={onCancel}
          className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Go back
        </button>
      </div>
    );
  }

  if (approved) {
    return (
      <div className="rounded-xl border border-green-900/50 bg-zinc-950 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-900/30">
          <Check className="h-7 w-7 text-green-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Submission Approved</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Your application for <span className="font-medium text-zinc-200">{reviewData.serviceTitle}</span> has been
          submitted successfully.
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Main review UI                                                     */
  /* ------------------------------------------------------------------ */

  const grouped = groupBySource(reviewData.fields);
  const sourceOrder: FieldSource[] = ['profile', 'document', 'ai_inferred', 'user_input'];
  const sourceLabels: Record<FieldSource, string> = {
    profile: 'From Your Profile',
    document: 'From Documents',
    ai_inferred: 'AI Inferred',
    user_input: 'Your Input',
  };

  return (
    <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
          <Shield className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Review & Approve</h2>
          <p className="text-sm text-zinc-400">{reviewData.serviceTitle}</p>
        </div>
      </div>

      {/* Submission Target */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Submission Target
        </h3>
        <p className="text-sm font-medium text-zinc-200">{reviewData.target.office}</p>
        <p className="mt-1 text-xs text-zinc-400">
          Method: <span className="text-zinc-300">{reviewData.target.method}</span>
        </p>
      </section>

      {/* Fields grouped by source */}
      {sourceOrder.map((source) => {
        const fields = grouped[source];
        if (fields.length === 0) return null;
        return (
          <section key={source} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {sourceLabels[source]}
            </h3>
            <div className="space-y-3">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className={`rounded-md border p-3 ${
                    field.requiresApproval && !field.approved
                      ? 'border-l-2 border-l-amber-500 border-t-zinc-800 border-r-zinc-800 border-b-zinc-800'
                      : 'border-zinc-800'
                  } bg-zinc-950`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-500">{field.label}</p>

                      {editingField === field.key ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editValues[field.key] ?? field.value}
                            onChange={(e) =>
                              setEditValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(field.key)}
                            className="rounded p-1 text-green-400 hover:bg-green-900/30"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="mt-0.5 text-sm text-zinc-200">{field.value}</p>
                      )}

                      <div className="mt-1.5 flex items-center gap-2">
                        <SourceBadge source={field.source} />
                        <span className="text-[10px] text-zinc-500">
                          Confidence: {field.confidence}%
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {field.requiresApproval && (
                        <label className="flex cursor-pointer items-center gap-1 text-[10px] text-amber-400">
                          <input
                            type="checkbox"
                            checked={field.approved ?? false}
                            onChange={() => toggleFieldApproval(field.key)}
                            className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 accent-amber-500"
                          />
                          Confirm
                        </label>
                      )}
                      {editingField !== field.key && (
                        <button
                          onClick={() => startEdit(field.key, field.value)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Documents */}
      {reviewData.documents.length > 0 && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Documents
          </h3>
          <div className="space-y-2">
            {reviewData.documents.map((doc) => (
              <div key={doc.name} className="flex items-center gap-2 text-sm">
                {doc.attached ? (
                  <FileCheck className="h-4 w-4 shrink-0 text-green-400" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-red-400" />
                )}
                <span className={doc.attached ? 'text-zinc-200' : 'text-zinc-400'}>
                  {doc.name}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {doc.attached ? (doc.fileName ? `- ${doc.fileName}` : '- Attached') : '- Missing'}
                </span>
                {doc.required && !doc.attached && (
                  <span className="rounded bg-red-900/30 px-1.5 py-0.5 text-[10px] text-red-400">
                    Required
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fee Estimate */}
      {reviewData.feeEstimate && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Fee Estimate
          </h3>
          <p className="text-sm font-medium text-zinc-200">
            {reviewData.feeEstimate.currency}{' '}
            {reviewData.feeEstimate.min.toLocaleString()}
            {reviewData.feeEstimate.max !== reviewData.feeEstimate.min &&
              ` - ${reviewData.feeEstimate.max.toLocaleString()}`}
          </p>
        </section>
      )}

      {/* Warnings */}
      {reviewData.warnings.length > 0 && (
        <section className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Warnings
            </h3>
          </div>
          <ul className="space-y-1">
            {reviewData.warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-300/80">
                &bull; {w.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Declarations */}
      {reviewData.declarations.length > 0 && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Declarations
          </h3>
          <div className="space-y-3">
            {reviewData.declarations.map((decl) => (
              <label key={decl.id} className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={declarationsChecked[decl.id] ?? false}
                  onChange={() => toggleDeclaration(decl.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-[#DC143C]"
                />
                <span className="text-sm leading-relaxed text-zinc-300">{decl.text}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Blocking reasons */}
      {hasBlockingReasons && (
        <div className="space-y-1">
          {reviewData.blockingReasons.map((reason, i) => (
            <p key={i} className="text-xs text-red-400">
              {reason}
            </p>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/20 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
        <button
          onClick={onCancel}
          disabled={approving}
          className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleApprove}
          disabled={!canSubmit}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
            canSubmit
              ? 'bg-gradient-to-r from-[#DC143C] to-[#B01030] text-white shadow-lg shadow-red-900/25 hover:from-[#B01030] hover:to-[#8E0C26]'
              : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
          }`}
        >
          {approving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
              Submitting...
            </>
          ) : (
            <>
              Approve & Submit
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
