'use client';

/**
 * Client-side hooks for the Evidence Vault.
 * Reads from Supabase evidence_vault table (RLS allows public reads).
 */
import { useQuery } from '@tanstack/react-query';
import { hasPublicSupabaseConfig, supabasePublic } from '@/lib/supabase/client';

const supabaseConfigured = hasPublicSupabaseConfig;

export interface EvidenceVaultEntry {
  id: string;
  official_name: string;
  official_title: string | null;
  quote_text: string;
  quote_summary: string | null;
  quote_context: string | null;
  language: string;
  source_type: string;
  source_url: string;
  source_title: string | null;
  timestamp_seconds: number | null;
  timestamp_url: string | null;
  spoken_date: string | null;
  promise_ids: number[];
  statement_type: string | null;
  verification_status: string;
  sentiment: number | null;
  importance_score: number;
  tags: string[];
  created_at: string;
}

/**
 * Fetch evidence entries for a specific promise ID.
 */
export function useEvidenceVault(promiseId?: string | number) {
  return useQuery({
    queryKey: ['evidence-vault', promiseId],
    queryFn: async (): Promise<EvidenceVaultEntry[]> => {
      if (!supabaseConfigured || !supabasePublic || !promiseId) return [];

      const numericId = typeof promiseId === 'string' ? parseInt(promiseId, 10) : promiseId;
      if (isNaN(numericId)) return [];

      const { data, error } = await supabasePublic
        .from('evidence_vault')
        .select('*')
        .contains('promise_ids', [numericId])
        .order('importance_score', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('[useEvidenceVault] Query failed:', error.message);
        return [];
      }

      return (data ?? []) as EvidenceVaultEntry[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!promiseId,
  });
}

/**
 * Fetch evidence counts per promise (for the list page badges).
 * Returns a map of promiseId -> count.
 */
export function useEvidenceCounts() {
  return useQuery({
    queryKey: ['evidence-vault', 'counts'],
    queryFn: async (): Promise<Record<number, number>> => {
      if (!supabaseConfigured || !supabasePublic) return {};

      const { data, error } = await supabasePublic
        .from('evidence_vault')
        .select('promise_ids');

      if (error) {
        console.warn('[useEvidenceCounts] Query failed:', error.message);
        return {};
      }

      const counts: Record<number, number> = {};
      if (data) {
        for (const row of data) {
          const pids = (row.promise_ids as number[]) || [];
          for (const pid of pids) {
            counts[pid] = (counts[pid] || 0) + 1;
          }
        }
      }

      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });
}
