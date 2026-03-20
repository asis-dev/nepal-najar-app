'use client';

import { useState } from 'react';
import { X, FileUp, CheckCircle2 } from 'lucide-react';

interface SubmitEvidenceModalProps {
  promiseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SubmitEvidenceModal({ promiseId, isOpen, onClose }: SubmitEvidenceModalProps) {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'evidence' | 'tip'>('evidence');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promise_id: promiseId,
          url: url.trim() || undefined,
          description: description.trim(),
          type,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setUrl('');
        setDescription('');
        setType('evidence');
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-card p-6 sm:p-8 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">Submitted!</h3>
            <p className="text-sm text-gray-400">Your submission will be reviewed by our team.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <FileUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Submit Evidence</h3>
                <p className="text-xs text-gray-500">Help verify this commitment with evidence or tips</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'evidence' | 'tip')}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-all appearance-none"
                >
                  <option value="evidence">Evidence (article, report, document)</option>
                  <option value="tip">Tip (unverified lead or observation)</option>
                </select>
              </div>

              {/* URL input */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  URL <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the evidence or tip..."
                  rows={4}
                  maxLength={2000}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 resize-none transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-500/20 to-cyan-500/20 border border-primary-500/30 hover:from-primary-500/30 hover:to-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
