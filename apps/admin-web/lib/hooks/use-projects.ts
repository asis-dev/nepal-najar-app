'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface GovernmentUnit {
  id: string;
  name: string;
  type: string;
}

export interface Region {
  id: string;
  name: string;
  type: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: string;
  weight: number;
  sequence: number;
  due_date: string;
  completion_date?: string;
  created_at: string;
}

export interface Blocker {
  id: string;
  title: string;
  description: string;
  blocker_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'escalated' | 'resolved';
  owner_unit?: GovernmentUnit;
  created_at: string;
  resolved_at?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: 'active' | 'draft' | 'suspended' | 'completed' | 'cancelled';
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  target_end_date: string;
  government_unit?: GovernmentUnit;
  region?: Region;
  milestones?: Milestone[];
  blockers?: Blocker[];
  creator?: { id: string; display_name: string };
  created_at: string;
  updated_at: string;
}

export interface ProjectsResponse {
  data: Project[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Map raw API project entity to frontend Project shape */
function mapProject(raw: any): Project {
  return {
    ...raw,
    progress: Number(raw.current_progress_percent_cached ?? raw.progress ?? 0),
  };
}

export function useProjects(params?: {
  status?: string;
  governmentUnitId?: string;
  regionId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const { data } = await api.get('/projects', { params });
      return {
        data: (data.data ?? []).map(mapProject),
        meta: data.meta,
      } as ProjectsResponse;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return mapProject(data) as Project;
    },
    enabled: !!id,
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

export function useProjectBlockers(projectId: string, params?: { status?: string; severity?: string }) {
  return useQuery({
    queryKey: ['projects', projectId, 'blockers', params],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/blockers`, { params });
      return data as Blocker[];
    },
    enabled: !!projectId,
  });
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboards', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/dashboards/overview');
      return data as {
        totalProjects: number;
        totalActive: number;
        totalCompleted: number;
        overallProgress: number;
        totalBlockers: number;
      };
    },
  });
}

export function useNationalDashboard() {
  return useQuery({
    queryKey: ['dashboards', 'national'],
    queryFn: async () => {
      const { data } = await api.get('/dashboards/national');
      return data;
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data } = await api.patch(`/projects/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
