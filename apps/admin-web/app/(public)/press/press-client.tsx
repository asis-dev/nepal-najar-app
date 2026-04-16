'use client';

import { useState, useCallback } from 'react';
import {
  Copy,
  Check,
  Download,
  Code2,
  BarChart3,
  Quote,
  ExternalLink,
  Newspaper,
  Activity,
  TrendingUp,
  Shield,
  Database,
  Globe,
  FileJson,
  Image as ImageIcon,
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   PRESS & MEDIA KIT — Client Component
   All interactive features: copy buttons, embed
   code, and client-only rendering.
   ═══════════════════════════════════════════════ */

interface PressStats {
  total: number;
  delivered: number;
  inProgress: number;
  stalled: number;
  notStarted: number;
  day: number;
  grade: string | null;
  gradeLabel: string | null;
  gradeText: string | null;
  gradeBg: string | null;
  gradeGlow: string | null;
  score: number;
  signalCount: number;
  sourceCount: number;
  avgProgress: number;
  dataConfidence: string;
  phaseLabel: string;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
        transition-all duration-200
        ${
          copied
            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border border-white/10 bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200'
        }
      `}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label || 'Copy'}
    </button>
  );
}

/* ── Section wrapper ────────────────────────── */
function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: typeof BarChart3;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20">
          <Icon className="w-4.5 h-4.5 text-primary-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/* ── Stat card ──────────────────────────────── */
function StatCard({
  value,
  label,
  accent = 'text-gray-100',
}: {
  value: string | number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-np-surface/60 p-4 text-center">
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

/* ── Quote block ────────────────────────────── */
function QuoteBlock({ text }: { text: string }) {
  return (
    <div className="relative rounded-xl border border-white/[0.06] bg-np-surface/60 p-5">
      <Quote className="absolute top-4 left-4 w-5 h-5 text-primary-500/30" />
      <p className="pl-8 text-sm leading-relaxed text-gray-300 italic">
        &ldquo;{text}&rdquo;
      </p>
      <div className="mt-3 flex justify-end">
        <CopyButton text={text} label="Copy quote" />
      </div>
    </div>
  );
}

export function PressPageClient({ stats }: { stats: PressStats }) {
  const {
    total,
    delivered,
    inProgress,
    stalled,
    notStarted,
    day,
    grade,
    gradeLabel,
    gradeText,
    gradeBg,
    gradeGlow,
    score,
    signalCount,
    sourceCount,
    avgProgress,
    dataConfidence,
    phaseLabel,
  } = stats;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Embed code
  const embedCode = `<iframe
  src="https://nepalrepublic.org/embed?theme=dark&count=5"
  width="400"
  height="520"
  style="border:none;border-radius:12px;"
  title="Nepal Republic — Government Commitment Tracker"
></iframe>`;

  const embedCodeLight = `<iframe
  src="https://nepalrepublic.org/embed?theme=light&count=5"
  width="400"
  height="520"
  style="border:none;border-radius:12px;"
  title="Nepal Republic — Government Commitment Tracker"
></iframe>`;

  // Quotable stats
  const quote1 = `As of Day ${day}, only ${delivered} of ${total} government commitments have been delivered, according to Nepal Republic's AI tracking system.`;
  const quote2 = grade
    ? `The government's accountability grade currently stands at ${grade} (${gradeLabel}), based on analysis of ${signalCount.toLocaleString()} intelligence signals from ${sourceCount} sources.`
    : `Nepal Republic's AI system has analyzed ${signalCount.toLocaleString()} intelligence signals from ${sourceCount} sources to track ${total} government commitments.`;
  const quote3 = `${stalled} government commitments are currently stalled, while ${inProgress} are in progress. The average completion stands at ${avgProgress}%.`;
  const quote4 = `Nepal Republic uses artificial intelligence to monitor ${sourceCount} media sources across Nepal, collecting and classifying over ${signalCount.toLocaleString()} signals to hold the government accountable.`;

  return (
    <div className="min-h-screen">
      {/* ═══ HERO ═══════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-nepal-blue/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/[0.07] rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/5 px-4 py-1.5 text-xs font-medium text-primary-300 mb-6">
            <Newspaper className="w-3.5 h-3.5" />
            Press &amp; Media Kit
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-50 leading-tight tracking-tight">
            Nepal Republic
            <br />
            <span className="text-primary-400">Press &amp; Media Kit</span>
          </h1>

          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-gray-400 leading-relaxed">
            AI-powered accountability data for Nepal&apos;s government.
            <br className="hidden sm:block" />
            Free to use. Credit appreciated.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-np-surface/40 px-3 py-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              Last updated: {today}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-np-surface/40 px-3 py-1.5">
              <Shield className="w-3 h-3 text-primary-400" />
              {phaseLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 pb-20 space-y-14">

        {/* ── Quick nav ──────────────────────────────────── */}
        <nav className="flex flex-wrap gap-2 justify-center text-xs">
          {[
            { href: '#stats', label: 'Live Stats' },
            { href: '#quotes', label: 'Quotable Stats' },
            { href: '#embed', label: 'Embed Widget' },
            { href: '#downloads', label: 'Downloads' },
            { href: '#attribution', label: 'Attribution' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg border border-white/[0.06] bg-np-surface/40 px-3 py-1.5 text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* ── 1. LIVE STATS DASHBOARD ────────────────────── */}
        <Section id="stats" icon={BarChart3} title="Live Stats Dashboard">
          <p className="text-sm text-gray-500 mb-6">
            These numbers are computed from live data each time this page loads.
            Use them freely in your reporting.
          </p>

          {/* Top row: key headline numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard
              value={total}
              label="Commitments Tracked"
              accent="text-primary-300"
            />
            <StatCard
              value={`Day ${day}`}
              label="Since Inauguration"
              accent="text-cyan-300"
            />
            {grade ? (
              <StatCard
                value={grade}
                label={`Republic Score (${gradeLabel})`}
                accent={gradeText || 'text-gray-100'}
              />
            ) : (
              <StatCard
                value="--"
                label="Grade (too early)"
                accent="text-gray-500"
              />
            )}
            <StatCard
              value={`${avgProgress}%`}
              label="Avg. Completion"
              accent="text-amber-300"
            />
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard
              value={delivered}
              label="Delivered"
              accent="text-emerald-400"
            />
            <StatCard
              value={inProgress}
              label="In Progress"
              accent="text-blue-400"
            />
            <StatCard
              value={stalled}
              label="Stalled"
              accent="text-red-400"
            />
            <StatCard
              value={notStarted}
              label="Not Started"
              accent="text-gray-400"
            />
          </div>

          {/* Intelligence pipeline stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              value={signalCount.toLocaleString()}
              label="Intelligence Signals Collected"
              accent="text-violet-400"
            />
            <StatCard
              value={sourceCount}
              label="Monitored Sources"
              accent="text-orange-400"
            />
          </div>
        </Section>

        {/* ── 2. QUICK QUOTE BLOCKS ──────────────────────── */}
        <Section id="quotes" icon={Quote} title="Quotable Stats">
          <p className="text-sm text-gray-500 mb-6">
            Pre-formatted statements you can use directly in articles. Click
            &ldquo;Copy quote&rdquo; to grab the text.
          </p>

          <div className="space-y-4">
            <QuoteBlock text={quote1} />
            <QuoteBlock text={quote2} />
            <QuoteBlock text={quote3} />
            <QuoteBlock text={quote4} />
          </div>
        </Section>

        {/* ── 3. EMBED WIDGET ────────────────────────────── */}
        <Section id="embed" icon={Code2} title="Embed Widget">
          <p className="text-sm text-gray-500 mb-6">
            Add a live government commitment tracker to your website. The widget
            auto-updates with the latest data from Nepal Republic.
          </p>

          <div className="space-y-6">
            {/* Dark theme embed */}
            <div className="rounded-xl border border-white/[0.06] bg-np-surface/60 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <span className="text-xs font-medium text-gray-400">
                  Dark Theme
                </span>
                <CopyButton text={embedCode} label="Copy embed code" />
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {embedCode}
                </pre>
              </div>
            </div>

            {/* Light theme embed */}
            <div className="rounded-xl border border-white/[0.06] bg-np-surface/60 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <span className="text-xs font-medium text-gray-400">
                  Light Theme
                </span>
                <CopyButton text={embedCodeLight} label="Copy embed code" />
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {embedCodeLight}
                </pre>
              </div>
            </div>

            {/* Customization note */}
            <div className="rounded-xl border border-primary-500/10 bg-primary-500/[0.03] px-5 py-4">
              <h4 className="text-sm font-medium text-primary-300 mb-2">
                Customization Options
              </h4>
              <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
                <li>
                  <code className="text-primary-400/80">theme=dark</code> or{' '}
                  <code className="text-primary-400/80">theme=light</code> --
                  set the color scheme
                </li>
                <li>
                  <code className="text-primary-400/80">count=5</code> -- number
                  of commitments to show (1-20)
                </li>
                <li>
                  <code className="text-primary-400/80">
                    status=in_progress
                  </code>{' '}
                  -- filter by status (delivered, in_progress, stalled,
                  not_started)
                </li>
                <li>
                  <code className="text-primary-400/80">compact=true</code> --
                  smaller variant without stats bar
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ── 4. DOWNLOADS ───────────────────────────────── */}
        <Section id="downloads" icon={Download} title="Downloads &amp; Data">
          <p className="text-sm text-gray-500 mb-6">
            Download the latest data for your reporting. All data is free to use
            with attribution.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Scorecard image */}
            <a
              href="/api/og/scorecard"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-np-surface/60 p-5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/15 shrink-0">
                <ImageIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-gray-100 transition-colors">
                  Today&apos;s Scorecard Image
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  OG-sized image (1200x630) -- perfect for social media posts and
                  article thumbnails.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400/70">
                  <ExternalLink className="w-3 h-3" />
                  Open image
                </span>
              </div>
            </a>

            {/* Full data JSON */}
            <a
              href="/api/v1/promises?limit=50"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-np-surface/60 p-5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/15 shrink-0">
                <FileJson className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-gray-100 transition-colors">
                  Full Commitment Data (JSON)
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Machine-readable dataset of all {total} public commitments with
                  status, progress, and evidence counts.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400/70">
                  <ExternalLink className="w-3 h-3" />
                  Open API
                </span>
              </div>
            </a>

            {/* Stats API */}
            <a
              href="/api/v1/stats"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-np-surface/60 p-5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/15 shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-gray-100 transition-colors">
                  Aggregate Stats API
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Summary statistics: totals by status and category, average
                  progress. JSON format, CORS-enabled.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400/70">
                  <ExternalLink className="w-3 h-3" />
                  Open API
                </span>
              </div>
            </a>

            {/* Report card image */}
            <a
              href="/api/og/report-card"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-np-surface/60 p-5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/15 shrink-0">
                <ImageIcon className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-gray-100 transition-colors">
                  Report Card Image
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Weekly report card graphic with grade, status breakdown, and
                  key metrics.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-violet-400/70">
                  <ExternalLink className="w-3 h-3" />
                  Open image
                </span>
              </div>
            </a>
          </div>

          {/* API docs link */}
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-np-surface/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <Database className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-gray-300">
                  REST API
                </h4>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  All data is available via our public REST API. Endpoints
                  support filtering by status, category, and search. Rate
                  limited to 100 requests/minute. CORS enabled for browser
                  use.
                </p>
                <div className="mt-2 text-xs font-mono text-gray-600">
                  Base URL: https://nepalrepublic.org/api/v1/
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 5. ATTRIBUTION & CONTACT ───────────────────── */}
        <Section id="attribution" icon={Globe} title="Attribution &amp; Contact">
          <div className="space-y-6">
            {/* How to credit */}
            <div className="rounded-xl border border-white/[0.06] bg-np-surface/60 p-5">
              <h4 className="text-sm font-medium text-gray-200 mb-3">
                How to Credit Us
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                We provide all data free of charge. When using our data or
                quotes, please include this attribution:
              </p>

              <div className="rounded-lg border border-white/[0.08] bg-np-elevated/50 px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-300">
                  Source:{' '}
                  <strong className="text-gray-100">Nepal Republic</strong>{' '}
                  (
                  <a
                    href="https://nepalrepublic.org"
                    className="text-primary-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    nepalrepublic.org
                  </a>
                  )
                </p>
                <CopyButton
                  text="Source: Nepal Republic (nepalrepublic.org)"
                  label="Copy"
                />
              </div>
            </div>

            {/* About the platform */}
            <div className="rounded-xl border border-white/[0.06] bg-np-surface/60 p-5">
              <h4 className="text-sm font-medium text-gray-200 mb-3">
                About Nepal Republic
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Nepal Republic is an AI-powered civic accountability platform
                that tracks government commitments and promises using
                automated intelligence gathering from {sourceCount}+ media
                sources across Nepal. The platform monitors news, social
                media, parliamentary records, and government portals to
                provide evidence-based tracking of {total} government
                commitments.
              </p>
            </div>

            {/* Contact */}
            <div className="rounded-xl border border-white/[0.06] bg-np-surface/60 p-5">
              <h4 className="text-sm font-medium text-gray-200 mb-3">
                Media Inquiries
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">
                For press inquiries, data requests, or interviews, reach out
                through any of these channels:
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://nepalrepublic.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/[0.06] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  nepalrepublic.org
                </a>
              </div>
            </div>

            {/* Terms of use */}
            <div className="rounded-xl border border-primary-500/10 bg-primary-500/[0.03] px-5 py-4">
              <h4 className="text-sm font-medium text-primary-300 mb-2">
                Terms of Use
              </h4>
              <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
                <li>
                  All data and statistics are free to use for journalistic and
                  research purposes.
                </li>
                <li>
                  Please credit &ldquo;Nepal Republic
                  (nepalrepublic.org)&rdquo; in your publication.
                </li>
                <li>
                  Embed widgets may be used on any website without
                  permission.
                </li>
                <li>
                  For commercial use of bulk data, please contact us first.
                </li>
              </ul>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
