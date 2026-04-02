'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, MessageSquareText, Copy, Check, Share } from 'lucide-react';
import { trackPilotEvent } from '@/lib/analytics/client';
import { useI18n } from '@/lib/i18n';
import { normalizeShareUrl, shareIntentUrl, shareOrCopy } from '@/lib/utils/share';

interface ShareComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  url: string;
}

export function ShareComposerModal({
  isOpen,
  onClose,
  title,
  text,
  url,
}: ShareComposerModalProps) {
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const [comment, setComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  const normalizedUrl = useMemo(() => normalizeShareUrl(url), [url]);

  useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    setComment('');
    setHasNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [isOpen]);

  if (!isOpen) return null;

  const emitShareEvent = (platform: string) => {
    trackPilotEvent('share_clicked', {
      metadata: {
        platform,
        hasComment: comment.trim().length > 0,
        url: normalizedUrl,
      },
    });
  };

  const openPlatform = (platform: 'x' | 'facebook' | 'whatsapp') => {
    const intent = shareIntentUrl(platform, { title, text, comment, url: normalizedUrl });
    window.open(intent, '_blank', 'noopener,noreferrer');
    emitShareEvent(platform);
  };

  const handleCopy = async () => {
    const result = await shareOrCopy({ title, text, comment, url: normalizedUrl });
    if (result === 'copied') {
      setCopied(true);
      emitShareEvent('copy');
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleNative = async () => {
    const result = await shareOrCopy({ title, text, comment, url: normalizedUrl });
    if (result === 'shared') {
      emitShareEvent('native');
      onClose();
    }
  };

  const actionBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm transition-colors hover:bg-white/[0.08]';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label={isNe ? 'सेयर बन्द गर्नुहोस्' : 'Close sharing dialog'}
      />

      <div className="relative z-[81] w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] hover:text-gray-300"
          aria-label={isNe ? 'बन्द गर्नुहोस्' : 'Close'}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 pr-7">
          <h3 className="text-base font-semibold text-white">
            {isNe ? 'सेयर गर्नुअघि आफ्नो कुरा थप्नुहोस्' : 'Add your take before sharing'}
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            {isNe
              ? 'यो पोस्ट X, Facebook वा WhatsApp मा सजिलै शेयर गर्नुहोस्।'
              : 'Share to X, Facebook, or WhatsApp with your own context.'}
          </p>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          {isNe ? 'तपाईंको टिप्पणी (ऐच्छिक)' : 'Your comment (optional)'}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            isNe
              ? 'यो किन महत्त्वपूर्ण छ भनेर छोटो टिप्पणी लेख्नुहोस्...'
              : 'Add a short thought to improve engagement...'
          }
          maxLength={220}
          rows={3}
          className="w-full resize-none rounded-xl border border-white/[0.12] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
        />
        <p className="mt-1 text-right text-[10px] text-gray-600">
          {comment.length}/220
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => openPlatform('whatsapp')}
            className={`${actionBtn} text-green-300`}
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => openPlatform('facebook')}
            className={`${actionBtn} text-blue-300`}
          >
            Facebook
          </button>
          <button
            type="button"
            onClick={() => openPlatform('x')}
            className={`${actionBtn} text-gray-200`}
          >
            X
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={`${actionBtn} text-gray-300`}
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? (isNe ? 'कपी भयो' : 'Copied') : (isNe ? 'लिङ्क कपी' : 'Copy')}
          </button>
        </div>

        {hasNativeShare && (
          <button
            type="button"
            onClick={handleNative}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
          >
            <Share className="h-4 w-4" />
            {isNe ? 'फोन शेयर मेनु खोल्नुहोस्' : 'Open device share sheet'}
          </button>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
          <MessageSquareText className="h-3.5 w-3.5" />
          {isNe
            ? 'तपाईंको टिप्पणीले पोस्टको पहुँच र संलग्नता बढाउँछ।'
            : 'Adding a short comment usually improves post reach and engagement.'}
        </p>
      </div>
    </div>
  );
}
