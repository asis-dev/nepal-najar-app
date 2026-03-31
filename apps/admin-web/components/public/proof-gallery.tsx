'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ThumbsUp, ThumbsDown, Camera, CheckCircle2, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';

interface EvidenceItem {
  id: string;
  user_id: string;
  promise_id: string;
  evidence_type: string;
  media_urls: string[];
  caption: string | null;
  caption_ne: string | null;
  classification: 'confirms' | 'contradicts' | 'neutral';
  upvote_count: number;
  downvote_count: number;
  created_at: string;
  display_name: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const classificationConfig = {
  confirms: { emoji: '\u2705', label: 'Confirms', labelNe: 'पुष्टि', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  contradicts: { emoji: '\u274C', label: 'Contradicts', labelNe: 'खण्डन', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  neutral: { emoji: '\uD83D\uDCCB', label: 'Documenting', labelNe: 'दस्तावेज', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
};

export function ProofGallery({ promiseId }: { promiseId: string }) {
  const { isAuthenticated } = useAuth();
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';
  const queryClient = useQueryClient();
  const [votingId, setVotingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ evidence: EvidenceItem[] }>({
    queryKey: ['evidence', promiseId],
    queryFn: async () => {
      const res = await fetch(`/api/evidence?promise_id=${promiseId}`);
      if (!res.ok) throw new Error('Failed to load evidence');
      return res.json();
    },
  });

  const handleVote = useCallback(async (evidenceId: string, voteType: 'up' | 'down') => {
    if (!isAuthenticated) return;
    setVotingId(evidenceId);

    try {
      await fetch(`/api/evidence/${evidenceId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      });
      queryClient.invalidateQueries({ queryKey: ['evidence', promiseId] });
    } catch {
      // silent fail
    } finally {
      setVotingId(null);
    }
  }, [isAuthenticated, promiseId, queryClient]);

  const evidence = data?.evidence ?? [];

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          {t('evidence.citizenProof')}
        </h3>
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <Camera className="w-4 h-4 text-cyan-400" />
        {t('evidence.citizenProof')}
        {evidence.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-semibold">
            {evidence.length}
          </span>
        )}
      </h3>

      {evidence.length > 0 ? (
        <div className="space-y-3">
          {evidence.map((item) => {
            const config = classificationConfig[item.classification];
            const isVerified = item.upvote_count >= 10;

            return (
              <div
                key={item.id}
                className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:bg-white/[0.04] transition-colors"
              >
                {/* Header: user + classification */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <User className="w-3 h-3 text-cyan-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-300">{item.display_name}</span>
                    <span className="text-[10px] text-gray-600">{relativeTime(item.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {t('evidence.communityVerified')}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.bg} ${config.color}`}>
                      {config.emoji} {isNe ? config.labelNe : config.label}
                    </span>
                  </div>
                </div>

                {/* Caption */}
                {item.caption && (
                  <p className="text-sm text-gray-300 leading-relaxed mb-3">{item.caption}</p>
                )}

                {/* Media thumbnails */}
                {item.media_urls.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {item.media_urls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-20 h-20 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[10px] text-gray-500 hover:border-cyan-500/30 transition-colors overflow-hidden"
                      >
                        <Camera className="w-6 h-6 text-gray-600" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Vote buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(item.id, 'up')}
                    disabled={!isAuthenticated || votingId === item.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all disabled:opacity-40"
                  >
                    {votingId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-3 h-3" />
                    )}
                    <span className="tabular-nums">{item.upvote_count}</span>
                  </button>
                  <button
                    onClick={() => handleVote(item.id, 'down')}
                    disabled={!isAuthenticated || votingId === item.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-40"
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span className="tabular-nums">{item.downvote_count}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <Camera className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {t('evidence.noCitizenProofYet')}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {t('evidence.beFirstShareProof')}
          </p>
        </div>
      )}
    </div>
  );
}
