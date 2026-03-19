'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Download,
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
  const totalIssues =
    (data?.whatsNotWorking.downSources.length ?? 0) +
    (data?.whatsNotWorking.silentPromises.length ?? 0);

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
          eyebrow={isNe ? 'साप्ताहिक जवाफदेहिता' : 'Weekly accountability'}
          title={t('accountability.pageTitle')}
          description={t('accountability.pageSubtitle')}
          aside={
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                  {isNe ? 'यो हप्ता' : 'This week'}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-center">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                      {t('accountability.whatsWorking')}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {data?.whatsWorking.length ?? '--'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-center">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                      {t('accountability.issues')}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {data ? totalIssues : '--'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-center">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                      {t('accountability.votes')}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {data ? data.voteAggregates.length : '--'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }
          stats={data ? <TransparencyScoreSection score={data.transparencyScore} /> : null}
        />

        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl">
              <details className="glass-card overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-medium text-gray-300 transition-colors hover:text-white">
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {t('accountability.weeklyImage')}
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    {isNe ? 'साझा गर्न तयार' : 'Ready to share'}
                  </span>
                </summary>
                <div className="space-y-4 p-4 pt-0">
                  <img
                    src={`/api/report-card?v=${cacheBust}`}
                    alt={t('accountability.pageTitle')}
                    className="mx-auto w-full max-w-md rounded-xl shadow-lg shadow-black/30"
                  />
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {supportsNativeShare && (
                      <button
                        onClick={handleNativeShare}
                        className="rounded-xl border border-primary-500/30 bg-primary-500/20 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-primary-500/30"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Share2 className="h-3.5 w-3.5" />
                          {t('accountability.share')}
                        </span>
                      </button>
                    )}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/20 px-4 py-2 text-center text-xs font-medium text-white transition-all hover:bg-[#25D366]/30"
                    >
                      WhatsApp
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                        copied
                          ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                          : 'border border-white/[0.08] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? t('accountability.copied') : t('accountability.copyLink')}
                      </span>
                    </button>
                    <a
                      href="/api/report-card"
                      download="nepal-najar-report-card.png"
                      className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-center text-xs font-medium text-gray-300 transition-all hover:bg-white/[0.08]"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Download className="h-3 w-3" />
                        {t('accountability.download')}
                      </span>
                    </a>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </section>

        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl">
              <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1.5">
              {TABS.map(({ id, icon: Icon, labelKey }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-center text-xs font-medium transition-all duration-200 sm:flex-row sm:gap-1.5 sm:text-sm ${
                    activeTab === id
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(labelKey)}</span>
                </button>
              ))}
            </div>
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
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
