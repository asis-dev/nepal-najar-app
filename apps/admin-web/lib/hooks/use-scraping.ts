'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

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
    queryFn: async () => {
      try {
        const { data } = await api.get('/scraping/status');
        return data as ScrapingStatus;
      } catch {
        return { total: 0, in_progress: 0, completed: 0, failed: 0, last_run_at: null } as ScrapingStatus;
      }
    },
    refetchInterval: 10000,
  });
}

export function useScrapingFindings(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['scraping', 'findings', params],
    queryFn: async () => {
      try {
        const { data } = await api.get('/scraping/findings', { params });
        return Array.isArray(data) ? (data as ResearchFinding[]) : [];
      } catch {
        return [];
      }
    },
  });
}

export function usePotentialProjects(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['scraping', 'potential', params],
    queryFn: async () => {
      try {
        const { data } = await api.get('/scraping/potential', { params });
        return Array.isArray(data) ? (data as PotentialProject[]) : [];
      } catch {
        return [];
      }
    },
  });
}

export function useTriggerScraping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { scope_type?: string; scope_id?: string; job_type?: string }) => {
      const { data } = await api.post('/scraping/trigger', payload ?? {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraping'] });
    },
  });
}
