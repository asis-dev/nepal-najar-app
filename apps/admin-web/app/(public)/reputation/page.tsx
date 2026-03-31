'use client';

import Link from 'next/link';
import {
  Star,
  ShieldCheck,
  TrendingUp,
  Award,
  LogIn,
  Users,
  FileCheck,
  MessageSquare,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  useReputation,
  LEVEL_THRESHOLDS,
  getNextLevelThreshold,
  getCurrentLevelThreshold,
} from '@/lib/hooks/use-reputation';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const MILESTONE_LEVELS = [
  { level: 1, karma: 0, label: 'L1', labelNe: 'स्तर १' },
  { level: 3, karma: 50, label: 'L3', labelNe: 'स्तर ३' },
  { level: 5, karma: 200, label: 'L5', labelNe: 'स्तर ५' },
  { level: 7, karma: 500, label: 'L7', labelNe: 'स्तर ७' },
  { level: 10, karma: 2000, label: 'L10', labelNe: 'स्तर १०' },
];

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function ReputationPage() {
  const { t, locale } = useI18n();
  const { isAuthenticated, isVerifier } = useAuth();
  const isNe = locale === 'ne';

  const { karma, level, evidenceKarma, verificationKarma, communityKarma, isLoading } =
    useReputation();

  // Progress to next level
  const currentThreshold = getCurrentLevelThreshold(level);
  const nextThreshold = getNextLevelThreshold(level);
  const progressPercent = nextThreshold
    ? Math.min(100, ((karma - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

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
                  {t('reputation.signInRequired')}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {t('reputation.signInToView')}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {t('reputation.signIn')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-primary-500/[0.045] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <section className="public-section pb-0">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-4">
                <Star className="w-3.5 h-3.5" />
                {t('reputation.communityKarmaLabel')}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                {t('reputation.yourReputation')}
              </h1>
              <p className="text-gray-400 text-sm sm:text-base mt-2 max-w-lg mx-auto">
                {t('reputation.yourReputationDesc')}
              </p>
            </div>
          </div>
        </section>

        {/* Karma + Level */}
        <section className="public-section pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              {isLoading ? (
                <div className="glass-card p-8 animate-pulse">
                  <div className="h-16 w-32 bg-white/[0.06] rounded mx-auto mb-4" />
                  <div className="h-4 w-48 bg-white/[0.04] rounded mx-auto mb-6" />
                  <div className="h-3 w-full bg-white/[0.04] rounded" />
                </div>
              ) : (
                <>
                  {/* Main karma card */}
                  <div className="glass-card p-8 text-center mb-6">
                    {/* Verifier badge */}
                    {isVerifier && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-4">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {t('reputation.youAreVerifier')}
                      </div>
                    )}

                    {/* Big karma number */}
                    <div className="text-6xl sm:text-7xl font-bold text-white tracking-tight mb-2">
                      {karma.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-400 mb-1">
                      {t('reputation.totalKarma')}
                    </p>

                    {/* Level */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mt-3">
                      <Award className="w-4 h-4 text-primary-400" />
                      <span className="text-sm font-semibold text-primary-300">
                        {isNe ? `स्तर ${level}` : `Level ${level}`}
                      </span>
                    </div>

                    {/* Progress bar to next level */}
                    {nextThreshold && (
                      <div className="mt-6 max-w-sm mx-auto">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                          <span>{isNe ? `स्तर ${level}` : `Level ${level}`}</span>
                          <span>{isNe ? `स्तर ${level + 1}` : `Level ${level + 1}`}</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {karma} / {nextThreshold} {t('applyVerifier.karma')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Karma breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="glass-card p-5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                        <FileCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">{evidenceKarma}</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('reputation.evidenceKarma')}
                      </p>
                    </div>

                    <div className="glass-card p-5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="text-2xl font-bold text-cyan-400">{verificationKarma}</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('reputation.verificationKarma')}
                      </p>
                    </div>

                    <div className="glass-card p-5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-purple-400">{communityKarma}</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('reputation.communityKarma')}
                      </p>
                    </div>
                  </div>

                  {/* Level thresholds */}
                  <div className="glass-card p-5 sm:p-6">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary-400" />
                      {t('reputation.levelThresholds')}
                    </h3>
                    <div className="space-y-3">
                      {MILESTONE_LEVELS.map((milestone) => {
                        const isReached = karma >= milestone.karma;
                        const isCurrent = level === milestone.level;
                        return (
                          <div
                            key={milestone.level}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                              isCurrent
                                ? 'bg-primary-500/10 border border-primary-500/20'
                                : isReached
                                  ? 'bg-white/[0.02]'
                                  : 'opacity-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-xs font-bold w-8 ${
                                  isReached ? 'text-primary-400' : 'text-gray-600'
                                }`}
                              >
                                {isNe ? milestone.labelNe : milestone.label}
                              </span>
                              <span className="text-sm text-gray-300">
                                {milestone.karma.toLocaleString()} {t('applyVerifier.karma')}
                              </span>
                            </div>
                            {isReached && (
                              <span className="text-emerald-400 text-xs font-medium">
                                {t('reputation.reached')}
                              </span>
                            )}
                            {milestone.level === 5 && !isReached && (
                              <span className="text-xs text-cyan-400/60">
                                {t('reputation.canApplyVerifier')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Apply to become Verifier / Already Verifier */}
                  <div className="mt-6 text-center">
                    {isVerifier ? (
                      <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-sm font-semibold">
                        <ShieldCheck className="w-5 h-5" />
                        {t('reputation.youAreVerifier')}
                      </div>
                    ) : level >= 5 ? (
                      <Link
                        href="/apply-verifier"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all duration-200 hover:scale-105"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        {t('reputation.applyVerifier')}
                      </Link>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {isNe
                          ? `प्रमाणकर्ता बन्न स्तर ५ (२०० कर्म) चाहिन्छ। तपाईंको: ${karma} कर्म`
                          : `Reach Level 5 (200 karma) to apply as a Verifier. You have: ${karma} karma`}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
