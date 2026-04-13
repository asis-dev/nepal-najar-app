'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { useVoiceInput } from '@/lib/hooks/use-voice-input';
import { useVoiceOutput } from '@/lib/hooks/use-voice-output';
import { useUserPreferencesStore } from '@/lib/stores/preferences';
import type { HouseholdMember } from '@/lib/household/types';
import { HOUSEHOLD_RELATIONSHIP_LABELS } from '@/lib/household/types';

interface ServiceOption {
  slug: string;
  category: string;
  title: { en: string; ne: string };
  providerName: string;
}

interface ServiceDocument {
  title: { en: string; ne: string };
  required: boolean;
  notes?: { en: string; ne: string };
}

interface ServiceStep {
  order: number;
  title: { en: string; ne: string };
  detail: { en: string; ne: string };
}

interface ServiceOffice {
  name: { en: string; ne: string };
  address: { en: string; ne: string };
  phone?: string;
  hours?: { en: string; ne: string };
  mapsUrl?: string;
}

interface DocStatusEntry {
  docType: string;
  label: string;
  haveIt: boolean;
}

interface ServicePreview {
  slug: string;
  category: string;
  title: { en: string; ne: string };
  providerName: string;
  summary?: { en: string; ne: string } | null;
  estimatedTime?: { en: string; ne: string } | null;
  feeRange?: { en: string; ne: string } | null;
  officialUrl?: string | null;
  documents: ServiceDocument[];
  steps: ServiceStep[];
  offices: ServiceOffice[];
}

interface PreviewData {
  service: ServicePreview;
  docStatus: { missingDocs: DocStatusEntry[]; readyDocs: DocStatusEntry[] } | null;
  authenticated: boolean;
  routeReason?: string;
}

const CYCLING_PLACEHOLDERS_EN = [
  'I need a passport...',
  'Report a broken road near me...',
  'How do I get a driving license?',
  'My water supply is cut off...',
  'I need a citizenship certificate...',
  'How to file taxes?',
  'Streetlight not working...',
  'I want to register a business...',
  'Report garbage not collected...',
  'Birth certificate for my child...',
  'Pothole on my street...',
  'Land registration process...',
  'My hospital bill is wrong...',
  'Report construction dust problem...',
  'How to complain about corruption?',
];

const CYCLING_PLACEHOLDERS_NE = [
  'मलाई पासपोर्ट चाहिन्छ...',
  'सडक भत्किएको छ रिपोर्ट गर्ने...',
  'ड्राइभिङ लाइसेन्स कसरी बनाउने?',
  'खानेपानी आउँदैन...',
  'नागरिकता प्रमाणपत्र चाहिन्छ...',
  'कर कसरी फाइल गर्ने?',
  'बत्ती बलेको छैन...',
  'व्यापार दर्ता गर्नु छ...',
  'फोहोर उठाएको छैन...',
  'बच्चाको जन्म दर्ता...',
  'सडकमा खाल्डा छ...',
  'जग्गा दर्ता प्रक्रिया...',
  'अस्पताल बिल गलत छ...',
  'निर्माणको धुलो समस्या...',
  'भ्रष्टाचार उजुरी कसरी गर्ने?',
];

