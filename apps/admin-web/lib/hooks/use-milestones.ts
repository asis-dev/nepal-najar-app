'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

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

export function useMilestones(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['milestones', params],
    queryFn: async () => {
      // Milestones are project-scoped in the API, so we fetch from national dashboard
      // or iterate projects. For the admin view we use the national dashboard data.
      const { data } = await api.get('/dashboards/national');
      return data;
    },
  });
}

export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'milestones'],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/milestones`);
      return data as Milestone[];
    },
    enabled: !!projectId,
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Milestone> & { id: string }) => {
      const { data } = await api.patch(`/milestones/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}
