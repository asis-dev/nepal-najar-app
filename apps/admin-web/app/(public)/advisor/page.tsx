'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Clock,
  Banknote,
  Compass,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Heart,
  LogIn,
  Users,
  ClipboardCheck,
  MapPin,
  Building2,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Send,
  Megaphone,
} from 'lucide-react';
import {
  saveJourney,
  getActiveJourney,
  markStepDone,
  clearJourney,
  type Journey,
  type JourneyStep,
} from '@/lib/services/journey-store';
import { VoiceSearchBar } from '@/components/public/voice/voice-search-bar';
import { SpeakButton } from '@/components/public/voice/speak-button';
import { useVoiceOutput } from '@/lib/hooks/use-voice-output';
import { useUserPreferencesStore } from '@/lib/stores/preferences';
import { useAuth } from '@/lib/hooks/use-auth';
import type { HouseholdMember } from '@/lib/household/types';
import { HOUSEHOLD_RELATIONSHIP_LABELS } from '@/lib/household/types';

// ── Example prompts ───────────────────────────────────────────────
const EXAMPLE_PROMPTS_EN = [
  'I am not feeling well',
  'I want to go abroad for work',
  'I need to get my driving license',
  'My documents were lost/stolen',
  "I'm having a baby",
  'I want to buy land',
  'I want to study abroad',
  'I want to file my taxes',
  'I need a passport',
  'I want to get citizenship',
  'I want a government job',
  'I need to file a complaint',
  'Report civic issue',
];

const EXAMPLE_PROMPTS_NE = [
  'मलाई सन्चो छैन',
  'म विदेश जान चाहन्छु',
  'मलाई ड्राइभिङ लाइसेन्स चाहिन्छ',
  'मेरो कागजात हरायो',
  'म बच्चा जन्माउँदैछु',
  'म जग्गा किन्न चाहन्छु',
  'म विदेश पढ्न जान चाहन्छु',
  'म कर फाइल गर्न चाहन्छु',
  'मलाई पासपोर्ट चाहिन्छ',
  'मलाई नागरिकता चाहिन्छ',
  'नागरिक गुनासो दर्ता गर्नुहोस्',
];

// ── Category colors ──────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  identity: 'border-blue-500/30 bg-blue-500/5',
  transport: 'border-amber-500/30 bg-amber-500/5',
  tax: 'border-emerald-500/30 bg-emerald-500/5',
  health: 'border-rose-500/30 bg-rose-500/5',
  utilities: 'border-yellow-500/30 bg-yellow-500/5',
  business: 'border-violet-500/30 bg-violet-500/5',
  land: 'border-orange-500/30 bg-orange-500/5',
  banking: 'border-cyan-500/30 bg-cyan-500/5',
  education: 'border-indigo-500/30 bg-indigo-500/5',
  legal: 'border-gray-500/30 bg-gray-500/5',
};

// ── IntakeState type (mirrors backend) ───────────────────────────
interface IntakeState {
  domain: string;
  subject: string;
  urgency: string;
  careNeed: string;
}

interface ServiceOption {
  slug: string;
  category: string;
  title: string;
  providerName: string;
}

interface CitedService {
  id?: string;
  slug: string;
  category: string;
  title: { en: string; ne: string };
  providerName: string;
}

interface RoutingInfo {
  departmentKey?: string;
  departmentName?: string;
  officeName?: string;
  authorityLevel?: string;
  roleTitle?: string;
  routingReason?: string;
  confidence?: number;
  department?: string;
  office?: string;
}

interface TaskInfo {
  id: string;
  title?: string;
  status?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  data?: {
    journey?: Journey | null;
    intakeState?: IntakeState | null;
    followUpPrompt?: string | null;
    followUpOptions?: string[];
    serviceOptions?: ServiceOption[];
    task?: TaskInfo | null;
    taskReused?: boolean;
    requiresAuth?: boolean;
    missingDocs?: string[];
    readyDocs?: string[];
    routing?: RoutingInfo | null;
    targetMember?: string | null;
    answer?: string | null;
    cited?: CitedService[];
    topService?: CitedService | null;
  };
}

