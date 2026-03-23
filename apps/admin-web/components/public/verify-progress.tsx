'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { trackPilotEvent } from '@/lib/analytics/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';

interface VerifyStats {
  accurate: number;
  disputed: number;
  partially_true: number;
  total: number;
  user_verification: string | null;
}

export function VerifyProgress({ promiseId }: { promiseId: string }) {
  const { isAuthenticated } = useAuth();
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const [justVoted, setJustVoted] = useState<string | null>(null);

  const { data, isLoading } = useQuery<VerifyStats>({
    queryKey: ['verify', promiseId],
    queryFn: async () => {
      const res = await fetch(`/api/verify?promise_id=${promiseId}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const handleVerify = useCallback(async (verification: string) => {
    if (!isAuthenticated) return;

    // If disputed, show reason input first
    if (verification === 'disputed' && !showReason) {
      setShowReason(true);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promise_id: promiseId,
          verification,
          reason: verification === 'disputed' ? reason.trim() || null : null,
        }),
      });

      if (res.ok) {
        trackPilotEvent('verify_progress', {
          metadata: {
            promiseId,
            verification,
            hasReason: verification === 'disputed' ? Boolean(reason.trim()) : false,
          },
        });
        setJustVoted(verification);
        setShowReason(false);
        setReason('');
        queryClient.invalidateQueries({ queryKey: ['verify', promiseId] });
        setTimeout(() => setJustVoted(null), 1500);
      }
    } catch {
      // silent fail
    } finally {
      setSubmitting(false);
    }
  }, [isAuthenticated, promiseId, showReason, reason, queryClient]);

  const stats = data ?? { accurate: 0, disputed: 0, partially_true: 0, total: 0, user_verification: null };
  const total = stats.total || 1; // prevent div by zero
  const accuratePct = Math.round((stats.accurate / total) * 100);
  const disputedPct = Math.round((stats.disputed / total) * 100);
  const partialPct = 100 - accuratePct - disputedPct;

  const userVote = justVoted ?? stats.user_verification;

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        {isNe ? 'प्रगति प्रमाणीकरण' : 'Verify Progress'}
        {stats.total > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-semibold">
            {stats.total} {isNe ? 'मतहरू' : 'votes'}
          </span>
        )}
      </h3>

      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">
            {isNe ? 'नागरिकहरू भन्छन्:' : 'Citizens say:'}{' '}
            <span className="text-emerald-400 font-medium">{accuratePct}% {isNe ? 'सही' : 'Accurate'}</span>
            {' \u00B7 '}
            <span className="text-red-400 font-medium">{disputedPct}% {isNe ? 'विवादित' : 'Disputed'}</span>
            {' \u00B7 '}
            <span className="text-amber-400 font-medium">{partialPct}% {isNe ? 'आंशिक' : 'Mixed'}</span>
          </p>
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden flex">
            {accuratePct > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${accuratePct}%` }}
              />
            )}
            {disputedPct > 0 && (
              <div
                className="h-full bg-red-500 transition-all duration-700"
                style={{ width: `${disputedPct}%` }}
              />
            )}
            {partialPct > 0 && (
              <div
                className="h-full bg-amber-500 transition-all duration-700"
                style={{ width: `${partialPct}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Vote buttons */}
      {isAuthenticated ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'accurate', label: isNe ? 'सही' : 'Accurate', emoji: '\u2705', activeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]' },
              { value: 'disputed', label: isNe ? 'विवादित' : 'Disputed', emoji: '\u274C', activeColor: 'bg-red-500/20 border-red-500/40 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.15)]' },
              { value: 'partially_true', label: isNe ? 'आंशिक सही' : 'Partially True', emoji: '\u26A0\uFE0F', activeColor: 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleVerify(opt.value)}
                disabled={submitting}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium border transition-all duration-200 ${
                  userVote === opt.value
                    ? opt.activeColor
                    : 'bg-white/[0.03] border-white/[0.08] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
                } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting && showReason && opt.value === 'disputed' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-lg">{opt.emoji}</span>
                )}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Reason input for disputes */}
          {showReason && (
            <div className="space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isNe ? 'किन विवादित? (वैकल्पिक)' : 'Why disputed? (optional)'}
                rows={2}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 resize-none transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleVerify('disputed')}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl text-xs font-medium bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 disabled:opacity-50 transition-all"
                >
                  {submitting ? (isNe ? 'पेश गर्दै...' : 'Submitting...') : (isNe ? 'विवाद पेश गर्नुहोस्' : 'Submit Dispute')}
                </button>
                <button
                  onClick={() => { setShowReason(false); setReason(''); }}
                  className="px-4 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {isNe ? 'रद्द' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {userVote && !justVoted && (
            <p className="text-[10px] text-gray-600 text-center">
              {isNe ? 'तपाईंले पहिले नै मत दिनुभएको छ। फेरि क्लिक गरेर अपडेट गर्नुहोस्।' : 'You already voted. Click again to update.'}
            </p>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-sm text-gray-400">
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              {isNe ? 'लगइन गर्नुहोस्' : 'Sign in'}
            </Link>{' '}
            {isNe ? 'प्रगति प्रमाणित गर्न' : 'to verify progress'}
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-2">
          <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
