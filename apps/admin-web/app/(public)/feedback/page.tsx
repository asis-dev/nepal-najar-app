'use client';

import { useState } from 'react';
import { MessageSquarePlus, Send, CheckCircle2, LogIn, Star } from 'lucide-react';
import Link from 'next/link';
import { trackPilotEvent } from '@/lib/analytics/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { getSupabaseBrowser } from '@/lib/supabase/client';

type FeedbackType = 'bug' | 'feature' | 'content' | 'general';

const feedbackTypes: { value: FeedbackType; label: string; labelNe: string }[] = [
  { value: 'bug', label: 'Bug Report', labelNe: 'बग रिपोर्ट' },
  { value: 'feature', label: 'Feature Request', labelNe: 'सुविधा अनुरोध' },
  { value: 'content', label: 'Content Issue', labelNe: 'सामग्री समस्या' },
  { value: 'general', label: 'General Feedback', labelNe: 'सामान्य प्रतिक्रिया' },
];

const ratingLabels = ['Poor', 'Okay', 'Good', 'Great', 'Excellent'];

export default function FeedbackPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [page, setPage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please write your feedback before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        throw new Error('Feedback is unavailable until public database access is configured.');
      }
      const { error: insertError } = await supabase.from('user_feedback').insert({
        user_id: user?.id,
        feedback_type: type,
        message: message.trim(),
        rating: rating || null,
        page_context: page.trim() || null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });

      if (insertError) throw insertError;
      trackPilotEvent('feedback_submit', {
        metadata: {
          feedbackType: type,
          rating: rating || null,
          pageContext: page.trim() || null,
          messageLength: message.trim().length,
        },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="public-section pt-14 pb-20">
        <div className="public-shell max-w-lg">
          <div className="glass-card p-8 text-center">
            <LogIn className="mx-auto h-12 w-12 text-gray-500" />
            <h1 className="mt-4 text-2xl font-semibold text-white">Sign in to give feedback</h1>
            <p className="mt-2 text-sm text-gray-400">
              We value your voice. Sign in so we can follow up and make Nepal Najar better for everyone.
            </p>
            <Link
              href="/login?from=/feedback"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-section pt-14 pb-20">
        <div className="public-shell max-w-lg">
          <div className="glass-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-semibold text-white">Thank you!</h1>
            <p className="mt-2 text-sm text-gray-400">
              Your feedback helps us build a better Nepal Najar. We read every message.
            </p>
            <p className="mt-1 text-xs text-gray-500">धन्यवाद — तपाईंको प्रतिक्रिया हामीलाई सुधार गर्न मद्दत गर्छ।</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setMessage('');
                  setRating(0);
                  setPage('');
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/[0.07]"
              >
                Send another
              </button>
              <Link
                href="/"
                className="rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-500"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-section pt-14 pb-20">
      <div className="public-shell max-w-2xl">
        <div className="mb-8">
          <div className="section-kicker">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Help us improve
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Your feedback matters
          </h1>
          <p className="mt-3 text-base text-gray-400">
            Nepal Najar is built for Nepal&apos;s citizens. Tell us what&apos;s working, what&apos;s broken, and what you want to see next.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            तपाईंको प्रतिक्रिया नेपाल नजरलाई राम्रो बनाउँछ।
          </p>
        </div>

        <div className="glass-card space-y-6 p-6 sm:p-8">
          {/* Feedback type */}
          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-500">
              Type of feedback
            </label>
            <div className="flex flex-wrap gap-2">
              {feedbackTypes.map((ft) => (
                <button
                  key={ft.value}
                  onClick={() => setType(ft.value)}
                  className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                    type === ft.value
                      ? 'border-primary-500/40 bg-primary-500/15 text-primary-300'
                      : 'border-white/[0.08] bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-500">
              How would you rate Nepal Najar? (optional)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star === rating ? 0 : star)}
                  className="rounded-lg p-1 transition-colors hover:bg-white/[0.06]"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-400">{ratingLabels[rating - 1]}</span>
              )}
            </div>
          </div>

          {/* Page context */}
          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-500">
              Which page is this about? (optional)
            </label>
            <input
              type="text"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="e.g. First 100 Days, Map, Daily..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-primary-500/40 focus:bg-white/[0.05]"
            />
          </div>

          {/* Message */}
          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-500">
              Your feedback
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think — in English or Nepali..."
              rows={5}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-primary-500/40 focus:bg-white/[0.05]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-4 text-base font-semibold text-white transition-all hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Feedback
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-gray-600">
            Logged in as {user?.email || user?.phone || 'citizen'} · Your feedback is private and only seen by the Nepal Najar team.
          </p>
        </div>
      </div>
    </div>
  );
}
