'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Loader2,
  LogIn,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { useReputation } from '@/lib/hooks/use-reputation';
import {
  useMyApplication,
  useSubmitApplication,
  type ExpertiseArea,
} from '@/lib/hooks/use-verifier-application';
import { NEPAL_PROVINCES } from '@/lib/stores/preferences';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const EXPERTISE_AREAS: { key: ExpertiseArea; en: string; ne: string }[] = [
  { key: 'infrastructure', en: 'Infrastructure', ne: 'पूर्वाधार' },
  { key: 'health', en: 'Health', ne: 'स्वास्थ्य' },
  { key: 'education', en: 'Education', ne: 'शिक्षा' },
  { key: 'environment', en: 'Environment', ne: 'वातावरण' },
  { key: 'governance', en: 'Governance', ne: 'शासन' },
  { key: 'economy', en: 'Economy', ne: 'अर्थतन्त्र' },
  { key: 'social', en: 'Social', ne: 'सामाजिक' },
  { key: 'other', en: 'Other', ne: 'अन्य' },
];

const REQUIRED_KARMA = 200;

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function ApplyVerifierPage() {
  const { t, locale } = useI18n();
  const { isAuthenticated } = useAuth();
  const isNe = locale === 'ne';
  const router = useRouter();

  const { karma, level, isLoading: reputationLoading } = useReputation();
  const { data: existingApplication, isLoading: appLoading } = useMyApplication();
  const submitMutation = useSubmitApplication();

  // Form state
  const [reason, setReason] = useState('');
  const [expertiseArea, setExpertiseArea] = useState<ExpertiseArea>('infrastructure');
  const [province, setProvince] = useState('');

  const isEligible = karma >= REQUIRED_KARMA;
  const isValid = reason.trim().length >= 10 && reason.trim().length <= 2000 && province;

  const handleSubmit = async () => {
    if (!isValid || !isEligible) return;
    try {
      await submitMutation.mutateAsync({
        reason: reason.trim(),
        expertise_area: expertiseArea,
        province,
      });
    } catch {
      // Error handled by mutation state
    }
  };

  // Auth gate
  if (!isAuthenticated) {
    return (
      <div className="public-page">
        <div className="relative z-10 public-section">
          <div className="public-shell">
            <div className="mx-auto max-w-lg">
              <div className="glass-card p-12 text-center">
                <LogIn className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">
                  {t('applyVerifier.signInRequired')}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {t('applyVerifier.signInToApply')}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {t('applyVerifier.signIn')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLoadingAny = reputationLoading || appLoading;

  return (
    <div className="public-page">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-cyan-500/[0.04] blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Back link */}
        <div className="public-shell pt-6">
          <div className="mx-auto max-w-2xl">
            <Link
              href="/reputation"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('applyVerifier.karmaDashboard')}
            </Link>
          </div>
        </div>

        {/* Header */}
        <section className="public-section pb-0 pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 text-cyan-400" />
                {t('applyVerifier.verifierApplication')}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {t('applyVerifier.verifierApplicationDesc')}
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="public-section pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              {isLoadingAny ? (
                <div className="glass-card p-8 animate-pulse">
                  <div className="h-8 w-48 bg-white/[0.06] rounded mx-auto mb-4" />
                  <div className="h-4 w-64 bg-white/[0.04] rounded mx-auto mb-6" />
                  <div className="h-3 w-full bg-white/[0.04] rounded" />
                </div>
              ) : !isEligible ? (
                /* Locked state */
                <div className="glass-card p-8 sm:p-12 text-center">
                  <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-300 mb-2">
                    {isNe ? `${REQUIRED_KARMA} कर्म चाहिन्छ` : `Need ${REQUIRED_KARMA} karma to apply`}
                  </h2>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                    {t('applyVerifier.buildKarma')}
                  </p>

                  {/* Progress bar */}
                  <div className="max-w-xs mx-auto mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>{karma} {t('applyVerifier.karma')}</span>
                      <span>{REQUIRED_KARMA} {t('applyVerifier.required')}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.min(100, (karma / REQUIRED_KARMA) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {REQUIRED_KARMA - karma} {t('applyVerifier.karmaToGo')}
                    </p>
                  </div>

                  <Link
                    href="/reputation"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-primary-400 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all"
                  >
                    {t('applyVerifier.viewKarmaDashboard')}
                  </Link>
                </div>
              ) : existingApplication ? (
                /* Existing application status */
                <div className="glass-card p-8 sm:p-12 text-center">
                  {existingApplication.status === 'pending' && (
                    <>
                      <Clock className="w-12 h-12 text-amber-400/60 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold text-gray-300 mb-2">
                        {t('applyVerifier.applicationPending')}
                      </h2>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        {t('applyVerifier.applicationPendingDesc')}
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mt-4">
                        <Clock className="w-3 h-3" />
                        {t('applyVerifier.pending')}
                      </div>
                    </>
                  )}
                  {existingApplication.status === 'approved' && (
                    <>
                      <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold text-gray-300 mb-2">
                        {t('applyVerifier.applicationApproved')}
                      </h2>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        {t('applyVerifier.applicationApprovedDesc')}
                      </p>
                      <Link
                        href="/verify-evidence"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all mt-4"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {t('applyVerifier.startReviewing')}
                      </Link>
                    </>
                  )}
                  {existingApplication.status === 'rejected' && (
                    <>
                      <XCircle className="w-12 h-12 text-red-400/60 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold text-gray-300 mb-2">
                        {t('applyVerifier.applicationRejected')}
                      </h2>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        {existingApplication.reviewer_note || t('applyVerifier.applicationRejectedDesc')}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                /* Application form */
                <div className="space-y-5">
                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      {t('applyVerifier.whyVerifier')} *
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('applyVerifier.whyVerifierPlaceholder')}
                      maxLength={2000}
                      rows={5}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 resize-none transition-all"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">
                      {reason.length}/2000 ({t('applyVerifier.minChars')})
                    </p>
                  </div>

                  {/* Expertise area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      {t('applyVerifier.expertiseArea')} *
                    </label>
                    <div className="relative">
                      <select
                        value={expertiseArea}
                        onChange={(e) => setExpertiseArea(e.target.value as ExpertiseArea)}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500/40 transition-all"
                      >
                        {EXPERTISE_AREAS.map((area) => (
                          <option key={area.key} value={area.key}>
                            {isNe ? area.ne : area.en}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Province */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      {t('applyVerifier.province')} *
                    </label>
                    <div className="relative">
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500/40 transition-all"
                      >
                        <option value="">{t('applyVerifier.selectProvince')}</option>
                        {NEPAL_PROVINCES.map((p) => (
                          <option key={p.name} value={p.name}>
                            {isNe ? p.name_ne : p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Error */}
                  {submitMutation.isError && (
                    <div className="p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-sm text-red-400">
                      {submitMutation.error?.message || t('applyVerifier.failedToSubmit')}
                    </div>
                  )}

                  {/* Success */}
                  {submitMutation.isSuccess && (
                    <div className="p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 text-sm text-emerald-400">
                      {t('applyVerifier.applicationSuccess')}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleSubmit}
                      disabled={!isValid || submitMutation.isPending}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {t('applyVerifier.submitApplication')}
                    </button>
                    <Link
                      href="/reputation"
                      className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {t('applyVerifier.cancel')}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
