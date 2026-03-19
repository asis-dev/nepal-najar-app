'use client';

/**
 * Milestones hooks — STUBBED. No milestones table exists in Supabase.
 */
import { useQuery } from '@tanstack/react-query';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  weight: number;
  sequence: number;
  due_date: string;
  completion_date?: string;
  project?: { id: string; title: string };
  created_at: string;
}

export function useMilestones(_params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['milestones', _params],
    queryFn: async () => ({ data: [] as Milestone[], unavailable: true }),
  });
}

export function useProjectMilestones(_projectId: string) {
  return useQuery({
    queryKey: ['projects', _projectId, 'milestones'],
    queryFn: async (): Promise<Milestone[]> => [],
    enabled: !!_projectId,
  });
}

export function useUpdateMilestone() {
  return {
    mutate: () => console.warn('[useUpdateMilestone] No backend available'),
    mutateAsync: async () => { throw new Error('No backend available'); },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
  };
}
