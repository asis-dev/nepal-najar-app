'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/* ===================================================
   REPORT CARD VIEWER + SHARE PAGE
   =================================================== */

export default function ReportCardPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const [copied, setCopied] = useState(false);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://nepalnajar.com/report-card';
  const imageUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/report-card` : '/api/report-card';

  const shareTitle = isNe
    ? 'Nepal Najar - साप्ताहिक रिपोर्ट कार्ड'
    : 'Nepal Najar - Weekly Report Card';

  const shareText = isNe
    ? `Nepal Najar साप्ताहिक रिपोर्ट कार्ड हेर्नुहोस्! नेपालको विकास प्रगति ट्र्याक गर्नुहोस्। ${pageUrl}`
    : `Check out Nepal Najar Weekly Report Card! Track Nepal's development progress. ${pageUrl}`;

  /* ---- Share Handler ---- */
  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: pageUrl,
        });
      } catch {
        // User cancelled or share failed — silently ignore
      }
    }
  }

  function handleCopyLink() {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="min-h-screen bg-np-base">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Back link */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-xl mx-auto">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Link>
          </div>
        </div>

        {/* Main content */}
        <section className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-xl mx-auto">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {t('reportCard.title')}
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                {t('reportCard.weeklyReport')}
              </p>
            </div>

            {/* Report Card Image */}
            <div className="glass-card p-3 sm:p-4 mb-8">
              <img
                src="/api/report-card"
                alt="Report Card"
                className="w-full rounded-xl shadow-lg shadow-black/30"
              />
            </div>

            {/* Share Section */}
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Share2 className="w-5 h-5 text-primary-400" />
                <h2 className="text-lg font-semibold text-white">
                  {isNe ? 'साझा गर्नुहोस्' : 'Share'}
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
                {/* Native Share (if supported) */}
                {supportsNativeShare && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all duration-200 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    {isNe ? 'साझा गर्नुहोस्' : 'Share'}
                  </button>
                )}

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#25D366]/20 border border-[#25D366]/30 hover:bg-[#25D366]/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  WhatsApp
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#1877F2]/20 border border-[#1877F2]/30 hover:bg-[#1877F2]/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Facebook
                </a>

                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  X / Twitter
                </a>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    copied
                      ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                      : 'text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {isNe ? 'कपी भयो!' : 'Copied!'}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {isNe ? 'लिंक कपी' : 'Copy Link'}
                    </>
                  )}
                </button>

                {/* Download */}
                <a
                  href="/api/report-card"
                  download="nepal-najar-report-card.png"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isNe ? 'डाउनलोड' : 'Download'}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
