'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowDownUp, ChevronRight, Loader2, MapPin, MessageSquareWarning, Mic, Search, Send, Square, Users } from 'lucide-react';
import { useComplaints } from '@/lib/hooks/use-complaints';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { ShareMenu } from '@/components/public/share-menu';
import { buildComplaintShareData } from '@/lib/complaints/share';
import { PhotoUpload } from '@/components/public/photo-upload';

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

function timeAgo(value: string, isNe: boolean): string {
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return '';
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return isNe ? 'अहिले' : 'now';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function statusDotColor(status: string): string {
  if (status === 'resolved' || status === 'closed') return 'bg-emerald-400';
  if (status === 'in_progress' || status === 'acknowledged') return 'bg-cyan-400';
  if (status === 'needs_info') return 'bg-amber-400';
  return 'bg-gray-500';
}

function statusBadgeColor(status: string): string {
  if (status === 'resolved' || status === 'closed') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (status === 'in_progress' || status === 'acknowledged') return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  if (status === 'needs_info') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-gray-400 bg-white/[0.04] border-white/[0.08]';
}

/** Compact issue row used in both panels */
function IssueRow({ complaint, isNe }: { complaint: any; isNe: boolean }) {
  const shareData = buildComplaintShareData(complaint, isNe ? 'ne' : 'en');

  return (
    <div className="flex items-start gap-2 py-1">
      <Link
        href={`/complaints/${complaint.id}`}
        className="group flex min-w-0 flex-1 items-start gap-2.5 rounded-lg px-1 py-2.5 transition-colors hover:bg-white/[0.03]"
      >
        <div className="mt-1.5 shrink-0">
          <div className={`h-2 w-2 rounded-full ${statusDotColor(complaint.status)}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-medium text-gray-200 transition-colors group-hover:text-white">
            {isNe && complaint.title_ne ? complaint.title_ne : complaint.title}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${statusBadgeColor(complaint.status)}`}>
              {complaint.status.replace('_', ' ')}
            </span>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-gray-400 capitalize">
              {complaint.issue_type}
            </span>
            {(complaint.municipality || complaint.ward_number) && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                <MapPin className="h-2.5 w-2.5" />
                {[complaint.municipality, complaint.ward_number ? `W${complaint.ward_number}` : null]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(complaint.follower_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500" title={isNe ? 'समर्थक' : 'Supporters'}>
              <Users className="h-2.5 w-2.5" />
              {complaint.follower_count}
            </span>
          )}
          <span className="tabular-nums text-[10px] text-gray-600">{timeAgo(complaint.last_activity_at, isNe)}</span>
          <ChevronRight className="h-3 w-3 text-gray-700 transition-colors group-hover:text-gray-500" />
        </div>
      </Link>
      <div className="pt-2.5">
        <ShareMenu
          shareUrl={shareData.shareUrl}
          shareText={shareData.shareText}
          shareTitle={shareData.shareTitle}
          ogParams={shareData.ogParams}
          size="sm"
        />
      </div>
    </div>
  );
}

export default function ComplaintsPage() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const { isAuthenticated, isVerifier } = useAuth();

  // ── All issues filters ──
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [issueType, setIssueType] = useState('');
  const [sortBy, setSortBy] = useState('last_activity_at');
  const [rightTab, setRightTab] = useState<'all' | 'mine' | 'followed'>('all');
  const [pageOffset, setPageOffset] = useState(0);
  const PAGE_SIZE = 30;

  // ── Report form state ──
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
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

  // ── Issues query (switches between all / mine / followed based on rightTab) ──
  const issueFilters = useMemo(
    () => ({
      mine: isAuthenticated && rightTab === 'mine',
      followed: isAuthenticated && rightTab === 'followed',
      q: search || undefined,
      status: status || undefined,
      issue_type: issueType || undefined,
      sort_by: sortBy,
      sort_order: sortBy === 'follower_count' ? 'desc' : 'desc',
      limit: PAGE_SIZE,
      offset: pageOffset,
    }),
    [isAuthenticated, rightTab, search, status, issueType, sortBy, pageOffset],
  );
  const { data: issueData, isLoading: issueLoading, error: issueError, refetch: refetchAll } = useComplaints(issueFilters);
  const issueComplaints = issueData?.complaints || [];

  // ── Voice recording ──
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
      // Try codecs in order: webm/opus (Chrome/Firefox), mp4 (Safari/iOS), then default
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : MediaRecorder.isTypeSupported('audio/wav')
            ? 'audio/wav'
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
          media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
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
      setMediaUrls([]);
      setVoiceError(null);
      setVoiceMessage(null);
      setSubmitMessage(
        isNe ? 'नागरिक समस्या सफलतापूर्वक दर्ता भयो। समीक्षा पछि सार्वजनिक स्थितिमा अपडेट हुनेछ।' : 'Civic issue submitted successfully. Public status will update only after review.',
      );

      await queryClient.invalidateQueries({ queryKey: ['complaints'] });
      await refetchAll();
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
        <div className="public-shell space-y-4">
          {/* ── Hero ── */}
          <div className="glass-card p-5 sm:p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              <MessageSquareWarning className="h-3.5 w-3.5" />
              {isNe ? 'नागरिक समस्या ट्र्याकर' : 'Citizen Issue Tracker'}
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {isNe ? 'समस्या रिपोर्ट गर्नुहोस्, ट्र्याक गर्नुहोस्, फलोअप गर्नुहोस्' : 'Report, track & follow up on local issues'}
            </h1>
            <p className="mt-2 text-sm text-gray-300 sm:text-base">
              {isNe
                ? 'सडकको खाल्डो, पानी, फोहर, बिजुली वा सेवासम्बन्धी समस्या दर्ता गर्नुहोस्।'
                : 'Log roads, water, sanitation, power, and service issues. AI suggests routing, but public status changes only after review.'}
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
                  Operations Hub
                </Link>
              )}
            </div>
          </div>

          {/* ══ SPLIT LAYOUT: Form+MyIssues (left) | All Issues (right) ══ */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">

            {/* ── LEFT COLUMN: Report Form + My Issues ── */}
            <div className="space-y-4">
              {/* Report form */}
              <form onSubmit={handleSubmitComplaint} className="glass-card p-4 sm:p-5">
                <h2 className="text-base font-semibold text-white mb-3">
                  {isNe ? 'नयाँ समस्या रिपोर्ट' : 'Report New Issue'}
                </h2>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isNe ? 'शीर्षक (वैकल्पिक)' : 'Title (optional)'}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder={isNe ? 'पालिका' : 'Municipality'}
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                  />
                  <input
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder={isNe ? 'वडा नं' : 'Ward'}
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                  />
                </div>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setInputMode(rawTranscript.trim().length > 0 ? 'mixed' : 'text');
                  }}
                  rows={3}
                  placeholder={
                    isNe
                      ? 'समस्या के हो? कहाँ हो? कहिले देखि हो?...'
                      : 'Describe the issue, location, timeline...'
                  }
                  className="mt-2 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing || isSubmitting}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                      isRecording
                        ? 'border-red-400/40 bg-red-500/20 text-red-100 hover:bg-red-500/30'
                        : 'border-cyan-400/40 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30'
                    }`}
                  >
                    {isRecording ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    {isRecording
                      ? (isNe ? 'रोक्नुहोस्' : 'Stop')
                      : (isNe ? 'बोल्नुहोस्' : 'Speak')}
                  </button>
                  {isTranscribing && (
                    <span className="inline-flex items-center gap-1 text-xs text-cyan-200">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {isNe ? 'ट्रान्सक्राइब...' : 'Transcribing...'}
                    </span>
                  )}
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/5"
                    />
                    {isNe ? 'गुमनाम' : 'Anonymous'}
                  </label>
                </div>

                {voiceMessage && (
                  <p className="mt-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100">
                    {voiceMessage}
                  </p>
                )}
                {voiceError && (
                  <p className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
                    {voiceError}
                  </p>
                )}
                {submitMessage && (
                  <p className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
                    {submitMessage}
                  </p>
                )}
                {submitError && (
                  <p className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
                    {submitError}
                  </p>
                )}

                {/* Photo/PDF upload */}
                <div className="mt-2">
                  <PhotoUpload
                    onUpload={(urls) => setMediaUrls((prev) => [...prev, ...urls])}
                    maxFiles={5}
                    disabled={isSubmitting}
                  />
                  {mediaUrls.length > 0 && (
                    <p className="mt-1 text-[10px] text-emerald-400">
                      {mediaUrls.length} {isNe ? 'फाइल अपलोड भयो' : 'file(s) uploaded'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-500/40 bg-primary-500/20 px-4 py-2.5 text-sm font-semibold text-primary-100 transition-colors hover:bg-primary-500/30 disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? (isNe ? 'पठाउँदै...' : 'Submitting...') : isNe ? 'समस्या पठाउनुहोस्' : 'Submit Issue'}
                </button>
              </form>

            </div>

            {/* ── RIGHT COLUMN: All Community Issues ── */}
            <div className="glass-card flex flex-col overflow-hidden">
              {/* Header with tabs + filters */}
              <div className="border-b border-white/[0.06] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-lg border border-white/[0.1] bg-white/[0.03] p-0.5">
                    {([
                      { key: 'all' as const, label: isNe ? 'सबै' : 'All', needsAuth: false },
                      { key: 'mine' as const, label: isNe ? 'मेरो' : 'Mine', needsAuth: true },
                      { key: 'followed' as const, label: isNe ? 'फलो' : 'Following', needsAuth: true },
                    ]).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setRightTab(tab.key)}
                        disabled={tab.needsAuth && !isAuthenticated}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                          rightTab === tab.key
                            ? 'bg-white/[0.12] text-white'
                            : 'text-gray-400 hover:text-gray-200'
                        } disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-500 tabular-nums">
                    {issueData?.total || 0} {isNe ? 'समस्या' : 'issues'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPageOffset(0); }}
                    className="shrink-0 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none"
                  >
                    <option value="">{isNe ? 'स्थिति' : 'Status'}</option>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <select
                    value={issueType}
                    onChange={(e) => { setIssueType(e.target.value); setPageOffset(0); }}
                    className="shrink-0 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none"
                  >
                    <option value="">{isNe ? 'विषय' : 'Type'}</option>
                    {ISSUE_TYPES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPageOffset(0); }}
                    className="shrink-0 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none"
                  >
                    <option value="last_activity_at">{isNe ? 'नयाँ गतिविधि' : 'Recent activity'}</option>
                    <option value="created_at">{isNe ? 'नयाँ दर्ता' : 'Newest'}</option>
                    <option value="follower_count">{isNe ? 'धेरै समर्थन' : 'Most supported'}</option>
                  </select>
                  <label className="relative flex flex-1 min-w-0 items-center">
                    <Search className="pointer-events-none absolute left-2 h-3 w-3 text-gray-500" />
                    <input
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPageOffset(0); }}
                      placeholder={isNe ? 'खोज्नुहोस्...' : 'Search...'}
                      className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] py-1.5 pl-7 pr-2 text-[11px] text-white placeholder:text-gray-500 focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              {/* Scrollable issue list */}
              <div className="flex-1 overflow-y-auto max-h-[70vh] px-3 py-1 divide-y divide-white/[0.04]">
                {issueLoading ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    {isNe ? 'लोड हुँदैछ...' : 'Loading...'}
                  </div>
                ) : issueError ? (
                  <div className="py-8 text-center text-sm text-red-300">
                    <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                    {issueError instanceof Error ? issueError.message : isNe ? 'लोड असफल' : 'Failed to load'}
                  </div>
                ) : issueComplaints.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">
                    {rightTab === 'mine'
                      ? (isNe ? 'तपाईंले अहिलेसम्म कुनै समस्या रिपोर्ट गर्नुभएको छैन।' : 'You haven\'t reported any issues yet.')
                      : rightTab === 'followed'
                        ? (isNe ? 'फलो गरिएका समस्या छैनन्।' : 'No followed issues yet.')
                        : (isNe ? 'समस्या फेला परेन।' : 'No issues found.')}
                  </div>
                ) : (
                  issueComplaints.map((complaint) => (
                    <IssueRow key={complaint.id} complaint={complaint} isNe={isNe} />
                  ))
                )}

                {/* Pagination */}
                {(issueData?.total ?? 0) > 0 && (
                  <div className="flex items-center justify-between py-3 px-1">
                    <button
                      onClick={() => setPageOffset(Math.max(0, pageOffset - PAGE_SIZE))}
                      disabled={pageOffset === 0}
                      className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isNe ? '← अघिल्लो' : '← Previous'}
                    </button>
                    <span className="text-[10px] text-gray-500 tabular-nums">
                      {pageOffset + 1}–{Math.min(pageOffset + PAGE_SIZE, issueData?.total ?? 0)} / {issueData?.total ?? 0}
                    </span>
                    <button
                      onClick={() => setPageOffset(pageOffset + PAGE_SIZE)}
                      disabled={pageOffset + PAGE_SIZE >= (issueData?.total ?? 0)}
                      className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isNe ? 'अर्को →' : 'Next →'}
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
