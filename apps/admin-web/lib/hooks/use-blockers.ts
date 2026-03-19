'use client';

/**
 * Blockers hooks — STUBBED. No blockers table exists in Supabase.
 * Returns empty states to prevent runtime errors.
 */
import { useQuery } from '@tanstack/react-query';

export interface Blocker {
  id: string;
  title: string;
  description: string;
  blocker_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'escalated' | 'resolved';
  project?: { id: string; title: string };
  owner_unit?: { id: string; name: string };
  reported_by?: { id: string; name: string };
  created_at: string;
  resolved_at?: string;
}

export function useBlockers(_params?: {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['blockers', _params],
    queryFn: async () => ({ data: [] as Blocker[], unavailable: true }),
  });
}

export function useBlocker(_id: string) {
  return useQuery({
    queryKey: ['blockers', _id],
    queryFn: async (): Promise<Blocker | null> => null,
    enabled: !!_id,
  });
}

export function useUpdateBlocker() {
  return {
    mutate: () => console.warn('[useUpdateBlocker] No backend available'),
    mutateAsync: async () => { throw new Error('No backend available'); },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
  };
}
