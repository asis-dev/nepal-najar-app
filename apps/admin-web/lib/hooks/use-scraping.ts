'use client';

/**
 * Scraping hooks — REWIRED to use the real Next.js API routes
 * at /api/scrape/* instead of the dead localhost:3001 backend.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ScrapingStatus {
  total: number;
  in_progress: number;
  completed: number;
  failed: number;
  last_run_at: string | null;
}

export interface ResearchFinding {
  id: string;
  title: string;
  body: string;
  source_url: string;
  finding_type: string;
  confidence: number;
  project_id: string | null;
  created_at: string;
}

export interface PotentialProject {
  id: string;
  title: string;
  description: string;
  source_url: string;
  status: string;
  confidence: number;
  matched_project_id: string | null;
  region_name: string | null;
  created_at: string;
}

export function useScrapingStatus() {
  return useQuery({
    queryKey: ['scraping', 'status'],
    queryFn: async (): Promise<ScrapingStatus> => {
      try {
        const res = await fetch('/api/scrape/status', {
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SCRAPE_SECRET || ''}` },
        });
        if (!res.ok) throw new Error('Status fetch failed');
        const data = await res.json();
        // Map from our API response shape
        const runs = data.recentRuns ?? [];
        const lastRun = runs[0];
        return {
          total: data.stats?.totalArticles ?? 0,
          in_progress: runs.filter((r: Record<string, unknown>) => r.status === 'running').length,
          completed: runs.filter((r: Record<string, unknown>) => r.status === 'completed').length,
          failed: runs.filter((r: Record<string, unknown>) => r.status === 'failed').length,
          last_run_at: lastRun?.started_at ?? null,
        };
      } catch {
        return { total: 0, in_progress: 0, completed: 0, failed: 0, last_run_at: null };
      }
    },
    refetchInterval: 10000,
  });
}

export function useScrapingFindings(_params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['scraping', 'findings', _params],
    queryFn: async (): Promise<ResearchFinding[]> => [],
  });
}

export function usePotentialProjects(_params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['scraping', 'potential', _params],
    queryFn: async (): Promise<PotentialProject[]> => [],
  });
}

export function useTriggerScraping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { source?: string }) => {
      const res = await fetch('/api/scrape/source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SCRAPE_SECRET || ''}`,
        },
        body: JSON.stringify({
          source: payload?.source ?? 'kathmandu-post',
          trigger: 'manual',
        }),
      });
      if (!res.ok) throw new Error('Scrape trigger failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraping'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}
