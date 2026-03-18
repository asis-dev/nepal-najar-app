'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  Target,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Link2,
  MessageCircle,
} from 'lucide-react';
import {
  useProject,
  useProjectMilestones,
  useProjectBlockers,
  type Milestone,
  type Blocker,
} from '@/lib/hooks/use-projects';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

/* ── Status helpers ─────────────────────────────────── */

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.2)]',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_16px_rgba(59,130,246,0.2)]',
  suspended: 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.2)]',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_16px_rgba(239,68,68,0.2)]',
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const BLOCKER_STATUS_COLORS: Record<string, string> = {
  open: 'text-red-400',
  in_progress: 'text-amber-400',
  escalated: 'text-orange-400',
  resolved: 'text-emerald-400',
};

/* ── Progress Ring ──────────────────────────────────── */

function ProgressRing({ progress, label, size = 180, strokeWidth = 12 }: { progress: number; label: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-white">{Math.round(progress)}%</span>
        <span className="text-sm text-white/40">{label}</span>
      </div>
    </div>
  );
}

/* ── Milestone Timeline ─────────────────────────────── */

function MilestoneTimeline({ milestones, locale, completedLabel }: { milestones: Milestone[]; locale: string; completedLabel: string }) {
  const sorted = [...milestones].sort((a, b) => a.sequence - b.sequence);
  const dateLocale = locale === 'ne' ? 'ne-NP' : 'en-US';

  function getIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-cyan-400 animate-pulse" />;
      default:
        return <Circle className="h-5 w-5 text-white/20" />;
    }
  }

  function getLineColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/60';
      case 'in_progress':
        return 'bg-cyan-500/40';
      default:
        return 'bg-white/10';
    }
  }

  return (
    <div className="space-y-0">
      {sorted.map((m, idx) => (
        <div key={m.id} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
              m.status === 'completed'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : m.status === 'in_progress'
                ? 'border-cyan-500/30 bg-cyan-500/10'
                : 'border-white/10 bg-white/5'
            }`}>
              {getIcon(m.status)}
            </div>
            {idx < sorted.length - 1 && (
              <div className={`w-0.5 flex-1 min-h-[2rem] ${getLineColor(m.status)}`} />
            )}
          </div>
          <div className="pb-8 pt-1">
            <h4 className={`font-semibold ${
              m.status === 'completed' ? 'text-white/70' : m.status === 'in_progress' ? 'text-white' : 'text-white/40'
            }`}>
              {m.title}
            </h4>
            {m.due_date && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/30">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(m.due_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' })}
                {m.status === 'completed' && m.completion_date && (
                  <span className="text-emerald-400/60 ml-2">
                    {completedLabel} {new Date(m.completion_date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Share Buttons ───────────────────────────────────── */

function ShareButtons({ title, shareLabel, copiedLabel }: { title: string; shareLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(shareUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — ignore
    }
  };

  const btnClass =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/40 mr-1">{shareLabel}</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        title="Facebook"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        title="X"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        title="WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
      <button onClick={handleCopy} className={btnClass} title={copiedLabel}>
        {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────── */

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { t, locale } = useI18n();

  const { data: project, isLoading, isError } = useProject(id);
  const { data: milestones } = useProjectMilestones(id);
  const { data: blockers } = useProjectBlockers(id);

  const dateLocale = locale === 'ne' ? 'ne-NP' : 'en-US';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a0e1a] via-[#0d1225] to-[#0a0e1a]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0a0e1a] via-[#0d1225] to-[#0a0e1a] text-white/50">
        <p className="text-lg">{t('project.notFound')}</p>
        <Link href="/explore/projects" className="mt-4 text-cyan-400 hover:underline">
          &larr; {t('project.backToProjects')}
        </Link>
      </div>
    );
  }

  const progress = Math.round(project.progress ?? 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] via-[#0d1225] to-[#0a0e1a] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Back link */}
        <Link
          href="/explore/projects"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('project.backToProjects')}
        </Link>

        {/* ── Hero section ──────────────────────────── */}
        <div className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${
                    STATUS_BADGE[project.status] ?? STATUS_BADGE.draft
                  }`}
                >
                  {t(`status.${project.status}`)}
                </span>
                {project.priority && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/40">
                    {t('project.priority')}: {project.priority}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{project.title}</h1>
              {project.government_unit && (
                <p className="mt-3 flex items-center gap-2 text-white/50">
                  <Building2 className="h-4 w-4 text-cyan-400/60" />
                  {project.government_unit.name}
                </p>
              )}
              {project.description && (
                <p className="mt-4 leading-relaxed text-white/40">{project.description}</p>
              )}
            </div>
            <div className="flex justify-center sm:ml-6">
              <ProgressRing progress={progress} label={t('project.complete')} />
            </div>
          </div>
        </div>

        {/* ── Key facts ─────────────────────────────── */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              icon: Calendar,
              label: t('project.startDate'),
              value: project.start_date
                ? new Date(project.start_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A',
            },
            {
              icon: Target,
              label: t('project.targetEnd'),
              value: project.target_end_date
                ? new Date(project.target_end_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A',
            },
            {
              icon: MapPin,
              label: t('project.region'),
              value: project.region?.name ?? 'N/A',
            },
            {
              icon: AlertTriangle,
              label: t('project.priority'),
              value: project.priority ?? 'N/A',
            },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <Icon className="mb-2 h-5 w-5 text-cyan-400/60" />
              <p className="text-xs uppercase tracking-wide text-white/30">{label}</p>
              <p className="mt-1 font-semibold capitalize text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Milestones ────────────────────────────── */}
        {milestones && milestones.length > 0 && (
          <div className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <h2 className="mb-6 text-xl font-bold text-white">{t('project.milestones')}</h2>
            <MilestoneTimeline milestones={milestones} locale={locale} completedLabel={t('project.completed')} />
          </div>
        )}

        {/* ── Blockers ──────────────────────────────── */}
        {blockers && blockers.length > 0 && (
          <div className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <h2 className="mb-6 text-xl font-bold text-white">{t('project.blockers')}</h2>
            <div className="space-y-4">
              {blockers.map((b: Blocker) => (
                <div
                  key={b.id}
                  className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4"
                >
                  <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${
                    b.severity === 'critical' ? 'text-red-400' :
                    b.severity === 'high' ? 'text-orange-400' :
                    b.severity === 'medium' ? 'text-amber-400' :
                    'text-blue-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-white">{b.title}</h4>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${
                          SEVERITY_COLORS[b.severity] ?? SEVERITY_COLORS.low
                        }`}
                      >
                        {t(`project.severity.${b.severity}`)}
                      </span>
                      <span className={`text-xs font-medium capitalize ${BLOCKER_STATUS_COLORS[b.status] ?? 'text-white/40'}`}>
                        {t(`status.${b.status}`) !== `status.${b.status}` ? t(`status.${b.status}`) : b.status.replace('_', ' ')}
                      </span>
                    </div>
                    {b.description && (
                      <p className="mt-1 text-sm text-white/40">{b.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Share ──────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <ShareButtons
            title={project.title}
            shareLabel={t('common.share')}
            copiedLabel={t('commitment.copied')}
          />
        </div>
      </div>
    </div>
  );
}
