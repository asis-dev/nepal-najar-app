'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { useVoiceInput } from '@/lib/hooks/use-voice-input';
import { useUserPreferencesStore } from '@/lib/stores/preferences';
import type { HouseholdMember } from '@/lib/household/types';
import { HOUSEHOLD_RELATIONSHIP_LABELS } from '@/lib/household/types';

interface ServiceOption {
  slug: string;
  category: string;
  title: { en: string; ne: string };
  providerName: string;
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
  const [error, setError] = useState<string | null>(null);
  const [routeReason, setRouteReason] = useState<string | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState<string | null>(null);
  const [followUpOptions, setFollowUpOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [targetMemberId, setTargetMemberId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
    try {
      const response = await fetch('/api/me/service-tasks/from-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: nextQuestion,
          locale,
          sessionId,
          targetMemberId: targetMemberId || undefined,
        }),
      });
      const data = await response.json();
      if (data.serviceOptions?.length && (data.ambiguous || !response.ok)) {
        setRouteReason(data.routeReason || null);
        setFollowUpPrompt(data.followUpPrompt || null);
        setFollowUpOptions(data.followUpOptions || []);
        setServiceOptions(data.serviceOptions || []);
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Could not route that request.');
        return;
      }

      // Civic complaint services → redirect to complaints flow
      const COMPLAINT_SLUGS = [
        'local-infrastructure-complaint',
        'ciaa-complaint',
        'consumer-complaint',
        'human-rights-complaint',
        'lokpal-complaint',
      ];
      const serviceSlug = data.service?.slug || data.task?.service_slug;
      if (serviceSlug && COMPLAINT_SLUGS.includes(serviceSlug)) {
        const q = encodeURIComponent(nextQuestion);
        router.push(`/complaints?q=${q}&type=${serviceSlug}`);
        return;
      }

      if (data.requiresAuth && data.service) {
        router.push(`/services/${data.service.category}/${data.service.slug}`);
        return;
      }

      if (data.task) {
        router.push('/me/tasks');
        return;
      }

      if (data.service) {
        router.push(`/services/${data.service.category}/${data.service.slug}`);
        return;
      }
    } catch {
      setError('Something went wrong while routing your request.');
    } finally {
      setLoading(false);
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

      {/* AI routing results — follow-ups and service options */}
      {(routeReason || followUpPrompt || serviceOptions.length > 0) && (
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
    </div>
  );
}
