'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Activity,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Target,
  ExternalLink,
  Clock,
  Calendar,
  Circle,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Landmark,
  Award,
  AlertOctagon,
  BadgeCheck,
  HelpCircle,
  ShieldQuestion,
  User,
  DollarSign,
} from 'lucide-react';
import { useMinistersWeekly } from '@/lib/hooks/use-ministers';
import { useI18n } from '@/lib/i18n';
import { promises } from '@/lib/data/promises';

/* ═══════════════════════════════════════════════
   MINISTER DETAIL PAGE
   ═══════════════════════════════════════════════ */

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  stalled: { label: 'Stalled', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
} as const;

const CLASSIFICATION_COLORS: Record<string, { text: string; bg: string }> = {
  confirms: { text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  contradicts: { text: 'text-red-400', bg: 'bg-red-400/10' },
  context: { text: 'text-blue-400', bg: 'bg-blue-400/10' },
  neutral: { text: 'text-gray-400', bg: 'bg-gray-400/10' },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysInOffice(appointedDate?: string): number | null {
  if (!appointedDate) return null;
  const then = new Date(appointedDate).getTime();
  const now = Date.now();
  return Math.floor((now - then) / 86400000);
}

export default function MinisterDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { locale } = useI18n();
  const isNe = locale === 'ne';

  const { ministers, isLoading } = useMinistersWeekly();

  const minister = useMemo(() => {
    return ministers.find((m) => m.slug === slug) ?? null;
  }, [ministers, slug]);

  // Get owned commitments from static promises data
  const ownedCommitments = useMemo(() => {
    if (!minister) return [];
    return promises.filter((p) => minister.ownedCommitmentIds.includes(Number(p.id)));
  }, [minister]);

  const days = minister?.appointedDate ? daysInOffice(minister.appointedDate) : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-np-void pb-24">
        <div className="mx-auto max-w-2xl px-4 pt-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-24 rounded bg-gray-800" />
            <div className="h-6 w-2/3 rounded bg-gray-800" />
            <div className="h-4 w-1/2 rounded bg-gray-800" />
            <div className="mt-6 h-20 w-full rounded-xl bg-gray-800" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 w-full rounded-xl bg-gray-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!isLoading && !minister) {
    return (
      <div className="min-h-screen bg-np-void pb-24">
        <div className="mx-auto max-w-2xl px-4 pt-8">
          <Link
            href="/ministers"
            className="mb-6 inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isNe ? 'मन्त्रीपरिषद्' : 'Back to Ministers'}
          </Link>
          <div className="flex flex-col items-center py-20 text-center">
            <Briefcase className="h-10 w-10 text-gray-600" />
            <p className="mt-3 text-sm text-gray-400">
              {isNe ? 'मन्त्री भेटिएन।' : 'Minister not found.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!minister) return null;

  const { weeklyActivity } = minister;

  return (
    <div className="min-h-screen bg-np-void pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-8">
        {/* Back link */}
        <Link
          href="/ministers"
          className="mb-6 inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isNe ? 'मन्त्रीपरिषद्' : 'Back to Ministers'}
        </Link>

        {/* Minister header */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5">
          <h1 className="text-xl font-bold text-gray-100">
            {isNe && minister.nameNe ? minister.nameNe : minister.name}
          </h1>
          <p className="mt-1 text-sm text-gray-300">
            {isNe && minister.titleNe ? minister.titleNe : minister.title}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{minister.ministry}</p>

          {(minister.appointedDate || days !== null) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              {minister.appointedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {isNe ? 'नियुक्त' : 'Appointed'}: {new Date(minister.appointedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {days !== null && (
                <span className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                  {days} {isNe ? 'दिन' : 'days in office'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        {minister.profile && <MinisterProfile profile={minister.profile} isNe={isNe} />}

        {/* Activity stats bar */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            icon={Activity}
            label={isNe ? 'सिग्नलहरू' : 'Signals'}
            value={weeklyActivity.totalSignals}
            color="text-primary-400"
          />
          <StatCard
            icon={ThumbsUp}
            label={isNe ? 'पुष्टि' : 'Confirming'}
            value={weeklyActivity.confirming}
            color="text-emerald-400"
          />
          <StatCard
            icon={ThumbsDown}
            label={isNe ? 'विरोध' : 'Contradicting'}
            value={weeklyActivity.contradicting}
            color="text-red-400"
          />
          <StatCard
            icon={MessageSquare}
            label={isNe ? 'उल्लेख' : 'Mentions'}
            value={weeklyActivity.directMentions}
            color="text-blue-400"
          />
        </div>

        {/* This Week's Signals */}
        {weeklyActivity.topSignals.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-200">
              {isNe ? 'यस हप्ताका सिग्नलहरू' : "This Week's Signals"}
            </h2>
            <div className="space-y-2">
              {weeklyActivity.topSignals.map((signal) => {
                const cls = CLASSIFICATION_COLORS[signal.classification] || CLASSIFICATION_COLORS.neutral;
                return (
                  <div
                    key={signal.id}
                    className="rounded-xl border border-gray-800 bg-gray-900/60 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1 text-sm leading-relaxed text-gray-200">
                        {isNe && signal.titleNe ? signal.titleNe : signal.title}
                      </p>
                      {signal.url && (
                        <a
                          href={signal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-md p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls.text} ${cls.bg}`}>
                        {signal.classification}
                      </span>
                      {'type' in signal && (signal as any).type && (
                        <span className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                          {(signal as any).type}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {relativeTime(signal.discoveredAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Owned Commitments */}
        {ownedCommitments.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-200">
              <Target className="h-4 w-4" />
              {isNe ? 'जिम्मेवारी भएका प्रतिबद्धताहरू' : 'Owned Commitments'}
              <span className="ml-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-400">
                {ownedCommitments.length}
              </span>
            </h2>
            <div className="space-y-2">
              {ownedCommitments.map((commitment) => {
                const statusConf = STATUS_CONFIG[commitment.status] || STATUS_CONFIG.not_started;
                const StatusIcon = statusConf.icon;

                return (
                  <Link
                    key={commitment.id}
                    href={`/explore/first-100-days/${commitment.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-3.5 transition-colors hover:border-gray-700"
                  >
                    <div className={`shrink-0 rounded-lg p-1.5 ${statusConf.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${statusConf.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-200 group-hover:text-gray-100">
                        {isNe ? commitment.title_ne : commitment.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-xs ${statusConf.color}`}>{statusConf.label}</span>
                        <span className="text-xs text-gray-500">{commitment.progress}%</span>
                        {/* Mini progress bar */}
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className={`h-full rounded-full ${
                              commitment.status === 'stalled'
                                ? 'bg-red-400'
                                : commitment.status === 'delivered'
                                  ? 'bg-emerald-400'
                                  : commitment.status === 'in_progress'
                                    ? 'bg-blue-400'
                                    : 'bg-gray-600'
                            }`}
                            style={{ width: `${commitment.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* No activity state */}
        {weeklyActivity.topSignals.length === 0 && ownedCommitments.length === 0 && (
          <div className="mt-8 flex flex-col items-center py-12 text-center">
            <Activity className="h-8 w-8 text-gray-600" />
            <p className="mt-3 text-sm text-gray-400">
              {isNe ? 'यस हप्ता कुनै गतिविधि छैन।' : 'No activity this week.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 text-center">
      <Icon className={`mx-auto h-4 w-4 ${color}`} />
      <p className="mt-1.5 text-lg font-bold text-gray-100">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

/* ─── Verification Badge ─── */

const VERIFICATION_CONFIG = {
  confirmed: { icon: BadgeCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Confirmed' },
  reported: { icon: HelpCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Reported' },
  unverified: { icon: ShieldQuestion, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Unverified' },
} as const;

function VerificationBadge({ status }: { status: 'confirmed' | 'reported' | 'unverified' }) {
  const cfg = VERIFICATION_CONFIG[status] || VERIFICATION_CONFIG.unverified;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-medium ${cfg.color} ${cfg.bg}`} title={cfg.label}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

/* ─── Minister Profile ─── */

function MinisterProfile({ profile, isNe }: { profile: any; isNe: boolean }) {
  if (!profile) return null;

  return (
    <div className="mt-4 space-y-3">
      {/* Bio */}
      {profile.bio && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isNe ? 'परिचय' : 'Biography'}
            </h3>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{profile.bio}</p>
          {profile.personalInfo?.party && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 text-primary-400 font-medium">
                {profile.personalInfo.party}
              </span>
              {profile.personalInfo.constituency && (
                <span className="text-gray-500">{profile.personalInfo.constituency}</span>
              )}
              {profile.personalInfo.birthPlace && (
                <span className="text-gray-500">From {profile.personalInfo.birthPlace}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Education */}
      {profile.education?.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-3.5 w-3.5 text-blue-400" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isNe ? 'शिक्षा' : 'Education'}
            </h3>
          </div>
          <div className="space-y-2">
            {profile.education.map((edu: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200">{edu.degree}</p>
                  <p className="text-xs text-gray-500">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</p>
                </div>
                <VerificationBadge status={edu.verified} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Political Career */}
      {profile.politicalCareer?.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="h-3.5 w-3.5 text-purple-400" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isNe ? 'राजनीतिक करियर' : 'Political Career'}
            </h3>
          </div>
          <div className="relative pl-4 space-y-3">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gray-800" />
            {profile.politicalCareer.map((role: any, i: number) => (
              <div key={i} className="relative">
                <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-gray-700 border border-gray-600" />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200">{role.role}</p>
                    <p className="text-xs text-gray-500">{role.period}</p>
                    {role.details && <p className="text-xs text-gray-500 mt-0.5">{role.details}</p>}
                  </div>
                  <VerificationBadge status={role.verified} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Net Worth */}
      {profile.estimatedNetWorth?.amount && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isNe ? 'अनुमानित सम्पत्ति' : 'Estimated Net Worth'}
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-amber-400">{profile.estimatedNetWorth.amount}</p>
              <p className="text-[10px] text-gray-500">
                Source: {profile.estimatedNetWorth.source || 'Unknown'}
                {profile.estimatedNetWorth.year ? ` · ${profile.estimatedNetWorth.year}` : ''}
              </p>
            </div>
            <VerificationBadge status={profile.estimatedNetWorth.verified} />
          </div>
        </div>
      )}

      {/* Achievements */}
      {profile.achievements?.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-3.5 w-3.5 text-emerald-400" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isNe ? 'उपलब्धिहरू' : 'Notable Achievements'}
            </h3>
          </div>
          <div className="space-y-2">
            {profile.achievements.map((a: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300">{a.description}</p>
                  {a.year && <p className="text-[10px] text-gray-600 mt-0.5">{a.year}</p>}
                </div>
                <VerificationBadge status={a.verified} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controversies */}
      {profile.controversies?.length > 0 && (
        <div className="rounded-xl border border-red-500/10 bg-red-500/[0.02] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="h-3.5 w-3.5 text-red-400" />
            <h3 className="text-xs font-semibold text-red-400/70 uppercase tracking-wider">
              {isNe ? 'विवादहरू' : 'Controversies'}
            </h3>
          </div>
          <div className="space-y-2">
            {profile.controversies.map((c: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300">{c.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.year && <span className="text-[10px] text-gray-600">{c.year}</span>}
                    {c.status && (
                      <span className={`text-[10px] font-medium ${
                        c.status === 'ongoing' || c.status === 'under investigation'
                          ? 'text-amber-400'
                          : c.status === 'resolved' || c.status === 'acquitted'
                          ? 'text-emerald-400'
                          : 'text-gray-500'
                      }`}>
                        {c.status}
                      </span>
                    )}
                  </div>
                </div>
                <VerificationBadge status={c.verified} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
