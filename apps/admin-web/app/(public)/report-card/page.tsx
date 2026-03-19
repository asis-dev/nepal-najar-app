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
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAccountability } from '@/lib/hooks/use-accountability';
import { PublicPageHero } from '@/components/public/page-hero';
import { TransparencyScoreSection } from '@/components/public/report-card/transparency-score';
import { WhatsWorkingSection } from '@/components/public/report-card/whats-working';
import { WhatsNotWorkingSection } from '@/components/public/report-card/whats-not-working';
import { PublicVoiceSection } from '@/components/public/report-card/public-voice';

/* ═══════════════════════════════════════════════
   GOVERNMENT ACCOUNTABILITY REPORT CARD
   ═══════════════════════════════════════════════ */

type Tab = 'working' | 'not-working' | 'voice';

const TABS: { id: Tab; icon: typeof CheckCircle2; labelKey: string }[] = [
  { id: 'working', icon: CheckCircle2, labelKey: 'accountability.whatsWorking' },
  { id: 'not-working', icon: AlertTriangle, labelKey: 'accountability.whatsNotWorking' },
  { id: 'voice', icon: MessageCircle, labelKey: 'accountability.publicVoice' },
];

export default function ReportCardPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const [activeTab, setActiveTab] = useState<Tab>('working');
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useAccountability();

  // Cache-bust key for OG image
  const cacheBust = typeof window !== 'undefined' ? Math.floor(Date.now() / 600_000) : 0;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://nepalnajar.com/report-card';

  const shareTitle = `Nepal Najar - ${t('accountability.pageTitle')}`;
  const shareText = isNe
    ? `Nepal Najar ${t('accountability.pageTitle')} हेर्नुहोस्! ${pageUrl}`
    : `Check out Nepal Najar's ${t('accountability.pageTitle')}! ${pageUrl}`;

  function handleCopyLink() {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: pageUrl });
      } catch {
        /* cancelled */
      }
    }
  }

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="public-page">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Back link */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Link>
          </div>
        </div>

        <PublicPageHero
          title={t('accountability.pageTitle')}
          description={t('accountability.pageSubtitle')}
          centered
          stats={data ? <TransparencyScoreSection score={data.transparencyScore} /> : null}
        />

        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl">
              <details className="glass-card overflow-hidden">
              <summary className="flex items-center gap-2 p-4 cursor-pointer text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">
                <Download className="w-4 h-4" />
                {t('accountability.weeklyImage')}
              </summary>
              <div className="p-4 pt-0">
                <img
                  src={`/api/report-card?v=${cacheBust}`}
                  alt={t('accountability.pageTitle')}
                  className="w-full max-w-md mx-auto rounded-xl shadow-lg shadow-black/30"
                />
                {/* Share buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {supportsNativeShare && (
                    <button
                      onClick={handleNativeShare}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-primary-500/20 border border-primary-500/30 hover:bg-primary-500/30 transition-all flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {t('accountability.share')}
                    </button>
                  )}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-[#25D366]/20 border border-[#25D366]/30 hover:bg-[#25D366]/30 transition-all flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-[#1877F2]/20 border border-[#1877F2]/30 hover:bg-[#1877F2]/30 transition-all flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Facebook
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      copied
                        ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                        : 'text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? t('accountability.copied') : t('accountability.copyLink')}
                  </button>
                  <a
                    href="/api/report-card"
                    download="nepal-najar-report-card.png"
                    className="px-4 py-2 rounded-xl text-xs font-medium text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    {t('accountability.download')}
                  </a>
                </div>
              </div>
              </details>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-6">
              {TABS.map(({ id, icon: Icon, labelKey }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t(labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Content */}
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="glass-card p-12 text-center">
                <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {t('accountability.loading')}
                </p>
              </div>
            ) : data ? (
              <>
                {activeTab === 'working' && (
                  <WhatsWorkingSection promises={data.whatsWorking} />
                )}
                {activeTab === 'not-working' && (
                  <WhatsNotWorkingSection
                    downSources={data.whatsNotWorking.downSources}
                    silentPromises={data.whatsNotWorking.silentPromises}
                  />
                )}
                {activeTab === 'voice' && (
                  <PublicVoiceSection voteAggregates={data.voteAggregates} />
                )}
              </>
            ) : null}
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
