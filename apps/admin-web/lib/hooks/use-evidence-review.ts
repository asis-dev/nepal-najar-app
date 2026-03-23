'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/use-auth';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export type EvidenceClassification = 'confirms' | 'contradicts' | 'neutral';
export type EvidenceStatus = 'pending' | 'approved' | 'rejected' | 'needs_info';

export interface CommunityEvidence {
  id: string;
  promise_id: string;
  submitter_id: string;
  submitter_name?: string;
  submitter_is_verifier?: boolean;
  caption: string;
  classification: EvidenceClassification;
  media_urls: string[];
  proof_url?: string;
  status: EvidenceStatus;
  reviewer_id?: string;
  reviewer_note?: string;
  upvote_count: number;
  downvote_count: number;
  created_at: string;
  updated_at: string;
}

export interface EvidenceFilters {
  status?: EvidenceStatus;
  promise_id?: string;
  classification?: EvidenceClassification;
  date_from?: string;
  date_to?: string;
}

export interface ReviewPayload {
  action: 'approve' | 'reject' | 'request_info';
  note: string;
  proof_url?: string;
}

interface PendingEvidenceResponse {
  evidence: CommunityEvidence[];
  total: number;
}

/* ═══════════════════════════════════════════
   HOOK: usePendingEvidence — fetch evidence queue
   ═══════════════════════════════════════════ */
export function usePendingEvidence(filters: EvidenceFilters = {}) {
  const { isAuthenticated } = useAuth();

  return useQuery<PendingEvidenceResponse>({
    queryKey: ['evidence-review', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('status', filters.status || 'pending');
      if (filters.promise_id) params.set('promise_id', filters.promise_id);
      if (filters.classification) params.set('classification', filters.classification);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);

      const res = await fetch(`/api/evidence?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load evidence');
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useReviewEvidence — review mutation
   ═══════════════════════════════════════════ */
export function useReviewEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evidenceId,
      payload,
    }: {
      evidenceId: string;
      payload: ReviewPayload;
    }) => {
      const res = await fetch(`/api/evidence/${evidenceId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to review evidence');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-review'] });
      queryClient.invalidateQueries({ queryKey: ['community-evidence'] });
      queryClient.invalidateQueries({ queryKey: ['reputation'] });
    },
  });
}
