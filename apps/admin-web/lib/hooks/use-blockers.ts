'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

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

export function useBlockers(params?: {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['blockers', params],
    queryFn: async () => {
      // Use the projects blockers or a global blockers listing
      // The API exposes /projects/:projectId/blockers, but for a global view
      // we fetch all projects and collect blockers, or use national dashboard
      const { data } = await api.get('/dashboards/national');
      return data;
    },
  });
}

export function useBlocker(id: string) {
  return useQuery({
    queryKey: ['blockers', id],
    queryFn: async () => {
      const { data } = await api.get(`/blockers/${id}`);
      return data as Blocker;
    },
    enabled: !!id,
  });
}

export function useUpdateBlocker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Blocker> & { id: string }) => {
      const { data } = await api.patch(`/blockers/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockers'] });
    },
  });
}
