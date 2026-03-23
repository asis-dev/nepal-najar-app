'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Users,
  BarChart3,
  Eye,
  ShieldCheck,
  Satellite,
  MessageSquareText,
  Scale,
  Zap,
  Signal,
  Radio,
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   HOW IT WORKS — Onboarding page
   Nepal Najar: citizen-powered government accountability
   ═══════════════════════════════════════════════ */

const howWeTrackCards = [
  {
    icon: Brain,
    title: 'AI Intelligence Engine',
    titleNe: 'एआई बुद्धिमत्ता इन्जिन',
    body: 'We scan 15+ sources every 4 hours: news outlets, social media, parliament records, government portals, and public databases.',
    accent: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  {
    icon: Users,
    title: 'Community Verification',
    titleNe: 'सामुदायिक प्रमाणीकरण',
    body: 'Citizens submit real evidence from the ground — photos, documents, firsthand reports. Verified by trusted community members.',
    accent: 'from-emerald-500/20 to-green-500/20',
    iconColor: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  {
    icon: Scale,
    title: 'Combined Scoring',
    titleNe: 'संयुक्त मूल्याङ्कन',
    body: 'AI signals + community evidence = the truth about each commitment\'s progress. No single source can dominate the score.',
    accent: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
    border: 'border-violet-500/20',
  },
];

const roleCards = [
  {
    icon: Eye,
    title: 'Observer',
    titleNe: 'पर्यवेक्षक',
    body: 'Sign up, submit evidence, vote on submissions, and track commitments that matter to you. Every citizen can participate.',
    features: ['Submit ground-level evidence', 'Vote on others\' submissions', 'Build your personal watchlist', 'Get alerts when things change'],
    accent: 'from-cyan-500/20 to-blue-500/20',
    iconColor: 'text-cyan-400',
    border: 'border-cyan-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Verifier',
    titleNe: 'प्रमाणकर्ता',
    body: 'Earn karma through quality contributions. Become a trusted verifier whose reviews carry extra weight.',
    features: ['Earn reputation through accuracy', 'Review and verify evidence', 'Your votes carry 2x weight', 'Help build Nepal\'s trust layer'],
    accent: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
    border: 'border-amber-500/20',
  },
];

const stats = [
  { value: '109', label: 'Commitments tracked', labelNe: 'वचनबद्धता ट्र्याक गरिएको' },
  { value: '15+', label: 'Sources monitored', labelNe: 'स्रोत अनुगमन गरिएको' },
  { value: '4hr', label: 'Scan frequency', labelNe: 'स्क्यान आवृत्ति' },
];

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-np-void">
      {/* Background grid */}
      <div className="absolute inset-0 z-0 nepal-hero-grid" />
      <div className="mountain-ridge opacity-60" />

      <div className="relative z-10">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="public-section pt-14 sm:pt-16 lg:pt-20">
          <div className="public-shell text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-300">
              <Radio className="h-3.5 w-3.5" />
              नेपाल नजर कसरी काम गर्छ
            </div>

            <h1 className="mx-auto mt-6 max-w-3xl text-balance font-sans text-[2.5rem] font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-[3.4rem] lg:text-[4.2rem]">
              How Nepal Najar Works
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-300 sm:text-lg">
              Nepal&apos;s citizen-powered government accountability platform.
              We combine AI intelligence with community verification so every
              Nepali can see the truth about public commitments.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/explore/first-100-days"
                className="inline-flex items-center gap-2 rounded-2xl border border-primary-400/20 bg-primary-600 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-500"
              >
                Browse Commitments
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-base font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </section>

        {/* ── The Problem ──────────────────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="glass-card p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 rounded-2xl bg-red-500/10 p-3">
                    <Zap className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-red-400/80">
                      The problem / समस्या
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Nepal&apos;s government makes commitments. Citizens have no
                      way to track if they&apos;re being kept.
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-gray-400">
                      Election promises, budget allocations, infrastructure
                      projects, policy reforms — announcements are made, but
                      follow-through disappears into bureaucracy. There is no
                      single place where a citizen can check: did this actually
                      happen? Nepal Najar changes that.
                    </p>
                    <p className="mt-3 text-sm leading-7 text-gray-500">
                      चुनावी वाचा, बजेट विनियोजन, पूर्वाधार आयोजना — घोषणा हुन्छ तर
                      कार्यान्वयन नागरिकको नजरबाट हराउँछ। नेपाल नजरले यो बदल्छ।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How We Track ─────────────────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mb-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                Three pillars / तीन स्तम्भ
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                How We Track
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {howWeTrackCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className={`glass-card relative overflow-hidden p-6 transition-all duration-500 hover:border-white/[0.12]`}
                  >
                    {/* Gradient glow */}
                    <div
                      className={`absolute -inset-px rounded-[inherit] bg-gradient-to-b ${card.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                    />
                    <div className="relative">
                      <div className={`rounded-2xl bg-gradient-to-br ${card.accent} p-3.5 w-fit`}>
                        <Icon className={`h-6 w-6 ${card.iconColor}`} />
                      </div>
                      <h3 className="mt-5 text-xl font-semibold text-white">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {card.titleNe}
                      </p>
                      <p className="mt-4 text-sm leading-7 text-gray-400">
                        {card.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Your Role ────────────────────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mb-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                Your role / तपाईंको भूमिका
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                Two Ways to Participate
              </h2>
            </div>

            <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
              {roleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="glass-card relative overflow-hidden p-6 transition-all duration-500 hover:border-white/[0.12]"
                  >
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`rounded-2xl bg-gradient-to-br ${card.accent} p-3.5`}>
                          <Icon className={`h-6 w-6 ${card.iconColor}`} />
                        </div>
                        <span
                          className={`rounded-full border ${card.border} bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${card.iconColor}`}
                        >
                          {card.titleNe}
                        </span>
                      </div>
                      <h3 className="mt-5 text-xl font-semibold text-white">
                        {card.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-gray-400">
                        {card.body}
                      </p>
                      <ul className="mt-4 space-y-2">
                        {card.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-sm text-gray-400"
                          >
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-400/60" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── The Numbers ──────────────────────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mb-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                The numbers / संख्या
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                Accountability at Scale
              </h2>
            </div>

            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="glass-card p-5 text-center">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="mt-2 text-sm font-medium text-gray-300">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {stat.labelNe}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How Scoring Works (visual) ───────────────────────────── */}
        <section className="public-section pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              <div className="glass-card p-6 sm:p-8">
                <div className="text-center">
                  <div className="mx-auto inline-flex rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 p-3">
                    <BarChart3 className="h-6 w-6 text-violet-400" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    How the Score is Calculated
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    स्कोर कसरी गणना गरिन्छ
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {/* AI Score */}
                  <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Brain className="h-5 w-5 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">
                          AI Score
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Confirms vs contradicts from 15+ sources
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                        style={{ width: '40%' }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-gray-600">
                      40% weight when community evidence exists
                    </p>
                  </div>

                  {/* Community Score */}
                  <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-300">
                          Community Score
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Citizen evidence weighted by trust
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000"
                        style={{ width: '60%' }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-gray-600">
                      60% weight — community truth leads
                    </p>
                  </div>

                  {/* Combined */}
                  <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Scale className="h-5 w-5 text-violet-400" />
                        <span className="text-sm font-medium text-violet-300">
                          Final Score
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        AI + Community = Progress %
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400 transition-all duration-1000"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-gray-600">
                      Strong community consensus can override AI
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Get Started CTA ──────────────────────────────────────── */}
        <section className="public-section pb-14 pt-10 sm:pt-14">
          <div className="public-shell">
            <div className="glass-card mx-auto max-w-3xl p-6 text-center sm:p-8">
              <Satellite className="mx-auto h-8 w-8 text-primary-400" />
              <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                Ready to Watch?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                हेर्न तयार हुनुहुन्छ?
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-gray-400">
                Join thousands of Nepali citizens holding their government
                accountable. Browse commitments, submit evidence, or see
                what&apos;s trending right now.
              </p>

              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/explore/first-100-days"
                  className="inline-flex items-center gap-2 rounded-2xl border border-primary-400/20 bg-primary-600 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-500"
                >
                  Browse Commitments
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                >
                  Sign Up
                </Link>
                <Link
                  href="/trending"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-gray-200 transition-all duration-300 hover:bg-white/[0.07]"
                >
                  <Signal className="h-4 w-4 text-cyan-300" />
                  See What&apos;s Trending
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
