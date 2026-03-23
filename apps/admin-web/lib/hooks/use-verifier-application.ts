'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/use-auth';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type ExpertiseArea =
  | 'infrastructure'
  | 'health'
  | 'education'
  | 'environment'
  | 'governance'
  | 'economy'
  | 'social'
  | 'other';

export interface VerifierApplication {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_karma?: number;
  user_level?: number;
  reason: string;
  expertise_area: ExpertiseArea;
  province: string;
  status: ApplicationStatus;
  reviewer_id?: string;
  reviewer_note?: string;
  created_at: string;
  updated_at: string;
}

/* ═══════════════════════════════════════════
   HOOK: useMyApplication — own application status
   ═══════════════════════════════════════════ */
export function useMyApplication() {
  const { isAuthenticated } = useAuth();

  return useQuery<VerifierApplication | null>({
    queryKey: ['verifier-application', 'mine'],
    queryFn: async () => {
      const res = await fetch('/api/verifier-applications?mine=true');
      if (!res.ok) throw new Error('Failed to load application');
      const data = await res.json();
      return data.application ?? null;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useSubmitApplication — submit application
   ═══════════════════════════════════════════ */
export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      reason: string;
      expertise_area: ExpertiseArea;
      province: string;
    }) => {
      const res = await fetch('/api/verifier-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit application');
      }
      return res.json() as Promise<VerifierApplication>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifier-application'] });
    },
  });
}

/* ═══════════════════════════════════════════
   HOOK: useAdminApplications — all pending (admin)
   ═══════════════════════════════════════════ */
export function useAdminApplications() {
  const { isAdmin } = useAuth();

  return useQuery<VerifierApplication[]>({
    queryKey: ['verifier-application', 'admin'],
    queryFn: async () => {
      const res = await fetch('/api/verifier-applications?status=pending');
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      return data.applications ?? data;
    },
    enabled: isAdmin,
    staleTime: 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useReviewApplication — admin review mutation
   ═══════════════════════════════════════════ */
export function useReviewApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      action,
      note,
    }: {
      applicationId: string;
      action: 'approve' | 'reject';
      note?: string;
    }) => {
      const res = await fetch(`/api/verifier-applications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: applicationId,
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewer_note: note,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to review application');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifier-application'] });
    },
  });
}
