'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  CorruptionCase,
  CorruptionEntity,
  CaseEntity,
  TimelineEvent,
  CorruptionEvidence,
  MoneyFlow,
  CorruptionStats,
  EntityDossier,
  CorruptionType,
  CaseStatus,
  Severity,
  EntityType,
} from '@/lib/data/corruption-types';

/* ── Cases List ── */

interface UseCasesOpts {
  corruption_type?: CorruptionType;
  status?: CaseStatus;
  severity?: Severity;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useCorruptionCases(opts: UseCasesOpts = {}) {
  return useQuery({
    queryKey: ['corruption-cases', opts],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts.corruption_type) params.set('corruption_type', opts.corruption_type);
      if (opts.status) params.set('status', opts.status);
      if (opts.severity) params.set('severity', opts.severity);
      if (opts.search) params.set('search', opts.search);
      if (opts.page) params.set('page', String(opts.page));
      if (opts.pageSize) params.set('pageSize', String(opts.pageSize));

      const res = await fetch(`/api/corruption/cases?${params.toString()}`);
      if (!res.ok) return { cases: [] as CorruptionCase[], total: 0 };
      return res.json() as Promise<{ cases: CorruptionCase[]; total: number }>;
    },
    staleTime: 60 * 1000,
  });
}

/* ── Single Case with details ── */

export function useCorruptionCase(slug: string) {
  return useQuery({
    queryKey: ['corruption-case', slug],
    queryFn: async () => {
      const res = await fetch(`/api/corruption/cases/${slug}`);
      if (!res.ok) return null;
      return res.json() as Promise<{
        case: CorruptionCase;
        entities: Array<CaseEntity & { entity: CorruptionEntity }>;
        timeline: TimelineEvent[];
        evidence: CorruptionEvidence[];
        moneyFlows: Array<MoneyFlow & { from_entity?: CorruptionEntity; to_entity?: CorruptionEntity }>;
      }>;
    },
    staleTime: 60 * 1000,
    enabled: !!slug,
  });
}

/* ── Stats ── */

export function useCorruptionStats() {
  return useQuery({
    queryKey: ['corruption-stats'],
    queryFn: async () => {
      const res = await fetch('/api/corruption/stats');
      if (!res.ok) {
        return {
          totalCases: 0,
          totalAmountNpr: 0,
          activeInvestigations: 0,
          convictions: 0,
          convictionRate: 0,
          casesByType: {},
          casesByStatus: {},
          casesBySeverity: {},
          totalEntities: 0,
        } as CorruptionStats;
      }
      return res.json() as Promise<CorruptionStats>;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/* ── Entities List ── */

interface UseEntitiesOpts {
  entity_type?: EntityType;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useCorruptionEntities(opts: UseEntitiesOpts = {}) {
  return useQuery({
    queryKey: ['corruption-entities', opts],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts.entity_type) params.set('entity_type', opts.entity_type);
      if (opts.search) params.set('search', opts.search);
      if (opts.page) params.set('page', String(opts.page));
      if (opts.pageSize) params.set('pageSize', String(opts.pageSize));

      const res = await fetch(`/api/corruption/entities?${params.toString()}`);
      if (!res.ok) return { entities: [] as CorruptionEntity[], total: 0 };
      return res.json() as Promise<{ entities: CorruptionEntity[]; total: number }>;
    },
    staleTime: 60 * 1000,
  });
}

/* ── Single Entity Dossier ── */

export function useCorruptionEntity(slug: string) {
  return useQuery({
    queryKey: ['corruption-entity', slug],
    queryFn: async () => {
      const res = await fetch(`/api/corruption/entities/${slug}`);
      if (!res.ok) return null;
      return res.json() as Promise<EntityDossier>;
    },
    staleTime: 60 * 1000,
    enabled: !!slug,
  });
}
