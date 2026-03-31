'use client';

import { useState, useCallback } from 'react';
import { Camera, X, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { trackPilotEvent } from '@/lib/analytics/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';

interface ShareProofButtonProps {
  promiseId: string;
}

export function ShareProofButton({ promiseId }: ShareProofButtonProps) {
  const { isAuthenticated } = useAuth();
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const [isOpen, setIsOpen] = useState(false);
  const [mediaUrls, setMediaUrls] = useState('');
  const [caption, setCaption] = useState('');
  const [classification, setClassification] = useState<'confirms' | 'contradicts' | 'neutral'>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const urls = mediaUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promise_id: promiseId,
          media_urls: urls,
          caption: caption.trim() || null,
          classification,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      trackPilotEvent('evidence_submit', {
        metadata: {
          promiseId,
          classification,
          mediaUrlCount: urls.length,
          hasCaption: Boolean(caption.trim()),
        },
      });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setMediaUrls('');
        setCaption('');
        setClassification('neutral');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [promiseId, mediaUrls, caption, classification]);

  // Not signed in
  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all"
      >
        <Camera className="w-3.5 h-3.5" />
        {t('evidence.signInToShareProof')}
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all"
      >
        <Camera className="w-3.5 h-3.5" />
        {t('evidence.shareProof')}
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md glass-card p-6 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => !isSubmitting && setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">
                  {t('evidence.proofSubmitted')}
                </h3>
                <p className="text-sm text-gray-400">
                  {t('evidence.proofSubmittedDesc')}
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-1">
                  <Camera className="w-5 h-5 inline mr-2 text-cyan-400" />
                  {t('evidence.shareProof')}
                </h3>
                <p className="text-xs text-gray-500 mb-5">
                  {t('evidence.addPhotoOrDesc')}
                </p>

                {/* Media URLs */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    {t('evidence.photoVideoUrls')} <span className="text-gray-600">(optional)</span>
                  </label>
                  <textarea
                    value={mediaUrls}
                    onChange={(e) => setMediaUrls(e.target.value)}
                    placeholder={t('evidence.oneUrlPerLine')}
                    rows={2}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 resize-none transition-all"
                  />
                </div>

                {/* Caption */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    {t('evidence.captionLabel')} <span className="text-gray-600">(max 500)</span>
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={t('evidence.whatDidYouSee')}
                    maxLength={500}
                    rows={2}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 resize-none transition-all"
                  />
                </div>

                {/* Classification */}
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    {t('evidence.thisEvidence')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'confirms' as const, label: t('evidence.confirmsLabel'), emoji: '\u2705', color: 'emerald' },
                      { value: 'contradicts' as const, label: t('evidence.contradictsLabel'), emoji: '\u274C', color: 'red' },
                      { value: 'neutral' as const, label: t('evidence.documentingLabel'), emoji: '\uD83D\uDCCB', color: 'gray' },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setClassification(opt.value)}
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-xs font-medium border transition-all duration-200 ${
                          classification === opt.value
                            ? opt.color === 'emerald'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : opt.color === 'red'
                              ? 'bg-red-500/15 border-red-500/40 text-red-300'
                              : 'bg-gray-500/15 border-gray-500/40 text-gray-300'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-500 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 mb-3">{error}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {isSubmitting
                    ? t('evidence.submitting')
                    : t('evidence.submitProof')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