// ── Step Card Component ──────────────────────────────────────────
function StepCard({
  step,
  index,
  onToggleDone,
  onSpeak,
}: {
  step: JourneyStep;
  index: number;
  onToggleDone: (i: number) => void;
  onSpeak?: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(!step.done);
  const locale = useUserPreferencesStore((s) => s.locale);
  const isNe = locale === 'ne';
  const voiceLang = locale === 'ne' ? 'ne-NP' as const : 'en-US' as const;
  const colorClass = CATEGORY_COLORS[step.category] || 'border-zinc-700/50 bg-zinc-800/30';

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-300 ${
        step.done
          ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70'
          : colorClass
      }`}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(index); }}
          className="mt-0.5 flex-shrink-0"
          aria-label={step.done ? 'Mark as not done' : 'Mark as done'}
        >
          {step.done ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-600 text-xs font-bold text-zinc-400">
              {step.order}
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className={`text-sm font-semibold ${step.done ? 'text-emerald-300 line-through' : 'text-white'}`}>
              {isNe && step.serviceTitleNe ? step.serviceTitleNe : step.serviceTitle}
            </h3>
            <SpeakButton
              text={`${step.serviceTitleNe || step.serviceTitle}. ${step.why}`}
              lang={voiceLang}
              size="sm"
            />
          </div>
          {!isNe && step.serviceTitleNe && (
            <p className="mt-0.5 text-xs text-zinc-500">{step.serviceTitleNe}</p>
          )}
          {isNe && step.serviceTitle && (
            <p className="mt-0.5 text-xs text-zinc-500">{step.serviceTitle}</p>
          )}
          <p className="mt-1 text-xs text-zinc-400">{step.why}</p>
        </div>

        {expanded ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-zinc-600" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-600" />}
      </button>

      {expanded && (
        <div className="border-t border-zinc-800/50 px-4 pb-4 pt-3">
          {step.documents.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <FileText className="h-3 w-3" />
                {isNe ? 'आवश्यक कागजातहरू' : 'Required Documents'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {step.documents.map((doc, di) => (
                  <span key={di} className="rounded-lg bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 border border-zinc-700/50">
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3 flex gap-4">
            {step.estimatedTime && step.estimatedTime !== 'Varies' && step.estimatedTime !== 'फरक पर्छ' && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                {step.estimatedTime}
              </div>
            )}
            {step.fee && step.fee !== 'Varies' && step.fee !== 'फरक पर्छ' && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Banknote className="h-3.5 w-3.5 text-zinc-500" />
                {step.fee}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/services/${step.category}/${step.serviceSlug}/apply`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC143C] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#DC143C]/80 active:scale-95"
            >
              {isNe ? 'यो चरण सुरु गर्नुहोस्' : 'Start this step'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {step.portalUrl && (
              <a href={step.portalUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 active:scale-95">
                {isNe ? 'आधिकारिक पोर्टल' : 'Official Portal'}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────
function ProgressBar({ steps }: { steps: JourneyStep[] }) {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const locale = useUserPreferencesStore((s) => s.locale);
  const isNe = locale === 'ne';

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          {isNe ? `${total} मध्ये ${done} चरण पूरा भयो` : `${done} of ${total} steps completed`}
        </span>
        <span className="text-xs font-bold text-zinc-300">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-[#DC143C] to-emerald-500 transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Urgency Badge ─────────────────────────────────────────────────
function UrgencyBadge({ urgency, isNe }: { urgency: string; isNe: boolean }) {
  if (urgency === 'today') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
        <AlertTriangle className="h-3 w-3" />
        {isNe ? 'आजै चाहिन्छ' : 'URGENT -- Today'}
      </span>
    );
  }
  if (urgency === 'soon') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
        {isNe ? 'चाँडै' : 'Soon'}
      </span>
    );
  }
  return null;
}

// ── Task Created Card ─────────────────────────────────────────────
function TaskCreatedCard({
  task,
  taskReused,
  missingDocs,
  readyDocs,
  routing,
  isNe,
}: {
  task: TaskInfo;
  taskReused?: boolean;
  missingDocs?: string[];
  readyDocs?: string[];
  routing?: RoutingInfo | null;
  isNe: boolean;
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck className="h-5 w-5 text-emerald-400" />
        <span className="text-sm font-bold text-emerald-300">
          {taskReused
            ? (isNe ? 'पहिलेको कार्य फेला पर्यो' : 'Existing task found')
            : (isNe ? 'कार्य सिर्जना भयो' : 'Task created')}
        </span>
      </div>

      {task.title && (
        <p className="text-sm text-zinc-300 mb-2">{task.title}</p>
      )}

      {/* Routing info */}
      {routing && (routing.departmentName || routing.officeName) && (
        <div className="mb-3 flex flex-wrap gap-3">
          {routing.departmentName && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Building2 className="h-3.5 w-3.5 text-zinc-500" />
              {routing.departmentName}
            </div>
          )}
          {routing.officeName && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <MapPin className="h-3.5 w-3.5 text-zinc-500" />
              {routing.officeName}
            </div>
          )}
        </div>
      )}

      {/* Doc readiness */}
      {((readyDocs && readyDocs.length > 0) || (missingDocs && missingDocs.length > 0)) && (
        <div className="mb-3 space-y-2">
          {readyDocs && readyDocs.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                <ShieldCheck className="h-3 w-3" />
                {isNe ? 'तयार कागजातहरू' : 'Ready documents'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {readyDocs.map((doc, i) => (
                  <span key={i} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 border border-emerald-500/20">
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}
          {missingDocs && missingDocs.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                <ShieldAlert className="h-3 w-3" />
                {isNe ? 'हराइरहेका कागजातहरू' : 'Missing documents'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingDocs.map((doc, i) => (
                  <span key={i} className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300 border border-amber-500/20">
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Link
        href="/me/tasks"
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 active:scale-95"
      >
        {isNe ? 'मेरा कार्यहरू हेर्नुहोस्' : 'View My Cases'}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ── Auth Gate Card ────────────────────────────────────────────────
function AuthGateCard({ isNe }: { isNe: boolean }) {
  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <LogIn className="h-5 w-5 text-blue-400" />
        <span className="text-sm font-bold text-blue-300">
          {isNe ? 'लगइन आवश्यक छ' : 'Sign in required'}
        </span>
      </div>
      <p className="text-xs text-zinc-400 mb-3">
        {isNe
          ? 'आफ्नो प्रगति ट्र्याक गर्न र कार्यहरू सिर्जना गर्न साइन इन गर्नुहोस्।'
          : 'Sign in to track your progress and create tasks.'}
      </p>
      <Link
        href="/login?redirect=/advisor"
        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 active:scale-95"
      >
        <LogIn className="h-3.5 w-3.5" />
        {isNe ? 'साइन इन गर्नुहोस्' : 'Sign in'}
      </Link>
    </div>
  );
}

// ── Chat Bubble ──────────────────────────────────────────────────
function ChatBubble({ message, isNe }: { message: ConversationMessage; isNe: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
          isUser
            ? 'bg-[#DC143C] text-white'
            : 'bg-zinc-800/80 text-zinc-200'
        }`}
      >
        {message.text}
        {/* Cited services in assistant bubbles */}
        {!isUser && message.data?.cited && message.data.cited.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-zinc-700/50 pt-2">
            <div className="text-[10px] uppercase text-zinc-500 mb-1">
              {isNe ? 'सम्बन्धित सेवा' : 'Related services'}
            </div>
            {message.data.cited.slice(0, 3).map((c) => (
              <Link
                key={c.slug}
                href={`/services/${c.category}/${c.slug}`}
                className="block text-[11px] text-[#DC143C]/80 hover:text-[#DC143C] hover:underline"
              >
                {isNe ? c.title.ne : c.title.en}
              </Link>
            ))}
          </div>
        )}
        {/* Top service action */}
        {!isUser && message.data?.topService && (
          <div className="mt-2">
            <Link
              href={`/services/${message.data.topService.category}/${message.data.topService.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC143C]/10 px-3 py-1.5 text-[11px] font-semibold text-[#DC143C] hover:bg-[#DC143C]/20"
            >
              {isNe ? 'यो सेवा सुरु गर्नुहोस्' : 'Start this service'}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page Wrapper ─────────────────────────────────────────────
export default function AdvisorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <AdvisorPageInner />
    </Suspense>
  );
}

// ── Main Page Component ───────────────────────────────────────────
function AdvisorPageInner() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState<string | null>(null);
  const [followUpOptions, setFollowUpOptions] = useState<string[]>([]);
  const [intakeState, setIntakeState] = useState<IntakeState | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [followUpText, setFollowUpText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const followUpRef = useRef<HTMLInputElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const locale = useUserPreferencesStore((s) => s.locale);
  const isNe = locale === 'ne';
  const voiceLang = isNe ? 'ne-NP' as const : 'en-US' as const;
  const { speak } = useVoiceOutput({ lang: voiceLang });
  const didAutoSubmitRef = useRef(false);

  // Auth state
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  // Household members
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [targetMemberId, setTargetMemberId] = useState('');

  // Conversation history
  const [history, setHistory] = useState<ConversationMessage[]>([]);

  // Task creation results
  const [taskResult, setTaskResult] = useState<TaskInfo | null>(null);
  const [taskReused, setTaskReused] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [missingDocs, setMissingDocs] = useState<string[]>([]);
  const [readyDocs, setReadyDocs] = useState<string[]>([]);
  const [routing, setRouting] = useState<RoutingInfo | null>(null);

  // Fetch household members when authenticated
  useEffect(() => {
    if (!authReady || !user) return;
    fetch('/api/me/household-members')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setMembers(data?.members || []))
      .catch(() => setMembers([]));
  }, [authReady, user]);

  // Initialize auth
  useEffect(() => {
    const init = useAuth.getState().initialize;
    init();
  }, []);

  // Load saved journey on mount, or handle ?q= param from landing page
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam && !didAutoSubmitRef.current) {
      didAutoSubmitRef.current = true;
      setQuery(qParam);
      setTimeout(() => handleSubmit(qParam), 100);
      return;
    }
    const saved = getActiveJourney();
    if (saved) {
      setJourney(saved);
      setQuery(saved.query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom on new history
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = useCallback(
    async (q?: string) => {
      const searchQuery = (q || query).trim();
      if (!searchQuery) return;

      setLoading(true);
      setError(null);
      setFollowUpPrompt(null);
      setFollowUpOptions([]);
      setIntakeState(null);
      setServiceOptions([]);
      setTaskResult(null);
      setTaskReused(false);
      setRequiresAuth(false);
      setMissingDocs([]);
      setReadyDocs([]);
      setRouting(null);
      setQuery(searchQuery);

      // Add user message to history
      setHistory((prev) => [...prev, { role: 'user', text: searchQuery }]);

      try {
        const res = await fetch('/api/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            locale,
            targetMemberId: targetMemberId || undefined,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to get advice');
        }

        const data = await res.json();

        // Store intake state & follow-ups regardless
        if (data.intakeState) setIntakeState(data.intakeState);
        if (data.followUpPrompt) setFollowUpPrompt(data.followUpPrompt);
        if (data.followUpOptions?.length) setFollowUpOptions(data.followUpOptions);
        if (data.serviceOptions?.length) setServiceOptions(data.serviceOptions);

        // Task creation results
        if (data.task) {
          setTaskResult(data.task);
          setTaskReused(!!data.taskReused);
        }
        if (data.requiresAuth) setRequiresAuth(true);
        if (data.missingDocs?.length) setMissingDocs(data.missingDocs.map((d: any) => typeof d === 'string' ? d : d.label || d.docType || String(d)));
        if (data.readyDocs?.length) setReadyDocs(data.readyDocs.map((d: any) => typeof d === 'string' ? d : d.label || d.docType || String(d)));
        if (data.routing) setRouting(data.routing);

        // Build assistant response text
        const assistantText =
          data.answer ||
          data.summary ||
          (isNe ? 'सम्बन्धित जानकारी तल हेर्नुहोस्।' : 'See results below.');

        // Add assistant message to history
        setHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: assistantText,
            data: {
              journey: null,
              intakeState: data.intakeState || null,
              followUpPrompt: data.followUpPrompt || null,
              followUpOptions: data.followUpOptions || [],
              serviceOptions: data.serviceOptions || [],
              task: data.task || null,
              taskReused: data.taskReused || false,
              requiresAuth: data.requiresAuth || false,
              missingDocs: (data.missingDocs || []).map((d: any) => typeof d === 'string' ? d : d.label || d.docType || String(d)),
              readyDocs: (data.readyDocs || []).map((d: any) => typeof d === 'string' ? d : d.label || d.docType || String(d)),
              routing: data.routing || null,
              targetMember: data.targetMember || null,
              answer: data.answer || null,
              cited: data.cited || [],
              topService: data.topService || null,
            },
          },
        ]);

        if (!data.matched && (!data.steps || data.steps.length === 0)) {
          // Truly no match and no AI general answer
          setError(
            data.summary ||
              (isNe ? 'सम्बन्धित सेवा भेटिएन। अर्को शब्दमा भन्नुहोस्।' : 'Could not find matching services. Try a different question.'),
          );
          setJourney(null);

          // Speak the follow-up prompt if there is one
          if (data.followUpPrompt) {
            setTimeout(() => speak(data.followUpPrompt), 500);
          }
          return;
        }

        // AI general answer (no steps but has content) — show as conversation, not error
        if (data.matched && (!data.steps || data.steps.length === 0) && (data.source === 'ai-general' || data.source === 'ai')) {
          setJourney(null);
          // Speak the summary
          if (data.summary) {
            setTimeout(() => speak(data.summary), 500);
          }
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
          return;
        }

        if (!data.steps || data.steps.length === 0) {
          setJourney(null);
          return;
        }

        const saved = saveJourney(searchQuery, data.steps, data.summary);
        setJourney(saved);

        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        if (data.summary) {
          setTimeout(() => speak(data.summary), 500);
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
        setHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: err.message || (isNe ? 'केही गलत भयो।' : 'Something went wrong.'),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, speak, locale, isNe, targetMemberId],
  );

  const handleFollowUp = useCallback(
    (option: string) => {
      const combined = query ? `${query}. ${option}` : option;
      setQuery(combined);
      handleSubmit(combined);
    },
    [query, handleSubmit],
  );

  const handleFollowUpTextSubmit = useCallback(() => {
    const text = followUpText.trim();
    if (!text) return;
    setFollowUpText('');
    const combined = query ? `${query}. ${text}` : text;
    setQuery(combined);
    handleSubmit(combined);
  }, [followUpText, query, handleSubmit]);

  const handleToggleDone = useCallback(
    (index: number) => {
      if (!journey) return;
      const step = journey.steps[index];
      if (step.done) {
        const updated = { ...journey };
        updated.steps = updated.steps.map((s, i) => i === index ? { ...s, done: false } : s);
        try { localStorage.setItem('nepal-republic-journey', JSON.stringify(updated)); } catch {}
        setJourney(updated);
      } else {
        const updated = markStepDone(index);
        if (updated) setJourney({ ...updated });
      }
    },
    [journey],
  );

  const handleClear = useCallback(() => {
    clearJourney();
    setJourney(null);
    setQuery('');
    setError(null);
    setFollowUpPrompt(null);
    setFollowUpOptions([]);
    setIntakeState(null);
    setServiceOptions([]);
    setHistory([]);
    setTaskResult(null);
    setTaskReused(false);
    setRequiresAuth(false);
    setMissingDocs([]);
    setReadyDocs([]);
    setRouting(null);
    setFollowUpText('');
    setTargetMemberId('');
    inputRef.current?.focus();
  }, []);

  const examplePrompts = isNe ? EXAMPLE_PROMPTS_NE : EXAMPLE_PROMPTS_EN;
  const hasResults = journey || error || taskResult || requiresAuth;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/services"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#DC143C]" />
              {isNe ? 'सेवा सल्लाहकार' : 'Service Advisor'}
            </h1>
            <p className="text-[11px] text-zinc-500">
              {isNe ? 'के चाहिन्छ भन्नुहोस्, हामी बाटो देखाउँछौं' : 'Tell us what you need, we\'ll show you the steps'}
            </p>
          </div>
          {/* Report civic issue link */}
          <Link
            href="/complaints"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isNe ? 'गुनासो' : 'Report Issue'}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        {/* Voice-first search bar */}
        <div className="mb-6">
          <div className="text-center mb-3">
            <p className="text-lg font-bold text-white">
              {isNe ? 'म तपाईंलाई कसरी मद्दत गर्न सक्छु?' : 'What can I help you with?'}
            </p>
            <p className="text-xs text-zinc-500">
              {isNe ? 'पासपोर्ट, लाइसेन्स, अस्पताल, बिल — जे चाहिन्छ भन्नुहोस्' : 'Passport, license, hospital, bills — tell me what you need'}
            </p>
          </div>
          <VoiceSearchBar
            onSubmit={(text) => handleSubmit(text)}
            size="hero"
            placeholder="e.g. I need a passport, I'm not feeling well..."
            placeholderNe="जस्तै: पासपोर्ट चाहिन्छ, सन्चो छैन..."
            disabled={loading}
            initialValue={query}
          />

          {/* Household member selector */}
          {isAuthenticated && members.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <Users className="h-3.5 w-3.5 text-zinc-500" />
              <select
                value={targetMemberId}
                onChange={(e) => setTargetMemberId(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 focus:border-[#DC143C]/50 focus:outline-none"
              >
                <option value="">{isNe ? 'मेरो लागि' : 'For me'}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName} · {HOUSEHOLD_RELATIONSHIP_LABELS[member.relationship][locale]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading && (
            <div className="mt-3 flex items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{isNe ? 'खोजिँदै...' : 'Finding your service journey...'}</span>
            </div>
          )}
        </div>

        {/* Conversation history (compact chat bubbles) */}
        {history.length > 1 && (
          <div className="mb-6 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              {isNe ? 'कुराकानी' : 'Conversation'}
            </p>
            {/* Show all but the last assistant message as compact bubbles */}
            {history.slice(0, -1).map((msg, i) => (
              <ChatBubble key={i} message={msg} isNe={isNe} />
            ))}
          </div>
        )}

        {/* Urgency badge */}
        {intakeState?.urgency && intakeState.urgency !== 'unknown' && (
          <div className="mb-4 flex justify-center">
            <UrgencyBadge urgency={intakeState.urgency} isNe={isNe} />
          </div>
        )}

        {/* Auth gate */}
        {requiresAuth && !isAuthenticated && (
          <div className="mb-6">
            <AuthGateCard isNe={isNe} />
          </div>
        )}

        {/* Task creation result */}
        {taskResult && (
          <div className="mb-6">
            <TaskCreatedCard
              task={taskResult}
              taskReused={taskReused}
              missingDocs={missingDocs}
              readyDocs={readyDocs}
              routing={routing}
              isNe={isNe}
            />
          </div>
        )}

        {/* Error / clarification state */}
        {error && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            {/* Health domain icon */}
            {intakeState?.domain === 'health' && (
              <div className="mb-2 flex items-center gap-2 text-rose-400">
                <Heart className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isNe ? 'स्वास्थ्य सम्बन्धी' : 'Health Related'}
                </span>
              </div>
            )}
            <p className="text-sm text-amber-200">{error}</p>

            {/* Follow-up prompt */}
            {followUpPrompt && (
              <p className="mt-2 text-sm font-medium text-white">{followUpPrompt}</p>
            )}

            {/* Follow-up option chips */}
            {followUpOptions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {followUpOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleFollowUp(option)}
                    disabled={loading}
                    className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-200 transition-all hover:border-[#DC143C]/40 hover:bg-[#DC143C]/10 hover:text-white active:scale-95 disabled:opacity-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Service options as fallback cards */}
            {serviceOptions.length > 0 && followUpOptions.length === 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {isNe ? 'सम्भावित सेवाहरू' : 'Possible services'}
                </p>
                {serviceOptions.map((so) => (
                  <Link
                    key={so.slug}
                    href={`/services/${so.category}/${so.slug}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 transition-all hover:border-zinc-700 hover:bg-zinc-800/50"
                  >
                    <div>
                      <span className="text-sm font-medium text-white">{so.title}</span>
                      <span className="ml-2 text-[10px] text-zinc-500">{so.providerName}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Journey results */}
        {journey && (
          <div ref={resultsRef}>
            {/* Summary */}
            <div className="mb-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4">
              {intakeState?.domain === 'health' && (
                <div className="mb-2 flex items-center gap-2 text-rose-400">
                  <Heart className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isNe ? 'स्वास्थ्य सेवा' : 'Health Service'}
                  </span>
                </div>
              )}
              <p className="text-sm leading-relaxed text-zinc-300">{journey.summary}</p>
              <div className="mt-3 flex items-center gap-2">
                <SpeakButton
                  text={journey.summary}
                  lang={voiceLang}
                  label={isNe ? 'सुन्नुहोस्' : 'Listen'}
                  size="md"
                />
              </div>
            </div>

            {/* Read full journey aloud */}
            <div className="mb-4 flex justify-center">
              <SpeakButton
                text={
                  journey.summary + '. ' +
                  journey.steps.map((s, i) => `${isNe ? 'चरण' : 'Step'} ${i + 1}: ${s.serviceTitleNe || s.serviceTitle}. ${s.why}`).join('. ')
                }
                lang={voiceLang}
                label={isNe ? 'पूरा यात्रा सुन्नुहोस्' : 'Listen to full journey'}
                size="md"
              />
            </div>

            <ProgressBar steps={journey.steps} />

            {/* Steps */}
            <div className="space-y-3">
              {journey.steps.map((step, i) => (
                <StepCard
                  key={`${step.serviceSlug}-${i}`}
                  step={step}
                  index={i}
                  onToggleDone={handleToggleDone}
                  onSpeak={(text) => speak(text)}
                />
              ))}
            </div>

            {/* Follow-up options even after journey match (AI refinement) */}
            {followUpOptions.length > 0 && (
              <div className="mt-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4">
                {followUpPrompt && (
                  <p className="mb-2 text-sm text-zinc-400">{followUpPrompt}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {followUpOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleFollowUp(option)}
                      disabled={loading}
                      className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-200 transition-all hover:border-[#DC143C]/40 hover:bg-[#DC143C]/10 hover:text-white active:scale-95 disabled:opacity-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear / Start over */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 rounded-xl border border-zinc-800 px-5 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {isNe ? 'नयाँ खोज' : 'Start Over'}
              </button>
            </div>
          </div>
        )}

        {/* Follow-up input — shown after any results */}
        {hasResults && !loading && (
          <div className="mt-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-3">
            <div className="flex items-center gap-2">
              <input
                ref={followUpRef}
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFollowUpTextSubmit();
                }}
                placeholder={isNe ? 'थप प्रश्न सोध्नुहोस्...' : 'Ask a follow-up...'}
                className="flex-1 rounded-xl border border-zinc-700/50 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#DC143C]/50 focus:outline-none"
              />
              <button
                onClick={handleFollowUpTextSubmit}
                disabled={!followUpText.trim() || loading}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DC143C] text-white transition-all hover:bg-[#DC143C]/80 active:scale-95 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={scrollEndRef} />

        {/* Example prompts — show when no journey */}
        {!journey && !error && !taskResult && !requiresAuth && (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
                {isNe ? 'यसरी सोध्नुहोस्' : 'Try asking'}
              </p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setQuery(prompt); handleSubmit(prompt); }}
                    disabled={loading}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-xs text-zinc-300 transition-all hover:border-[#DC143C]/30 hover:bg-[#DC143C]/5 hover:text-white active:scale-95 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Report civic issue prominent button */}
            <Link
              href="/complaints"
              className="flex items-center gap-3 rounded-2xl border border-[#DC143C]/20 bg-[#DC143C]/5 p-4 transition-all hover:border-[#DC143C]/40 hover:bg-[#DC143C]/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DC143C]/10">
                <Megaphone className="h-5 w-5 text-[#DC143C]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {isNe ? 'नागरिक गुनासो दर्ता गर्नुहोस्' : 'Report a Civic Issue'}
                </p>
                <p className="text-xs text-zinc-500">
                  {isNe ? 'सडक, पानी, बिजुली, सफाई — कुनै पनि समस्या रिपोर्ट गर्नुहोस्' : 'Roads, water, electricity, sanitation — report any problem'}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </Link>

            <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4">
              <p className="text-xs leading-relaxed text-zinc-500">
                {isNe
                  ? 'सेवा सल्लाहकारले तपाईंलाई कुन सरकारी सेवा चाहिन्छ र कुन क्रममा भन्ने पत्ता लगाउन मद्दत गर्छ। आफ्नो लक्ष्य भन्नुहोस् र हामी आवश्यक कागजात, शुल्क, र आधिकारिक पोर्टलको लिंकसहित चरणबद्ध योजना बनाउँछौं।'
                  : 'The Service Advisor helps you figure out which government services you need and in what order. Tell us your goal and we\'ll create a step-by-step plan with required documents, fees, and direct links to official portals.'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
