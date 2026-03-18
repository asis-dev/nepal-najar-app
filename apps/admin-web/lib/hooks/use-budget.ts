'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

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

export function useBudgetSummary(params?: { ministry?: string; fiscal_year?: string }) {
  return useQuery({
    queryKey: ['budget', 'summary', params],
    queryFn: async () => {
      const { data } = await api.get('/api/budget/summary', { params });
      return data as BudgetSummary;
    },
  });
}

export function useBudgetByMinistry(params?: { fiscal_year?: string }) {
  return useQuery({
    queryKey: ['budget', 'by-ministry', params],
    queryFn: async () => {
      const { data } = await api.get('/api/budget/by-ministry', { params });
      return data as BudgetByMinistry[];
    },
  });
}

export function useBudgetProjects(params?: { ministry?: string; fiscal_year?: string; status?: string }) {
  return useQuery({
    queryKey: ['budget', 'projects', params],
    queryFn: async () => {
      const { data } = await api.get('/api/budget/projects', { params });
      return data as { data: BudgetProject[]; total: number };
    },
  });
}

export function useBudgetAnomalies() {
  return useQuery({
    queryKey: ['budget', 'anomalies'],
    queryFn: async () => {
      const { data } = await api.get('/api/budget/anomalies');
      return data as BudgetAnomaly[];
    },
  });
}
