'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Filter,
  ChevronDown,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  LogIn,
  User,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  usePendingEvidence,
  useReviewEvidence,
  type EvidenceFilters,
  type EvidenceClassification,
  type CommunityEvidence,
} from '@/lib/hooks/use-evidence-review';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const CLASSIFICATION_STYLES: Record<EvidenceClassification, { bg: string; text: string; label: string; labelNe: string }> = {
  confirms: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', label: 'Confirms', labelNe: 'पुष्टि गर्छ' },
  contradicts: { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', label: 'Contradicts', labelNe: 'खण्डन गर्छ' },
  neutral: { bg: 'bg-gray-500/15 border-gray-500/30', text: 'text-gray-400', label: 'Neutral', labelNe: 'तटस्थ' },
};

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function VerifyEvidencePage() {
  const { t, locale } = useI18n();
  const { isAuthenticated, isVerifier, isAdmin } = useAuth();
  const isNe = locale === 'ne';

  // Filters
  const [classificationFilter, setClassificationFilter] = useState<EvidenceClassification | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filters: EvidenceFilters = {
    status: 'pending',
    classification: classificationFilter || undefined,
    date_from: dateFilter || undefined,
  };

  const { data, isLoading } = usePendingEvidence(filters);
  const reviewMutation = useReviewEvidence();

  // Review form state
  const [activeReview, setActiveReview] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_info'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewProofUrl, setReviewProofUrl] = useState('');

  const handleReview = (evidenceId: string) => {
    if (reviewAction === 'reject' && !reviewProofUrl.trim()) return;

    reviewMutation.mutate(
      {
        evidenceId,
        payload: {
          action: reviewAction,
          note: reviewNote.trim(),
          proof_url: reviewProofUrl.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setActiveReview(null);
          setReviewNote('');
          setReviewProofUrl('');
        },
      },
    );
  };

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
                  {isNe ? 'साइन इन आवश्यक' : 'Sign In Required'}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {isNe ? 'प्रमाण समीक्षा गर्न साइन इन गर्नुहोस्।' : 'Sign in to review evidence.'}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {isNe ? 'साइन इन' : 'Sign In'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Role gate
  if (!isVerifier && !isAdmin) {
    return (
      <div className="public-page">
        <div className="relative z-10 public-section">
          <div className="public-shell">
            <div className="mx-auto max-w-lg">
              <div className="glass-card p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">
                  {isNe ? 'प्रमाणकर्ता स्थिति आवश्यक' : 'You need Verifier status'}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {isNe
                    ? 'प्रमाण समीक्षा गर्न तपाईंलाई प्रमाणकर्ता वा प्रशासक भूमिका चाहिन्छ। आफ्नो कर्म बढाउनुहोस् र आवेदन दिनुहोस्।'
                    : 'You need a Verifier or Admin role to review evidence. Build your karma and apply.'}
                </p>
                <Link
                  href="/reputation"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isNe ? 'कर्म हेर्नुहोस्' : 'View Your Karma'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const evidenceList = data?.evidence ?? [];

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
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isNe ? 'प्रमाण समीक्षा' : 'Evidence Review'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                {isNe ? 'समीक्षा पङ्क्ति' : 'Review Queue'}
              </h1>
              <p className="text-gray-400 text-sm sm:text-base mt-2 max-w-lg mx-auto">
                {isNe
                  ? 'समुदायले पेश गरेको प्रमाण समीक्षा गर्नुहोस्'
                  : 'Review evidence submitted by the community'}
              </p>
              {data && (
                <p className="text-xs text-gray-500 mt-2">
                  {data.total} {isNe ? 'पेन्डिङ समीक्षा' : 'pending reviews'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="public-section pt-6 pb-0">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${
                  showFilters
                    ? 'bg-white/[0.07] text-white border border-white/[0.14]'
                    : 'text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {isNe ? 'फिल्टर' : 'Filters'}
              </button>

              {showFilters && (
                <div className="glass-card p-4 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Classification */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {isNe ? 'वर्गीकरण' : 'Classification'}
                    </label>
                    <div className="relative">
                      <select
                        value={classificationFilter}
                        onChange={(e) => setClassificationFilter(e.target.value as EvidenceClassification | '')}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/40"
                      >
                        <option value="">{isNe ? 'सबै' : 'All'}</option>
                        <option value="confirms">{isNe ? 'पुष्टि गर्छ' : 'Confirms'}</option>
                        <option value="contradicts">{isNe ? 'खण्डन गर्छ' : 'Contradicts'}</option>
                        <option value="neutral">{isNe ? 'तटस्थ' : 'Neutral'}</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {isNe ? 'मिति देखि' : 'Date From'}
                    </label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/40"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Evidence list */}
        <section className="public-section">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-card p-6 animate-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
                        <div className="flex-1">
                          <div className="h-4 w-40 bg-white/[0.06] rounded mb-1" />
                          <div className="h-3 w-24 bg-white/[0.04] rounded" />
                        </div>
                      </div>
                      <div className="h-12 bg-white/[0.04] rounded mb-3" />
                      <div className="flex gap-2">
                        <div className="h-8 w-20 bg-white/[0.04] rounded-lg" />
                        <div className="h-8 w-20 bg-white/[0.04] rounded-lg" />
                        <div className="h-8 w-24 bg-white/[0.04] rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : evidenceList.length === 0 ? (
                <div className="glass-card p-12 sm:p-16 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-300 mb-2">
                    {isNe ? 'सबै प्रमाण समीक्षा भइसकेको!' : 'All caught up!'}
                  </h2>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    {isNe
                      ? 'हाल समीक्षाको लागि कुनै पेन्डिङ प्रमाण छैन।'
                      : 'No pending evidence to review right now.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evidenceList.map((item) => (
                    <EvidenceReviewCard
                      key={item.id}
                      item={item}
                      isNe={isNe}
                      isActive={activeReview === item.id}
                      onStartReview={(action) => {
                        setActiveReview(item.id);
                        setReviewAction(action);
                        setReviewNote('');
                        setReviewProofUrl('');
                      }}
                      onCancelReview={() => setActiveReview(null)}
                      reviewAction={reviewAction}
                      reviewNote={reviewNote}
                      reviewProofUrl={reviewProofUrl}
                      onNoteChange={setReviewNote}
                      onProofUrlChange={setReviewProofUrl}
                      onSubmitReview={() => handleReview(item.id)}
                      isSubmitting={reviewMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EVIDENCE REVIEW CARD
   ═══════════════════════════════════════════ */

function EvidenceReviewCard({
  item,
  isNe,
  isActive,
  onStartReview,
  onCancelReview,
  reviewAction,
  reviewNote,
  reviewProofUrl,
  onNoteChange,
  onProofUrlChange,
  onSubmitReview,
  isSubmitting,
}: {
  item: CommunityEvidence;
  isNe: boolean;
  isActive: boolean;
  onStartReview: (action: 'approve' | 'reject' | 'request_info') => void;
  onCancelReview: () => void;
  reviewAction: 'approve' | 'reject' | 'request_info';
  reviewNote: string;
  reviewProofUrl: string;
  onNoteChange: (v: string) => void;
  onProofUrlChange: (v: string) => void;
  onSubmitReview: () => void;
  isSubmitting: boolean;
}) {
  const cls = CLASSIFICATION_STYLES[item.classification] || CLASSIFICATION_STYLES.neutral;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(isNe ? 'ne-NP' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="glass-card p-5 sm:p-6 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500/15 border border-primary-500/30 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {item.submitter_name || (isNe ? 'अज्ञात' : 'Anonymous')}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatDate(item.created_at)}
            </div>
          </div>
        </div>

        {/* Classification badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls.bg} ${cls.text}`}>
          {isNe ? cls.labelNe : cls.label}
        </span>
      </div>

      {/* Caption */}
      <p className="text-sm text-gray-300 leading-relaxed mb-4">
        {item.caption}
      </p>

      {/* Media URLs */}
      {item.media_urls && item.media_urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {item.media_urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-400 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all"
            >
              <ImageIcon className="w-3 h-3" />
              {isNe ? `मिडिया ${i + 1}` : `Media ${i + 1}`}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ))}
        </div>
      )}

      {/* Proof URL */}
      {item.proof_url && (
        <div className="mb-4">
          <a
            href={item.proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {isNe ? 'प्रमाण लिंक' : 'Proof Link'}
          </a>
        </div>
      )}

      {/* Action buttons */}
      {!isActive ? (
        <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
          <button
            onClick={() => onStartReview('approve')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isNe ? 'स्वीकृत' : 'Approve'}
          </button>
          <button
            onClick={() => onStartReview('reject')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <XCircle className="w-3.5 h-3.5" />
            {isNe ? 'अस्वीकृत' : 'Reject'}
          </button>
          <button
            onClick={() => onStartReview('request_info')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {isNe ? 'थप जानकारी' : 'Request Info'}
          </button>
        </div>
      ) : (
        /* Review form */
        <div className="pt-3 border-t border-white/[0.04] space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {isNe ? 'समीक्षा टिप्पणी' : 'Review Note'}
            </label>
            <textarea
              value={reviewNote}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={isNe ? 'तपाईंको टिप्पणी...' : 'Your note...'}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 resize-none transition-all"
            />
          </div>

          {reviewAction === 'reject' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {isNe ? 'प्रमाण URL (अनिवार्य)' : 'Proof URL (required for rejection)'}
              </label>
              <input
                type="url"
                value={reviewProofUrl}
                onChange={(e) => onProofUrlChange(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 transition-all"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onSubmitReview}
              disabled={isSubmitting || (reviewAction === 'reject' && !reviewProofUrl.trim())}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                reviewAction === 'approve'
                  ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25'
                  : reviewAction === 'reject'
                    ? 'text-red-300 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25'
                    : 'text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : reviewAction === 'approve' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : reviewAction === 'reject' ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {isNe ? 'पेश गर्नुहोस्' : 'Submit'}
            </button>
            <button
              onClick={onCancelReview}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
