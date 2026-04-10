'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type TaskContext = {
  id: string;
  service: string;
  status: string;
  progress: number;
  currentStep: number;
  nextAction: string;
};

type TokenInfo = {
  valid: boolean;
  scope: string;
  counterparty: { id: string; name: string; name_ne?: string; kind: string };
  task: TaskContext;
  previous_replies: Array<{ id: string; reply_type: string; content: string; created_at: string }>;
  remaining_uses: number;
  expires_at: string;
};

const REPLY_TYPES = [
  { value: 'note', label: 'Add a note / टिप्पणी थप्नुहोस्' },
  { value: 'status_update', label: 'Update status / स्थिति अपडेट' },
  { value: 'approval', label: 'Approve / स्वीकृत' },
  { value: 'rejection', label: 'Reject / अस्वीकृत' },
  { value: 'request_info', label: 'Request more info / थप जानकारी माग' },
];

const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In Progress / प्रक्रियामा' },
  { value: 'waiting_on_citizen', label: 'Waiting on Citizen / नागरिकको प्रतीक्षा' },
  { value: 'completed', label: 'Completed / सम्पन्न' },
  { value: 'rejected', label: 'Rejected / अस्वीकृत' },
];

export default function PartnerReplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400 animate-pulse">Loading... / लोड हुँदैछ...</div>
      </div>
    }>
      <PartnerReplyContent />
    </Suspense>
  );
}

function PartnerReplyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [replyType, setReplyType] = useState('note');
  const [content, setContent] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No token provided. कुनै टोकन प्रदान गरिएको छैन।');
      setLoading(false);
      return;
    }
    fetch(`/api/partner-reply?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInfo(data);
        }
      })
      .catch(() => setError('Failed to validate token'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (!token || !info) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/partner-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reply_type: replyType,
          content,
          new_status: (replyType === 'status_update' || replyType === 'approval' || replyType === 'rejection') ? (newStatus || (replyType === 'approval' ? 'completed' : replyType === 'rejection' ? 'rejected' : null)) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit reply');
      setSuccess(true);
      setContent('');
      // Refresh token info
      const refreshRes = await fetch(`/api/partner-reply?token=${encodeURIComponent(token)}`);
      const refreshData = await refreshRes.json();
      if (!refreshData.error) setInfo(refreshData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400 animate-pulse">Loading... / लोड हुँदैछ...</div>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Access Error</div>
          <div className="text-sm text-zinc-300">{error}</div>
          <div className="mt-2 text-xs text-zinc-500">
            If this link was shared with you by NepalRepublic, it may have expired or been used up.
            Please contact the sending department for a new link.
          </div>
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <div className="text-xs uppercase tracking-wide text-violet-400 font-bold mb-1">
            NepalRepublic Partner Reply / साझेदार जवाफ
          </div>
          <h1 className="text-lg font-semibold text-zinc-100">
            {info.counterparty.name}
            {info.counterparty.name_ne ? ` / ${info.counterparty.name_ne}` : ''}
          </h1>
          <div className="mt-1 text-sm text-zinc-400">
            Responding to: {info.task.service} · Status: {info.task.status?.replace(/_/g, ' ')}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>{info.remaining_uses} uses remaining / बाँकी प्रयोग</span>
            <span>Expires: {new Date(info.expires_at).toLocaleDateString('en-NP')}</span>
          </div>
        </div>

        {/* Previous replies */}
        {info.previous_replies.length > 0 && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-5">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Previous replies / पहिलेका जवाफहरू</div>
            <div className="space-y-3">
              {info.previous_replies.map((reply) => (
                <div key={reply.id} className="rounded-xl bg-zinc-800/50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-violet-300 capitalize">{reply.reply_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-zinc-500">{new Date(reply.created_at).toLocaleString('en-NP')}</span>
                  </div>
                  {reply.content && <div className="text-sm text-zinc-200">{reply.content}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
            Reply submitted successfully. जवाफ सफलतापूर्वक पेश भयो।
          </div>
        )}

        {/* Reply form */}
        {info.remaining_uses > 0 && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-5 space-y-4">
            <div className="text-base font-semibold text-zinc-100">Submit Reply / जवाफ पेश गर्नुहोस्</div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Reply type / जवाफ प्रकार</label>
              <select
                value={replyType}
                onChange={(e) => {
                  setReplyType(e.target.value);
                  if (e.target.value === 'approval') setNewStatus('completed');
                  else if (e.target.value === 'rejection') setNewStatus('rejected');
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
              >
                {REPLY_TYPES.filter((rt) => {
                  if (info.scope === 'reply') return rt.value === 'note' || rt.value === 'request_info';
                  if (info.scope === 'status_update') return rt.value === 'note' || rt.value === 'status_update';
                  return true;
                }).map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>

            {(replyType === 'status_update' || replyType === 'approval' || replyType === 'rejection') && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">New status / नयाँ स्थिति</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
                >
                  <option value="">Select... / छान्नुहोस्...</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Message / सन्देश</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Type your response here... / यहाँ तपाईंको जवाफ लेख्नुहोस्..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 resize-none"
              />
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={submitting || (!content.trim() && !newStatus)}
              className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting... / पेश हुँदैछ...' : 'Submit Reply / जवाफ पेश गर्नुहोस्'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
