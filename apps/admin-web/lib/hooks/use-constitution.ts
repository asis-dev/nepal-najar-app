'use client';

import { useQuery } from '@tanstack/react-query';

export interface ConstitutionArticleSummary {
  id: number;
  part_number: number;
  part_title: string;
  part_title_ne: string;
  article_number: number;
  article_title: string;
  article_title_ne: string;
  tags: string[];
  linked_promise_ids: number[];
  is_amended: boolean;
  amendment_status: string;
  version: number;
}

export interface ConstitutionArticleFull extends ConstitutionArticleSummary {
  body_en: string;
  body_ne: string | null;
  amendment_date: string | null;
  amendment_note: string | null;
  schedule_number: number | null;
}

/** Fetch all constitution articles (summary only — no body text) */
export function useConstitutionArticles(filters?: {
  part?: number;
  search?: string;
  tag?: string;
  promiseId?: number;
  amendedOnly?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.part) params.set('part', String(filters.part));
  if (filters?.search) params.set('search', filters.search);
  if (filters?.tag) params.set('tag', filters.tag);
  if (filters?.promiseId) params.set('promise_id', String(filters.promiseId));
  if (filters?.amendedOnly) params.set('amended', 'true');

  const qs = params.toString();
  const url = `/api/constitution${qs ? `?${qs}` : ''}`;

  return useQuery<ConstitutionArticleSummary[]>({
    queryKey: ['constitution', qs],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

/** Fetch a single article with full text */
export function useConstitutionArticle(articleNumber: number | null) {
  return useQuery<ConstitutionArticleFull | null>({
    queryKey: ['constitution-article', articleNumber],
    queryFn: async () => {
      if (!articleNumber) return null;
      const res = await fetch(`/api/constitution?article=${articleNumber}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!articleNumber,
    staleTime: 30 * 60 * 1000, // 30 min (constitution doesn't change often)
  });
}

/** Fetch articles linked to a specific commitment */
export function useLinkedArticles(promiseId: number | null) {
  return useQuery<ConstitutionArticleSummary[]>({
    queryKey: ['constitution-linked', promiseId],
    queryFn: async () => {
      if (!promiseId) return [];
      const res = await fetch(`/api/constitution?promise_id=${promiseId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!promiseId,
    staleTime: 10 * 60 * 1000,
  });
}
