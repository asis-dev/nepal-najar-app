'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Plus,
  Loader2,
  Clock,
  FileCheck,
  Image as ImageIcon,
  ExternalLink,
  Inbox,
  Send,
  ChevronDown,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CommunityEvidence, EvidenceClassification } from '@/lib/hooks/use-evidence-review';

/* ═══════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════ */

interface CommunityEvidenceFeedProps {
  promiseId: string;
}

const CLASSIFICATION_CONFIG: Record<
  EvidenceClassification,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string; labelNe: string }
> = {
  confirms: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    label: 'Confirms',
    labelNe: 'पुष्टि गर्छ',
  },
  contradicts: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/15 border-red-500/30',
    label: 'Contradicts',
    labelNe: 'खण्डन गर्छ',
  },
  neutral: {
    icon: MinusCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-500/15 border-gray-500/30',
    label: 'Neutral',
    labelNe: 'तटस्थ',
  },
};

/* ═══════════════════════════════════════════
   HOOK: fetch approved evidence for a promise
   ═══════════════════════════════════════════ */
function useCommunityEvidence(promiseId: string) {
  return useQuery<{ evidence: CommunityEvidence[]; total: number }>({
    queryKey: ['community-evidence', promiseId],
    queryFn: async () => {
      const res = await fetch(`/api/evidence?promise_id=${promiseId}&status=approved`);
      if (!res.ok) throw new Error('Failed to load evidence');
      return res.json();
    },
    enabled: !!promiseId,
    staleTime: 2 * 60 * 1000,
  });
}

function useVoteEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      evidenceId,
      voteType,
    }: {
      evidenceId: string;
      voteType: 'up' | 'down';
    }) => {
      const res = await fetch(`/api/evidence/${evidenceId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      });
      if (!res.ok) throw new Error('Failed to vote');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-evidence'] });
    },
  });
}

function useSubmitEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      promise_id: string;
      caption: string;
      classification: EvidenceClassification;
      media_urls: string[];
      proof_url?: string;
    }) => {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit evidence');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-evidence'] });
    },
  });
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export function CommunityEvidenceFeed({ promiseId }: CommunityEvidenceFeedProps) {
  const { locale } = useI18n();
  const { isAuthenticated } = useAuth();
  const isNe = locale === 'ne';

  const { data, isLoading } = useCommunityEvidence(promiseId);
  const voteMutation = useVoteEvidence();
  const submitMutation = useSubmitEvidence();

  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [classification, setClassification] = useState<EvidenceClassification>('confirms');
  const [mediaUrl, setMediaUrl] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const evidenceList = data?.evidence ?? [];

  const handleSubmit = async () => {
    if (!caption.trim()) return;
    try {
      await submitMutation.mutateAsync({
        promise_id: promiseId,
        caption: caption.trim(),
        classification,
        media_urls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
        proof_url: proofUrl.trim() || undefined,
      });
      setShowSubmitForm(false);
      setCaption('');
      setMediaUrl('');
      setProofUrl('');
    } catch {
      // Error handled by mutation state
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(isNe ? 'ne-NP' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + Submit button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-primary-400" />
          {isNe ? 'समुदाय प्रमाण' : 'Community Evidence'}
          {data && (
            <span className="text-xs text-gray-500 font-normal">
              ({data.total})
            </span>
          )}
        </h3>

        {isAuthenticated && (
          <button
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-primary-300 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {isNe ? 'प्रमाण पेश गर्नुहोस्' : 'Submit Evidence'}
          </button>
        )}
      </div>

      {/* Submit form (inline) */}
      {showSubmitForm && (
        <div className="glass-card p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {isNe ? 'विवरण' : 'Caption'} *
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={isNe ? 'तपाईंको प्रमाणको विवरण...' : 'Describe your evidence...'}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {isNe ? 'वर्गीकरण' : 'Classification'}
            </label>
            <div className="relative">
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as EvidenceClassification)}
                className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/40"
              >
                <option value="confirms">{isNe ? 'पुष्टि गर्छ' : 'Confirms'}</option>
                <option value="contradicts">{isNe ? 'खण्डन गर्छ' : 'Contradicts'}</option>
                <option value="neutral">{isNe ? 'तटस्थ' : 'Neutral'}</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {isNe ? 'मिडिया URL' : 'Media URL'} ({isNe ? 'वैकल्पिक' : 'optional'})
            </label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {isNe ? 'प्रमाण लिंक' : 'Proof URL'} ({isNe ? 'वैकल्पिक' : 'optional'})
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 transition-all"
            />
          </div>

          {submitMutation.isError && (
            <p className="text-xs text-red-400">
              {submitMutation.error?.message || (isNe ? 'पेश गर्न असफल' : 'Failed to submit')}
            </p>
          )}

          {submitMutation.isSuccess && (
            <p className="text-xs text-emerald-400">
              {isNe ? 'प्रमाण पेश भयो! समीक्षापछि देखिनेछ।' : 'Evidence submitted! It will appear after review.'}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={!caption.trim() || submitMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {isNe ? 'पेश गर्नुहोस्' : 'Submit'}
            </button>
            <button
              onClick={() => setShowSubmitForm(false)}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Evidence timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
                <div className="h-3 w-32 bg-white/[0.06] rounded" />
              </div>
              <div className="h-10 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      ) : evidenceList.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-1">
            {isNe ? 'अहिलेसम्म कुनै समुदाय प्रमाण छैन।' : 'No community evidence yet.'}
          </p>
          <p className="text-xs text-gray-500">
            {isNe ? 'पहिलो बन्नुहोस्!' : 'Be the first!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {evidenceList.map((item) => {
            const cls = CLASSIFICATION_CONFIG[item.classification] || CLASSIFICATION_CONFIG.neutral;
            const ClsIcon = cls.icon;

            return (
              <div
                key={item.id}
                className="glass-card p-4 transition-all duration-200 hover:border-white/[0.12]"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ClsIcon className={`w-4 h-4 flex-shrink-0 ${cls.color}`} />
                    <span className="text-xs font-medium text-gray-300 truncate">
                      {item.submitter_name || (isNe ? 'अज्ञात' : 'Anonymous')}
                    </span>
                    {item.submitter_is_verifier && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[9px] font-semibold">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {isNe ? 'प्रमाणकर्ता' : 'Verifier'}
                      </span>
                    )}
                  </div>

                  {/* Classification badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls.bg} ${cls.color}`}>
                    {isNe ? cls.labelNe : cls.label}
                  </span>
                </div>

                {/* Caption */}
                <p className="text-sm text-gray-300 leading-relaxed mb-3">
                  {item.caption}
                </p>

                {/* Media links */}
                {item.media_urls && item.media_urls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.media_urls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-primary-400 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all"
                      >
                        <ImageIcon className="w-2.5 h-2.5" />
                        {isNe ? `मिडिया ${i + 1}` : `Media ${i + 1}`}
                        <ExternalLink className="w-2 h-2" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Footer: date + votes */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.created_at)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        voteMutation.mutate({ evidenceId: item.id, voteType: 'up' })
                      }
                      disabled={!isAuthenticated}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      {item.upvote_count}
                    </button>
                    <button
                      onClick={() =>
                        voteMutation.mutate({ evidenceId: item.id, voteType: 'down' })
                      }
                      disabled={!isAuthenticated}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      {item.downvote_count}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
