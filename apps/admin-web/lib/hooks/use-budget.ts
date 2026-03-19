'use client';

/**
 * Budget hooks — STUBBED. No budget tables exist in Supabase.
 * All budget data was fabricated. Returns null/empty states.
 */
import { useQuery } from '@tanstack/react-query';

export interface BudgetSummary {
  total_allocated: number;
  total_released: number;
  total_spent: number;
  utilization_rate: number;
}

export interface BudgetByMinistry {
  ministry: string;
  allocated: number;
  released: number;
  spent: number;
}

export interface BudgetProject {
  id: string;
  project_name: string;
  ministry: string;
  allocated: number;
  released: number;
  spent: number;
  utilization: number;
  status: 'healthy' | 'under_utilized' | 'over_budget' | 'at_risk';
}

export interface BudgetAnomaly {
  id: string;
  project_name: string;
  type: 'over_budget' | 'under_utilized' | 'release_delay' | 'spending_spike';
  message: string;
  severity: 'warning' | 'critical';
  value: number;
}

export function useBudgetSummary(_params?: { ministry?: string; fiscal_year?: string }) {
  return useQuery({
    queryKey: ['budget', 'summary', _params],
    queryFn: async (): Promise<BudgetSummary | null> => null,
  });
}

export function useBudgetByMinistry(_params?: { fiscal_year?: string }) {
  return useQuery({
    queryKey: ['budget', 'by-ministry', _params],
    queryFn: async (): Promise<BudgetByMinistry[]> => [],
  });
}

export function useBudgetProjects(_params?: { ministry?: string; fiscal_year?: string; status?: string }) {
  return useQuery({
    queryKey: ['budget', 'projects', _params],
    queryFn: async (): Promise<{ data: BudgetProject[]; total: number }> => ({ data: [], total: 0 }),
  });
}

export function useBudgetAnomalies() {
  return useQuery({
    queryKey: ['budget', 'anomalies'],
    queryFn: async (): Promise<BudgetAnomaly[]> => [],
  });
}
