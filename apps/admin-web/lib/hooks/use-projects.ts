'use client';

/**
 * Project hooks — REWRITTEN to use Supabase instead of dead localhost:3001 backend.
 *
 * The old hooks called api.get('/projects') etc. which pointed to a backend
 * that does not exist. These now either query Supabase directly or return
 * empty/unavailable states.
 */
import { useQuery } from '@tanstack/react-query';
import { hasPublicSupabaseConfig, supabasePublic } from '@/lib/supabase/client';

/* ═══════════════════════════════════════════
   TYPES (kept for backward compat)
   ═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   HOOKS — rewired to Supabase / stubs
   ═══════════════════════════════════════════ */

/** Projects entity does not exist in Supabase — returns empty */
export function useProjects(_params?: {
  status?: string;
  governmentUnitId?: string;
  regionId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['projects', _params],
    queryFn: async (): Promise<ProjectsResponse> => ({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    }),
  });
}

/** Single project — not available */
export function useProject(_id: string) {
  return useQuery({
    queryKey: ['projects', _id],
    queryFn: async (): Promise<Project | null> => null,
    enabled: !!_id,
  });
}

export function useProjectMilestones(_projectId: string) {
  return useQuery({
    queryKey: ['projects', _projectId, 'milestones'],
    queryFn: async (): Promise<Milestone[]> => [],
    enabled: !!_projectId,
  });
}

export function useProjectBlockers(_projectId: string, _params?: { status?: string; severity?: string }) {
  return useQuery({
    queryKey: ['projects', _projectId, 'blockers', _params],
    queryFn: async (): Promise<Blocker[]> => [],
    enabled: !!_projectId,
  });
}

/** Dashboard overview — now reads from Supabase promises table */
export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboards', 'overview'],
    queryFn: async () => {
      if (!hasPublicSupabaseConfig || !supabasePublic) {
        return {
          totalProjects: 0,
          totalActive: 0,
          totalCompleted: 0,
          overallProgress: 0,
          totalBlockers: 0,
        };
      }

      const { data, error } = await supabasePublic
        .from('promises')
        .select('status, progress');

      if (error || !data) {
        return {
          totalProjects: 0,
          totalActive: 0,
          totalCompleted: 0,
          overallProgress: 0,
          totalBlockers: 0,
        };
      }

      const total = data.length;
      const active = data.filter((p) => p.status === 'in_progress').length;
      const completed = data.filter((p) => p.status === 'delivered').length;
      const avgProgress = total > 0
        ? Math.round(data.reduce((sum, p) => sum + (p.progress || 0), 0) / total)
        : 0;

      return {
        totalProjects: total,
        totalActive: active,
        totalCompleted: completed,
        overallProgress: avgProgress,
        totalBlockers: data.filter((p) => p.status === 'stalled').length,
      };
    },
  });
}

/** National dashboard — reads promise category breakdown from Supabase */
export function useNationalDashboard() {
  return useQuery({
    queryKey: ['dashboards', 'national'],
    queryFn: async () => {
      if (!hasPublicSupabaseConfig || !supabasePublic) return null;

      const { data, error } = await supabasePublic
        .from('promises')
        .select('category, status, progress');

      if (error || !data) return null;

      // Group by category
      const categories: Record<string, { total: number; inProgress: number; delivered: number; stalled: number }> = {};
      for (const p of data) {
        const cat = p.category as string;
        if (!categories[cat]) categories[cat] = { total: 0, inProgress: 0, delivered: 0, stalled: 0 };
        categories[cat].total++;
        if (p.status === 'in_progress') categories[cat].inProgress++;
        if (p.status === 'delivered') categories[cat].delivered++;
        if (p.status === 'stalled') categories[cat].stalled++;
      }

      return {
        categoryBreakdown: Object.entries(categories).map(([name, stats]) => ({ name, ...stats })),
        totalPromises: data.length,
      };
    },
  });
}

/** Project updates — not available without backend */
export function useUpdateProject() {
  return {
    mutate: () => console.warn('[useUpdateProject] No backend available'),
    mutateAsync: async () => { throw new Error('No backend available'); },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
  };
}
