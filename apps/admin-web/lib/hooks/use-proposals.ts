'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/use-auth';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export type ProposalStatus =
  | 'draft'
  | 'open'
  | 'trending'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'archived';

export type ProposalCategory =
  | 'infrastructure'
  | 'health'
  | 'education'
  | 'environment'
  | 'transport'
  | 'technology'
  | 'water_sanitation'
  | 'agriculture'
  | 'tourism'
  | 'governance'
  | 'social'
  | 'energy'
  | 'other';

export interface Proposal {
  id: string;
  author_id: string;
  author_name?: string;
  title: string;
  title_ne?: string;
  description: string;
  description_ne?: string;
  category: ProposalCategory;
  status: ProposalStatus;
  province: string;
  district?: string;
  municipality?: string;
  related_promise_ids?: string[];
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
  is_flagged: boolean;
  is_hidden: boolean;
  image_urls?: string[];
  estimated_cost_npr?: number;
  impact_score?: number;
  trending_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ProposalVote {
  id: string;
  proposal_id: string;
  user_id?: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface ProposalComment {
  id: string;
  proposal_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  is_approved: boolean;
  is_flagged: boolean;
  display_name?: string;
  created_at: string;
  replies?: ProposalComment[];
}

export interface ProposalUpdate {
  id: string;
  proposal_id: string;
  author_id: string;
  content: string;
  update_type: 'general' | 'status_change' | 'official_response' | 'milestone';
  old_status?: ProposalStatus;
  new_status?: ProposalStatus;
  created_at: string;
}

export interface ProposalFilters {
  status?: ProposalStatus | 'all';
  category?: ProposalCategory | 'all';
  province?: string;
  sort?: 'trending' | 'newest' | 'top_voted';
  search?: string;
}

interface ProposalsPage {
  proposals: Proposal[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface VoteState {
  userVote: 'up' | 'down' | null;
  upvotes: number;
  downvotes: number;
}

interface CommentsResponse {
  comments: ProposalComment[];
  pending: ProposalComment[];
}

/* ═══════════════════════════════════════════
   HOOK: useProposals — paginated list
   ═══════════════════════════════════════════ */
export function useProposals(filters: ProposalFilters = {}) {
  return useInfiniteQuery<ProposalsPage>({
    queryKey: ['proposals', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.province) params.set('province', filters.province);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.search) params.set('search', filters.search);
      params.set('page', String(pageParam ?? 1));
      params.set('pageSize', '20');

      const res = await fetch(`/api/proposals?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load proposals');
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 2 * 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useProposal — single detail
   ═══════════════════════════════════════════ */
export function useProposal(id: string) {
  return useQuery<Proposal>({
    queryKey: ['proposal', id],
    queryFn: async () => {
      const res = await fetch(`/api/proposals/${id}`);
      if (!res.ok) throw new Error('Failed to load proposal');
      return res.json();
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useMyProposals — user's own
   ═══════════════════════════════════════════ */
export function useMyProposals() {
  const { isAuthenticated } = useAuth();
  return useQuery<Proposal[]>({
    queryKey: ['proposals', 'mine'],
    queryFn: async () => {
      const res = await fetch('/api/proposals?mine=true');
      if (!res.ok) throw new Error('Failed to load proposals');
      const data = await res.json();
      return data.proposals ?? data;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useTrendingProposals — hot feed
   ═══════════════════════════════════════════ */
export function useTrendingProposals(limit = 5) {
  return useQuery<Proposal[]>({
    queryKey: ['proposals', 'trending', limit],
    queryFn: async () => {
      const res = await fetch(`/api/proposals?sort=trending&pageSize=${limit}`);
      if (!res.ok) throw new Error('Failed to load trending proposals');
      const data = await res.json();
      return data.proposals ?? data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useProposalVote — vote state + mutations
   ═══════════════════════════════════════════ */
export function useProposalVote(proposalId: string) {
  const queryClient = useQueryClient();

  const { data: voteState } = useQuery<VoteState>({
    queryKey: ['proposal-vote', proposalId],
    queryFn: async () => {
      const res = await fetch(`/api/proposals/${proposalId}/votes`);
      if (!res.ok) throw new Error('Failed to load vote state');
      return res.json();
    },
    enabled: !!proposalId,
  });

  const castVoteMutation = useMutation({
    mutationFn: async (voteType: 'up' | 'down') => {
      const res = await fetch(`/api/proposals/${proposalId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      });
      if (!res.ok) throw new Error('Failed to cast vote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-vote', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  const removeVoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proposals/${proposalId}/votes`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove vote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-vote', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
    },
  });

  return {
    userVote: voteState?.userVote ?? null,
    upvotes: voteState?.upvotes ?? 0,
    downvotes: voteState?.downvotes ?? 0,
    castVote: castVoteMutation.mutate,
    removeVote: removeVoteMutation.mutate,
    isVoting: castVoteMutation.isPending || removeVoteMutation.isPending,
  };
}

/* ═══════════════════════════════════════════
   HOOK: useProposalComments — comments + submit
   ═══════════════════════════════════════════ */
export function useProposalComments(proposalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<CommentsResponse>({
    queryKey: ['proposal-comments', proposalId],
    queryFn: async () => {
      const res = await fetch(`/api/proposals/${proposalId}/comments`);
      if (!res.ok) throw new Error('Failed to load comments');
      return res.json();
    },
    enabled: !!proposalId,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const res = await fetch(`/api/proposals/${proposalId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parent_id: parentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit comment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-comments', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
    },
  });

  return {
    comments: query.data?.comments ?? [],
    pending: query.data?.pending ?? [],
    isLoading: query.isLoading,
    submitComment: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error?.message ?? null,
  };
}

/* ═══════════════════════════════════════════
   HOOK: useProposalUpdates — status timeline
   ═══════════════════════════════════════════ */
export function useProposalUpdates(proposalId: string) {
  return useQuery<ProposalUpdate[]>({
    queryKey: ['proposal-updates', proposalId],
    queryFn: async () => {
      const res = await fetch(`/api/proposals/${proposalId}/updates`);
      if (!res.ok) throw new Error('Failed to load updates');
      return res.json();
    },
    enabled: !!proposalId,
  });
}

/* ═══════════════════════════════════════════
   HOOK: useCreateProposal — create mutation
   ═══════════════════════════════════════════ */
export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      title_ne?: string;
      description: string;
      description_ne?: string;
      category: ProposalCategory;
      province: string;
      district?: string;
      municipality?: string;
      related_promise_ids?: string[];
      estimated_cost_npr?: number;
    }) => {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create proposal');
      }
      return res.json() as Promise<Proposal>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

/* ═══════════════════════════════════════════
   HOOK: useDeleteProposal
   ═══════════════════════════════════════════ */
export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      const res = await fetch(`/api/proposals/${proposalId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete proposal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}
