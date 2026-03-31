'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BellRing, Loader2, MapPin, MessageSquareWarning, Mic, Search, Send, Square } from 'lucide-react';
import { useComplaints } from '@/lib/hooks/use-complaints';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';

const STATUS_OPTIONS = [
  'submitted',
  'triaged',
  'routed',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
  'needs_info',
];

const ISSUE_TYPES = [
  'roads',
  'water',
  'electricity',
  'health',
  'education',
  'sanitation',
  'internet',
  'safety',
  'employment',
  'environment',
  'other',
];

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

export default function ComplaintsPage() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const { isAuthenticated, isVerifier } = useAuth();

  const [mode, setMode] = useState<'all' | 'mine' | 'followed'>('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [issueType, setIssueType] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'mixed'>('text');
  const [municipality, setMunicipality] = useState('');
  const [ward, setWard] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

  const filters = useMemo(
    () => ({
      mine: isAuthenticated && mode === 'mine',
      followed: isAuthenticated && mode === 'followed',
      q: search || undefined,
      status: status || undefined,
      issue_type: issueType || undefined,
      limit: 40,
      offset: 0,
    }),
    [isAuthenticated, issueType, mode, search, status],
  );

  const { data, isLoading, error, refetch } = useComplaints(filters);
  const complaints = data?.complaints || [];

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.stop();
    setIsRecording(false);
  };

  const transcribeBlob = async (blob: Blob) => {
    setIsTranscribing(true);
    setVoiceError(null);
    setVoiceMessage(null);

    try {
      const ext = blob.type.includes('mp4')
        ? 'm4a'
        : blob.type.includes('wav')
          ? 'wav'
          : 'webm';
      const file = new File([blob], `civic-issue.${ext}`, {
        type: blob.type || `audio/${ext}`,
      });

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', isNe ? 'ne' : 'en');

      const response = await fetch('/api/complaints/transcribe', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || `Transcription failed (${response.status})`);
      }

      const transcript = typeof payload?.transcript === 'string' ? payload.transcript.trim() : '';
      if (!transcript) {
        throw new Error(isNe ? 'आवाजबाट पाठ निकाल्न सकिएन।' : 'Could not extract transcript from voice input.');
      }

      const hasExistingText = description.trim().length > 0;
      setDescription((previous) => {
        const current = previous.trim();
        if (!current) return transcript;
        return `${current}\n\n${transcript}`;
      });
      setRawTranscript(transcript);
      setInputMode(hasExistingText ? 'mixed' : 'voice');
      setVoiceMessage(
        isNe
          ? 'आवाज सफलतापूर्वक ट्रान्सक्राइब भयो। आवश्यक परे सम्पादन गरेर पठाउनुहोस्।'
          : 'Voice transcription completed. Review/edit and submit.',
      );
    } catch (transcribeError) {
      setVoiceError(
        transcribeError instanceof Error
          ? transcribeError.message
          : isNe
            ? 'आवाज ट्रान्सक्राइब गर्न सकिएन।'
            : 'Failed to transcribe voice input.',
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    if (!isAuthenticated) {
      setVoiceError(
        isNe ? 'आवाजबाट रिपोर्ट गर्न लगइन गर्नुहोस्।' : 'Please log in to report by voice.',
      );
      return;
    }

    setVoiceError(null);
    setVoiceMessage(null);

    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      setVoiceError(
        isNe ? 'यो ब्राउजरमा voice recording समर्थित छैन।' : 'Voice recording is not supported in this browser.',
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError(
        isNe ? 'माइक्रोफोन access उपलब्ध छैन।' : 'Microphone access is not available.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined;
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      mediaChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const chunkType = mediaChunksRef.current[0]?.type || recorder.mimeType || 'audio/webm';
        const blob = new Blob(mediaChunksRef.current, { type: chunkType });
        mediaChunksRef.current = [];
        mediaRecorderRef.current = null;

        if (blob.size === 0) {
          setVoiceError(
            isNe ? 'रिकर्डिङमा आवाज भेटिएन। फेरि प्रयास गर्नुहोस्।' : 'No audio captured. Please try again.',
          );
          return;
        }

        await transcribeBlob(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (recordError) {
      setVoiceError(
        recordError instanceof Error
          ? recordError.message
          : isNe
            ? 'माइक्रोफोन सुरु गर्न सकिएन।'
            : 'Failed to start microphone.',
      );
    }
  };

  const handleSubmitComplaint = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setSubmitError(isNe ? 'नागरिक समस्या दर्ताका लागि लगइन गर्नुहोस्।' : 'Please log in to report a civic issue.');
      return;
    }
    if (description.trim().length < 10) {
      setSubmitError(isNe ? 'विवरण कम्तीमा १० अक्षर हुनु पर्छ।' : 'Description must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          description: description.trim(),
          raw_transcript: rawTranscript || undefined,
          municipality: municipality.trim() || undefined,
          ward_number: ward.trim() || undefined,
          is_anonymous: isAnonymous,
          input_mode: inputMode,
          language: isNe ? 'ne' : 'en',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || `Failed with status ${response.status}`);
      }

      setTitle('');
      setDescription('');
      setRawTranscript('');
      setInputMode('text');
      setMunicipality('');
      setWard('');
      setIsAnonymous(false);
      setVoiceError(null);
      setVoiceMessage(null);
      setSubmitMessage(
        isNe ? 'नागरिक समस्या सफलतापूर्वक दर्ता भयो। समीक्षा पछि सार्वजनिक स्थितिमा अपडेट हुनेछ।' : 'Civic issue submitted successfully. Public status will update only after review.',
      );

      await queryClient.invalidateQueries({ queryKey: ['complaints'] });
      await refetch();
    } catch (submitErr) {
      const message =
        submitErr instanceof Error
          ? submitErr.message
          : isNe
            ? 'नागरिक समस्या दर्ता गर्न सकिएन।'
            : 'Failed to submit civic issue.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="public-page">
      <section className="public-section pb-4">
        <div className="public-shell space-y-5">
          <div className="glass-card p-5 sm:p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              <MessageSquareWarning className="h-3.5 w-3.5" />
              {isNe ? 'नागरिक समस्या ट्र्याकर' : 'Citizen Issue Tracker'}
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {isNe ? 'समस्या रिपोर्ट गर्नुहोस्, ट्र्याक गर्नुहोस्, फलोअप गर्नुहोस्' : 'Report local issues, track progress, and follow updates'}
            </h1>
            <p className="mt-2 text-sm text-gray-300 sm:text-base">
              {isNe
                ? 'सडकको खाल्डो, पानी, फोहर, बिजुली वा सेवासम्बन्धी समस्या दर्ता गर्नुहोस्। एआईले विभाग सुझाव दिन्छ, तर सार्वजनिक स्थिति समीक्षा पछि मात्र बदलिन्छ।'
                : 'Log roads, water, sanitation, power, and service issues. AI suggests routing, but public status changes only after reviewer approval.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/complaints/clusters"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/[0.08] transition-colors"
              >
                {isNe ? 'समस्या क्लस्टरहरू' : 'Issue Clusters'}
              </Link>
              {isVerifier && (
                <Link
                  href="/complaints/ops"
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                >
                  {isNe ? 'Operations Hub' : 'Operations Hub'}
                </Link>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmitComplaint} className="glass-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">
              {isNe ? 'नयाँ नागरिक समस्या' : 'New Civic Issue'}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isNe ? 'शीर्षक (वैकल्पिक)' : 'Title (optional)'}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder={isNe ? 'पालिका' : 'Municipality'}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                />
                <input
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder={isNe ? 'वडा नं' : 'Ward'}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                />
              </div>
            </div>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setInputMode(rawTranscript.trim().length > 0 ? 'mixed' : 'text');
              }}
              rows={4}
              placeholder={
                isNe
                  ? 'समस्या के हो? कहाँ हो? कहिले देखि हो? कुनै जोखिम छ भने उल्लेख गर्नुहोस्...'
                  : 'Describe the issue, location, timeline, and any urgency or risk...'
              }
              className="mt-3 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing || isSubmitting}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                  isRecording
                    ? 'border-red-400/40 bg-red-500/20 text-red-100 hover:bg-red-500/30'
                    : 'border-cyan-400/40 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30'
                }`}
              >
                {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {isRecording
                  ? (isNe ? 'रिकर्डिङ रोक्नुहोस्' : 'Stop recording')
                  : (isNe ? 'आवाजमा समस्या बोल्नुहोस्' : 'Speak issue')}
              </button>

              {isTranscribing && (
                <span className="inline-flex items-center gap-1 text-xs text-cyan-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isNe ? 'ट्रान्सक्राइब हुँदैछ...' : 'Transcribing...'}
                </span>
              )}
            </div>

            {voiceMessage && (
              <p className="mt-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                {voiceMessage}
              </p>
            )}
            {voiceError && (
              <p className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {voiceError}
              </p>
            )}

            <label className="mt-3 flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              {isNe ? 'नाम सार्वजनिक नगर्नुहोस्' : 'Submit anonymously'}
            </label>

            {submitMessage && (
              <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {submitMessage}
              </p>
            )}
            {submitError && (
              <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary-500/40 bg-primary-500/20 px-4 py-2.5 text-sm font-semibold text-primary-100 transition-colors hover:bg-primary-500/30 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmitting ? (isNe ? 'पठाउँदै...' : 'Submitting...') : isNe ? 'समस्या पठाउनुहोस्' : 'Submit Issue'}
            </button>
          </form>

          <div className="glass-card p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-[auto_auto_auto_1fr_auto_auto]">
              <div className="inline-flex rounded-xl border border-white/[0.1] bg-white/[0.03] p-1">
                {(['all', 'mine', 'followed'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMode(tab)}
                    disabled={!isAuthenticated && tab !== 'all'}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      mode === tab
                        ? 'bg-white/[0.12] text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    } disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    {tab === 'all'
                      ? isNe
                        ? 'सबै'
                        : 'All'
                      : tab === 'mine'
                        ? isNe
                          ? 'मेरो'
                          : 'Mine'
                        : isNe
                          ? 'फलो गरिएका'
                          : 'Following'}
                  </button>
                ))}
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs text-gray-200 focus:outline-none"
              >
                <option value="">{isNe ? 'सबै स्थिति' : 'All status'}</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs text-gray-200 focus:outline-none"
              >
                <option value="">{isNe ? 'सबै विषय' : 'All issues'}</option>
                {ISSUE_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <label className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isNe ? 'समस्या खोज्नुहोस्...' : 'Search civic issues...'}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] py-2 pl-8 pr-3 text-xs text-white placeholder:text-gray-500 focus:outline-none"
                />
              </label>

              <div className="flex items-center gap-2 text-xs text-gray-300">
                <BellRing className="h-3.5 w-3.5 text-primary-300" />
                {isNe ? `${data?.total || 0} ट्र्याक गरिएका` : `${data?.total || 0} tracked`}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="glass-card p-6 text-sm text-gray-300">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                {isNe ? 'समस्याहरू लोड हुँदैछ...' : 'Loading civic issues...'}
              </div>
            ) : error ? (
              <div className="glass-card border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">
                <AlertCircle className="mr-2 inline h-4 w-4" />
                {error instanceof Error ? error.message : isNe ? 'लोड गर्न असफल भयो।' : 'Failed to load civic issues.'}
              </div>
            ) : complaints.length === 0 ? (
              <div className="glass-card p-8 text-center text-sm text-gray-300">
                {isNe ? 'समस्या फेला परेन।' : 'No civic issues found.'}
              </div>
            ) : (
              complaints.map((complaint) => (
                <Link
                  key={complaint.id}
                  href={`/complaints/${complaint.id}`}
                  className="glass-card block p-4 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/[0.15] bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                      {complaint.status.replace('_', ' ')}
                    </span>
                    <span className="rounded-full border border-primary-400/30 bg-primary-500/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-primary-200">
                      {complaint.issue_type}
                    </span>
                    {complaint.is_following && (
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200">
                        {isNe ? 'फलो गर्दै' : 'Following'}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-white">
                    {isNe && complaint.title_ne ? complaint.title_ne : complaint.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-300">
                    {isNe && complaint.description_ne ? complaint.description_ne : complaint.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span>{complaint.reporter_name || (complaint.is_anonymous ? 'Anonymous' : 'Citizen')}</span>
                    <span>{formatTime(complaint.last_activity_at)}</span>
                    {(complaint.municipality || complaint.ward_number) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[complaint.municipality, complaint.ward_number ? `Ward ${complaint.ward_number}` : null]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    )}
                    <span>{complaint.evidence_count} evidence</span>
                    <span>{complaint.follower_count} following</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