export function TaskRouter({ locale: localeProp }: { locale?: 'en' | 'ne' }) {
  const router = useRouter();
  const storeLocale = useUserPreferencesStore((s) => s.locale);
  const locale = localeProp ?? storeLocale ?? 'en';
  const isNe = locale === 'ne';

  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeReason, setRouteReason] = useState<string | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState<string | null>(null);
  const [followUpOptions, setFollowUpOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [targetMemberId, setTargetMemberId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track whether last input came from voice (only speak responses for voice input)
  const inputSourceRef = useRef<'voice' | 'text'>('text');

  // Voice output — Nepali: HemkalaNeural, English: AriaNeural
  const voiceLang = isNe ? 'ne-NP' as const : 'en-US' as const;
  const { speak, stop: stopSpeaking } = useVoiceOutput({ lang: voiceLang });

  // Cycle placeholder every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % CYCLING_PLACEHOLDERS_EN.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Session ID for multi-turn routing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = `nr-task-router-session-${locale}`;
    const existing = window.localStorage.getItem(storageKey);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const created = window.crypto?.randomUUID?.() || `router-${Date.now()}`;
    window.localStorage.setItem(storageKey, created);
    setSessionId(created);
  }, [locale]);

  // Load household members
  useEffect(() => {
    if (!authReady || !user) return;
    fetch('/api/me/household-members')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setMembers(data?.members || []))
      .catch(() => setMembers([]));
  }, [authReady, user]);

  // Voice input
  const handleVoiceResult = useCallback((voiceText: string) => {
    inputSourceRef.current = 'voice';
    setQuestion(voiceText);
    setTimeout(() => routeQuestion(voiceText), 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error: voiceError,
  } = useVoiceInput({ onResult: handleVoiceResult });

  // Show interim transcript live
  useEffect(() => {
    if (interimTranscript && isListening) {
      setQuestion(interimTranscript);
    }
  }, [interimTranscript, isListening]);

  async function routeQuestion(nextQuestion: string) {
    if (!nextQuestion.trim() || loading) return;
    setLoading(true);
    setError(null);
    setRouteReason(null);
    setFollowUpPrompt(null);
    setFollowUpOptions([]);
    setServiceOptions([]);
    setPreview(null);
    setAiAnswer(null);
    stopSpeaking();

    const wasVoice = inputSourceRef.current === 'voice';

    try {
      // Use the advisor API — it has full AI understanding (GPT-4o-mini intent +
      // Gemini general answers) not just service catalog matching
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nextQuestion,
          locale,
          targetMemberId: targetMemberId || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Could not process that request.');
        return;
      }

      // ── AI gave a general answer (food, health advice, life question, etc.) ──
      if (data.source === 'ai-general' || (!data.matched && data.summary)) {
        const answer = data.aiAnswer || data.summary || null;
        if (answer) {
          setAiAnswer(answer);
          setFollowUpPrompt(data.followUpPrompt || null);
          setFollowUpOptions(data.followUpOptions || []);

          if (wasVoice) {
            setTimeout(() => speak(answer.slice(0, 400)), 300);
          }
          return;
        }
      }

      // ── Task already created (authenticated user + confident match) ──
      if (data.task) {
        // Show the service preview card with task info instead of redirecting
        const topSvc = data.topService || data.task;
        if (topSvc) {
          // Fetch full service details for the preview card
          try {
            const previewRes = await fetch('/api/me/service-tasks/from-query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: nextQuestion,
                locale,
                targetMemberId: targetMemberId || undefined,
                mode: 'preview',
              }),
            });
            const previewData = await previewRes.json();
            if (previewData.preview && previewData.service) {
              setPreview({
                service: previewData.service,
                docStatus: previewData.docStatus || null,
                authenticated: previewData.authenticated,
                routeReason: data.summary || previewData.routeReason,
              });
              if (wasVoice) {
                const title = isNe ? previewData.service.title.ne : previewData.service.title.en;
                setTimeout(() => speak(title), 300);
              }
              return;
            }
          } catch { /* fall through */ }
        }
        router.push('/me/tasks');
        return;
      }

      // ── Confident service match but not authenticated ──
      if (data.requiresAuth && data.topService) {
        // Show preview card with sign-in prompt
        try {
          const previewRes = await fetch('/api/me/service-tasks/from-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: nextQuestion,
              locale,
              targetMemberId: targetMemberId || undefined,
              mode: 'preview',
            }),
          });
          const previewData = await previewRes.json();
          if (previewData.preview && previewData.service) {
            setPreview({
              service: previewData.service,
              docStatus: null,
              authenticated: false,
              routeReason: data.summary || previewData.routeReason,
            });
            if (wasVoice) {
              const title = isNe ? previewData.service.title.ne : previewData.service.title.en;
              setTimeout(() => speak(title), 300);
            }
            return;
          }
        } catch { /* fall through */ }
      }

      // ── Matched service with journey steps ──
      if (data.matched && data.topService) {
        try {
          const previewRes = await fetch('/api/me/service-tasks/from-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: nextQuestion,
              locale,
              targetMemberId: targetMemberId || undefined,
              mode: 'preview',
            }),
          });
          const previewData = await previewRes.json();
          if (previewData.preview && previewData.service) {
            setPreview({
              service: previewData.service,
              docStatus: previewData.docStatus || null,
              authenticated: previewData.authenticated,
              routeReason: data.summary || previewData.routeReason,
            });
            if (wasVoice) {
              const title = isNe ? previewData.service.title.ne : previewData.service.title.en;
              setTimeout(() => speak(title), 300);
            }
            return;
          }
        } catch { /* fall through */ }
      }

      // ── Ambiguous / follow-ups needed (health triage, multiple options, etc.) ──
      if (data.followUpPrompt || data.followUpOptions?.length || data.serviceOptions?.length) {
        setRouteReason(data.summary || data.routeReason || null);
        setFollowUpPrompt(data.followUpPrompt || null);
        setFollowUpOptions(data.followUpOptions || []);
        setServiceOptions(data.serviceOptions || []);

        if (wasVoice && (data.followUpPrompt || data.summary)) {
          setTimeout(() => speak(data.followUpPrompt || data.summary), 300);
        }
        return;
      }

      // ── AI gave a summary/answer without follow-ups ──
      if (data.summary || data.aiAnswer) {
        setAiAnswer(data.aiAnswer || data.summary);
        if (wasVoice) {
          setTimeout(() => speak((data.aiAnswer || data.summary).slice(0, 400)), 300);
        }
        return;
      }

      // ── Nothing matched at all ──
      setError(isNe
        ? 'माफ गर्नुहोस्, मैले बुझ्न सकिनँ। कृपया अर्को तरिकाले भन्नुहोस्।'
        : 'I couldn\'t understand that. Could you try rephrasing?');
    } catch {
      setError('Something went wrong while routing your request.');
    } finally {
      setLoading(false);
      inputSourceRef.current = 'text';
    }
  }

  async function startService() {
    if (!preview || starting) return;
    setStarting(true);
    try {
      // Use advisor API which handles task creation for authenticated users
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          locale,
          targetMemberId: targetMemberId || undefined,
        }),
      });
      const data = await response.json();

      if (data.requiresAuth) {
        router.push(`/services/${preview.service.category}/${preview.service.slug}`);
        return;
      }

      if (data.task) {
        router.push('/me/tasks');
        return;
      }

      // Fallback: navigate to service page
      router.push(`/services/${preview.service.category}/${preview.service.slug}`);
    } catch {
      setError('Something went wrong starting this service.');
    } finally {
      setStarting(false);
    }
  }

  const handleSubmit = useCallback(() => {
    const trimmed = question.trim();
    if (trimmed && !loading) {
      routeQuestion(trimmed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, loading]);

  const currentPlaceholder = isNe
    ? CYCLING_PLACEHOLDERS_NE[placeholderIdx]
    : CYCLING_PLACEHOLDERS_EN[placeholderIdx];

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          {isNe ? 'म तपाईंलाई कसरी मद्दत गर्न सक्छु?' : 'What can I help you with?'}
        </h2>
      </div>

      {/* Unified voice + text search bar with gradient border */}
      <div className="relative">
        <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-[#DC143C] via-[#003893] to-[#DC143C] opacity-60 blur-[2px] animate-gradient-shift" />

        <div
          className={`relative flex items-center gap-2 bg-zinc-900 border rounded-3xl border-zinc-700/50 px-5 py-4 transition-colors ${
            isListening ? 'border-[#DC143C]/50 ring-2 ring-[#DC143C]/20' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleSubmit(); }}
            placeholder={currentPlaceholder}
            disabled={loading || isListening}
            className={`flex-1 min-w-0 bg-transparent text-lg text-white outline-none placeholder-zinc-500 ${
              isListening ? 'text-zinc-400 italic' : ''
            }`}
          />

          {/* Household member selector */}
          {user && members.length > 0 && (
            <select
              value={targetMemberId}
              onChange={(e) => setTargetMemberId(e.target.value)}
              className="hidden md:block rounded-xl border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none max-w-[140px]"
            >
              <option value="">{isNe ? 'मेरो लागि' : 'For me'}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} · {HOUSEHOLD_RELATIONSHIP_LABELS[member.relationship][locale]}
                </option>
              ))}
            </select>
          )}

          {/* Submit button */}
          {question.trim() && !isListening && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-shrink-0 rounded-xl bg-[#DC143C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#DC143C]/80 active:scale-95 disabled:opacity-40"
            >
              {loading
                ? (isNe ? 'रुट गर्दै…' : 'Routing…')
                : (isNe ? 'खोज्नुहोस्' : 'Go')}
            </button>
          )}

          {/* Mic button */}
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={loading}
              className={`relative flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 h-14 w-14 ${
                isListening
                  ? 'bg-[#DC143C] shadow-[0_0_24px_rgba(220,20,60,0.5)]'
                  : 'bg-zinc-700 hover:bg-zinc-600'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-[#DC143C] animate-voice-pulse opacity-40" />
                  <span className="absolute inset-0 rounded-full bg-[#DC143C] animate-voice-pulse-delayed opacity-20" />
                </>
              )}
              <svg
                className="text-white relative z-10 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {isListening ? (
                  <>
                    <rect x="4" y="8" width="2" height="8" rx="1" fill="currentColor" className="animate-voice-bar-1" />
                    <rect x="8" y="5" width="2" height="14" rx="1" fill="currentColor" className="animate-voice-bar-2" />
                    <rect x="12" y="3" width="2" height="18" rx="1" fill="currentColor" className="animate-voice-bar-3" />
                    <rect x="16" y="5" width="2" height="14" rx="1" fill="currentColor" className="animate-voice-bar-2" />
                    <rect x="20" y="8" width="2" height="8" rx="1" fill="currentColor" className="animate-voice-bar-1" />
                  </>
                ) : (
                  <>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Voice error */}
      {voiceError && (
        <p className="mt-2 text-xs text-red-400 text-center">{voiceError}</p>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="flex gap-0.5">
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-1" />
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-2" />
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-3" />
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-2" />
            <span className="h-2 w-0.5 rounded-full bg-[#DC143C] animate-voice-bar-1" />
          </div>
          <span className="text-xs text-zinc-500 animate-pulse">
            {isNe ? 'सुन्दैछ...' : 'Listening...'}
          </span>
        </div>
      )}

      {/* Error from routing */}
      {error && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-center">
          {error}
        </div>
      )}

      {/* ── Rich service preview card ── */}
      {preview && (
        <div className="mt-4 rounded-2xl border border-zinc-700/50 bg-zinc-950/90 backdrop-blur overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#DC143C]/15 to-[#003893]/15 px-5 py-4 border-b border-zinc-800/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#DC143C]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#DC143C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white leading-tight">
                  {isNe ? preview.service.title.ne : preview.service.title.en}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">{preview.service.providerName}</p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 p-1"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {preview.service.summary && (
              <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                {isNe ? preview.service.summary.ne : preview.service.summary.en}
              </p>
            )}
          </div>

          {/* Quick facts row */}
          <div className="grid grid-cols-2 gap-px bg-zinc-800/30">
            {preview.service.feeRange && (
              <div className="bg-zinc-950/90 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                  {isNe ? 'शुल्क' : 'Fees'}
                </div>
                <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                  {isNe ? preview.service.feeRange.ne : preview.service.feeRange.en}
                </div>
              </div>
            )}
            {preview.service.estimatedTime && (
              <div className="bg-zinc-950/90 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                  {isNe ? 'अवधि' : 'Timeline'}
                </div>
                <div className="text-sm font-semibold text-blue-400 mt-0.5">
                  {isNe ? preview.service.estimatedTime.ne : preview.service.estimatedTime.en}
                </div>
              </div>
            )}
          </div>

          {/* Documents section */}
          {preview.service.documents.length > 0 && (
            <div className="px-5 py-4 border-t border-zinc-800/50">
              <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">
                {isNe ? 'आवश्यक कागजातहरू' : 'Documents Required'}
              </h4>
              <div className="space-y-2">
                {preview.service.documents.map((doc, i) => {
                  // Check if user has this doc in vault
                  const vaultMatch = preview.docStatus
                    ? [...(preview.docStatus.readyDocs || []), ...(preview.docStatus.missingDocs || [])].find(
                        (d) => {
                          const titleLower = doc.title.en.toLowerCase();
                          return titleLower.includes(d.label.toLowerCase()) || d.label.toLowerCase().includes(titleLower.split(' ')[0]?.toLowerCase());
                        }
                      )
                    : null;
                  const inVault = vaultMatch?.haveIt;

                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        inVault
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : doc.required
                          ? 'bg-zinc-800 text-zinc-500'
                          : 'bg-zinc-800/50 text-zinc-600'
                      }`}>
                        {inVault ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${inVault ? 'text-emerald-300' : 'text-zinc-200'}`}>
                          {isNe ? doc.title.ne : doc.title.en}
                        </span>
                        {inVault && (
                          <span className="ml-2 inline-flex items-center text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            {isNe ? 'भल्टमा छ' : 'In vault'}
                          </span>
                        )}
                        {!doc.required && (
                          <span className="ml-2 inline-flex items-center text-[10px] text-zinc-500 font-medium">
                            {isNe ? 'ऐच्छिक' : 'optional'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vault summary */}
              {preview.docStatus && (
                <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                  preview.docStatus.missingDocs.length === 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {preview.docStatus.missingDocs.length === 0 ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isNe ? 'तपाईंसँग सबै आवश्यक कागजातहरू छन्!' : 'You have all required documents!'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      {isNe
                        ? `${preview.docStatus.missingDocs.length} कागजात अझै भल्टमा थप्नुपर्छ`
                        : `${preview.docStatus.missingDocs.length} document${preview.docStatus.missingDocs.length === 1 ? '' : 's'} still needed — add to your vault`}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Steps preview — show first 3 */}
          {preview.service.steps.length > 0 && (
            <div className="px-5 py-4 border-t border-zinc-800/50">
              <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">
                {isNe ? 'प्रक्रिया' : 'Process'}
              </h4>
              <div className="space-y-3">
                {preview.service.steps.slice(0, 3).map((step) => (
                  <div key={step.order} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#003893]/30 text-[#4d8bff] flex items-center justify-center text-xs font-bold">
                      {step.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200">
                        {isNe ? step.title.ne : step.title.en}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                        {isNe ? step.detail.ne : step.detail.en}
                      </div>
                    </div>
                  </div>
                ))}
                {preview.service.steps.length > 3 && (
                  <div className="text-xs text-zinc-500 pl-9">
                    +{preview.service.steps.length - 3} {isNe ? 'थप चरणहरू' : 'more steps'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nearest office */}
          {preview.service.offices.length > 0 && (
            <div className="px-5 py-3 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-zinc-300 font-medium">
                  {isNe ? preview.service.offices[0].name.ne : preview.service.offices[0].name.en}
                </span>
                {preview.service.offices[0].hours && (
                  <span className="text-zinc-600 ml-1">
                    · {isNe ? preview.service.offices[0].hours.ne : preview.service.offices[0].hours.en}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-5 py-4 border-t border-zinc-800/50 flex gap-3">
            <button
              onClick={startService}
              disabled={starting}
              className="flex-1 rounded-xl bg-[#DC143C] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#DC143C]/90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isNe ? 'सुरु गर्दै...' : 'Starting...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  {isNe ? 'यो सेवा सुरु गर्नुहोस्' : 'Start this service'}
                </>
              )}
            </button>
            <Link
              href={`/services/${preview.service.category}/${preview.service.slug}`}
              className="flex-shrink-0 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all flex items-center gap-1.5"
            >
              {isNe ? 'विवरण' : 'Details'}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* AI general answer (for non-service queries like "my stomach hurts", "I need food") */}
      {!preview && aiAnswer && (
        <div className="mt-4 rounded-2xl border border-zinc-700/50 bg-zinc-950/90 backdrop-blur overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#DC143C]/20 to-[#003893]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#DC143C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                {aiAnswer}
              </div>
            </div>
          </div>
          {followUpPrompt && (
            <div className="px-5 pb-3 text-xs text-zinc-500">{followUpPrompt}</div>
          )}
          {followUpOptions.length > 0 && (
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              {followUpOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setQuestion(option);
                    routeQuestion(option);
                  }}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 hover:border-[#DC143C]/30"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t border-zinc-800/50">
            <button
              onClick={() => { setAiAnswer(null); setFollowUpPrompt(null); setFollowUpOptions([]); inputRef.current?.focus(); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {isNe ? 'अर्को प्रश्न सोध्नुहोस्' : 'Ask something else'}
            </button>
          </div>
        </div>
      )}

      {/* AI routing results — follow-ups and service options */}
      {!preview && !aiAnswer && (routeReason || followUpPrompt || followUpOptions.length > 0 || serviceOptions.length > 0) && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
          {routeReason && (
            <div className="text-sm text-zinc-300">{routeReason}</div>
          )}
          {followUpPrompt && (
            <div className="mt-2 text-xs text-zinc-500">{followUpPrompt}</div>
          )}
          {followUpOptions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {followUpOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    const nextQuestion = `${question.trim()}. ${option}`.trim();
                    setQuestion(nextQuestion);
                    routeQuestion(nextQuestion);
                  }}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          {serviceOptions.length > 0 && (
            <div className="mt-3 grid gap-2">
              {serviceOptions.slice(0, 4).map((option) => (
                <Link
                  key={option.slug}
                  href={`/services/${option.category}/${option.slug}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-left hover:border-red-500/40 hover:bg-zinc-900/80"
                >
                  <div className="text-sm font-semibold text-zinc-100">
                    {isNe ? option.title.ne : option.title.en}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{option.providerName}</div>
                </Link>
              ))}
              <button
                type="button"
                onClick={() => router.push(`/services/search?q=${encodeURIComponent(question.trim())}`)}
                className="mt-1 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
              >
                {isNe ? 'थप विकल्प हेर्नुहोस्' : 'See more options'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick action pills — 4 items, single row on mobile */}
      <div className="mt-3 flex justify-center gap-1.5">
        {[
          { ne: 'पासपोर्ट', en: 'Passport' },
          { ne: 'नागरिकता', en: 'Citizenship' },
          { ne: 'लाइसेन्स', en: 'License' },
          { ne: 'समस्या', en: 'Report' },
        ].map((item) => (
          <button
            key={item.en}
            onClick={() => {
              setQuestion(isNe ? item.ne : item.en);
              routeQuestion(isNe ? item.ne : item.en);
            }}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-[11px] text-zinc-400 transition-all hover:border-[#DC143C]/30 hover:bg-[#DC143C]/5 hover:text-white active:scale-95"
          >
            {isNe ? item.ne : item.en}
          </button>
        ))}
      </div>

      {/* View my cases link — shown for authenticated users */}
      {user && (
        <div className="mt-3 text-center">
          <Link
            href="/me/tasks"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#DC143C] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {isNe ? 'मेरा केसहरू हेर्नुहोस्' : 'View my cases'}
          </Link>
        </div>
      )}
    </div>
  );
}
